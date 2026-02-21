"""
Load engine definitions from XML. Returns structured config only; providers build
engine instances from this to avoid circular imports.
"""

import logging
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import NamedTuple

logger = logging.getLogger(__name__)

# Default path: backend/app/config/engines.xml relative to this file
_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "engines.xml"


class EngineSpec(NamedTuple):
    """Single real-engine definition from XML."""

    model_id: str
    display_name: str


class EngineMoneysaverSpec(NamedTuple):
    """Single moneysaver-engine definition from XML (Groq with display name + env key)."""

    display_name: str
    api_key_env: str


def _get_config_path() -> Path:
    """Resolve config path: ENGINES_CONFIG_PATH env or default."""
    path = os.environ.get("ENGINES_CONFIG_PATH")
    if path:
        return Path(path)
    return _DEFAULT_CONFIG_PATH


def load_engine_config(
    path: Path | None = None,
) -> tuple[list[EngineSpec], list[EngineMoneysaverSpec]]:
    """
    Parse engines.xml and return (real_engine_specs, moneysaver_engine_specs).

    Raises:
        FileNotFoundError: if the config file does not exist.
        ET.ParseError: if the XML is invalid.
    """
    config_path = path if path is not None else _get_config_path()
    if not config_path.is_file():
        raise FileNotFoundError(f"Engine config not found: {config_path}")

    tree = ET.parse(config_path)
    root = tree.getroot()

    real_specs: list[EngineSpec] = []
    moneysaver_specs: list[EngineMoneysaverSpec] = []

    engines_el = root.find("engines")
    if engines_el is not None:
        for el in engines_el.findall("engine"):
            model_id = (el.get("model_id") or "").strip()
            display_name = (el.get("display_name") or "").strip()
            if model_id and display_name:
                real_specs.append(EngineSpec(model_id=model_id, display_name=display_name))
            else:
                logger.warning("Skipping engine with missing model_id or display_name: %s", el.attrib)

    engines_moneysaver_el = root.find("engines_moneysaver")
    if engines_moneysaver_el is not None:
        for el in engines_moneysaver_el.findall("engine"):
            display_name = (el.get("display_name") or "").strip()
            api_key_env = (el.get("api_key_env") or "GROQ_API_KEY").strip()
            if display_name:
                moneysaver_specs.append(
                    EngineMoneysaverSpec(display_name=display_name, api_key_env=api_key_env)
                )
            else:
                logger.warning(
                    "Skipping moneysaver engine with missing display_name: %s", el.attrib
                )

    return real_specs, moneysaver_specs
