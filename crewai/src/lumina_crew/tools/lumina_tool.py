"""
Lumina pipeline tool for CrewAI.

Runs the full Lumina flow (generate prompts -> evaluate -> suggest title)
using backend.app.pipeline. MONEYSAVER and behaviour match the FastAPI backend.
"""

import logging
import sys
from pathlib import Path
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Ensure repo root is on path so "backend" can be imported (e.g. when AMP runs from crewai/)
_REPO_ROOT = Path(__file__).resolve().parents[4]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


class LuminaPipelineInput(BaseModel):
    """Input for the Lumina pipeline tool."""

    identity: str = Field(..., description="Who the user is (e.g. Senior data scientist at a fintech startup)")
    intent: str = Field(..., description="What the user wants to achieve")
    output_format: str = Field(
        ...,
        description="Desired output structure (e.g. JSON with keys: sentiment, themes)",
    )
    money_saver: bool = Field(
        default=False,
        description="If True, only Groq is used (free tier). Same 6 engine display names.",
    )
    skip_evaluation: bool = Field(
        default=False,
        description="If True, return prompts with placeholder evaluations.",
    )


class LuminaPipelineTool(BaseTool):
    """Tool that runs the Lumina Prompt Engine pipeline and returns FinalResponse as JSON."""

    name: str = "lumina_pipeline"
    description: str = (
        "Runs the Lumina prompt-engineering pipeline: generates model-specific prompts from "
        "identity, intent, and output_format; evaluates them; suggests a run title. "
        "Returns a JSON object with persona, results (engine outputs + scores), summary, system_prompt, suggested_title. "
        "Set money_saver=True to use only Groq (free tier)."
    )
    args_schema: Type[BaseModel] = LuminaPipelineInput

    def _run(
        self,
        identity: str,
        intent: str,
        output_format: str,
        money_saver: bool = False,
        skip_evaluation: bool = False,
    ) -> str:
        """Execute the pipeline and return FinalResponse as JSON string."""
        try:
            from backend.app.pipeline import run_pipeline
        except ImportError:
            if str(_REPO_ROOT) not in sys.path:
                sys.path.insert(0, str(_REPO_ROOT))
            from backend.app.pipeline import run_pipeline

        response = run_pipeline(
            identity=identity,
            intent=intent,
            output_format=output_format,
            money_saver=money_saver,
            skip_evaluation=skip_evaluation,
        )
        return response.model_dump_json()
