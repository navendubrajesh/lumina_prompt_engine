"""
Shared pipeline logic for Lumina Prompt Engine.

Runs generate -> evaluate -> suggest_title. Used by FastAPI and CrewAI so
MONEYSAVER and behaviour stay identical.
"""

import asyncio
import logging
import os
from contextlib import contextmanager
from typing import Optional

from backend.app.engines import MultiEngineRouter
from backend.app.engines.base import SYSTEM_PROMPT
from backend.app.engines.providers import ENGINES_MONEYSAVER
from backend.app.evaluator import evaluate_prompt
from backend.app.models import (
    EvaluatedEngineOutput,
    FinalResponse,
    Persona,
    placeholder_evaluation,
)
from backend.app.title_suggestion import suggest_run_title

logger = logging.getLogger(__name__)


@contextmanager
def _money_saver_env(money_saver: bool):
    """MONEYSAVER: when True, all engines + judge use Groq only (GROQ_API_KEY)."""
    if not money_saver:
        yield
        return
    saved = {}
    groq_key = os.environ.get("GROQ_API_KEY")
    for env_key in ["OPENAI_API_KEY", "GOOGLE_API_KEY", "USE_GROQ_FOR_JUDGE"]:
        saved[env_key] = os.environ.get(env_key)
    if groq_key:
        os.environ["OPENAI_API_KEY"] = groq_key
        os.environ["GOOGLE_API_KEY"] = groq_key
    os.environ["USE_GROQ_FOR_JUDGE"] = "1"
    try:
        yield
    finally:
        for k, v in saved.items():
            if v is not None:
                os.environ[k] = v
            elif k in os.environ:
                os.environ.pop(k)


async def run_pipeline_async(
    persona: Persona,
    money_saver: bool,
    skip_evaluation: bool = False,
) -> FinalResponse:
    """
    Generate prompts, optionally evaluate them, suggest title. Same behaviour as
    FastAPI /generate-optimized-prompts. Call from sync code via asyncio.run(run_pipeline_async(...)).
    """
    with _money_saver_env(money_saver):
        router = MultiEngineRouter(
            engines=ENGINES_MONEYSAVER if money_saver else None
        )
        engine_outputs = await router.generate_all(persona)

    if not engine_outputs:
        raise RuntimeError(
            "No engine outputs returned. Check API keys and provider availability."
        )

    if skip_evaluation:
        results = [
            EvaluatedEngineOutput(engine_output=out, evaluation=placeholder_evaluation())
            for out in engine_outputs
        ]
        summary_text = (
            f"Generated {len(results)} model-specific prompts. "
            "Evaluating prompts…"
        )
    else:
        with _money_saver_env(money_saver):
            eval_tasks = [evaluate_prompt(output, persona) for output in engine_outputs]
            evaluations = await asyncio.gather(*eval_tasks)
        results = [
            EvaluatedEngineOutput(engine_output=out, evaluation=ev)
            for out, ev in zip(engine_outputs, evaluations)
        ]
        summary_text = (
            f"Generated {len(results)} model-specific prompts. "
            f"Top scorer: {results[0].engine_output.engine_name} "
            f"(overall: {results[0].overall_score:.2f})."
        )

    top_prompt = results[0].engine_output.generated_prompt if results else None
    suggested_title: Optional[str] = await suggest_run_title(
        persona, summary_text, top_prompt
    )

    return FinalResponse(
        persona=persona,
        results=results,
        summary=summary_text,
        system_prompt=SYSTEM_PROMPT,
        suggested_title=suggested_title,
    )


def run_pipeline(
    identity: str,
    intent: str,
    output_format: str,
    money_saver: bool = False,
    skip_evaluation: bool = False,
) -> FinalResponse:
    """
    Synchronous entry point for CrewAI tool. Runs the full pipeline and returns
    FinalResponse (same as /generate-optimized-prompts).
    """
    persona = Persona(
        identity=identity,
        intent=intent,
        output_format=output_format,
    )
    return asyncio.run(
        run_pipeline_async(persona, money_saver, skip_evaluation)
    )
