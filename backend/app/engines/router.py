"""
Multi-engine orchestrator. Runs all registered engines in parallel.

Engine definitions are loaded from config/engines.xml (or ENGINES_CONFIG_PATH).
See providers.py for the loader and fallback.
"""

import asyncio

from backend.app.engines.base import BaseEngine
from backend.app.engines.providers import ENGINES
from backend.app.models import Persona, PromptEngineOutput


class MultiEngineRouter:
    """
    Orchestrates prompt generation across all registered engines in parallel.

    Uses asyncio.gather so all models respond at the speed of the slowest one.
    """

    def __init__(self, engines: list[BaseEngine] | None = None) -> None:
        """
        Args:
            engines: List of engine instances. Defaults to ENGINES if None.
        """
        self._engines = engines if engines is not None else ENGINES

    async def generate_all(self, persona: Persona) -> list[PromptEngineOutput]:
        """Trigger all engines in parallel and return their outputs."""
        tasks = [engine.generate(persona) for engine in self._engines]
        return await asyncio.gather(*tasks)
