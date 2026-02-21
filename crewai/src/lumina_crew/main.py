#!/usr/bin/env python
"""
Lumina Prompt Engine - CrewAI entry point.

Run from repo root (lumina_prompt_engine) so backend is on path:
  cd lumina_prompt_engine && crewai run

Or from crewai/: uv run python -m lumina_crew.main

Kickoff inputs: identity, intent, output_format, money_saver (bool), skip_evaluation (bool).
Output: FinalResponse as JSON string.
"""

import sys
from pathlib import Path

# Ensure repo root (lumina_prompt_engine) is on path so backend can be imported
# __file__ = .../crewai/src/lumina_crew/main.py -> parents[3] = crewai, parents[4] = repo root
_repo_root = Path(__file__).resolve().parents[4]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from lumina_crew.crew import LuminaCrew


def run():
    """Run the Lumina crew with kickoff inputs."""
    inputs = {
        "identity": "Senior data scientist at a fintech startup",
        "intent": "Extract structured insights from customer feedback",
        "output_format": "JSON with keys: sentiment, themes, action_items",
        "money_saver": False,
        "skip_evaluation": False,
    }
    result = LuminaCrew().crew().kickoff(inputs=inputs)
    if result is not None:
        print(result)
    return result


if __name__ == "__main__":
    # Allow override from CLI or AMP (AMP passes inputs via kickoff)
    run()
