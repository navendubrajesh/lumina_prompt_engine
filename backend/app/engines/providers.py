"""
Engine instances are built from backend/app/config/engines.xml (or ENGINES_CONFIG_PATH).
No per-engine details here—only factory logic and GROQ model id for simulators.
"""

import logging
import os

from backend.app.engines.base import BaseEngine, generate_with_instructor
from backend.app.engines.loader import load_engine_config
from backend.app.models import Persona, PromptEngineOutput

logger = logging.getLogger(__name__)

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


def _build_engines_from_config() -> tuple[list[BaseEngine], list[BaseEngine]]:
    """Build ENGINES and ENGINES_MONEYSAVER from XML config. Raises if config missing/invalid."""
    real_specs, moneysaver_specs = load_engine_config()
    engines = [_make_engine(s.model_id, s.display_name)() for s in real_specs]
    moneysaver = [
        _make_simulator_engine(s.display_name, s.api_key_env)() for s in moneysaver_specs
    ]
    return engines, moneysaver


_engines_list, _moneysaver_list = _build_engines_from_config()
ENGINES: list[BaseEngine] = _engines_list
ENGINES_MONEYSAVER: list[BaseEngine] = _moneysaver_list
logger.info(
    "Loaded %d engines and %d moneysaver engines from XML config.",
    len(ENGINES),
    len(ENGINES_MONEYSAVER),
)
