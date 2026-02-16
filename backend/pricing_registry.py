"""Model Pricing Registry — loads and serves model pricing data.

The registry reads from data/model_pricing.json at startup and exposes
typed lookup methods used by the estimator and the API layer.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel

# ── Path to the JSON data file ─────────────────────────────────
_DATA_DIR = Path(__file__).resolve().parent / "data"
_PRICING_FILE = _DATA_DIR / "model_pricing.json"


# ── Pydantic schemas ───────────────────────────────────────────

class ModelPricing(BaseModel):
    """Pricing and throughput details for a single model."""
    id: str
    display_name: str
    family: str
    input_per_million: float
    output_per_million: float
    tokens_per_sec: float
    context_window: Optional[int] = None


class ProviderInfo(BaseModel):
    """A provider with its list of models."""
    id: str
    name: str
    models: List[ModelPricing]


class PricingRegistryData(BaseModel):
    """Top‑level schema of model_pricing.json."""
    version: str
    providers: List[ProviderInfo]


# ── Registry class ─────────────────────────────────────────────

class PricingRegistry:
    """In‑memory registry for model pricing, loaded from JSON.

    Provides fast lookups by (provider, model) and iteration helpers
    for the API layer.
    """

    def __init__(self) -> None:
        self._providers: List[ProviderInfo] = []
        # (provider_id, model_id) → ModelPricing
        self._lookup: Dict[Tuple[str, str], ModelPricing] = {}
        self._version: str = ""

    # ── Loading ────────────────────────────────────────────────

    def load(self, path: Optional[Path] = None) -> None:
        """Load registry from a JSON file. Defaults to data/model_pricing.json."""
        file_path = path or _PRICING_FILE
        if not file_path.exists():
            raise FileNotFoundError(f"Pricing data not found at {file_path}")

        raw = json.loads(file_path.read_text(encoding="utf-8"))
        data = PricingRegistryData(**raw)

        self._version = data.version
        self._providers = data.providers
        self._lookup = {}

        for prov in data.providers:
            for model in prov.models:
                key = (prov.id, model.id)
                self._lookup[key] = model

    # ── Queries ────────────────────────────────────────────────

    @property
    def version(self) -> str:
        return self._version

    def get_providers(self) -> List[ProviderInfo]:
        """Return all providers with their models."""
        return self._providers

    def get_provider_ids(self) -> List[str]:
        """Return just the provider id strings."""
        return [p.id for p in self._providers]

    def get_models_for_provider(self, provider_id: str) -> List[ModelPricing]:
        """Return all models under a given provider."""
        for p in self._providers:
            if p.id == provider_id:
                return p.models
        return []

    def get_all_models(
        self,
        provider: Optional[str] = None,
        family: Optional[str] = None,
    ) -> List[dict]:
        """Return a flat list of all models, optionally filtered.

        Each entry includes the provider_id for easy frontend consumption.
        """
        results = []
        for prov in self._providers:
            if provider and prov.id != provider:
                continue
            for m in prov.models:
                if family and m.family != family:
                    continue
                results.append({
                    "provider": prov.id,
                    **m.model_dump(),
                })
        return results

    def get(self, provider: str, model: str) -> Optional[ModelPricing]:
        """Look up pricing for a specific (provider, model) pair."""
        return self._lookup.get((provider, model))

    def pricing_key_compat(self, provider: str, model: str) -> Optional[dict]:
        """Return a dict matching the old MODEL_PRICING format for backward compat.

        Keys: input, output, tokens_per_sec.
        """
        entry = self.get(provider, model)
        if entry is None:
            return None
        return {
            "input": entry.input_per_million,
            "output": entry.output_per_million,
            "tokens_per_sec": entry.tokens_per_sec,
        }


# ── Module‑level singleton ─────────────────────────────────────

registry = PricingRegistry()
registry.load()
