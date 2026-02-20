"""
Suggest a short run title (≤6–8 words) via a small LLM call after Generate & Rank.
Uses persona and top-ranked prompt/summary. Optional; on failure returns None.
"""

import logging
import os
import re

from litellm import acompletion

from backend.app.models import Persona

logger = logging.getLogger(__name__)

# Prefer a fast model for a single short completion
TITLE_MODEL = os.environ.get("LUMINA_TITLE_MODEL", "groq/llama-3.3-70b-versatile")

TITLE_SYSTEM = """You suggest very short titles for prompt-engineering runs. Reply with ONLY the title, 6-8 words max. No quotes, no explanation."""

TITLE_USER_TEMPLATE = """Suggest a short title (6–8 words max) for this prompt run.

Persona:
- Identity: {identity}
- Intent: {intent}
- Output format: {output_format}

Top-ranked prompt (excerpt): {prompt_excerpt}

Summary: {summary}

Reply with only the title, no quotes or punctuation."""


def _truncate(s: str, max_chars: int = 300) -> str:
    s = (s or "").strip()
    if len(s) <= max_chars:
        return s
    return s[: max_chars - 3].rstrip() + "..."


def _sanitize_title(raw: str) -> str:
    """Take first line, strip, collapse spaces, cap length."""
    if not raw or not isinstance(raw, str):
        return ""
    line = raw.strip().split("\n")[0].strip()
    line = re.sub(r"\s+", " ", line)
    # Remove surrounding quotes if present
    for q in ('"', "'", "«", "»"):
        if line.startswith(q) and line.endswith(q) and len(line) > 1:
            line = line[1:-1].strip()
    return line[: 80].strip() if line else ""


async def suggest_run_title(
    persona: Persona,
    summary: str | None,
    top_prompt_text: str | None,
) -> str | None:
    """
    Call a small LLM to suggest a short title for the run.
    Returns None on failure or if the model returns empty.
    """
    prompt_excerpt = _truncate(top_prompt_text or "", 300)
    summary_str = (summary or "").strip() or "No summary."

    user_content = TITLE_USER_TEMPLATE.format(
        identity=(persona.identity or "").strip() or "(none)",
        intent=(persona.intent or "").strip() or "(none)",
        output_format=(persona.output_format or "").strip() or "(none)",
        prompt_excerpt=prompt_excerpt or "(none)",
        summary=summary_str,
    )

    try:
        response = await acompletion(
            model=TITLE_MODEL,
            messages=[
                {"role": "system", "content": TITLE_SYSTEM},
                {"role": "user", "content": user_content},
            ],
            max_tokens=50,
        )
        choice = response.choices[0] if response.choices else None
        content = (choice.message.content if choice and choice.message else "").strip()
        title = _sanitize_title(content)
        return title if title else None
    except Exception as e:
        logger.warning("Title suggestion failed: %s", e, exc_info=False)
        return None
