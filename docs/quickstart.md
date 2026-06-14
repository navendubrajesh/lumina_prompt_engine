# Quickstart

Get Lumina Prompt Engine running locally in under ten minutes.

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Automated setup

**Windows (PowerShell):**

```powershell
.\setup.ps1
```

**macOS / Linux:**

```bash
chmod +x setup.sh && ./setup.sh
```

The script creates `.venv`, installs backend and frontend dependencies, and copies `.env` from `backend/.env.example`.

## Configure API keys

Edit `.env` in the project root:

```env
# Minimum for MONEYSAVER mode (all engines + judge via Groq)
GROQ_API_KEY=gsk_...

# Full mode — one key per provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...
```

| Mode | Keys required |
|------|----------------|
| **MONEYSAVER** | `GROQ_API_KEY` only |
| **Full** | Keys for each engine you want to run; `OPENAI_API_KEY` minimum for judge |

## Run locally

**Terminal 1 — Backend:**

```bash
.venv\Scripts\activate    # Windows
# source .venv/bin/activate  # macOS/Linux
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend && npm run dev
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

## First run

1. Open http://localhost:3000
2. Fill in **Identity**, **Intent**, and **Output format**
3. Enable **MONEYSAVER mode** if you only have a Groq key
4. Submit — prompts appear first, then evaluation scores
5. Download **PDF** or **Excel** from the results matrix

## CrewAI local test

From repo root with `GROQ_API_KEY` in `.env`:

```bash
cd crewai
PYTHONPATH=.. uv run python -m lumina_crew.main
```

See [CrewAI](crewai.md) for AMP deployment.

## Troubleshooting

See the root [SETUP.md](https://github.com/navendubrajesh/lumina_prompt_engine/blob/main/SETUP.md) for detailed troubleshooting (ports, imports, CORS, API keys).
