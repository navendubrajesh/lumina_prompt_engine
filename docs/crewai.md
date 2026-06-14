# CrewAI

Optional deployment path using [CrewAI AMP](https://docs.crewai.com/) (Agent Management Platform).

## Package layout

```
crewai/
├── pyproject.toml
├── README.md
└── src/lumina_crew/
    ├── main.py          # CLI entry: python -m lumina_crew.main
    ├── crew.py          # Crew definition
    └── tools/
        └── lumina_pipeline.py   # Wraps run_pipeline_async
```

## How it works

The CrewAI tool calls the **same** `run_pipeline_async` from `backend/app/pipeline.py`:

- Identical MONEYSAVER behaviour
- Same six engines and DeepEval judge
- Returns `FinalResponse` JSON to the crew

## Local test

From repo root:

```bash
cd crewai
PYTHONPATH=.. uv run python -m lumina_crew.main
```

Requires `GROQ_API_KEY` (or full provider keys) in root `.env`.

## AMP deployment

1. Create a CrewAI AMP project
2. Set **project root** to the **repository root** (not `crewai/` alone) so `backend` imports work
3. Point entry to the lumina crew module
4. Add secrets: `GROQ_API_KEY`, and other keys if not using MONEYSAVER
5. Deploy and copy the **kickoff URL** + bearer token

## Frontend integration

Configure Vercel (or local `.env.local`):

```env
NEXT_PUBLIC_CREWAI_BASE_URL=https://your-deployment.kickoff.crewai.com
NEXT_PUBLIC_CREWAI_BEARER_TOKEN=...
```

The dashboard then uses kickoff + polling instead of FastAPI.

## Kickoff payload

Typical kickoff body (exact shape depends on crew inputs):

```json
{
  "inputs": {
    "identity": "...",
    "intent": "...",
    "output_format": "...",
    "money_saver": true
  }
}
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ModuleNotFoundError: backend` | Set AMP project root to repo root; `PYTHONPATH` includes parent |
| Empty crew output | Check AMP logs; verify API keys in AMP secrets |
| Timeout on frontend | Increase poll interval/timeout in `crewai-client.ts` |

See `crewai/README.md` in the repo for AMP-specific notes.
