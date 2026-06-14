# Lumina Prompt Engine

**Multi-model prompt orchestration and evaluation** — generate model-specific prompts from a Persona, rank them across six LLM engines, and score each with a Judge-LLM using five criteria.

## What it does

1. You define a **Persona** (identity, intent, output format).
2. Six engines generate **optimized prompts** in parallel (OpenAI, Anthropic, Google, Mistral, Llama, Groq).
3. A **DeepEval judge** scores each prompt on five criteria and ranks results.
4. Export **PDF or Excel** reports from the dashboard.

## Quick try

```bash
git clone https://github.com/navendubrajesh/lumina_prompt_engine.git
cd lumina_prompt_engine
./setup.sh          # or .\setup.ps1 on Windows
# Add GROQ_API_KEY to .env for MONEYSAVER mode
uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

Open http://localhost:3000 — enable **MONEYSAVER mode** to run all engines via Groq (free tier).

## Stack

| Layer | Location | Role |
|-------|----------|------|
| Backend | `backend/` | FastAPI, multi-engine router, DeepEval judge, pipeline |
| Frontend | `frontend/` | Next.js dashboard (Persona Studio, matrix, exports) |
| CrewAI | `crewai/` | Optional AMP deployment; same pipeline logic |
| Config | `backend/app/config/engines.xml` | Engine definitions (real + MONEYSAVER) |

## Documentation map

- [Quickstart](quickstart.md) — install, configure keys, run locally
- [Concepts](concepts.md) — Persona, two-phase flow, MONEYSAVER
- [Architecture](architecture.md) — pipeline, components, data flow
- [Engines](engines.md) — six LLM backends and XML config
- [Evaluation](evaluation.md) — five GEval criteria and scoring
- [API Reference](api.md) — FastAPI endpoints and schemas
- [Frontend](frontend.md) — Next.js UI and CrewAI client
- [CrewAI](crewai.md) — AMP deployment and kickoff API
- [Deployment](deployment.md) — Vercel + CrewAI production setup

## Links

- [GitHub repository](https://github.com/navendubrajesh/lumina_prompt_engine)
- [Product landing](https://navendubrajesh.github.io/lumina_prompt_engine.enterprise/)
