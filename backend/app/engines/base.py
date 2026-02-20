"""
Base engine interface and shared utilities for prompt generation.

All engines inherit from BaseEngine and use the shared Instructor client,
prompt templates, and GeneratedPrompt schema.
"""

import logging
from abc import ABC, abstractmethod

import instructor
from litellm import acompletion
from pydantic import BaseModel, Field

from backend.app.models import Persona, PromptEngineOutput

logger = logging.getLogger(__name__)

# Instructor-patched client for structured output
_instructor_client = instructor.from_litellm(acompletion)


class GeneratedPrompt(BaseModel):
    """Structured output from each engine. Instructor enforces this format."""

    generated_prompt: str = Field(
        description="The optimized prompt text only. No preamble, no meta-commentary.",
    )


SYSTEM_PROMPT = """You are an Expert Prompt Engineer. Your objective is to synthesize a user's raw inputs (Identity, Intent, and Output Format) into a single, highly optimized prompt designed to run on any major LLM.

You must engineer the final prompt by strictly applying the following five principles:

1. Context: Firmly establish the persona, domain expertise, and perspective based on the 'Identity'. Provide exact framing so the target LLM assumes the correct role immediately.
2. Clarity: Translate the 'Intent' into precise, unambiguous, and direct action verbs. The core task must be instantly comprehensible, leaving no room for misinterpretation.
3. Adherence: Treat the 'Output Format' as strict boundaries. Explicitly state all structural rules, formatting requirements, and length limits as non-negotiable constraints.
4. Efficiency: Make the prompt concise and token-efficient. Strip away conversational filler, redundant instructions, and user fluff. Every word must serve a functional purpose.
5. Robustness: Structure the prompt to yield consistent, predictable results across different LLM architectures. Use clear section headers (e.g., Context, Task, Constraints) and bullet points to prevent hallucinations and edge-case failures.

Zero Preamble: Output ONLY the exact text of the engineered prompt. Do not include introductory text, conversational filler, or meta-commentary."""

USER_PROMPT_TEMPLATE = """Persona:
- Identity: {identity}
- Intent: {intent}
- Output format: {output_format}

Generate an optimized prompt for this persona:"""


class BaseEngine(ABC):
    """Abstract base class for all prompt generation engines."""

    model_id: str = ""
    display_name: str = "base"

    @abstractmethod
    async def generate(self, persona: Persona) -> PromptEngineOutput:
        """
        Generate an optimized prompt for the given persona.

        Args:
            persona: The user's identity, intent, and output format.

        Returns:
            PromptEngineOutput containing the generated prompt and metadata.
        """
        ...


async def generate_with_instructor(
    model_id: str,
    display_name: str,
    persona: Persona,
    api_key: str | None = None,
) -> PromptEngineOutput:
    """
    Shared helper: call LiteLLM + Instructor for structured prompt generation.
    When api_key is provided (e.g. MONEYSAVER simulate keys), it is used for the request.
    """
    user_content = USER_PROMPT_TEMPLATE.format(
        identity=persona.identity,
        intent=persona.intent,
        output_format=persona.output_format,
    )
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    kwargs: dict = {"max_retries": 2}
    if api_key:
        kwargs["api_key"] = api_key
    try:
        parsed: GeneratedPrompt = await _instructor_client.chat.completions.create(
            model=model_id,
            messages=messages,
            response_model=GeneratedPrompt,
            **kwargs,
        )
        prompt_text = parsed.generated_prompt.strip()
        return PromptEngineOutput(
            engine_name=display_name,
            generated_prompt=prompt_text,
            raw_response=prompt_text,
        )
    except Exception as e:
        logger.exception("Engine %s failed: %s", display_name, e)
        return PromptEngineOutput(
            engine_name=display_name,
            generated_prompt="",
            raw_response=None,
        )
