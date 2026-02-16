"""Legacy pricing data — now a thin shim over pricing_registry.

Kept for backward compatibility.  All new code should import from
pricing_registry directly.
"""

from pricing_registry import registry


def pricing_key(provider: str, model: str) -> str:
    """Build a normalised lookup key (legacy format)."""
    return f"{provider}_{model}"


# Build a backward‑compatible dict from the registry so any old code
# that references MODEL_PRICING["OpenAI_GPT-4o"]["input"] still works.
MODEL_PRICING = {}
for _prov in registry.get_providers():
    for _m in _prov.models:
        _key = pricing_key(_prov.id, _m.id)
        MODEL_PRICING[_key] = {
            "input": _m.input_per_million,
            "output": _m.output_per_million,
            "tokens_per_sec": _m.tokens_per_sec,
        }
