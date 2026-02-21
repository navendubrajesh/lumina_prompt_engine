"""
Shim so CrewAI AMP finds src/crew.py at repo root.
Delegates to lumina_crew.crew.LuminaCrew (crewai/src/lumina_crew/).
"""
import sys
from pathlib import Path

# Add crewai/src so lumina_crew is importable
_repo_root = Path(__file__).resolve().parent.parent
_crewai_src = _repo_root / "crewai" / "src"
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))
if str(_crewai_src) not in sys.path:
    sys.path.insert(0, str(_crewai_src))

from lumina_crew.crew import LuminaCrew

__all__ = ["LuminaCrew"]
