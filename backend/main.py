"""
Lumina Prompt Engine - FastAPI Entry Point.

Block 4: POST /generate-optimized-prompts endpoint.
Flow: Persona -> 5 Engines (parallel) -> Evaluator (parallel) -> JSON response.
"""

from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root and backend/
_project_root = Path(__file__).resolve().parents[1]
_backend_dir = Path(__file__).resolve().parents[0]
load_dotenv(_project_root / ".env")
load_dotenv(_backend_dir / ".env")

import asyncio
import logging
import os
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from backend.app.evaluator import evaluate_prompt
from backend.app.engines import MultiEngineRouter
from backend.app.engines.base import SYSTEM_PROMPT
from backend.app.engines.providers import ENGINES_MONEYSAVER
from backend.app.title_suggestion import suggest_run_title
from backend.app.models import (
    EvaluatedEngineOutput,
    FinalResponse,
    GenerateOptimizedPromptsRequest,
    Persona,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Lumina Prompt Engine",
    description="Generates model-specific prompts from a Persona and evaluates them using a Judge-LLM across 5 criteria.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def custom_openapi() -> dict:
    """Customize OpenAPI schema for Swagger UI clarity."""
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi  # type: ignore[method-assign]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post(
    "/generate-optimized-prompts",
    response_model=FinalResponse,
    summary="Generate and evaluate optimized prompts",
    description=(
        "Accepts a Persona (identity, intent, output_format) and optional money_saver flag. "
        "When money_saver=True, all engines are simulated via Groq (same display names, lower cost). "
        "Otherwise real APIs are called for each engine."
    ),
)
async def generate_optimized_prompts(body: GenerateOptimizedPromptsRequest) -> FinalResponse:
    """
    Generate optimized prompts and evaluate them.
    When money_saver is True, all 6 engines call Groq with simulate keys; display names unchanged.
    Otherwise all registered engines run against their real APIs.
    """
    persona = body.to_persona()
    money_saver = body.money_saver

    @contextmanager
    def _money_saver_env():
        if not money_saver:
            yield
            return
        saved = {}
        for env_key, simulate_key in [
            ("OPENAI_API_KEY", "GROQ_OPENAI_SIMULATE"),
            ("GOOGLE_API_KEY", "GROQ_GEMINI_SIMULATE"),
        ]:
            saved[env_key] = os.environ.get(env_key)
            val = os.environ.get(simulate_key)
            if val:
                os.environ[env_key] = val
        try:
            yield
        finally:
            for k, v in saved.items():
                if v is not None:
                    os.environ[k] = v
                elif k in os.environ:
                    os.environ.pop(k)

    try:
        with _money_saver_env():
            router = MultiEngineRouter(
                engines=ENGINES_MONEYSAVER if money_saver else None
            )
            engine_outputs = await router.generate_all(persona)

            if not engine_outputs:
                raise HTTPException(
                    status_code=503,
                    detail="No engine outputs returned. Check API keys and provider availability.",
                )

            # Evaluate all outputs in parallel (judge may use OPENAI_API_KEY -> GROQ_OPENAI_SIMULATE)
            eval_tasks = [
                evaluate_prompt(output, persona) for output in engine_outputs
            ]
            evaluations = await asyncio.gather(*eval_tasks)

            results = [
                EvaluatedEngineOutput(engine_output=out, evaluation=ev)
                for out, ev in zip(engine_outputs, evaluations)
            ]
            results.sort(key=lambda r: r.overall_score, reverse=True)

            summary_text = (
                f"Generated {len(results)} model-specific prompts. "
                f"Top scorer: {results[0].engine_output.engine_name} "
                f"(overall: {results[0].overall_score:.2f})."
            )
            top_prompt = results[0].engine_output.generated_prompt if results else None
            suggested_title = await suggest_run_title(persona, summary_text, top_prompt)

        return FinalResponse(
            persona=persona,
            results=results,
            summary=summary_text,
            system_prompt=SYSTEM_PROMPT,
            suggested_title=suggested_title,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("generate_optimized_prompts failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during prompt generation: {str(e)}",
        ) from e


@app.get("/health", tags=["Health"])
async def health() -> dict[str, str]:
    """Health check for load balancers and monitoring."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
