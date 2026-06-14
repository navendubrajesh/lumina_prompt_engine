# Contributing

Guidelines for extending Lumina Prompt Engine.

## Development setup

1. Fork and clone the repository
2. Run `./setup.sh` or `.\setup.ps1`
3. Create a branch for your change
4. Run backend and frontend locally (see [Quickstart](quickstart.md))

## Code areas

| Change type | Location |
|-------------|----------|
| New engine | `backend/app/config/engines.xml`, providers |
| Judge criteria | `backend/app/evaluator/judge.py` |
| Pipeline logic | `backend/app/pipeline.py` (keep FastAPI + CrewAI in sync) |
| API routes | `backend/main.py` |
| UI | `frontend/components/`, `frontend/lib/` |
| CrewAI | `crewai/src/lumina_crew/` |
| Docs | `docs/` + `mkdocs.yml` |

## Shared pipeline rule

**Never duplicate** generate/evaluate logic in FastAPI and CrewAI separately. Always call `run_pipeline_async` from `pipeline.py`.

## Documentation

- Update relevant `docs/*.md` when behaviour changes
- Keep `README.md` and `SETUP.md` in sync with quickstart paths
- Run MkDocs build locally:

```bash
pip install -r docs/requirements.txt
mkdocs build --strict
```

## Pull requests

1. Describe the Persona/use case you tested
2. Note which mode (MONEYSAVER vs full) and which keys you used
3. Include screenshots for UI changes
4. Ensure `uvicorn backend.main:app` and `npm run build` in `frontend/` succeed

## Related documents

- [CODE_PLAN_AGENTS_AND_TOOLS.md](https://github.com/navendubrajesh/lumina_prompt_engine/blob/main/CODE_PLAN_AGENTS_AND_TOOLS.md) — original agent/tool design
- [SETUP.md](https://github.com/navendubrajesh/lumina_prompt_engine/blob/main/SETUP.md) — detailed setup troubleshooting

## License

Follow the license in the repository root. Contributions are welcome via pull request.
