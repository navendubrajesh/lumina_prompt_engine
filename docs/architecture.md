# Architecture

System design and data flow.

## High-level diagram

```
Persona (identity, intent, output_format)
        │
        ▼
┌───────────────────┐
│ MultiEngineRouter │── parallel ──► 6 × PromptEngineOutput
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ DeepEval Judge    │── parallel ──► 6 × EvaluationMetrics
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Title suggestion  │──► suggested_title (≤8 words)
└───────────────────┘
        │
        ▼
   FinalResponse → Frontend / PDF / Excel
```

## Repository layout

```
lumina_prompt_engine/
├── backend/
│   ├── main.py                 # FastAPI app
│   └── app/
│       ├── models.py           # Pydantic schemas
│       ├── pipeline.py         # Shared generate→evaluate→title
│       ├── title_suggestion.py
│       ├── engines/            # Router, providers, LiteLLM calls
│       ├── evaluator/          # DeepEval GEval judge
│       └── config/engines.xml
├── frontend/                   # Next.js  app/, components/, lib/
├── crewai/                     # CrewAI crew + Lumina pipeline tool
├── docs/                       # This documentation (MkDocs)
├── setup.ps1 / setup.sh
└── pyproject.toml
```

## Shared pipeline

`backend/app/pipeline.py` is the **single source of truth** for generation logic. Both FastAPI and CrewAI import `run_pipeline_async` so MONEYSAVER behaviour stays identical.

Key steps:

1. `_money_saver_env()` — temporarily sets env vars so all providers use Groq
2. `MultiEngineRouter.generate_all()` — parallel prompt generation
3. `evaluate_prompt()` — parallel GEval scoring (skipped if `skip_evaluation`)
4. `suggest_run_title()` — short title via LiteLLM (`max_tokens=50`)

## Engine router

`MultiEngineRouter` loads engine definitions from `engines.xml`:

- **Normal mode** — real model IDs (OpenAI, Anthropic, Google, etc.)
- **MONEYSAVER** — `ENGINES_MONEYSAVER` list; same display names, all Groq

Generation uses **Instructor + LiteLLM** with a shared system prompt emphasizing clarity, constraints, and token efficiency.

## Frontend architecture

- **Next.js App Router** (`frontend/app/`)
- **API client** (`lib/api-client.ts`) — two-phase FastAPI calls
- **CrewAI client** (`lib/crewai-client.ts`) — kickoff + poll when AMP URL is configured
- **Exports** — `pdf-generator.ts`, `evaluation-matrix.tsx` (xlsx)

## CrewAI integration

The `crewai/` package wraps `run_pipeline` as a CrewAI tool. Deploy to AMP with **project root = repo root** so `backend` imports resolve.

See [CrewAI](crewai.md) and [Deployment](deployment.md).
