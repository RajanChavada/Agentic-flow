"""Edge Data Contract validation via structural subtyping.

Checks that the source node's output_schema structurally satisfies
the target node's input_schema for every edge in a workflow graph.
"""

from __future__ import annotations


def validate_contracts(
    nodes: list[dict],
    edges: list[dict],
) -> tuple[list[dict], dict]:
    """Validate schema compatibility across all edges in a workflow graph.

    Args:
        nodes: List of node dicts (must include ``id``, ``output_schema``,
               ``input_schema``).
        edges: List of edge dicts (must include ``source``, ``target``,
               optionally ``id``).

    Returns:
        A tuple of ``(edge_results, summary)`` where *edge_results* is a list
        of per-edge validation dicts and *summary* aggregates the counts.
    """
    node_map: dict[str, dict] = {n["id"]: n for n in nodes}

    edge_results: list[dict] = []
    counts = {"compatible": 0, "incompatible": 0, "unvalidated": 0}

    for edge in edges:
        source_id = edge["source"]
        target_id = edge["target"]

        source_node = node_map.get(source_id)
        target_node = node_map.get(target_id)

        output_schema = (source_node or {}).get("output_schema")
        input_schema = (target_node or {}).get("input_schema")

        status, errors = check_schema_compatibility(output_schema, input_schema)
        counts[status] += 1

        edge_results.append({
            "edge_id": edge.get("id"),
            "source_id": source_id,
            "target_id": target_id,
            "status": status,
            "errors": errors,
        })

    summary = {
        "total_edges": len(edges),
        **counts,
    }

    return edge_results, summary


def check_schema_compatibility(
    output_schema: dict | None,
    input_schema: dict | None,
) -> tuple[str, list[str]]:
    """Check if an output schema satisfies an input schema.

    Returns ``(status, errors)`` where *status* is one of:

    * ``"compatible"``   -- output has all required input fields with
      compatible types.
    * ``"incompatible"`` -- type mismatches or missing required fields.
    * ``"unvalidated"``  -- one or both schemas are ``None``.
    """
    if output_schema is None or input_schema is None:
        return "unvalidated", []

    errors: list[str] = []

    output_props: dict = output_schema.get("properties", {})
    input_props: dict = input_schema.get("properties", {})
    input_required: list[str] = input_schema.get("required", [])

    # 1. Check every required input field exists in output with compatible type.
    for field in input_required:
        if field not in output_props:
            errors.append(f"Missing required field '{field}'")
            continue

        out_type = output_props[field].get("type")
        in_type = input_props.get(field, {}).get("type")

        if in_type is not None and out_type is not None:
            if not _types_compatible(out_type, in_type):
                errors.append(
                    f"Type mismatch on '{field}': "
                    f"output produces '{_type_label(out_type)}', "
                    f"input expects '{_type_label(in_type)}'"
                )

    # 2. Check non-required fields (warn on mismatch, but don't fail).
    for field, in_prop in input_props.items():
        if field in input_required:
            continue  # already checked above
        if field not in output_props:
            continue  # non-required + absent = fine

        out_type = output_props[field].get("type")
        in_type = in_prop.get("type")
        if in_type is not None and out_type is not None:
            if not _types_compatible(out_type, in_type):
                errors.append(
                    f"Type mismatch on optional field '{field}': "
                    f"output produces '{_type_label(out_type)}', "
                    f"input expects '{_type_label(in_type)}'"
                )

    if errors:
        return "incompatible", errors

    return "compatible", []


# ── Helpers ───────────────────────────────────────────────────


def _types_compatible(
    output_type: str | list[str],
    input_type: str | list[str],
) -> bool:
    """Check if JSON Schema types are compatible.

    Rules:
    - Exact match is always compatible.
    - ``"integer"`` is compatible with ``"number"`` (subtype).
    - Array/union types: any overlap (after widening integer→number)
      means compatible.
    """
    out_set = _normalise_types(output_type)
    in_set = _normalise_types(input_type)

    # Widen: integer → also counts as number
    widened_out = set(out_set)
    if "integer" in widened_out:
        widened_out.add("number")

    return bool(widened_out & in_set)


def _normalise_types(t: str | list[str]) -> set[str]:
    """Convert a JSON Schema ``type`` value to a set of type strings."""
    if isinstance(t, list):
        return set(t)
    return {t}


def _type_label(t: str | list[str]) -> str:
    """Human-readable label for a JSON Schema type value."""
    if isinstance(t, list):
        return " | ".join(t)
    return t
