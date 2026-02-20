"""
Block 3: The Evaluator (Judge) Logic using DeepEval.

Uses DeepEval GEval to programmatically define the 5 evaluation criteria
and compute mathematical scores (0.0–1.0) with reasoning for each.
"""

import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from backend.app.models import EvaluationMetrics, Persona, PromptEngineOutput

logger = logging.getLogger(__name__)

# Thread pool for running sync DeepEval measure() in parallel
_executor = ThreadPoolExecutor(max_workers=5)


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


# 5 GEval metrics matching our criteria
CONTEXTUAL_ALIGNMENT = GEval(
    name="ContextualAlignment",
    criteria="How well the generated prompt aligns with the persona's identity and context. Score high if the prompt reflects the user's role and domain.",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
)

INSTRUCTION_CLARITY = GEval(
    name="InstructionClarity",
    criteria="Clarity and specificity of instructions in the prompt. Score high for clear, unambiguous, actionable instructions.",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
)

CONSTRAINT_ADHERENCE = GEval(
    name="ConstraintAdherence",
    criteria="How well the prompt adheres to the specified output format and constraints from the persona. Score high when output_format requirements are explicitly addressed.",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
)

ROBUSTNESS = GEval(
    name="Robustness",
    criteria="Prompt's resilience to edge cases and ambiguous inputs. Score high for prompts that handle variability and unclear scenarios well.",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
)

EFFICIENCY = GEval(
    name="Efficiency",
    criteria="Token efficiency and concision without sacrificing quality. Score high for prompts that are brief yet complete.",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
)

ALL_METRICS: list[tuple[GEval, str, str]] = [
    (CONTEXTUAL_ALIGNMENT, "contextual_alignment", "contextual_alignment_reasoning"),
    (INSTRUCTION_CLARITY, "instruction_clarity", "instruction_clarity_reasoning"),
    (CONSTRAINT_ADHERENCE, "constraint_adherence", "constraint_adherence_reasoning"),
    (ROBUSTNESS, "robustness", "robustness_reasoning"),
    (EFFICIENCY, "efficiency", "efficiency_reasoning"),
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

    scores: dict[str, float] = {}
    reasons: dict[str, str] = {}

    for metric, score_key, reason_key in ALL_METRICS:
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
