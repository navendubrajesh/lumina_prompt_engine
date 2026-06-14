# Deployment

Production setup: **Vercel** (frontend) + **CrewAI AMP** (backend pipeline).

## Overview

```
User browser
    │
    ▼
Vercel (Next.js frontend)
    │  NEXT_PUBLIC_CREWAI_BASE_URL
    ▼
CrewAI AMP kickoff API
    │
    ▼
lumina_crew tool → backend/app/pipeline.py
    │
    ▼
6 engines + DeepEval judge → FinalResponse
```

Local development uses FastAPI on port 8000 instead of CrewAI.

## Step 1 — Deploy CrewAI backend

1. Push `lumina_prompt_engine` to GitHub
2. In CrewAI AMP, create a project linked to the repo
3. **Project root:** repository root (required for `backend` imports)
4. Add secrets to AMP:
   - `GROQ_API_KEY` (minimum for MONEYSAVER)
   - Or full provider keys for non–MONEYSAVER runs
5. Deploy and note:
   - Kickoff URL (e.g. `https://xxx.kickoff.crewai.com`)
   - Bearer token

Test with curl or the CrewAI dashboard before wiring the frontend.

## Step 2 — Deploy frontend to Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com)
2. **Root Directory:** `frontend`
3. Framework preset: **Next.js**
4. Environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CREWAI_BASE_URL` | AMP kickoff base URL |
| `NEXT_PUBLIC_CREWAI_BEARER_TOKEN` | AMP bearer token |

5. Deploy — your dashboard URL is live (e.g. `https://lumina-xxx.vercel.app`)

Do **not** set `NEXT_PUBLIC_API_URL` in production unless you self-host FastAPI.

## Step 3 — Documentation site

Full MkDocs documentation is published to:

**https://navendubrajesh.github.io/lumina_prompt_engine/**

Built from this repo's `docs/` via the portfolio sync workflow.

Product landing (single-page overview + doc embed):

**https://navendubrajesh.github.io/lumina_prompt_engine.enterprise/**

## Self-hosted FastAPI (optional)

Run behind your own reverse proxy:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Set on the frontend:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Ensure `CORS_ORIGINS` includes your frontend origin.

## Environment checklist

| Variable | Where | Required |
|----------|-------|----------|
| `GROQ_API_KEY` | AMP / `.env` | MONEYSAVER |
| Provider keys | AMP / `.env` | Full mode |
| `NEXT_PUBLIC_CREWAI_BASE_URL` | Vercel | Production UI |
| `NEXT_PUBLIC_CREWAI_BEARER_TOKEN` | Vercel | Production UI |
| `CORS_ORIGINS` | FastAPI host | Self-hosted only |

## vercel.json

Root `vercel.json` may redirect or configure monorepo behaviour — prefer setting **Root Directory = frontend** in the Vercel UI for clarity.
