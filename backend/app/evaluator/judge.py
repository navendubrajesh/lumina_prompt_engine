"""
Block 3: The Evaluator (Judge) Logic using DeepEval.

Uses DeepEval GEval to programmatically define the 5 evaluation criteria
and compute mathematical scores (0.0–1.0) with reasoning for each.

When USE_GROQ_FOR_JUDGE=1 (e.g. in MONEYSAVER mode), the judge uses Groq
(groq/llama-3.3-70b-versatile) via LiteLLM with GROQ_API_KEY only.
"""

import asyncio
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from backend.app.models import EvaluationMetrics, Persona, PromptEngineOutput

logger = logging.getLogger(__name__)

# Thread pool for running sync DeepEval measure() in parallel
_executor = ThreadPoolExecutor(max_workers=5)

# Groq model for judge when USE_GROQ_FOR_JUDGE=1 (MONEYSAVER: only GROQ_API_KEY needed)
_GROQ_JUDGE_MODEL = "groq/llama-3.3-70b-versatile"


def _judge_model():
    """Return Groq LiteLLM model for judge when USE_GROQ_FOR_JUDGE is set, else None (default OpenAI)."""
    if not os.environ.get("USE_GROQ_FOR_JUDGE"):
        return None
    try:
        from deepeval.models import LiteLLMModel
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.warning("USE_GROQ_FOR_JUDGE set but GROQ_API_KEY missing; judge may fall back to default.")
        return LiteLLMModel(
            model=_GROQ_JUDGE_MODEL,
            api_key=api_key or "",
            temperature=0,
        )
    except Exception as e:
        logger.warning("Could not create Groq judge model: %s; using default.", e)
        return None


def _persona_context(persona: Persona) -> str:
    """Serialize persona for evaluation context."""
    return json.dumps(
        {
            "identity": persona.identity,
            "intent": persona.intent,
            "output_format": persona.output_format,
        },
        indent=2,
    )


def _build_metrics(judge_model=None):
    """Build the 5 GEval metrics. If judge_model is set (Groq LiteLLM), use it; else default (OpenAI)."""
    kwargs = {} if judge_model is None else {"model": judge_model}
    return [
        (
            GEval(
                name="ContextualAlignment",
                criteria="How well the generated prompt aligns with the persona's identity and context. Score high if the prompt reflects the user's role and domain.",
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                **kwargs,
            ),
            "contextual_alignment",
            "contextual_alignment_reasoning",
        ),
        (
            GEval(
                name="InstructionClarity",
                criteria="Clarity and specificity of instructions in the prompt. Score high for clear, unambiguous, actionable instructions.",
                evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
                **kwargs,
            ),
            "instruction_clarity",
            "instruction_clarity_reasoning",
        ),
        (
            GEval(
                name="ConstraintAdherence",
                criteria="How well the prompt adheres to the specified output format and constraints from the persona. Score high when output_format requirements are explicitly addressed.",
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                **kwargs,
            ),
            "constraint_adherence",
            "constraint_adherence_reasoning",
        ),
        (
            GEval(
                name="Robustness",
                criteria="Prompt's resilience to edge cases and ambiguous inputs. Score high for prompts that handle variability and unclear scenarios well.",
                evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
                **kwargs,
            ),
            "robustness",
            "robustness_reasoning",
        ),
        (
            GEval(
                name="Efficiency",
                criteria="Token efficiency and concision without sacrificing quality. Score high for prompts that are brief yet complete.",
                evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
                **kwargs,
            ),
            "efficiency",
            "efficiency_reasoning",
        ),
    ]


def _measure_sync(metric: GEval, test_case: LLMTestCase) -> tuple[float, str]:
    """Run DeepEval measure in thread pool (sync API)."""
    metric.measure(test_case)
    score = float(getattr(metric, "score", 0.0) or 0.0)
    reason = str(getattr(metric, "reason", "") or "No reasoning provided.")
    # DeepEval normalizes to 0-1; ensure bounds
    score = max(0.0, min(1.0, score))
    return score, reason


def _evaluate_sync(
    prompt_text: str,
    persona: Persona,
) -> EvaluationMetrics:
    """Run all 5 GEval metrics synchronously and aggregate."""
    context = _persona_context(persona)
    test_case = LLMTestCase(input=context, actual_output=prompt_text)

    # Use Groq for judge when USE_GROQ_FOR_JUDGE=1 (MONEYSAVER mode)
    metrics_list = _build_metrics(_judge_model())

    scores: dict[str, float] = {}
    reasons: dict[str, str] = {}

    for metric, score_key, reason_key in metrics_list:
        try:
            s, r = _measure_sync(metric, test_case)
            scores[score_key] = s
            reasons[reason_key] = r
        except Exception as e:
            logger.warning("Metric %s failed: %s", metric.name, e)
            scores[score_key] = 0.0
            reasons[reason_key] = str(e)

    return EvaluationMetrics(
        contextual_alignment=scores.get("contextual_alignment", 0.0),
        contextual_alignment_reasoning=reasons.get(
            "contextual_alignment_reasoning", "Evaluation failed."
        ),
        instruction_clarity=scores.get("instruction_clarity", 0.0),
        instruction_clarity_reasoning=reasons.get(
            "instruction_clarity_reasoning", "Evaluation failed."
        ),
        constraint_adherence=scores.get("constraint_adherence", 0.0),
        constraint_adherence_reasoning=reasons.get(
            "constraint_adherence_reasoning", "Evaluation failed."
        ),
        robustness=scores.get("robustness", 0.0),
        robustness_reasoning=reasons.get("robustness_reasoning", "Evaluation failed."),
        efficiency=scores.get("efficiency", 0.0),
        efficiency_reasoning=reasons.get(
            "efficiency_reasoning", "Evaluation failed."
        ),
    )


async def evaluate_prompt(
    engine_output: PromptEngineOutput,
    persona: Persona,
) -> EvaluationMetrics:
    """
    Evaluate a generated prompt using DeepEval GEval across 5 criteria.

    Returns scores (0.0–1.0) and reasoning for each criterion.
    """
    prompt_text = engine_output.generated_prompt or ""
    if not prompt_text.strip():
        return EvaluationMetrics(
            contextual_alignment=0.0,
            contextual_alignment_reasoning="No prompt generated; engine likely failed.",
            instruction_clarity=0.0,
            instruction_clarity_reasoning="No prompt to evaluate.",
            constraint_adherence=0.0,
            constraint_adherence_reasoning="No prompt to evaluate.",
            robustness=0.0,
            robustness_reasoning="No prompt to evaluate.",
            efficiency=0.0,
            efficiency_reasoning="No prompt to evaluate.",
        )

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        _evaluate_sync,
        prompt_text,
        persona,
    )
