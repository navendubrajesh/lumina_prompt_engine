# Lumina Prompt Engine

Multi-model prompt orchestration and evaluation dashboard. Generates model-specific prompts from a Persona and ranks them across 6 LLM engines using DeepEval.

**Documentation:** [https://navendubrajesh.github.io/lumina_prompt_engine/](https://navendubrajesh.github.io/lumina_prompt_engine/) · [Product landing](https://navendubrajesh.github.io/lumina_prompt_engine.enterprise/)

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### 1. Automated Setup

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Check prerequisites
- Create Python virtual environment
- Install backend and frontend dependencies
- Create `.env` file from template

### 2. Configure API Keys

Edit `.env` in the project root and add your API keys:

```env
# Required for normal mode
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...

# Required for MONEYSAVER mode (all engines use Groq)
GROQ_API_KEY=...
```

**Minimum:** At least `OPENAI_API_KEY` is needed for the evaluator. For MONEYSAVER mode, only `GROQ_API_KEY` is required.

### 3. Run

**Terminal 1 – Backend:**
```bash
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 – Frontend:**
```bash
cd frontend && npm run dev
```

- **Frontend**: http://localhost:3000  
- **API docs**: http://localhost:8000/docs

## Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup guide with troubleshooting
- **[backend/.env.example](backend/.env.example)** - Environment variables reference  

## Deployment (Vercel + CrewAI)

- **Frontend:** Deploy on [Vercel](https://vercel.com) from Git. Connect the repo and set **Root Directory** to `frontend` (or use the included `vercel.json`). Add env vars in Vercel:
  - `NEXT_PUBLIC_CREWAI_BASE_URL` – CrewAI AMP base URL (e.g. `https://your-crew-name.crewai.com`)
  - `NEXT_PUBLIC_CREWAI_BEARER_TOKEN` – CrewAI AMP Bearer token (from crew Status tab)
- **Agents:** Deploy the crew to [CrewAI AMP](https://app.crewai.com). Use the `crewai/` project; set project root to this repo root so `backend` is importable. Configure `GROQ_API_KEY` (and other keys for non-MONEYSAVER) in AMP.
- When `NEXT_PUBLIC_CREWAI_BASE_URL` is set, the frontend uses CrewAI (one kickoff, full result). Otherwise it uses the local FastAPI backend (two-phase: generate then evaluate).

## Project Structure

```
lumina_prompt_engine/
├── backend/          # FastAPI, engines, evaluator, pipeline
├── crewai/           # CrewAI crew and Lumina pipeline tool
├── frontend/         # Next.js dashboard (Vercel)
├── vercel.json       # Vercel root directory = frontend
├── setup.ps1         # Windows setup script
├── setup.sh          # macOS/Linux setup script
├── SETUP.md          # Detailed setup guide
└── .env              # API keys (git-ignored)
```

## Features

- **6 LLM Engines**: OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, Mistral AI, Llama 3.1 70B, Groq Llama 3.3 70B
- **MONEYSAVER Mode**: Use Groq (free tier) to simulate all engines
- **5-Criteria Evaluation**: Context, Clarity, Adherence, Robustness, Efficiency
- **Ranked Results**: Automatically sorted by overall score
- **PDF & Excel Export**: Download evaluation results with prompts and reasoning (client-side)
- **Modern UI**: Dark-themed dashboard with real-time progress
- **CrewAI**: Optional agents/tools deployment; frontend can call CrewAI AMP when configured
