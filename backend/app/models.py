"""
Block 1: Data Schemas for Lumina Prompt Engine.

Pydantic v2 models defining the data contracts for Persona input,
engine outputs, evaluation metrics, and the final API response.
"""

from typing import Annotated

from pydantic import BaseModel, Field, computed_field


# ---------------------------------------------------------------------------
# Input Schema
# ---------------------------------------------------------------------------


class GenerateOptimizedPromptsRequest(BaseModel):
    """Request body for /generate-optimized-prompts. Persona fields plus optional MONEYSAVER mode."""

    identity: Annotated[
        str,
        Field(
            description="Who the user is (e.g., 'Senior data scientist at a fintech startup')",
            examples=["Senior data scientist at a fintech startup"],
        ),
    ]
    intent: Annotated[
        str,
        Field(
            description="What the user wants to achieve",
            examples=["Extract structured insights from customer feedback"],
        ),
    ]
    output_format: Annotated[
        str,
        Field(
            description="Desired output structure (e.g., 'JSON with keys: sentiment, themes')",
            examples=["JSON with keys: sentiment, themes, action_items"],
        ),
    ]
    money_saver: Annotated[
        bool,
        Field(
            default=False,
            description="If True, only Groq LLM is used (free tier). Fewer results, lower cost.",
        ),
    ]
    skip_evaluation: Annotated[
        bool,
        Field(
            default=False,
            description="If True, return prompts only (placeholder evaluations); call /evaluate-prompts to get scores.",
        ),
    ]

    def to_persona(self) -> "Persona":
        return Persona(
            identity=self.identity,
            intent=self.intent,
            output_format=self.output_format,
        )


class Persona(BaseModel):
    """User-defined persona describing identity, intent, and desired output format."""

    identity: Annotated[
        str,
        Field(
            description="Who the user is (e.g., 'Senior data scientist at a fintech startup')",
            examples=["Senior data scientist at a fintech startup"],
        ),
    ]
    intent: Annotated[
        str,
        Field(
            description="What the user wants to achieve (e.g., 'Extract structured insights from customer feedback')",
            examples=["Extract structured insights from customer feedback"],
        ),
    ]
    output_format: Annotated[
        str,
        Field(
            description="Desired output structure (e.g., 'JSON with keys: sentiment, themes, action_items')",
            examples=["JSON with keys: sentiment, themes, action_items"],
        ),
    ]


# ---------------------------------------------------------------------------
# Engine Output Schema
# ---------------------------------------------------------------------------


class PromptEngineOutput(BaseModel):
    """Output from a single prompt generation engine."""

    engine_name: Annotated[
        str,
        Field(
            description="Identifier of the model that generated the prompt",
            examples=["anthropic/claude-3-5-sonnet"],
        ),
    ]
    generated_prompt: Annotated[
        str,
        Field(
            description="The optimized prompt generated for this engine",
            examples=["You are a senior data scientist..."],
        ),
    ]
    raw_response: Annotated[
        str | None,
        Field(
            default=None,
            description="Raw response from the model before any extraction",
        ),
    ]


# ---------------------------------------------------------------------------
# Evaluation Metrics Schema
# ---------------------------------------------------------------------------


class EvaluationMetrics(BaseModel):
    """Scores and reasoning for each of the 5 evaluation criteria."""

    contextual_alignment: Annotated[
        float,
        Field(
            ge=0.0,
            le=1.0,
            description="How well the prompt aligns with the persona's identity and context",
        ),
    ]
    contextual_alignment_reasoning: Annotated[
        str,
        Field(
            description="Explanation of the contextual_alignment score for investor/stakeholder review",
        ),
    ]

    instruction_clarity: Annotated[
        float,
        Field(
            ge=0.0,
            le=1.0,
            description="Clarity and specificity of instructions in the prompt",
        ),
    ]
    instruction_clarity_reasoning: Annotated[
        str,
        Field(
            description="Explanation of the instruction_clarity score",
        ),
    ]

    constraint_adherence: Annotated[
        float,
        Field(
            ge=0.0,
            le=1.0,
            description="How well the prompt adheres to specified constraints and format",
        ),
    ]
    constraint_adherence_reasoning: Annotated[
        str,
        Field(
            description="Explanation of the constraint_adherence score",
        ),
    ]

    robustness: Annotated[
        float,
        Field(
            ge=0.0,
            le=1.0,
            description="Prompt's resilience to edge cases and ambiguous inputs",
        ),
    ]
    robustness_reasoning: Annotated[
        str,
        Field(
            description="Explanation of the robustness score",
        ),
    ]

    efficiency: Annotated[
        float,
        Field(
            ge=0.0,
            le=1.0,
            description="Token efficiency and concision without sacrificing quality",
        ),
    ]
    efficiency_reasoning: Annotated[
        str,
        Field(
            description="Explanation of the efficiency score",
        ),
    ]


# ---------------------------------------------------------------------------
# Composite Response Schema
# ---------------------------------------------------------------------------


class EvaluatedEngineOutput(BaseModel):
    """Engine output combined with its evaluation metrics."""

    engine_output: PromptEngineOutput
    evaluation: EvaluationMetrics

    @computed_field
    @property
    def overall_score(self) -> float:
        """Average of all 5 criteria scores (0.0–1.0)."""
        return (
            self.evaluation.contextual_alignment
            + self.evaluation.instruction_clarity
            + self.evaluation.constraint_adherence
            + self.evaluation.robustness
            + self.evaluation.efficiency
        ) / 5.0


class FinalResponse(BaseModel):
    """Complete API response with all 5 engine outputs and their scores."""

    persona: Annotated[
        Persona,
        Field(description="The input persona used for generation"),
    ]
    results: Annotated[
        list[EvaluatedEngineOutput],
        Field(
            description="List of engine outputs with their evaluation metrics",
            min_length=1,
            max_length=20,
        ),
    ]
    summary: Annotated[
        str | None,
        Field(
            default=None,
            description="Optional high-level summary of the comparison for stakeholders",
        ),
    ]
    system_prompt: Annotated[
        str | None,
        Field(
            default=None,
            description="The system prompt used by engines for prompt generation (for display in reports)",
        ),
    ] = None,
    suggested_title: Annotated[
        str | None,
        Field(
            default=None,
            description="LLM-suggested short title (≤6–8 words) for this run; user can edit in the UI.",
        ),
    ] = None,


# ---------------------------------------------------------------------------
# Evaluate-prompts (second phase)
# ---------------------------------------------------------------------------

PENDING_REASONING = "Evaluating..."


def placeholder_evaluation() -> EvaluationMetrics:
    """Placeholder evaluation when skip_evaluation=True; scores 0, reasoning 'Evaluating...'."""
    return EvaluationMetrics(
        contextual_alignment=0.0,
        contextual_alignment_reasoning=PENDING_REASONING,
        instruction_clarity=0.0,
        instruction_clarity_reasoning=PENDING_REASONING,
        constraint_adherence=0.0,
        constraint_adherence_reasoning=PENDING_REASONING,
        robustness=0.0,
        robustness_reasoning=PENDING_REASONING,
        efficiency=0.0,
        efficiency_reasoning=PENDING_REASONING,
    )


class EvaluatePromptsRequest(BaseModel):
    """Request body for /evaluate-prompts. Engine outputs from first phase + persona."""

    persona: Persona
    engine_outputs: Annotated[
        list[PromptEngineOutput],
        Field(description="Engine outputs from generate-optimized-prompts (skip_evaluation=True)", min_length=1),
    ]
    money_saver: Annotated[bool, Field(default=False)] = False


class EvaluatePromptsResponse(BaseModel):
    """Response from /evaluate-prompts. Same order as engine_outputs."""

    results: Annotated[
        list[EvaluatedEngineOutput],
        Field(description="Engine outputs with evaluations filled in; order matches request"),
    ]
