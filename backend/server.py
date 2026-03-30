from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Query
from fastapi.responses import JSONResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, tempfile, requests, numpy as np, string, secrets
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from openai import AsyncOpenAI
import boto3
from botocore.exceptions import ClientError
from fpdf import FPDF
from faster_whisper import WhisperModel
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenRouter API for chat completions
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o')
openrouter_client = AsyncOpenAI(
    base_url='https://openrouter.ai/api/v1',
    api_key=OPENROUTER_API_KEY,
    default_headers={
        'HTTP-Referer': 'https://kinesis.app',
        'X-Title': 'Kinesis'
    }
)

# OpenAI API for audio transcription and embeddings (OpenRouter doesn't support these)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Google OAuth credentials
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

GITHUB_PAT = os.environ.get('GITHUB_PAT')
SLACK_CLIENT_ID = os.environ.get('SLACK_CLIENT_ID')
SLACK_CLIENT_SECRET = os.environ.get('SLACK_CLIENT_SECRET')

# S3 Storage Configuration
S3_BUCKET = os.environ.get('S3_BUCKET', 'spec-engine-storage')
S3_REGION = os.environ.get('S3_REGION', 'us-east-1')
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
APP_NAME = "spec-engine"

# Initialize S3 client
s3_client = None
def init_storage():
    global s3_client
    if s3_client: return s3_client
    s3_client = boto3.client(
        's3',
        region_name=S3_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )
    return s3_client

def put_object(path, data, content_type):
    client = init_storage()
    client.put_object(
        Bucket=S3_BUCKET,
        Key=path,
        Body=data,
        ContentType=content_type
    )
    return {"path": path, "size": len(data)}

def get_object(path):
    client = init_storage()
    try:
        response = client.get_object(Bucket=S3_BUCKET, Key=path)
        return response['Body'].read(), response.get('ContentType', 'application/octet-stream')
    except ClientError as e:
        raise HTTPException(status_code=404, detail="File not found in storage")

app = FastAPI()
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def gen_id(prefix): return f"{prefix}_{uuid.uuid4().hex[:12]}"
def now_iso(): return datetime.now(timezone.utc).isoformat()
def gen_invite_code(): return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))

# ============ AUTH + WORKSPACE CONTEXT ============

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization")
    if not session_token and auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header.split(" ", 1)[1]
        
    api_key_header = request.headers.get("x-api-key")
    
    # Check if we have an MCP key (either via x-api-key header or a Bearer token looking like one)
    mcp_key = api_key_header
    if not mcp_key and session_token and session_token.startswith("sk-spec-"):
        mcp_key = session_token
        
    if mcp_key:
        key_record = await db.mcp_keys.find_one({"api_key": mcp_key, "is_active": True}, {"_id": 0})
        if not key_record:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        user = await db.users.find_one({"user_id": key_record["created_by"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="API Key owner not found")
        # Ensure context methods use the workspace bound to the key
        user["active_workspace_id"] = key_record["workspace_id"]
        return user

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    from datetime import datetime, timezone
    if isinstance(expires_at, str): expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None: expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_workspace_context(request: Request):
    """Returns (user, workspace_id, role). Ensures user has access."""
    user = await get_current_user(request)
    ws_id = user.get("active_workspace_id")
    if not ws_id:
        # Auto-create personal workspace
        ws_id = await ensure_personal_workspace(user)
    member = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return user, ws_id, member.get("role", "VIEWER")

def require_editor(role):
    if role == "VIEWER":
        raise HTTPException(status_code=403, detail="Viewers cannot modify data")

async def ensure_personal_workspace(user):
    existing = await db.workspaces.find_one({"owner_id": user["user_id"], "is_personal": True}, {"_id": 0})
    if existing:
        ws_id = existing["workspace_id"]
    else:
        ws_id = gen_id("ws")
        await db.workspaces.insert_one({"workspace_id": ws_id, "name": f"{user.get('name', 'My')} Workspace", "owner_id": user["user_id"], "is_personal": True, "invite_code": gen_invite_code(), "created_at": now_iso()})
        await db.workspace_members.insert_one({"workspace_id": ws_id, "user_id": user["user_id"], "role": "OWNER", "joined_at": now_iso()})
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_workspace_id": ws_id}})
    return ws_id

# ============ AUTH ENDPOINTS ============

@api_router.get("/auth/google")
async def google_auth(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = request.query_params.get("redirect_uri", str(request.base_url) + "api/auth/google/callback")
    state = secrets.token_urlsafe(32)
    # Store state for validation (in production, use Redis or session store)
    await db.oauth_states.insert_one({"state": state, "redirect_uri": redirect_uri, "created_at": now_iso()})
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=email%20profile&"
        f"access_type=offline&"
        f"state={state}"
    )
    return {"auth_url": google_auth_url}

@api_router.get("/auth/google/callback")
async def google_callback(request: Request, response: Response, code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback"""
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")
    
    # Validate state
    state_record = await db.oauth_states.find_one({"state": state})
    if not state_record:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    await db.oauth_states.delete_one({"state": state})
    
    # Get the redirect URI that was used
    redirect_uri = state_record.get("redirect_uri", str(request.base_url) + "api/auth/google/callback")
    
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri
    }
    token_response = requests.post(token_url, data=token_data, timeout=10)
    if token_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to exchange authorization code")
    
    tokens = token_response.json()
    access_token = tokens.get("access_token")
    
    # Get user info from Google
    userinfo_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10
    )
    if userinfo_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to get user info")
    
    userinfo = userinfo_response.json()
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")
    
    # Create or update user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture, "updated_at": now_iso()}})
    else:
        user_id = gen_id("user")
        await db.users.insert_one({"user_id": user_id, "email": email, "name": name, "picture": picture, "active_workspace_id": None, "created_at": now_iso(), "updated_at": now_iso()})
    
    # Create session
    session_token = secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": session_token, "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(), "created_at": now_iso()})
    
    # Set cookie (secure=False for localhost development)
    is_localhost = 'localhost' in str(request.base_url) or '127.0.0.1' in str(request.base_url)
    response.set_cookie(
        key="session_token", 
        value=session_token, 
        httponly=True, 
        secure=not is_localhost,  # False for localhost
        samesite="lax" if is_localhost else "none",
        path="/", 
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    # Ensure workspace
    if not user.get("active_workspace_id"):
        await ensure_personal_workspace(user)
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Check pending invites
    pending = await db.workspace_invites.find({"email": email, "status": "PENDING"}, {"_id": 0}).to_list(20)
    for inv in pending:
        exists = await db.workspace_members.find_one({"workspace_id": inv["workspace_id"], "user_id": user_id})
        if not exists:
            await db.workspace_members.insert_one({"workspace_id": inv["workspace_id"], "user_id": user_id, "role": inv.get("role", "EDITOR"), "joined_at": now_iso()})
        await db.workspace_invites.update_one({"invite_id": inv["invite_id"]}, {"$set": {"status": "ACCEPTED"}})
    
    # Redirect to frontend dashboard
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    return RedirectResponse(url=f"{frontend_url}/dashboard?session={session_token}")

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process session token (for frontend to validate after OAuth redirect)"""
    body = await request.json()
    session_token = body.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="session_token required")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str): expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None: expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Set cookie (secure=False for localhost development)
    is_localhost = 'localhost' in str(request.base_url) or '127.0.0.1' in str(request.base_url)
    response.set_cookie(
        key="session_token", 
        value=session_token, 
        httponly=True, 
        secure=not is_localhost,
        samesite="lax" if is_localhost else "none",
        path="/", 
        max_age=7*24*60*60
    )
    return user

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    if not user.get("active_workspace_id"):
        await ensure_personal_workspace(user)
        user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    # Get workspace info
    ws = await db.workspaces.find_one({"workspace_id": user.get("active_workspace_id")}, {"_id": 0})
    member = await db.workspace_members.find_one({"workspace_id": user.get("active_workspace_id"), "user_id": user["user_id"]}, {"_id": 0})
    user["workspace"] = ws
    user["workspace_role"] = member.get("role") if member else "VIEWER"
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token: await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"status": "ok"}

# ============ WORKSPACE MANAGEMENT ============

@api_router.get("/workspaces")
async def list_workspaces(request: Request):
    user = await get_current_user(request)
    memberships = await db.workspace_members.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    ws_ids = [m["workspace_id"] for m in memberships]
    workspaces = await db.workspaces.find({"workspace_id": {"$in": ws_ids}}, {"_id": 0}).to_list(50)
    role_map = {m["workspace_id"]: m["role"] for m in memberships}
    for ws in workspaces:
        ws["role"] = role_map.get(ws["workspace_id"], "VIEWER")
        ws["is_active"] = ws["workspace_id"] == user.get("active_workspace_id")
        ws["member_count"] = await db.workspace_members.count_documents({"workspace_id": ws["workspace_id"]})
    return workspaces

@api_router.post("/workspaces")
async def create_workspace(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    ws_id = gen_id("ws")
    ws = {"workspace_id": ws_id, "name": body.get("name", "New Workspace"), "owner_id": user["user_id"], "is_personal": False, "invite_code": gen_invite_code(), "created_at": now_iso()}
    await db.workspaces.insert_one(ws)
    await db.workspace_members.insert_one({"workspace_id": ws_id, "user_id": user["user_id"], "role": "OWNER", "joined_at": now_iso()})
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_workspace_id": ws_id}})
    return await db.workspaces.find_one({"workspace_id": ws_id}, {"_id": 0})

@api_router.post("/workspaces/{ws_id}/switch")
async def switch_workspace(ws_id: str, request: Request):
    user = await get_current_user(request)
    member = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not member: raise HTTPException(status_code=403, detail="Not a member")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_workspace_id": ws_id}})
    return {"status": "switched", "workspace_id": ws_id}

@api_router.get("/workspaces/{ws_id}/members")
async def list_members(ws_id: str, request: Request):
    user = await get_current_user(request)
    member = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not member: raise HTTPException(status_code=403, detail="Not a member")
    members = await db.workspace_members.find({"workspace_id": ws_id}, {"_id": 0}).to_list(100)
    for m in members:
        u = await db.users.find_one({"user_id": m["user_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1})
        if u: m.update(u)
    return members

@api_router.put("/workspaces/{ws_id}/members/{member_user_id}/role")
async def update_member_role(ws_id: str, member_user_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    caller = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not caller or caller["role"] != "OWNER": raise HTTPException(status_code=403, detail="Only owners can change roles")
    new_role = body.get("role", "EDITOR")
    if new_role not in ["OWNER", "EDITOR", "VIEWER"]: raise HTTPException(status_code=400, detail="Invalid role")
    await db.workspace_members.update_one({"workspace_id": ws_id, "user_id": member_user_id}, {"$set": {"role": new_role}})
    return {"status": "updated"}

@api_router.delete("/workspaces/{ws_id}/members/{member_user_id}")
async def remove_member(ws_id: str, member_user_id: str, request: Request):
    user = await get_current_user(request)
    caller = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not caller or caller["role"] != "OWNER": raise HTTPException(status_code=403, detail="Only owners can remove members")
    if member_user_id == user["user_id"]: raise HTTPException(status_code=400, detail="Cannot remove yourself")
    await db.workspace_members.delete_one({"workspace_id": ws_id, "user_id": member_user_id})
    return {"status": "removed"}

@api_router.post("/workspaces/{ws_id}/invite")
async def invite_member(ws_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    caller = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not caller or caller["role"] not in ["OWNER", "EDITOR"]: raise HTTPException(status_code=403, detail="No permission to invite")
    email = body.get("email", "").lower().strip()
    role = body.get("role", "EDITOR")
    if role not in ["EDITOR", "VIEWER"]: raise HTTPException(status_code=400, detail="Invalid role")
    # Check if already member
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        existing_member = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": existing_user["user_id"]})
        if existing_member: raise HTTPException(status_code=400, detail="User already a member")
        # Add directly
        await db.workspace_members.insert_one({"workspace_id": ws_id, "user_id": existing_user["user_id"], "role": role, "joined_at": now_iso()})
        return {"status": "added", "message": "User added to workspace"}
    # Create pending invite
    invite = {"invite_id": gen_id("inv"), "workspace_id": ws_id, "email": email, "role": role, "invited_by": user["user_id"], "status": "PENDING", "created_at": now_iso()}
    await db.workspace_invites.insert_one(invite)
    return {"status": "invited", "message": f"Invite sent to {email}"}

@api_router.get("/workspaces/{ws_id}/invite-link")
async def get_invite_link(ws_id: str, request: Request):
    user = await get_current_user(request)
    caller = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not caller: raise HTTPException(status_code=403, detail="Not a member")
    ws = await db.workspaces.find_one({"workspace_id": ws_id}, {"_id": 0})
    return {"invite_code": ws.get("invite_code"), "workspace_name": ws.get("name")}

@api_router.post("/workspaces/join")
async def join_workspace(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    invite_code = body.get("invite_code")
    if not invite_code: raise HTTPException(status_code=400, detail="invite_code required")
    ws = await db.workspaces.find_one({"invite_code": invite_code}, {"_id": 0})
    if not ws: raise HTTPException(status_code=404, detail="Invalid invite code")
    existing = await db.workspace_members.find_one({"workspace_id": ws["workspace_id"], "user_id": user["user_id"]})
    if existing: raise HTTPException(status_code=400, detail="Already a member")
    await db.workspace_members.insert_one({"workspace_id": ws["workspace_id"], "user_id": user["user_id"], "role": "EDITOR", "joined_at": now_iso()})
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_workspace_id": ws["workspace_id"]}})
    return {"status": "joined", "workspace": ws}

@api_router.post("/workspaces/{ws_id}/migrate-data")
async def migrate_data(ws_id: str, request: Request):
    """Migrate user's personal (non-workspace) data to a workspace"""
    user = await get_current_user(request)
    caller = await db.workspace_members.find_one({"workspace_id": ws_id, "user_id": user["user_id"]}, {"_id": 0})
    if not caller or caller["role"] not in ["OWNER", "EDITOR"]: raise HTTPException(status_code=403, detail="No permission")
    # Migrate data that has user_id but no workspace_id
    uid = user["user_id"]
    counts = {}
    for coll_name in ["sources", "source_items", "insights", "opportunities", "briefs", "tasks", "chat_messages"]:
        result = await db[coll_name].update_many({"user_id": uid, "workspace_id": {"$exists": False}}, {"$set": {"workspace_id": ws_id}})
        counts[coll_name] = result.modified_count
    return {"status": "migrated", "counts": counts}

# ============ SOURCES (workspace-scoped) ============

@api_router.get("/sources")
async def list_sources(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    return await db.sources.find({"workspace_id": ws_id}, {"_id": 0}).to_list(100)

@api_router.post("/sources")
async def create_source(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    source = {"source_id": gen_id("src"), "type": body.get("type", "UPLOAD"), "name": body.get("name", "Untitled"), "config": body.get("config", {}), "user_id": user["user_id"], "workspace_id": ws_id, "last_sync": None, "item_count": 0, "created_at": now_iso()}
    await db.sources.insert_one(source)
    return await db.sources.find_one({"source_id": source["source_id"]}, {"_id": 0})

@api_router.delete("/sources/{source_id}")
async def delete_source(source_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    result = await db.sources.delete_one({"source_id": source_id, "workspace_id": ws_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Source not found")
    await db.source_items.delete_many({"source_id": source_id})
    return {"status": "deleted"}

# ============ FILE UPLOAD + WHISPER ============

AUDIO_EXTENSIONS = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg"}

# Local Whisper model (loaded on first use)
# Options: tiny, base, small, medium, large-v3, turbo
# Add .en suffix for English-only models (faster): tiny.en, base.en, small.en, medium.en
WHISPER_MODEL = os.environ.get('WHISPER_MODEL', 'base.en')
_whisper_model = None

def get_whisper_model():
    """Lazy load the faster-whisper model"""
    global _whisper_model
    if _whisper_model is None:
        logger.info(f"Loading Whisper model: {WHISPER_MODEL}")
        # Use CPU by default, set device="cuda" for GPU
        device = os.environ.get('WHISPER_DEVICE', 'cpu')
        compute_type = "int8" if device == "cpu" else "float16"
        _whisper_model = WhisperModel(WHISPER_MODEL, device=device, compute_type=compute_type)
        logger.info("Whisper model loaded successfully")
    return _whisper_model

async def transcribe_audio(file_data, filename):
    """Transcribe audio using local faster-whisper model"""
    with tempfile.NamedTemporaryFile(suffix=f".{filename.split('.')[-1]}", delete=False) as tmp:
        tmp.write(file_data)
        tmp.flush()
        tmp_path = tmp.name
    
    try:
        model = get_whisper_model()
        # Run whisper in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        def _transcribe():
            segments, _ = model.transcribe(tmp_path, beam_size=5)
            return " ".join([segment.text for segment in segments])
        result = await loop.run_in_executor(None, _transcribe)
        return result
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{ws_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    transcript = None
    is_audio = ext in AUDIO_EXTENSIONS
    if is_audio:
        try:
            transcript = await transcribe_audio(data, file.filename)
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            transcript = f"[Transcription failed]"
    file_record = {"file_id": gen_id("file"), "storage_path": result["path"], "original_filename": file.filename, "content_type": file.content_type, "size": result.get("size", len(data)), "user_id": user["user_id"], "workspace_id": ws_id, "is_deleted": False, "is_audio": is_audio, "transcript": transcript, "created_at": now_iso()}
    await db.files.insert_one(file_record)
    return {"file_id": file_record["file_id"], "filename": file.filename, "storage_path": result["path"], "size": file_record["size"], "is_audio": is_audio, "transcript": transcript}

@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: str = Query(None)):
    if not auth:
        try: await get_current_user(request)
        except Exception: raise HTTPException(status_code=401, detail="Not authenticated")
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record: raise HTTPException(status_code=404, detail="File not found")
    file_data, content_type = get_object(path)
    return Response(content=file_data, media_type=record.get("content_type", content_type))

# ============ SOURCE ITEMS ============

@api_router.post("/sources/{source_id}/items")
async def add_source_item(source_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    source = await db.sources.find_one({"source_id": source_id, "workspace_id": ws_id}, {"_id": 0})
    if not source: raise HTTPException(status_code=404, detail="Source not found")
    item = {"item_id": gen_id("item"), "source_id": source_id, "user_id": user["user_id"], "workspace_id": ws_id, "external_id": body.get("external_id"), "title": body.get("title", "Untitled"), "raw_text": body.get("raw_text", ""), "transcript": body.get("transcript", body.get("raw_text", "")), "metadata": body.get("metadata", {}), "processed": False, "embedding": None, "created_at": now_iso()}
    await db.source_items.insert_one(item)
    await db.sources.update_one({"source_id": source_id}, {"$inc": {"item_count": 1}, "$set": {"last_sync": now_iso()}})
    return await db.source_items.find_one({"item_id": item["item_id"]}, {"_id": 0})

@api_router.get("/sources/{source_id}/items")
async def list_source_items(source_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    return await db.source_items.find({"source_id": source_id, "workspace_id": ws_id}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/sources/{source_id}/process")
async def process_source_items(source_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    items = await db.source_items.find({"source_id": source_id, "workspace_id": ws_id, "processed": False}, {"_id": 0}).to_list(50)
    if not items: return {"message": "No unprocessed items", "processed": 0}
    processed_count = 0
    for item in items:
        try:
            text = item.get("transcript") or item.get("raw_text") or ""
            if text and len(text.strip()) >= 10:
                await extract_insights(text, item["item_id"], user["user_id"], ws_id)
                embedding = await get_embedding(text[:2000])
                await db.source_items.update_one({"item_id": item["item_id"]}, {"$set": {"processed": True, "embedding": embedding}})
            else:
                await db.source_items.update_one({"item_id": item["item_id"]}, {"$set": {"processed": True}})
            processed_count += 1
        except Exception as e:
            logger.error(f"Error processing item {item['item_id']}: {e}")
    return {"message": f"Processed {processed_count} items", "processed": processed_count}

# ============ EMBEDDINGS + VECTOR SEARCH ============

async def get_embedding(text):
    """Get embedding using OpenAI API (required for vector search)"""
    if not openai_client:
        logger.warning("Embeddings disabled: OPENAI_API_KEY not set")
        return None
    try:
        response = await openai_client.embeddings.create(
            input=text[:8000],
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return None

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))

async def vector_search(query, ws_id, top_k=10):
    query_embedding = await get_embedding(query)
    if not query_embedding: return []
    items = await db.source_items.find({"workspace_id": ws_id, "embedding": {"$ne": None}}, {"_id": 0, "item_id": 1, "embedding": 1, "title": 1}).to_list(500)
    scored = [(cosine_similarity(query_embedding, item["embedding"]), item["item_id"]) for item in items if item.get("embedding")]
    scored.sort(key=lambda x: x[0], reverse=True)
    top_ids = [iid for _, iid in scored[:top_k]]
    return await db.source_items.find({"item_id": {"$in": top_ids}}, {"_id": 0, "embedding": 0}).to_list(top_k) if top_ids else []

# ============ AI HELPERS ============

def clean_json_response(response):
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"): cleaned = cleaned[:-3]
    return cleaned

async def call_gpt4(system_message: str, user_message: str) -> str:
    """Call LLM using OpenRouter API"""
    response = await openrouter_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ],
        temperature=0.7
    )
    return response.choices[0].message.content

async def extract_insights(text, item_id, user_id, ws_id):
    if not text or len(text.strip()) < 10: return []
    system_msg = "You are an expert product manager. Extract insights as JSON array with: type (COMPLAINT/PRAISE/FEATURE_REQUEST/QUESTION/OTHER), summary (max 10 words), quote, sentiment (-1 to 1), confidence (0-1), tags (array). Return ONLY valid JSON."
    response = await call_gpt4(system_msg, f"Extract insights:\n\n{text[:4000]}")
    try:
        data = json.loads(clean_json_response(response))
        if not isinstance(data, list): data = [data]
    except json.JSONDecodeError: return []
    stored = []
    for ins in data:
        insight = {"insight_id": gen_id("ins"), "source_item_id": item_id, "user_id": user_id, "workspace_id": ws_id, "type": ins.get("type", "OTHER"), "summary": ins.get("summary", ""), "quote": ins.get("quote", ""), "sentiment": float(ins.get("sentiment", 0)), "confidence": float(ins.get("confidence", 0.5)), "tags": ins.get("tags", []), "opportunity_id": None, "created_at": now_iso()}
        await db.insights.insert_one(insight)
        stored.append(insight)
    return stored

# ============ INSIGHTS ============

@api_router.get("/insights")
async def list_insights(request: Request, type: str = None, tag: str = None, limit: int = 100):
    user, ws_id, role = await get_workspace_context(request)
    query = {"workspace_id": ws_id}
    if type: query["type"] = type
    if tag: query["tags"] = tag
    return await db.insights.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)

@api_router.post("/insights/cluster")
async def cluster_insights(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    insights = await db.insights.find({"workspace_id": ws_id, "opportunity_id": None}, {"_id": 0}).to_list(200)
    if len(insights) < 2: return {"message": "Not enough unlinked insights", "opportunities": []}
    summaries = [f"[{i['type']}] {i['summary']} (sentiment: {i['sentiment']})" for i in insights]
    system_msg = "Group insights into opportunities. Return JSON array with: title, description, impact_score (0-10), insight_indices (0-based). Return ONLY valid JSON."
    response = await call_gpt4(system_msg, f"Group:\n\n" + "\n".join(f"{i}: {s}" for i, s in enumerate(summaries)))
    try:
        clusters = json.loads(clean_json_response(response))
        if not isinstance(clusters, list): clusters = [clusters]
    except json.JSONDecodeError: return {"message": "Failed to cluster", "opportunities": []}
    created = []
    for c in clusters:
        opp_id = gen_id("opp")
        await db.opportunities.insert_one({"opportunity_id": opp_id, "user_id": user["user_id"], "workspace_id": ws_id, "title": c.get("title", "Untitled"), "description": c.get("description", ""), "impact_score": float(c.get("impact_score", 5)), "status": "OPEN", "created_at": now_iso(), "updated_at": now_iso()})
        ids = [insights[idx]["insight_id"] for idx in c.get("insight_indices", []) if 0 <= idx < len(insights)]
        if ids: await db.insights.update_many({"insight_id": {"$in": ids}}, {"$set": {"opportunity_id": opp_id}})
        created.append(await db.opportunities.find_one({"opportunity_id": opp_id}, {"_id": 0}))
    return {"message": f"Created {len(created)} opportunities", "opportunities": created}

# ============ OPPORTUNITIES ============

@api_router.get("/opportunities")
async def list_opportunities(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    pipeline = [{"$match": {"workspace_id": ws_id}}, {"$lookup": {"from": "insights", "localField": "opportunity_id", "foreignField": "opportunity_id", "as": "_ins"}}, {"$addFields": {"insight_count": {"$size": "$_ins"}}}, {"$project": {"_id": 0, "_ins": 0}}, {"$sort": {"impact_score": -1}}, {"$limit": 100}]
    return await db.opportunities.aggregate(pipeline).to_list(100)

@api_router.get("/opportunities/{opp_id}")
async def get_opportunity(opp_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    opp = await db.opportunities.find_one({"opportunity_id": opp_id, "workspace_id": ws_id}, {"_id": 0})
    if not opp: raise HTTPException(status_code=404, detail="Not found")
    opp["insights"] = await db.insights.find({"opportunity_id": opp_id}, {"_id": 0}).to_list(100)
    opp["briefs"] = await db.briefs.find({"opportunity_id": opp_id}, {"_id": 0}).sort("version", -1).to_list(50)
    return opp

@api_router.put("/opportunities/{opp_id}")
async def update_opportunity(opp_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    fields = {k: body[k] for k in ["title", "description", "status", "impact_score"] if k in body}
    fields["updated_at"] = now_iso()
    result = await db.opportunities.update_one({"opportunity_id": opp_id, "workspace_id": ws_id}, {"$set": fields})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="Not found")
    return await db.opportunities.find_one({"opportunity_id": opp_id}, {"_id": 0})

@api_router.post("/opportunities")
async def create_opportunity(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    opp = {"opportunity_id": gen_id("opp"), "user_id": user["user_id"], "workspace_id": ws_id, "title": body.get("title", "Untitled"), "description": body.get("description", ""), "impact_score": float(body.get("impact_score", 5)), "status": "OPEN", "created_at": now_iso(), "updated_at": now_iso()}
    await db.opportunities.insert_one(opp)
    return await db.opportunities.find_one({"opportunity_id": opp["opportunity_id"]}, {"_id": 0})

# ============ BRIEFS ============

@api_router.post("/opportunities/{opp_id}/briefs")
async def create_brief(opp_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    opp = await db.opportunities.find_one({"opportunity_id": opp_id, "workspace_id": ws_id}, {"_id": 0})
    if not opp: raise HTTPException(status_code=404, detail="Not found")
    insights = await db.insights.find({"opportunity_id": opp_id}, {"_id": 0}).to_list(50)
    itext = "\n".join([f"- [{i['type']}] {i['summary']}: \"{i.get('quote', '')}\"" for i in insights])
    system_msg = "Create feature brief as JSON: problem_statement, success_metrics (array), proposed_ui, data_model_changes (array of {entity, changes}), workflow_impact, edge_cases_and_risks (array). Return ONLY valid JSON."
    response = await call_gpt4(system_msg, f"Opportunity: {opp['title']} - {opp['description']}\n\nInsights:\n{itext}")
    try: content = json.loads(clean_json_response(response))
    except: content = {"problem_statement": response, "success_metrics": [], "proposed_ui": "", "data_model_changes": [], "workflow_impact": "", "edge_cases_and_risks": []}
    ver = await db.briefs.count_documents({"opportunity_id": opp_id}) + 1
    brief = {"brief_id": gen_id("brief"), "opportunity_id": opp_id, "user_id": user["user_id"], "workspace_id": ws_id, "version": ver, "content": content, "status": "DRAFT", "spec": None, "created_at": now_iso(), "updated_at": now_iso()}
    await db.briefs.insert_one(brief)
    return await db.briefs.find_one({"brief_id": brief["brief_id"]}, {"_id": 0})

@api_router.get("/briefs/{brief_id}")
async def get_brief(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    brief = await db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Not found")
    return brief

@api_router.put("/briefs/{brief_id}")
async def update_brief(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    fields = {k: body[k] for k in ["content", "status"] if k in body}
    fields["updated_at"] = now_iso()
    result = await db.briefs.update_one({"brief_id": brief_id, "workspace_id": ws_id}, {"$set": fields})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="Not found")
    return await db.briefs.find_one({"brief_id": brief_id}, {"_id": 0})

@api_router.post("/briefs/{brief_id}/generate-spec")
async def generate_spec(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    brief = await db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Not found")
    system_msg = 'Return JSON: {"user_stories":[{"title":"...","acceptance_criteria":["..."]}],"api_contracts":[{"method":"GET","path":"...","description":"..."}],"database_migrations":["..."],"ui_components":[{"name":"...","props":["..."],"description":"..."}],"tasks":[{"title":"...","description":"...","priority":"HIGH/MEDIUM/LOW"}]}. ONLY valid JSON.'
    response = await call_gpt4(system_msg, f"Generate spec:\n\n{json.dumps(brief['content'], indent=2)}")
    try: spec = json.loads(clean_json_response(response))
    except: spec = {"user_stories": [], "api_contracts": [], "database_migrations": [], "ui_components": [], "tasks": []}
    await db.briefs.update_one({"brief_id": brief_id}, {"$set": {"spec": spec, "status": "FINAL", "updated_at": now_iso()}})
    for t in spec.get("tasks", []):
        await db.tasks.insert_one({"task_id": gen_id("task"), "brief_id": brief_id, "user_id": user["user_id"], "workspace_id": ws_id, "title": t.get("title", ""), "description": t.get("description", ""), "priority": t.get("priority", "MEDIUM"), "status": "PENDING", "external_ref": None, "created_at": now_iso(), "updated_at": now_iso()})
    return await db.briefs.find_one({"brief_id": brief_id}, {"_id": 0})

# ============ SHARE SPEC (public read-only) ============

@api_router.post("/briefs/{brief_id}/share")
async def share_brief(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    brief = await db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Not found")
    existing = await db.shared_specs.find_one({"brief_id": brief_id, "is_active": True}, {"_id": 0})
    if existing: return {"share_id": existing["share_id"], "already_shared": True}
    share_id = gen_id("share")
    await db.shared_specs.insert_one({"share_id": share_id, "brief_id": brief_id, "workspace_id": ws_id, "created_by": user["user_id"], "is_active": True, "created_at": now_iso()})
    return {"share_id": share_id, "already_shared": False}

@api_router.delete("/briefs/{brief_id}/share")
async def revoke_share(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    await db.shared_specs.update_many({"brief_id": brief_id, "workspace_id": ws_id}, {"$set": {"is_active": False}})
    return {"status": "revoked"}

@api_router.get("/shared/{share_id}")
async def get_shared_spec(share_id: str):
    """Public endpoint - no auth required"""
    share = await db.shared_specs.find_one({"share_id": share_id, "is_active": True}, {"_id": 0})
    if not share: raise HTTPException(status_code=404, detail="Shared spec not found or expired")
    brief = await db.briefs.find_one({"brief_id": share["brief_id"]}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Brief not found")
    opp = await db.opportunities.find_one({"opportunity_id": brief.get("opportunity_id")}, {"_id": 0})
    ws = await db.workspaces.find_one({"workspace_id": share.get("workspace_id")}, {"_id": 0})
    return {"brief": brief, "opportunity": opp, "workspace_name": ws.get("name") if ws else "Unknown", "shared_at": share.get("created_at")}

# ============ PDF EXPORT ============

def safe_text(text):
    if text is None: return ""
    if isinstance(text, (dict, list)): text = json.dumps(text, indent=2)
    return str(text).encode('latin-1', 'replace').decode('latin-1')

class SpecPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10); self.set_text_color(0, 47, 167); self.cell(0, 8, "Kinesis", ln=True)
        self.set_draw_color(0, 47, 167); self.line(10, self.get_y(), 200, self.get_y()); self.ln(4)
    def footer(self):
        self.set_y(-15); self.set_font("Helvetica", "", 7); self.set_text_color(150, 150, 150); self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")
    def section_title(self, t):
        self.set_font("Helvetica", "B", 13); self.set_text_color(20, 20, 20); self.ln(6); self.cell(0, 8, t, ln=True)
        self.set_draw_color(220, 220, 220); self.line(10, self.get_y(), 200, self.get_y()); self.ln(3)
    def section_body(self, t):
        if isinstance(t, (dict, list)): t = json.dumps(t, indent=2)
        self.set_font("Helvetica", "", 9); self.set_text_color(60, 60, 60); self.multi_cell(0, 5, safe_text(str(t))); self.ln(2)
    def bullet(self, t):
        if isinstance(t, (dict, list)): t = json.dumps(t)
        self.set_font("Helvetica", "", 9); self.set_text_color(60, 60, 60); self.multi_cell(0, 5, safe_text(f"- {t}")); self.ln(1)
    def badge(self, t, color=(0, 47, 167)):
        self.set_font("Helvetica", "B", 7); self.set_fill_color(*color); self.set_text_color(255, 255, 255)
        self.cell(self.get_string_width(t) + 4, 5, t, fill=True); self.set_text_color(60, 60, 60); self.cell(3, 5, "")

@api_router.post("/briefs/{brief_id}/export-pdf")
async def export_pdf(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    brief = await db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Not found")
    opp = await db.opportunities.find_one({"opportunity_id": brief["opportunity_id"]}, {"_id": 0})
    spec, content = brief.get("spec") or {}, brief.get("content") or {}
    pdf = SpecPDF(); pdf.alias_nb_pages(); pdf.add_page(); pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_font("Helvetica", "B", 20); pdf.set_text_color(20, 20, 20)
    pdf.multi_cell(0, 10, safe_text(opp["title"] if opp else "Feature Specification"))
    pdf.set_font("Helvetica", "", 9); pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, f"Brief v{brief.get('version', 1)} | {brief.get('status', 'DRAFT')} | {datetime.now().strftime('%B %d, %Y')}", ln=True); pdf.ln(4)
    pdf.section_title("Problem Statement"); pdf.section_body(content.get("problem_statement", "N/A"))
    pdf.section_title("Success Metrics")
    for m in content.get("success_metrics", []): pdf.bullet(m)
    pdf.section_title("Proposed UI"); pdf.section_body(content.get("proposed_ui", "N/A"))
    pdf.section_title("Workflow Impact"); pdf.section_body(content.get("workflow_impact", "N/A"))
    if content.get("edge_cases_and_risks"):
        pdf.section_title("Edge Cases & Risks")
        for r in content["edge_cases_and_risks"]: pdf.bullet(r)
    if spec.get("user_stories"):
        pdf.section_title("User Stories")
        for s in spec["user_stories"]:
            pdf.set_font("Helvetica", "B", 10); pdf.cell(0, 6, safe_text(s.get("title", "")), ln=True)
            for ac in s.get("acceptance_criteria", []): pdf.bullet(ac)
            pdf.ln(2)
    if spec.get("api_contracts"):
        pdf.section_title("API Contracts")
        for a in spec["api_contracts"]:
            pdf.badge(a.get("method", "GET")); pdf.set_font("Helvetica", "B", 9); pdf.set_text_color(20, 20, 20)
            pdf.cell(0, 5, safe_text(f" {a.get('path', '')}"), ln=True)
            pdf.set_font("Helvetica", "", 8); pdf.set_text_color(100, 100, 100); pdf.multi_cell(0, 4, safe_text(a.get("description", ""))); pdf.ln(2)
    if spec.get("tasks"):
        pdf.section_title("Implementation Tasks")
        for t in spec["tasks"]:
            p = t.get("priority", "MEDIUM"); c = (255, 59, 48) if p == "HIGH" else (255, 204, 0) if p == "MEDIUM" else (142, 142, 147)
            pdf.badge(p, c); pdf.set_font("Helvetica", "B", 9); pdf.set_text_color(20, 20, 20)
            pdf.cell(0, 5, safe_text(f" {t.get('title', '')}"), ln=True)
            pdf.set_font("Helvetica", "", 8); pdf.set_text_color(100, 100, 100); pdf.multi_cell(0, 4, safe_text(t.get("description", ""))); pdf.ln(2)
    return Response(content=bytes(pdf.output()), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=spec-{brief_id}.pdf"})

@api_router.post("/briefs/{brief_id}/export")
async def export_brief_md(brief_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    brief = await db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Not found")
    opp = await db.opportunities.find_one({"opportunity_id": brief["opportunity_id"]}, {"_id": 0})
    spec, content = brief.get("spec") or {}, brief.get("content") or {}
    md = f"# Feature Spec: {opp['title'] if opp else 'Feature'}\n\n## Problem Statement\n{content.get('problem_statement', 'N/A')}\n\n## Success Metrics\n"
    for m in content.get("success_metrics", []): md += f"- {m}\n"
    md += f"\n## Proposed UI\n{content.get('proposed_ui', 'N/A')}\n\n## User Stories\n"
    for s in spec.get("user_stories", []):
        md += f"\n### {s.get('title', '')}\n"
        for ac in s.get("acceptance_criteria", []): md += f"- {ac}\n"
    md += "\n## API Contracts\n"
    for a in spec.get("api_contracts", []): md += f"- **{a.get('method', 'GET')} {a.get('path', '')}**: {a.get('description', '')}\n"
    md += "\n## Tasks\n"
    for t in spec.get("tasks", []): md += f"- [{t.get('priority', 'MEDIUM')}] {t.get('title', '')}: {t.get('description', '')}\n"
    return {"markdown": md}

# ============ GITHUB EXPORT ============

@api_router.get("/github/repos")
async def list_github_repos(request: Request):
    await get_current_user(request)
    if not GITHUB_PAT: raise HTTPException(status_code=400, detail="GitHub PAT not configured")
    resp = requests.get("https://api.github.com/user/repos", headers={"Authorization": f"token {GITHUB_PAT}", "Accept": "application/vnd.github.v3+json"}, params={"per_page": 100, "sort": "updated"}, timeout=15)
    resp.raise_for_status()
    return [{"full_name": r["full_name"], "name": r["name"], "owner": r["owner"]["login"], "private": r["private"], "url": r["html_url"]} for r in resp.json()]

@api_router.post("/github/export")
async def github_export(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    brief_id, repo = body.get("brief_id"), body.get("repo")
    if not brief_id or not repo: raise HTTPException(status_code=400, detail="brief_id and repo required")
    brief = await db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief: raise HTTPException(status_code=404, detail="Not found")
    opp = await db.opportunities.find_one({"opportunity_id": brief["opportunity_id"]}, {"_id": 0})
    spec, content = brief.get("spec") or {}, brief.get("content") or {}
    title = opp["title"] if opp else "Feature"
    main_body = f"## Problem Statement\n{content.get('problem_statement', 'N/A')}\n\n## Success Metrics\n" + "".join(f"- {m}\n" for m in content.get("success_metrics", []))
    headers = {"Authorization": f"token {GITHUB_PAT}", "Accept": "application/vnd.github.v3+json"}
    resp = requests.post(f"https://api.github.com/repos/{repo}/issues", headers=headers, json={"title": f"[Feature] {title}", "body": main_body, "labels": ["feature"]}, timeout=15)
    resp.raise_for_status()
    main_issue = resp.json()
    issues = [{"number": main_issue["number"], "title": main_issue["title"], "url": main_issue["html_url"], "type": "main"}]
    for t in spec.get("tasks", []):
        r = requests.post(f"https://api.github.com/repos/{repo}/issues", headers=headers, json={"title": t.get("title", "Task"), "body": f"**Priority:** {t.get('priority', 'MEDIUM')}\n\n{t.get('description', '')}\n\nParent: #{main_issue['number']}", "labels": ["task"]}, timeout=15)
        if r.status_code == 201:
            i = r.json(); issues.append({"number": i["number"], "title": i["title"], "url": i["html_url"], "type": "task"})
    return {"issues": issues, "repo": repo}

# ============ SLACK ============

@api_router.get("/slack/auth-url")
async def slack_auth_url(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    # Use BACKEND_URL env var for ngrok, fallback to request URL
    backend_url = os.environ.get('BACKEND_URL', str(request.base_url).rstrip("/"))
    redirect_uri = f"{backend_url}/api/slack/callback"
    # Store workspace_id in state for callback
    import base64
    state = base64.urlsafe_b64encode(f"{ws_id}:{user['user_id']}".encode()).decode()
    return {"url": f"https://slack.com/oauth/v2/authorize?client_id={SLACK_CLIENT_ID}&scope=channels:history,channels:read,channels:join,users:read,chat:write&redirect_uri={redirect_uri}&state={state}"}

@api_router.get("/slack/callback")
async def slack_callback(request: Request, code: str = None, error: str = None, state: str = None):
    if error: raise HTTPException(status_code=400, detail=f"Slack auth error: {error}")
    if not code: raise HTTPException(status_code=400, detail="Missing code")
    
    # Decode state to get workspace_id and user_id
    import base64
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode() if state else ""
        ws_id, user_id = decoded.split(":") if ":" in decoded else (None, None)
    except Exception:
        ws_id, user_id = None, None
    
    backend_url = os.environ.get('BACKEND_URL', str(request.base_url).rstrip("/"))
    redirect_uri = f"{backend_url}/api/slack/callback"
    resp = requests.post("https://slack.com/api/oauth.v2.access", data={"client_id": SLACK_CLIENT_ID, "client_secret": SLACK_CLIENT_SECRET, "code": code, "redirect_uri": redirect_uri}, timeout=15)
    data = resp.json()
    
    # Log full response for debugging
    logger.info(f"Slack OAuth full response: {data}")
    
    if not data.get("ok"): 
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/sources?slack_error={data.get('error', 'unknown')}")
    
    # For OAuth v2, bot token is in 'access_token', user token is in 'authed_user.access_token'
    # We need the bot token for bot scopes (channels:read, etc.)
    access_token = data.get('access_token')
    team_name = data.get('team', {}).get('name', '')
    token_type = data.get('token_type', 'unknown')
    scope = data.get('scope', '')
    
    logger.info(f"Token type: {token_type}, Scope: {scope}, Has token: {bool(access_token)}")
    
    if ws_id and user_id and access_token:
        await db.slack_connections.update_one(
            {"workspace_id": ws_id}, 
            {"$set": {
                "workspace_id": ws_id, 
                "user_id": user_id, 
                "token": access_token, 
                "team_name": team_name, 
                "token_type": token_type,
                "scope": scope,
                "connected_at": now_iso()
            }}, 
            upsert=True
        )
        logger.info(f"Slack connection saved for workspace {ws_id}")
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    return RedirectResponse(url=f"{frontend_url}/sources?slack_connected=true&slack_team={team_name}")

@api_router.post("/slack/connect")
async def slack_connect(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    token = body.get("token")
    if not token: raise HTTPException(status_code=400, detail="Token required")
    resp = requests.get("https://slack.com/api/auth.test", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    data = resp.json()
    if not data.get("ok"): raise HTTPException(status_code=400, detail="Invalid token")
    await db.slack_connections.update_one({"workspace_id": ws_id}, {"$set": {"workspace_id": ws_id, "user_id": user["user_id"], "token": token, "team_name": data.get("team"), "connected_at": now_iso()}}, upsert=True)
    return {"status": "connected", "team": data.get("team")}

@api_router.delete("/slack/disconnect")
async def slack_disconnect(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    await db.slack_connections.delete_one({"workspace_id": ws_id})
    return {"status": "disconnected"}

@api_router.get("/slack/status")
async def slack_status(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    conn = await db.slack_connections.find_one({"workspace_id": ws_id}, {"_id": 0})
    if not conn:
        return {"connected": False, "team_name": None}
    # Verify token is still valid
    try:
        resp = requests.get("https://slack.com/api/auth.test", headers={"Authorization": f"Bearer {conn['token']}"}, timeout=5)
        data = resp.json()
        if not data.get("ok"):
            # Token invalid, remove connection
            await db.slack_connections.delete_one({"workspace_id": ws_id})
            return {"connected": False, "team_name": None}
        return {"connected": True, "team_name": conn.get("team_name") or data.get("team")}
    except Exception:
        return {"connected": True, "team_name": conn.get("team_name")}

@api_router.get("/slack/channels")
async def slack_channels(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    logger.info(f"Fetching Slack channels for workspace {ws_id}")
    conn = await db.slack_connections.find_one({"workspace_id": ws_id}, {"_id": 0})
    if not conn: 
        logger.warning(f"No Slack connection found for workspace {ws_id}")
        raise HTTPException(status_code=400, detail="Slack not connected")
    
    token = conn.get('token', '')
    
    # First test what scopes the token actually has
    test_resp = requests.get("https://slack.com/api/auth.test", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    test_data = test_resp.json()
    logger.info(f"Auth test: {test_data}")
    
    # Try with exclude_archived parameter
    resp = requests.get("https://slack.com/api/conversations.list", 
        headers={"Authorization": f"Bearer {token}"}, 
        params={"types": "public_channel", "exclude_archived": "true", "limit": 100}, 
        timeout=15)
    data = resp.json()
    logger.info(f"Slack API response: ok={data.get('ok')}, error={data.get('error')}, needed={data.get('needed')}, provided={data.get('provided')}")
    
    if not data.get("ok"): 
        raise HTTPException(status_code=400, detail=f"Slack error: {data.get('error')} - needed: {data.get('needed')}, provided: {data.get('provided')}")
    return [{"id": c["id"], "name": c["name"], "purpose": c.get("purpose", {}).get("value", ""), "num_members": c.get("num_members", 0)} for c in data.get("channels", [])]

@api_router.get("/slack/channel-messages")
async def slack_channel_messages(request: Request, channel_id: str, limit: int = 20):
    user, ws_id, role = await get_workspace_context(request)
    conn = await db.slack_connections.find_one({"workspace_id": ws_id}, {"_id": 0})
    if not conn: raise HTTPException(status_code=400, detail="Slack not connected")
    
    # Attempt to join the channel first to ensure we can read messages
    join_resp = requests.post("https://slack.com/api/conversations.join", headers={"Authorization": f"Bearer {conn['token']}"}, json={"channel": channel_id}, timeout=15)
    
    resp = requests.get("https://slack.com/api/conversations.history", headers={"Authorization": f"Bearer {conn['token']}"}, params={"channel": channel_id, "limit": min(limit, 50)}, timeout=15)
    data = resp.json()
    if not data.get("ok"): raise HTTPException(status_code=400, detail=f"Slack error: {data.get('error')}")
    messages = [{"text": m.get("text", ""), "user": m.get("user", ""), "ts": m.get("ts", "")} for m in data.get("messages", []) if m.get("type") == "message" and m.get("text")]
    return {"messages": messages, "has_more": data.get("has_more", False)}

@api_router.post("/slack/import-channel")
async def slack_import_channel(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    channel_id, source_id = body.get("channel_id"), body.get("source_id")
    if not channel_id or not source_id: raise HTTPException(status_code=400, detail="channel_id and source_id required")
    conn = await db.slack_connections.find_one({"workspace_id": ws_id}, {"_id": 0})
    if not conn: raise HTTPException(status_code=400, detail="Slack not connected")
    
    # Attempt to join the channel first to ensure we can read messages
    join_resp = requests.post("https://slack.com/api/conversations.join", headers={"Authorization": f"Bearer {conn['token']}"}, json={"channel": channel_id}, timeout=15)
    
    resp = requests.get("https://slack.com/api/conversations.history", headers={"Authorization": f"Bearer {conn['token']}"}, params={"channel": channel_id, "limit": 100}, timeout=15)
    data = resp.json()
    if not data.get("ok"): raise HTTPException(status_code=400, detail=f"Slack error: {data.get('error')}")
    imported = 0
    for msg in data.get("messages", []):
        if msg.get("type") == "message" and msg.get("text"):
            await db.source_items.insert_one({"item_id": gen_id("item"), "source_id": source_id, "user_id": user["user_id"], "workspace_id": ws_id, "external_id": msg.get("ts"), "title": f"Slack ({datetime.fromtimestamp(float(msg['ts'])).strftime('%Y-%m-%d %H:%M')})", "raw_text": msg["text"], "transcript": msg["text"], "metadata": {"channel_id": channel_id, "user": msg.get("user"), "ts": msg.get("ts")}, "processed": False, "embedding": None, "created_at": now_iso()})
            imported += 1
    await db.sources.update_one({"source_id": source_id}, {"$inc": {"item_count": imported}, "$set": {"last_sync": now_iso()}})
    return {"imported": imported}

# ============ CHAT (RAG) ============

@api_router.post("/chat")
async def chat_discovery(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    body = await request.json()
    query = body.get("message", "")
    current_path = body.get("currentPath", "")
    
    path_docs = {
        "/dashboard": {"name": "Overview", "desc": "High-level metrics, active insights, and recent activity."},
        "/sources": {"name": "Feedback & Data", "desc": "Upload and manage raw customer feedback (audio, text, Slack integrations)."},
        "/insights": {"name": "Extracted Insights", "desc": "AI-generated insights (complaints, features) extracted from the raw data sources."},
        "/opportunities": {"name": "Project Ideas", "desc": "Actionable product opportunities/projects clustered from insights."},
        "/briefs": {"name": "Product Briefs", "desc": "PRDs (Product Requirement Documents) detailing the high-level scope of opportunities."},
        "/specs": {"name": "Developer Requirements", "desc": "Deeply technical specs and implementation plans generated from briefs."},
        "/workspace": {"name": "Team & Workspace", "desc": "Manage team members, roles, and view workspace usage."},
        "/settings": {"name": "Settings (MCP Integration)", "desc": "View Cursor IDE setup guide and Generate MCP API keys."}
    }
    
    current_page_name = path_docs.get(current_path, {"name": current_path or "Overview (default)"})["name"]
    site_map_str = "\n".join([f"- {k} ({v['name']}): {v['desc']}" for k, v in path_docs.items()])
    if not query: raise HTTPException(status_code=400, detail="Message required")
    relevant = await vector_search(query, ws_id, top_k=8)
    insights = await db.insights.find({"workspace_id": ws_id}, {"_id": 0}).sort("created_at", -1).to_list(30)
    ctx = []
    for item in relevant:
        text = (item.get("transcript") or item.get("raw_text") or "")[:600]
        if text: ctx.append(f"[Source: {item.get('title', 'Untitled')}]\n{text}")
    for ins in insights[:20]:
        ctx.append(f"[{ins['type']}] {ins['summary']}: \"{ins.get('quote', '')}\"")
    context = "\n---\n".join(ctx)
    system_msg = f"""You are the friendly and knowledgeable Kinesis Discovery Assistant. Your role is twofold: to help users understand their customer data, and to help them use the Kinesis platform itself.

1. ABOUT SPECENGINE AND ITS PAGES (Knowledge Base):
Kinesis helps teams turn user feedback into actionable developer requirements.
Here is the official documentation of the platform's pages:
{site_map_str}

**Cursor Integration Instructions (CRITICAL):**
If the user asks how to integrate Kinesis with Cursor, instruct them explicitly to:
1. Go to the Settings page.
2. Click 'Generate MCP Key'.
3. Open `.cursor/mcp.json` in their local project.
4. Add the exact `sse` JSON snippet shown on the Settings page (it establishes the Model Context Protocol connection).
5. Restart Cursor.
(Never tell them to run a python command).

2. NAVIGATION CAPABILITY:
The user is currently viewing the page: '{current_page_name}' (Path: '{current_path}').
If the user asks to go to a specific section, or if your answer relies on a specific page, you can take them there automatically by appending this format at the very end of your response:
[[NAVIGATE_TO: /path_here]]
For example: 'Taking you to your settings now! [[NAVIGATE_TO: /settings]]'

3. ANSWERING QUESTIONS:
- If they ask a general platform question, use the Knowledge Base above. Stop hallucinating non-existent steps.
- If they ask about their customer data, use the Data below. If no Data, just answer from your Knowledge Base."""
    user_msg = f"Question: {query}\n\nData:\n{context}" if context else f"Question: {query}\n\nNo data ingested yet."
    response = await call_gpt4(system_msg, user_msg)
    await db.chat_messages.insert_one({"message_id": gen_id("msg"), "user_id": user["user_id"], "workspace_id": ws_id, "role": "user", "content": query, "created_at": now_iso()})
    amsg = {"message_id": gen_id("msg"), "user_id": user["user_id"], "workspace_id": ws_id, "role": "assistant", "content": response, "created_at": now_iso()}
    await db.chat_messages.insert_one(amsg)
    return {"response": response, "message_id": amsg["message_id"]}

@api_router.get("/chat/history")
async def chat_history(request: Request, limit: int = 50):
    user, ws_id, role = await get_workspace_context(request)
    msgs = await db.chat_messages.find({"workspace_id": ws_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    msgs.reverse()
    return msgs

# ============ TASKS ============

@api_router.get("/tasks")
async def list_tasks(request: Request, brief_id: str = None):
    user, ws_id, role = await get_workspace_context(request)
    query = {"workspace_id": ws_id}
    if brief_id: query["brief_id"] = brief_id
    return await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    body = await request.json()
    fields = {k: body[k] for k in ["status", "title", "description", "external_ref"] if k in body}
    fields["updated_at"] = now_iso()
    result = await db.tasks.update_one({"task_id": task_id, "workspace_id": ws_id}, {"$set": fields})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="Not found")
    return await db.tasks.find_one({"task_id": task_id}, {"_id": 0})

# ============ DASHBOARD ============

@api_router.get("/dashboard/stats")
async def dashboard_stats(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    counts = {}
    for coll in ["sources", "source_items", "insights", "opportunities", "briefs", "tasks"]:
        counts[coll] = await db[coll].count_documents({"workspace_id": ws_id})
    recent_insights = await db.insights.find({"workspace_id": ws_id}, {"_id": 0}).sort("created_at", -1).to_list(5)
    top_opps = await db.opportunities.find({"workspace_id": ws_id}, {"_id": 0}).sort("impact_score", -1).to_list(5)
    type_counts = {}
    for ins in await db.insights.find({"workspace_id": ws_id}, {"_id": 0, "type": 1}).to_list(1000):
        t = ins.get("type", "OTHER"); type_counts[t] = type_counts.get(t, 0) + 1
    return {"sources": counts["sources"], "source_items": counts["source_items"], "insights": counts["insights"], "opportunities": counts["opportunities"], "briefs": counts["briefs"], "tasks": counts["tasks"], "recent_insights": recent_insights, "top_opportunities": top_opps, "insight_types": type_counts}

# ============ MCP KEY MANAGEMENT ============

@api_router.post("/mcp/generate-key")
async def generate_mcp_key(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    # Deactivate existing keys
    await db.mcp_keys.update_many({"workspace_id": ws_id}, {"$set": {"is_active": False}})
    api_key = f"sk-spec-{secrets.token_hex(24)}"
    await db.mcp_keys.insert_one({"api_key": api_key, "workspace_id": ws_id, "created_by": user["user_id"], "is_active": True, "created_at": now_iso()})
    return {"api_key": api_key, "workspace_id": ws_id}

@api_router.get("/mcp/key")
async def get_mcp_key(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    key = await db.mcp_keys.find_one({"workspace_id": ws_id, "is_active": True}, {"_id": 0})
    if not key: return {"has_key": False}
    return {"has_key": True, "api_key": key["api_key"], "created_at": key.get("created_at")}

@api_router.delete("/mcp/key")
async def revoke_mcp_key(request: Request):
    user, ws_id, role = await get_workspace_context(request)
    require_editor(role)
    await db.mcp_keys.update_many({"workspace_id": ws_id}, {"$set": {"is_active": False}})
    return {"status": "revoked"}

@api_router.get("/mcp/activity")
async def get_mcp_activity(request: Request, limit: int = 20):
    user, ws_id, role = await get_workspace_context(request)
    activities = await db.mcp_activity.find({"workspace_id": ws_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return activities

@api_router.get("/mcp/implementations")
async def get_implementations(request: Request, brief_id: str = None):
    user, ws_id, role = await get_workspace_context(request)
    query = {"workspace_id": ws_id}
    if brief_id: query["brief_id"] = brief_id
    return await db.implementations.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)

# ============ SPECS (dedicated view) ============

@api_router.get("/specs")
async def list_specs(request: Request):
    """List all specs with task progress and validation status."""
    user, ws_id, role = await get_workspace_context(request)

    briefs = await db.briefs.find(
        {"workspace_id": ws_id, "spec": {"$ne": None}},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)

    results = []
    for brief in briefs:
        brief_id = brief["brief_id"]

        opp = await db.opportunities.find_one(
            {"opportunity_id": brief.get("opportunity_id")},
            {"_id": 0, "title": 1}
        )

        task_stats = {
            "total": await db.tasks.count_documents({"brief_id": brief_id}),
            "done": await db.tasks.count_documents({"brief_id": brief_id, "status": "DONE"}),
            "in_progress": await db.tasks.count_documents({"brief_id": brief_id, "status": "IN_PROGRESS"}),
            "blocked": await db.tasks.count_documents({"brief_id": brief_id, "status": "BLOCKED"}),
        }

        latest_impl = await db.implementations.find_one(
            {"brief_id": brief_id, "workspace_id": ws_id},
            {"_id": 0, "validation_status": 1},
            sort=[("created_at", -1)]
        )

        latest_activity = await db.mcp_activity.find_one(
            {"brief_id": brief_id, "workspace_id": ws_id},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )

        results.append({
            "brief_id": brief_id,
            "opportunity_title": opp.get("title") if opp else "Untitled",
            "version": brief.get("version", 1),
            "status": brief.get("status"),
            "task_stats": task_stats,
            "validation_status": latest_impl.get("validation_status") if latest_impl else None,
            "last_activity_at": latest_activity.get("created_at") if latest_activity else None,
            "created_at": brief.get("created_at"),
            "updated_at": brief.get("updated_at")
        })

    return results

@api_router.get("/specs/{brief_id}")
async def get_spec_detail(brief_id: str, request: Request):
    """Get complete spec with tasks, implementations, and activity."""
    user, ws_id, role = await get_workspace_context(request)

    brief = await db.briefs.find_one(
        {"brief_id": brief_id, "workspace_id": ws_id},
        {"_id": 0}
    )
    if not brief or not brief.get("spec"):
        raise HTTPException(status_code=404, detail="Spec not found")

    opp = await db.opportunities.find_one(
        {"opportunity_id": brief.get("opportunity_id")},
        {"_id": 0, "title": 1, "description": 1}
    )

    tasks = await db.tasks.find(
        {"brief_id": brief_id, "workspace_id": ws_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)

    implementations = await db.implementations.find(
        {"brief_id": brief_id, "workspace_id": ws_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    activity = await db.mcp_activity.find(
        {"brief_id": brief_id, "workspace_id": ws_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return {
        "brief": brief,
        "opportunity": opp,
        "tasks": tasks,
        "implementations": implementations,
        "activity": activity
    }

# ============ CURSOR ACTIVITY ============

@api_router.get("/activity")
async def get_activity_feed(
    request: Request,
    brief_id: str = None,
    activity_type: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get activity feed with filtering options."""
    user, ws_id, role = await get_workspace_context(request)

    query = {"workspace_id": ws_id}
    if brief_id:
        query["brief_id"] = brief_id
    if activity_type:
        query["type"] = activity_type

    total = await db.mcp_activity.count_documents(query)
    activities = await db.mcp_activity.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).to_list(limit)

    enriched = []
    for act in activities:
        item = dict(act)

        if act.get("brief_id"):
            brief = await db.briefs.find_one({"brief_id": act["brief_id"]}, {"_id": 0, "opportunity_id": 1})
            if brief:
                opp = await db.opportunities.find_one({"opportunity_id": brief.get("opportunity_id")}, {"_id": 0, "title": 1})
                item["opportunity_title"] = opp.get("title") if opp else "Untitled"

        if act.get("task_id"):
            task = await db.tasks.find_one({"task_id": act["task_id"]}, {"_id": 0, "title": 1})
            item["task_title"] = task.get("title") if task else None

        if act.get("impl_id") and act.get("type") == "implementation_validated":
            impl = await db.implementations.find_one({"impl_id": act["impl_id"]}, {"_id": 0, "validation_result": 1})
            item["validation_summary"] = impl.get("validation_result", {}).get("summary") if impl else None

        enriched.append(item)

    return {"activities": enriched, "total": total, "limit": limit, "offset": offset}

@api_router.get("/activity/stats")
async def get_activity_stats(request: Request, days: int = 7):
    """Get activity statistics for dashboard."""
    user, ws_id, role = await get_workspace_context(request)

    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    pipeline = [
        {"$match": {"workspace_id": ws_id, "created_at": {"$gte": cutoff}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]

    type_counts = {}
    async for doc in db.mcp_activity.aggregate(pipeline):
        type_counts[doc["_id"]] = doc["count"]

    validated = await db.implementations.find(
        {"workspace_id": ws_id, "validation_status": {"$ne": "PENDING"}},
        {"_id": 0, "validation_status": 1}
    ).to_list(100)

    pass_count = sum(1 for v in validated if v.get("validation_status") == "PASS")
    total_validated = len(validated)

    return {
        "task_updates": type_counts.get("task_update", 0),
        "implementations_submitted": type_counts.get("implementation_submitted", 0),
        "implementations_validated": type_counts.get("implementation_validated", 0),
        "validation_pass_rate": round((pass_count / total_validated * 100), 1) if total_validated > 0 else 0,
        "total_validated": total_validated,
        "days": days
    }

# ============ APP SETUP ============
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])

# Mount MCP server at /mcp
from mcp_server import mcp_server as mcp_instance, mcp_api_key_ctx
from starlette.applications import Starlette
from starlette.routing import Mount, Route
from mcp.server.sse import SseServerTransport
from starlette.responses import Response as StarletteResponse
import anyio

sse_transport = SseServerTransport("/api/mcp/messages/")

async def handle_sse(request):
    api_key = request.query_params.get("api_key")
    if api_key:
        mcp_api_key_ctx.set(api_key)
    async with sse_transport.connect_sse(request.scope, request.receive, request._send) as streams:
        await mcp_instance._mcp_server.run(streams[0], streams[1], mcp_instance._mcp_server.create_initialization_options())

async def handle_messages(request):
    await sse_transport.handle_post_message(request.scope, request.receive, request._send)

mcp_app = Starlette(
    routes=[
        Route("/api/mcp/sse", endpoint=handle_sse),
        Route("/api/mcp/messages/", endpoint=handle_messages, methods=["POST"]),
    ]
)
app.mount("/", mcp_app)

@app.on_event("startup")
async def startup():
    try: 
        init_storage()
        logger.info("S3 storage initialized")
    except Exception as e: 
        logger.warning(f"S3 storage init skipped (set AWS credentials to enable): {e}")
    logger.info("MCP server mounted at /api/mcp/sse")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
