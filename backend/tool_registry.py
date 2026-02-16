"""Tool Definitions Registry — loads and serves tool metadata.

Provides schema token counts, average response sizes, and latency
estimates for different tool categories (databases, MCP servers,
APIs, code execution, retrieval).

These values are used by the estimator to account for the hidden
token cost that tools add to agent nodes:
  • schema_tokens  → added to the agent's input (tool schema injection)
  • avg_response_tokens → added to the agent's input (tool result consumption)
  • latency_ms → added to the agent's latency (tool execution time)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel

# ── Path to the JSON data file ─────────────────────────────────
_DATA_DIR = Path(__file__).resolve().parent / "data"
_TOOL_FILE = _DATA_DIR / "tool_definitions.json"


# ── Pydantic schemas ───────────────────────────────────────────

class ToolDefinition(BaseModel):
    """Metadata and estimation heuristics for a single tool type."""
    id: str
    display_name: str
    description: str
    schema_tokens: int        # tokens added to agent input for the tool's JSON schema
    avg_response_tokens: int  # avg tokens the tool's output adds to agent input
    latency_ms: int           # avg tool execution time in milliseconds
    latency_type: str         # "local" or "hosted" — indicates network overhead


class ToolCategory(BaseModel):
    """A group of related tools (e.g. database, mcp_server, api)."""
    id: str
    name: str
    tools: List[ToolDefinition]


class ToolRegistryData(BaseModel):
    """Top-level schema of tool_definitions.json."""
    version: str
    tool_categories: List[ToolCategory]


# ── Registry class ─────────────────────────────────────────────

class ToolRegistry:
    """In-memory registry for tool definitions, loaded from JSON."""

    def __init__(self) -> None:
        self._categories: List[ToolCategory] = []
        self._lookup: Dict[str, ToolDefinition] = {}
        self._version: str = ""

    def load(self, path: Optional[Path] = None) -> None:
        """Load registry from a JSON file."""
        file_path = path or _TOOL_FILE
        if not file_path.exists():
            raise FileNotFoundError(f"Tool definitions not found at {file_path}")

        raw = json.loads(file_path.read_text(encoding="utf-8"))
        data = ToolRegistryData(**raw)

        self._version = data.version
        self._categories = data.tool_categories
        self._lookup = {}

        for cat in data.tool_categories:
            for tool in cat.tools:
                self._lookup[tool.id] = tool

    # ── Queries ────────────────────────────────────────────────

    @property
    def version(self) -> str:
        return self._version

    def get_categories(self) -> List[ToolCategory]:
        """Return all tool categories."""
        return self._categories

    def get_category_ids(self) -> List[str]:
        """Return category id strings."""
        return [c.id for c in self._categories]

    def get_tools_for_category(self, category_id: str) -> List[ToolDefinition]:
        """Return all tools in a given category."""
        for c in self._categories:
            if c.id == category_id:
                return c.tools
        return []

    def get(self, tool_id: str) -> Optional[ToolDefinition]:
        """Look up a tool by its id."""
        return self._lookup.get(tool_id)

    def get_all_tools(self, category: Optional[str] = None) -> List[dict]:
        """Return a flat list of all tools, optionally filtered by category."""
        results = []
        for cat in self._categories:
            if category and cat.id != category:
                continue
            for t in cat.tools:
                results.append({
                    "category": cat.id,
                    "category_name": cat.name,
                    **t.model_dump(),
                })
        return results


# ── Module-level singleton ─────────────────────────────────────

tool_registry = ToolRegistry()
tool_registry.load()
