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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from backend.app.evaluator import evaluate_prompt
from backend.app.engines import MultiEngineRouter
from backend.app.engines.providers import ENGINES_MONEYSAVER
from backend.app.models import (
    EvaluatedEngineOutput,
    EvaluatePromptsRequest,
    EvaluatePromptsResponse,
    FinalResponse,
    GenerateOptimizedPromptsRequest,
    Persona,
)
from backend.app.pipeline import _money_saver_env, run_pipeline_async

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
    try:
        return await run_pipeline_async(
            body.to_persona(),
            money_saver=body.money_saver,
            skip_evaluation=body.skip_evaluation,
        )
    except HTTPException:
        raise
    except RuntimeError as e:
        if "No engine outputs" in str(e):
            raise HTTPException(status_code=503, detail=str(e)) from e
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("generate_optimized_prompts failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during prompt generation: {str(e)}",
        ) from e


@app.post(
    "/evaluate-prompts",
    response_model=EvaluatePromptsResponse,
    summary="Evaluate prompts (second phase)",
    description="Accepts engine_outputs + persona from first-phase response; returns evaluations in same order (XML order).",
)
async def evaluate_prompts_endpoint(body: EvaluatePromptsRequest) -> EvaluatePromptsResponse:
    """Run judge on already-generated prompts; order of results matches request (XML order)."""
    with _money_saver_env(body.money_saver):
        eval_tasks = [evaluate_prompt(out, body.persona) for out in body.engine_outputs]
        evaluations = await asyncio.gather(*eval_tasks)
    results = [
        EvaluatedEngineOutput(engine_output=out, evaluation=ev)
        for out, ev in zip(body.engine_outputs, evaluations)
    ]
    return EvaluatePromptsResponse(results=results)


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
