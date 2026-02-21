# Local Development Environment Setup Guide

Complete guide to set up and run the Lumina Prompt Engine locally.

## Prerequisites

Before running the setup, ensure you have:

- **Python 3.10+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (optional, for cloning the repository)

Verify installations:
```bash
python --version   # or python3 --version
node --version
npm --version
```

## Quick Setup (Automated)

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### macOS / Linux
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. ✅ Check prerequisites (Python, Node.js, npm)
2. ✅ Create Python virtual environment (`.venv`)
3. ✅ Upgrade pip
4. ✅ Install backend dependencies (`requirements.txt` + dev dependencies)
5. ✅ Create `.env` file from template (if missing)
6. ✅ Install frontend dependencies (`npm install`)

## Manual Setup

If you prefer manual setup or the script fails:

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r backend/requirements.txt
pip install -e ".[dev]"  # Install project in editable mode with dev dependencies
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 3. Environment Configuration

Create `.env` file in the project root (copy from `backend/.env.example`):

```bash
# Windows
copy backend\.env.example .env

# macOS/Linux
cp backend/.env.example .env
```

Edit `.env` and add your API keys:

```env
# Required for normal mode
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...
TOGETHER_API_KEY=...

# Required for MONEYSAVER mode (all engines use Groq)
GROQ_API_KEY=...
GROQ_OPENAI_SIMULATE=...  # Optional: for OpenAI slot simulation
GROQ_GEMINI_SIMULATE=...  # Optional: for Gemini slot simulation
```

**Note:** At minimum, you need `OPENAI_API_KEY` for the evaluator (judge) to work. For MONEYSAVER mode, only `GROQ_API_KEY` is required.

## Running the Application

### Terminal 1: Backend (FastAPI)

```bash
# Activate virtual environment
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux

# Run backend server
uvicorn backend.main:app --reload --port 8000
```

Backend will be available at:
- **API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Terminal 2: Frontend (Next.js)

```bash
cd frontend
npm run dev
```

Frontend will be available at:
- **Web App**: http://localhost:3000

## Project Structure

```
lumina_prompt_engine/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── engines/            # LLM engine implementations
│   │   ├── evaluator/          # DeepEval judge logic
│   │   └── models.py           # Pydantic data models
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment variables template
├── frontend/                   # Next.js frontend
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── lib/                    # Utilities & API client
│   ├── package.json            # Node.js dependencies
│   └── .env.example            # Frontend env template
├── setup.ps1                   # Windows setup script
├── setup.sh                    # macOS/Linux setup script
├── pyproject.toml              # Python project config
├── .env                        # Your API keys (git-ignored)
└── README.md                   # Project overview
```

## Troubleshooting

### Python Issues

**Problem:** `python` command not found
- **Solution:** Use `python3` instead, or add Python to PATH

**Problem:** `pip` command not found
- **Solution:** Install pip: `python -m ensurepip --upgrade`

**Problem:** Virtual environment activation fails
- **Solution:** Ensure you're in the project root directory

### Node.js Issues

**Problem:** `npm install` fails
- **Solution:** Clear npm cache: `npm cache clean --force`
- **Solution:** Delete `node_modules` and `package-lock.json`, then reinstall

**Problem:** Port 3000 already in use
- **Solution:** Kill the process using port 3000, or change port in `frontend/package.json`

### Backend Issues

**Problem:** `uvicorn` command not found
- **Solution:** Ensure virtual environment is activated and dependencies are installed

**Problem:** Import errors (e.g., `backend.app.models`)
- **Solution:** Ensure you installed the project in editable mode: `pip install -e ".[dev]"`

**Problem:** API keys not working
- **Solution:** Verify `.env` file is in project root (not `backend/`)
- **Solution:** Check API keys are valid and have proper permissions
- **Solution:** Restart backend server after changing `.env`

### Frontend Issues

**Problem:** Frontend can't connect to backend
- **Solution:** Ensure backend is running on port 8000
- **Solution:** Check `NEXT_PUBLIC_API_URL` in `frontend/.env` (defaults to `http://localhost:8000`)

**Problem:** CORS errors
- **Solution:** Backend CORS is configured for `http://localhost:3000`. Ensure frontend runs on that port.

## Development Tips

### Hot Reload
Both backend and frontend support hot reload:
- **Backend**: Changes to Python files auto-reload (via `--reload` flag)
- **Frontend**: Changes to React/TypeScript files auto-reload

### API Testing
Use the Swagger UI at http://localhost:8000/docs to test API endpoints directly.

### Environment Variables
- Backend loads `.env` from project root and `backend/` directory
- Frontend uses `NEXT_PUBLIC_*` prefixed variables (see `frontend/.env.example`)

### MONEYSAVER Mode
Enable MONEYSAVER mode in the UI to use Groq for all engines (free tier). Requires only `GROQ_API_KEY` in `.env`.

### Deploying (Vercel + CrewAI)
- **Frontend:** Deploy to Vercel from Git. Set Root Directory to `frontend` (or use repo `vercel.json`). In Vercel env, set `NEXT_PUBLIC_CREWAI_BASE_URL` and `NEXT_PUBLIC_CREWAI_BEARER_TOKEN` to point to your CrewAI AMP crew.
- **Agents:** Deploy the `crewai/` project to CrewAI AMP with project root = repo root so `backend` is importable. See `crewai/README.md`.

## Next Steps

1. ✅ Environment is set up
2. ✅ Dependencies are installed
3. ✅ `.env` is configured with API keys
4. ✅ Backend is running on port 8000
5. ✅ Frontend is running on port 3000

**You're ready to use Lumina Prompt Engine!**

Open http://localhost:3000 and start generating optimized prompts.
