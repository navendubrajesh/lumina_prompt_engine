"""
All prompt engines in one place. Same logic, only model_id and display_name vary.
MONEYSAVER: all engines are simulated via Groq with same display names; keys from env.
"""

import os

from backend.app.engines.base import BaseEngine, generate_with_instructor
from backend.app.models import Persona, PromptEngineOutput

GROQ_MODEL = "groq/llama-3.3-70b-versatile"


def _make_engine(model_id: str, display_name: str) -> type[BaseEngine]:
    """Factory: create an engine class with the given model_id and display_name."""
    _mid = model_id
    _dname = display_name

    class _Engine(BaseEngine):
        model_id = _mid
        display_name = _dname

        async def generate(self, persona: Persona) -> PromptEngineOutput:
            return await generate_with_instructor(
                self.model_id,
                self.display_name,
                persona,
            )

    _Engine.__name__ = display_name.replace(" ", "")
    return _Engine


def _make_simulator_engine(display_name: str, api_key_env: str) -> type[BaseEngine]:
    """Engine that calls Groq with display_name and api_key from api_key_env (for MONEYSAVER)."""
    _dname = display_name
    _env = api_key_env

    class _SimulatorEngine(BaseEngine):
        model_id = GROQ_MODEL
        display_name = _dname

        async def generate(self, persona: Persona) -> PromptEngineOutput:
            api_key = os.environ.get(_env) or os.environ.get("GROQ_API_KEY")
            return await generate_with_instructor(
                GROQ_MODEL,
                self.display_name,
                persona,
                api_key=api_key,
            )

    _SimulatorEngine.__name__ = display_name.replace(" ", "") + "Simulator"
    return _SimulatorEngine


# ---------------------------------------------------------------------------
# Engine definitions: (model_id, display_name)
# ---------------------------------------------------------------------------

OPENAI = _make_engine("openai/gpt-4o", "OpenAI GPT-4o")
CLAUDE = _make_engine("anthropic/claude-3-5-sonnet-20241022", "Anthropic Claude 3.5 Sonnet")
GEMINI = _make_engine("google/gemini-1.5-pro", "Google Gemini 1.5 Pro")
DEEPSEEK = _make_engine("deepseek/deepseek-chat", "DeepSeek Chat")
LLAMA = _make_engine("meta-llama/llama-3.1-70b-instruct", "Meta Llama 3.1 70B")
GROQ = _make_engine(GROQ_MODEL, "Groq Llama 3.3 70B")

# Aliases for backwards compatibility
OpenAIEngine = OPENAI
ClaudeEngine = CLAUDE
GeminiEngine = GEMINI
DeepSeekEngine = DEEPSEEK
LlamaEngine = LLAMA
GroqEngine = GROQ

# Registry: add new engines here (e.g. ENGINES.append(_make_engine("mistral/...", "Mistral Large")())
ENGINES: list[BaseEngine] = [
    OPENAI(),
    CLAUDE(),
    GEMINI(),
    DEEPSEEK(),
    LLAMA(),
    GROQ(),
]

# MONEYSAVER: same 6 cards, same display names; all call Groq. Keys: OPENAI/Gemini use simulate keys, rest use GROQ_API_KEY.
ENGINES_MONEYSAVER: list[BaseEngine] = [
    _make_simulator_engine("OpenAI GPT-4o", "GROQ_OPENAI_SIMULATE")(),
    _make_simulator_engine("Anthropic Claude 3.5 Sonnet", "GROQ_API_KEY")(),
    _make_simulator_engine("Google Gemini 1.5 Pro", "GROQ_GEMINI_SIMULATE")(),
    _make_simulator_engine("DeepSeek Chat", "GROQ_API_KEY")(),
    _make_simulator_engine("Meta Llama 3.1 70B", "GROQ_API_KEY")(),
    _make_simulator_engine("Groq Llama 3.3 70B", "GROQ_API_KEY")(),
]
