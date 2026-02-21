# Lumina Prompt Engine – CrewAI Crew

This folder contains the CrewAI crew and tools for Lumina Prompt Engine. Deploy to **CrewAI AMP** so the frontend (Vercel) can call it via the AMP REST API.

## Behaviour

- **Inputs (kickoff):** `identity`, `intent`, `output_format`, `money_saver` (bool), `skip_evaluation` (bool).
- **Output:** FinalResponse as JSON string (persona, results, summary, system_prompt, suggested_title).
- **MONEYSAVER:** When `money_saver=True`, only Groq is used (same 6 engine display names). Set `GROQ_API_KEY` in AMP env.

## Local run (from repo root)

```bash
cd lumina_prompt_engine
# Create .env with GROQ_API_KEY (and other keys if not using MONEYSAVER)
uv run python -m lumina_crew.main
```

Or install and run from crewai/:

```bash
cd crewai
uv sync
# Ensure backend is on path: run from repo root or set PYTHONPATH to repo root
PYTHONPATH=.. uv run python -m lumina_crew.main
```

## Deploy to CrewAI AMP

1. Connect this repo to CrewAI AMP (GitHub).
2. Set **project root** to the repo root (`lumina_prompt_engine`) so `backend` is importable.
3. Set **entry / run** to the Lumina crew (e.g. `lumina_crew.main` or as per AMP UI).
4. Configure env in AMP: at least `GROQ_API_KEY` for MONEYSAVER; add other provider keys for full mode.
5. Use the AMP API: `POST /kickoff` with `identity`, `intent`, `output_format`, `money_saver`, `skip_evaluation`; poll `GET /{kickoff_id}/status` until done; parse result as FinalResponse JSON.

## Dependencies

Backend logic lives in `backend/` (same repo). The crew tool imports `backend.app.pipeline.run_pipeline`. All backend deps (litellm, instructor, deepeval, etc.) are listed in `crewai/pyproject.toml`.
