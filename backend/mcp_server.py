"""
Kinesis MCP Server — Bidirectional bridge between Kinesis and Cursor/AI agents.

Tools exposed:
  - list_specs: List all finalized specs in a workspace
  - get_spec: Fetch a specific spec with full context
  - update_task_status: Mark tasks as done/in-progress
  - submit_implementation: Send implementation results for validation
  - validate_implementation: AI compares results against acceptance criteria
"""
import os
import json
import uuid
import logging
import contextvars

mcp_api_key_ctx = contextvars.ContextVar("mcp_api_key_ctx", default=None)

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv
from pathlib import Path
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Create MCP server instance
mcp_server = FastMCP("Kinesis")

# DB connection (shared with main app)
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]

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


async def verify_mcp_key(api_key: str = None):
    """Verify an MCP API key and return workspace_id"""
    if not api_key:
        api_key = mcp_api_key_ctx.get(None) or os.environ.get("SPEC_API_KEY")
    if not api_key:
        return None
    record = await _db.mcp_keys.find_one({"api_key": api_key, "is_active": True}, {"_id": 0})
    if not record:
        return None
    return record.get("workspace_id")


# ============ MCP TOOLS ============

@mcp_server.tool()
async def list_specs(api_key: str = None) -> str:
    """List all finalized specs in your Kinesis workspace.
    
    Args:
        api_key: Your Kinesis MCP API key (from Settings > MCP Integration)
    
    Returns:
        JSON array of specs with brief_id, opportunity title, status, version, and task count.
    """
    ws_id = await verify_mcp_key(api_key)
    if not ws_id:
        return json.dumps({"error": "Invalid API key. Get your key from Kinesis Settings > MCP Integration."})
    
    briefs = await _db.briefs.find(
        {"workspace_id": ws_id, "spec": {"$ne": None}},
        {"_id": 0, "brief_id": 1, "opportunity_id": 1, "version": 1, "status": 1, "spec": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(50)
    
    results = []
    for b in briefs:
        opp = await _db.opportunities.find_one({"opportunity_id": b.get("opportunity_id")}, {"_id": 0, "title": 1, "description": 1})
        task_count = len(b.get("spec", {}).get("tasks", []))
        pending_tasks = await _db.tasks.count_documents({"brief_id": b["brief_id"], "status": "PENDING"})
        results.append({
            "brief_id": b["brief_id"],
            "title": opp.get("title", "Untitled") if opp else "Untitled",
            "description": opp.get("description", "") if opp else "",
            "version": b.get("version", 1),
            "status": b.get("status", "DRAFT"),
            "total_tasks": task_count,
            "pending_tasks": pending_tasks,
            "created_at": b.get("created_at")
        })
    
    return json.dumps(results, indent=2)


@mcp_server.tool()
async def get_spec(brief_id: str, api_key: str = None) -> str:
    """Fetch a complete executable spec from Kinesis — includes user stories, API contracts, DB migrations, UI components, and tasks.
    
    Args:
        api_key: Your Kinesis MCP API key
        brief_id: The brief ID to fetch (from list_specs)
    
    Returns:
        Full spec JSON with problem statement, user stories, API contracts, database migrations, UI components, and implementation tasks.
    """
    ws_id = await verify_mcp_key(api_key)
    if not ws_id:
        return json.dumps({"error": "Invalid API key"})
    
    brief = await _db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief:
        return json.dumps({"error": f"Brief {brief_id} not found in your workspace"})
    
    opp = await _db.opportunities.find_one({"opportunity_id": brief.get("opportunity_id")}, {"_id": 0, "title": 1, "description": 1, "impact_score": 1})
    insights = await _db.insights.find({"opportunity_id": brief.get("opportunity_id")}, {"_id": 0, "type": 1, "summary": 1, "quote": 1}).to_list(30)
    tasks = await _db.tasks.find({"brief_id": brief_id}, {"_id": 0}).to_list(50)
    
    result = {
        "brief_id": brief["brief_id"],
        "version": brief.get("version", 1),
        "status": brief.get("status"),
        "opportunity": {
            "title": opp.get("title") if opp else "Untitled",
            "description": opp.get("description") if opp else "",
            "impact_score": opp.get("impact_score") if opp else 0
        },
        "brief_content": brief.get("content", {}),
        "spec": brief.get("spec", {}),
        "tasks": [{
            "task_id": t["task_id"],
            "title": t.get("title", ""),
            "description": t.get("description", ""),
            "priority": t.get("priority", "MEDIUM"),
            "status": t.get("status", "PENDING"),
            "implementation_notes": t.get("implementation_notes")
        } for t in tasks],
        "supporting_insights": [{
            "type": i.get("type"),
            "summary": i.get("summary"),
            "quote": i.get("quote")
        } for i in insights]
    }
    
    return json.dumps(result, indent=2)


@mcp_server.tool()
async def update_task_status(task_id: str, status: str, notes: str = "", api_key: str = None) -> str:
    """Update the status of an implementation task in Kinesis.
    
    Args:
        api_key: Your Kinesis MCP API key
        task_id: The task ID to update
        status: New status — one of: PENDING, IN_PROGRESS, DONE, BLOCKED
        notes: Optional implementation notes or comments
    
    Returns:
        Confirmation of the update.
    """
    ws_id = await verify_mcp_key(api_key)
    if not ws_id:
        return json.dumps({"error": "Invalid API key"})
    
    if status not in ["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"]:
        return json.dumps({"error": f"Invalid status '{status}'. Use: PENDING, IN_PROGRESS, DONE, BLOCKED"})
    
    task = await _db.tasks.find_one({"task_id": task_id, "workspace_id": ws_id}, {"_id": 0})
    if not task:
        return json.dumps({"error": f"Task {task_id} not found"})
    
    update = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if notes:
        update["implementation_notes"] = notes
    
    await _db.tasks.update_one({"task_id": task_id}, {"$set": update})
    
    # Log the activity
    await _db.mcp_activity.insert_one({
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "workspace_id": ws_id,
        "type": "task_update",
        "task_id": task_id,
        "brief_id": task.get("brief_id"),
        "old_status": task.get("status"),
        "new_status": status,
        "notes": notes,
        "source": "mcp_cursor",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return json.dumps({"success": True, "task_id": task_id, "status": status, "message": f"Task updated to {status}"})


@mcp_server.tool()
async def submit_implementation(brief_id: str, implementation: str, api_key: str = None) -> str:
    """Submit implementation results for a spec. Kinesis will store these and can validate them against acceptance criteria.
    
    Args:
        api_key: Your Kinesis MCP API key
        brief_id: The brief ID this implementation is for
        implementation: Description of what was implemented — code changes, files modified, endpoints created, etc.
    
    Returns:
        Confirmation and implementation record ID.
    """
    ws_id = await verify_mcp_key(api_key)
    if not ws_id:
        return json.dumps({"error": "Invalid API key"})
    
    brief = await _db.briefs.find_one({"brief_id": brief_id, "workspace_id": ws_id}, {"_id": 0})
    if not brief:
        return json.dumps({"error": f"Brief {brief_id} not found"})
    
    impl_id = f"impl_{uuid.uuid4().hex[:12]}"
    await _db.implementations.insert_one({
        "impl_id": impl_id,
        "brief_id": brief_id,
        "workspace_id": ws_id,
        "implementation": implementation,
        "validation_status": "PENDING",
        "validation_result": None,
        "source": "mcp_cursor",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Log activity
    await _db.mcp_activity.insert_one({
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "workspace_id": ws_id,
        "type": "implementation_submitted",
        "brief_id": brief_id,
        "impl_id": impl_id,
        "source": "mcp_cursor",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return json.dumps({"success": True, "impl_id": impl_id, "message": "Implementation submitted. Use validate_implementation to check against acceptance criteria."})


@mcp_server.tool()
async def validate_implementation(impl_id: str, api_key: str = None) -> str:
    """Validate an implementation against the original spec's acceptance criteria using AI.
    
    Args:
        api_key: Your Kinesis MCP API key
        impl_id: The implementation ID (from submit_implementation)
    
    Returns:
        Validation results — pass/fail for each acceptance criterion, with specific feedback.
    """
    ws_id = await verify_mcp_key(api_key)
    if not ws_id:
        return json.dumps({"error": "Invalid API key"})
    
    impl = await _db.implementations.find_one({"impl_id": impl_id, "workspace_id": ws_id}, {"_id": 0})
    if not impl:
        return json.dumps({"error": f"Implementation {impl_id} not found"})
    
    brief = await _db.briefs.find_one({"brief_id": impl["brief_id"]}, {"_id": 0})
    if not brief or not brief.get("spec"):
        return json.dumps({"error": "No spec found for this brief"})
    
    spec = brief["spec"]
    content = brief.get("content", {})
    
    # Build validation context
    criteria = []
    for story in spec.get("user_stories", []):
        for ac in story.get("acceptance_criteria", []):
            criteria.append(f"[{story.get('title', '')}] {ac}")
    
    if not criteria:
        return json.dumps({"error": "No acceptance criteria found in spec"})
    
    # Use OpenAI directly for validation
    system_message = """You are a QA engineer validating an implementation against acceptance criteria.
For each criterion, determine if it's likely PASS, FAIL, or UNCLEAR based on the implementation description.
Return a JSON object: {"overall": "PASS/FAIL/PARTIAL", "criteria": [{"criterion": "...", "status": "PASS/FAIL/UNCLEAR", "feedback": "..."}], "summary": "...", "gaps": ["..."]}
Return ONLY valid JSON."""
    
    msg = f"""Validate this implementation against acceptance criteria:

## Acceptance Criteria:
{chr(10).join(f'- {c}' for c in criteria)}

## Problem Statement:
{content.get('problem_statement', 'N/A')}

## Implementation:
{impl['implementation']}"""
    
    response = await openrouter_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": msg}
        ],
        temperature=0.3
    )
    response_text = response.choices[0].message.content
    
    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
        validation = json.loads(cleaned)
    except json.JSONDecodeError:
        validation = {"overall": "UNCLEAR", "summary": response_text, "criteria": [], "gaps": []}
    
    # Store validation result
    await _db.implementations.update_one(
        {"impl_id": impl_id},
        {"$set": {"validation_status": validation.get("overall", "UNCLEAR"), "validation_result": validation, "validated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log activity
    await _db.mcp_activity.insert_one({
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "workspace_id": ws_id,
        "type": "implementation_validated",
        "brief_id": impl["brief_id"],
        "impl_id": impl_id,
        "result": validation.get("overall"),
        "source": "mcp_cursor",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return json.dumps(validation, indent=2)


# ============ MCP RESOURCES ============

@mcp_server.resource("kinesis://workspace/summary")
async def workspace_summary() -> str:
    """Get a summary of the current workspace — counts of sources, insights, opportunities, briefs."""
    # Without auth context in resources, return general info
    return json.dumps({
        "name": "Kinesis Workspace",
        "description": "Use the list_specs tool with your API key to access specs.",
        "available_tools": [
            "list_specs - List all finalized specs",
            "get_spec - Fetch a complete spec",
            "update_task_status - Mark tasks as done",
            "submit_implementation - Send implementation for review",
            "validate_implementation - AI validation against criteria"
        ]
    }, indent=2)


# ============ MCP PROMPTS ============

@mcp_server.prompt()
def implement_spec(spec_json: str) -> str:
    """Generate a prompt for implementing a Kinesis spec."""
    return f"""You are implementing a feature based on the following specification from Kinesis.

## Specification:
{spec_json}

## Instructions:
1. Read through the user stories and acceptance criteria carefully
2. Implement the API contracts as specified
3. Apply the database migrations
4. Build the UI components listed
5. Follow the task breakdown in priority order
6. After completing each task, use the update_task_status tool to mark it as DONE
7. When finished, use submit_implementation to send your results for validation

Start with the highest priority tasks first."""
