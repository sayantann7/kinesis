# Kinesis - Complete Setup Guide

This guide will walk you through setting up Kinesis locally, including all dependencies, environment configuration, authentication, and external services.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [MongoDB Setup](#3-mongodb-setup)
4. [Backend Setup](#4-backend-setup)
5. [Frontend Setup](#5-frontend-setup)
6. [Environment Variables](#6-environment-variables)
7. [Authentication Setup](#7-authentication-setup)
8. [External Integrations](#8-external-integrations)
9. [Running the Application](#9-running-the-application)
10. [MCP Integration (Cursor)](#10-mcp-integration-cursor)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Yarn** | 1.22+ | `npm install -g yarn` |
| **MongoDB** | 6.0+ | [mongodb.com](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Verify installations:

```bash
python --version    # Should show Python 3.10+
node --version      # Should show v18+
yarn --version      # Should show 1.22+
mongod --version    # Should show 6.0+ (if using local MongoDB)
```

---

## 2. Project Structure

```
spec-engine/
├── backend/                    # FastAPI Python backend
│   ├── server.py               # Main API server
│   ├── mcp_server.py           # MCP server for Cursor integration
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Backend environment variables (create this)
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.js              # Main React app
│   │   ├── contexts/           # Auth context
│   │   ├── pages/              # All pages
│   │   ├── components/         # UI components
│   │   └── layouts/            # Layout components
│   ├── package.json            # Node dependencies
│   └── .env                    # Frontend environment variables (create this)
└── memory/
    └── PRD.md                  # Product requirements document
```

---

## 3. MongoDB Setup

### Option A: Local MongoDB

1. **Install MongoDB Community Edition** from [mongodb.com](https://www.mongodb.com/try/download/community)

2. **Start MongoDB service:**

   ```bash
   # Windows
   net start MongoDB

   # macOS (with Homebrew)
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

3. **Verify MongoDB is running:**

   ```bash
   mongosh
   # You should see the MongoDB shell
   # Type 'exit' to quit
   ```

4. **Connection string** (for local):
   ```
   mongodb://localhost:27017
   ```

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account

2. Create a new cluster (free tier is fine)

3. **Set up database access:**
   - Go to Database Access → Add New Database User
   - Create a username and password
   - Grant "Read and write to any database" permission

4. **Set up network access:**
   - Go to Network Access → Add IP Address
   - Add your current IP or use `0.0.0.0/0` for all IPs (not recommended for production)

5. **Get connection string:**
   - Go to Database → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database user password

   Example:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## 4. Backend Setup

### Step 1: Navigate to backend directory

```bash
cd backend
```

### Step 2: Create a Python virtual environment (recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Python dependencies

```bash
pip install -r requirements.txt
```

This installs packages including:
- **FastAPI** - Web framework
- **Motor** - Async MongoDB driver
- **OpenAI** - AI/LLM integration (direct OpenAI SDK)
- **boto3** - AWS S3 storage
- **mcp** - Model Context Protocol for Cursor
- **slack_sdk** - Slack integration
- **PyGithub** - GitHub integration
- **fpdf2** - PDF generation

### Step 4: Create backend `.env` file

Copy the example file:

```bash
cp .env.example .env
```

Then edit `.env` with your values. See [Section 6](#6-environment-variables) for the full list.

---

## 5. Frontend Setup

### Step 1: Navigate to frontend directory

```bash
cd frontend
```

### Step 2: Install Node dependencies

```bash
yarn install
```

This installs React 19, Tailwind CSS, Radix UI components, and other dependencies.

### Step 3: Create frontend `.env` file

Create a file named `.env` in the `frontend/` directory:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 6. Environment Variables

### Backend `.env` (Required)

Create `backend/.env` with the following:

```env
# ============ REQUIRED ============

# MongoDB connection string
MONGO_URL=mongodb://localhost:27017
# For Atlas: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net

# Database name
DB_NAME=spec_engine

# OpenAI API Key (required for AI features)
# Get this from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key

# Google OAuth credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# AWS S3 Storage (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# ============ OPTIONAL ============

# CORS allowed origins (comma-separated)
# Default: * (all origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# GitHub Personal Access Token (for exporting specs to GitHub issues)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Slack OAuth credentials (for importing Slack channels)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
```

### Frontend `.env` (Required)

Create `frontend/.env` with the following:

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | **Yes** | MongoDB connection string |
| `DB_NAME` | **Yes** | Database name (e.g., `spec_engine`) |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for AI features |
| `GOOGLE_CLIENT_ID` | **Yes** | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | Google OAuth client secret |
| `FRONTEND_URL` | **Yes** | Frontend URL for OAuth redirects |
| `S3_BUCKET` | **Yes** | AWS S3 bucket for file storage |
| `AWS_ACCESS_KEY_ID` | **Yes** | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | **Yes** | AWS secret key |
| `CORS_ORIGINS` | No | Allowed CORS origins (default: `*`) |
| `GITHUB_PAT` | No | GitHub token for issue export |
| `SLACK_CLIENT_ID` | No | Slack app client ID |
| `SLACK_CLIENT_SECRET` | No | Slack app client secret |
| `REACT_APP_BACKEND_URL` | **Yes** | Backend URL for frontend |

---

## 7. Authentication Setup

Kinesis uses **Google OAuth** for authentication.

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project or select an existing one

3. Go to **APIs & Services → OAuth consent screen**
   - Choose "External" user type
   - Fill in app name, user support email
   - Add your domain to authorized domains
   - Add scopes: `email`, `profile`

4. Go to **APIs & Services → Credentials**
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

5. Copy the Client ID and Client Secret to your `.env` file

### How authentication works:

```
┌─────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User    │────>│ Backend          │────>│ Google OAuth    │
│ (Login) │     │ /api/auth/google │     │                 │
└─────────┘     └──────────────────┘     └─────────────────┘
                         │
                         ▼ (redirect with code)
┌─────────┐     ┌──────────────────────────┐
│ Frontend│<────│ /api/auth/google/callback │
│         │     │ (session created)         │
└─────────┘     └──────────────────────────┘
```

- Sessions expire after 7 days
- Users are automatically assigned to a personal workspace on first login

---

## 8. External Integrations

### 8.1 OpenAI (Required)

OpenAI provides AI/LLM capabilities.

**To get your API key:**

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Go to API Keys section
3. Create a new API key
4. Add it to `backend/.env` as `OPENAI_API_KEY`

**Features powered by OpenAI:**
- GPT-4o for insight extraction
- Spec generation from briefs
- Text embeddings for RAG search
- AI validation of implementations
- Audio transcription (Whisper)

---

### 8.2 AWS S3 (Required for file uploads)

S3 provides object storage for uploaded files.

**To set up:**

1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com/)
2. Create an S3 bucket
3. Create an IAM user with S3 access
4. Add credentials to `backend/.env`

---

### 8.3 GitHub Integration (Optional)

Export specs as GitHub issues.

**To set up:**

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token (classic) with `repo` scope
3. Add it to `backend/.env` as `GITHUB_PAT`

**Usage:**
- In the Brief Editor, click "Export to GitHub"
- Enter repository in format `owner/repo`
- Tasks are created as GitHub issues

---

### 8.4 Slack Integration (Optional)

Import messages from Slack channels as feedback sources.

**To set up a Slack app:**

1. Go to [Slack API](https://api.slack.com/apps) and create a new app
2. Enable OAuth & Permissions
3. Add these OAuth scopes:
   - `channels:read`
   - `channels:history`
   - `users:read`
4. Install to your workspace
5. Copy Client ID and Client Secret
6. Add to `backend/.env`:
   ```
   SLACK_CLIENT_ID=your_client_id
   SLACK_CLIENT_SECRET=your_client_secret
   ```

**Usage:**
- In Sources page, click "Connect Slack"
- Authorize the app
- Select channels to import

---

## 9. Running the Application

### Step 1: Start MongoDB (if local)

```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Step 2: Start the Backend

Open a terminal in the project root:

```bash
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     MCP server mounted at /api/mcp/sse
```

### Step 3: Start the Frontend

Open another terminal:

```bash
cd frontend

# Start the dev server
yarn start
```

The app will open at `http://localhost:3000`

### Step 4: Access the Application

1. Open `http://localhost:3000` in your browser
2. Click "Continue with Google"
3. Sign in with your Google account
4. You'll be redirected to the Dashboard

---

## 10. MCP Integration (Cursor)

Kinesis integrates with Cursor via the Model Context Protocol (MCP).

### Step 1: Generate an MCP Key

1. Go to **Settings** page in Kinesis
2. Under "MCP Integration", click **Generate MCP Key**
3. Copy the generated key

### Step 2: Configure Cursor

Add this to your `.cursor/mcp.json` file in your project:

```json
{
  "mcpServers": {
    "kinesis": {
      "type": "sse",
      "url": "http://localhost:8000/api/mcp/sse"
    }
  }
}
```

### Step 3: Use in Cursor

In Cursor, you can now say:

- "Use kinesis to list available specs"
- "Fetch the spec for [feature name] and implement it"
- "Mark task X as done"

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_specs` | List all finalized specs |
| `get_spec` | Get complete spec with tasks |
| `update_task_status` | Mark tasks as DONE/IN_PROGRESS |
| `submit_implementation` | Submit code changes |
| `validate_implementation` | AI validates against criteria |

---

## 11. Troubleshooting

### Backend won't start

**Error: `ModuleNotFoundError`**
```bash
# Make sure you're in the virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Error: `MONGO_URL` not set**
```bash
# Make sure .env file exists in backend/
# and contains MONGO_URL=...
```

---

### Frontend won't start

**Error: `Module not found`**
```bash
cd frontend
rm -rf node_modules
yarn install
```

**Error: `REACT_APP_BACKEND_URL` undefined**
```bash
# Make sure frontend/.env exists with:
# REACT_APP_BACKEND_URL=http://localhost:8000
```

---

### MongoDB connection failed

**Error: `ServerSelectionTimeoutError`**
```bash
# Make sure MongoDB is running
mongosh  # Try to connect manually

# If using Atlas, check:
# 1. IP whitelist includes your IP
# 2. Username/password are correct
# 3. Connection string is properly formatted
```

---

### Authentication issues

**Error: `Failed to validate session`**
- Make sure Google OAuth credentials are set correctly in `backend/.env`
- Check that redirect URIs match in Google Cloud Console

**Stuck on login redirect**
- Make sure backend is running on port 8000
- Check browser console for errors
- Clear cookies and try again

---

### CORS errors

**Error: `Access-Control-Allow-Origin`**
- Add your frontend URL to `CORS_ORIGINS` in `backend/.env`
- Example: `CORS_ORIGINS=http://localhost:3000`

---

### MCP not connecting

**Cursor shows "Connection failed"**
1. Make sure backend is running
2. Check the MCP endpoint: `http://localhost:8000/api/mcp/sse`
3. Verify `.cursor/mcp.json` is correct
4. Restart Cursor

---

## Quick Start Commands

```bash
# Clone and setup (run once)
git clone <your-repo-url> spec-engine
cd spec-engine

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values

# Frontend setup
cd ../frontend
yarn install
# Create .env file with REACT_APP_BACKEND_URL

# Run (in separate terminals)
# Terminal 1 - Backend:
cd backend && source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend:
cd frontend && yarn start
```

---

## Need Help?

- Check the [PRD](/memory/PRD.md) for feature documentation
- Review the backend API at `http://localhost:8000/docs` (FastAPI auto-docs)
- For AI features, ensure `OPENAI_API_KEY` is valid

---

*Kinesis - AI-Native Product Discovery Platform*
