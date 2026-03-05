"""NL-to-schema generation and validation for Ideal State nodes."""

import json
from typing import Optional

from config import OPENAI_API_KEY, SCHEMA_GEN_MODEL


SYSTEM_PROMPT = """You are a JSON Schema generator for AI workflow success criteria.

Given a natural language description of what a successful workflow output looks like,
generate a JSON Schema (draft 2020-12 compatible) that validates that output.

The schema must:
1. Have "type": "object" at the root level
2. Include a "properties" object with specific fields
3. Include a "required" array listing mandatory fields
4. Use appropriate types: string, number, integer, boolean, array, object
5. Include "description" for each property explaining what it captures
6. Where applicable, add constraints: minimum, maximum, minLength, maxLength, pattern, enum
7. If the description mentions performance criteria (latency, accuracy, scores), include them as numeric fields with bounds

Return ONLY valid JSON. No markdown, no explanations, no code blocks."""

USER_PROMPT_TEMPLATE = """Generate a JSON Schema for the following success criteria:

{description}

{context_section}Return a JSON object that is a valid JSON Schema."""


def generate_schema(description: str, context: Optional[str] = None) -> dict:
    """Generate a JSON schema from a natural language description.

    Uses OpenAI API if OPENAI_API_KEY is configured, otherwise returns
    a template schema as fallback.
    """
    if not OPENAI_API_KEY:
        return _fallback_schema(description)

    try:
        import openai

        client = openai.OpenAI(api_key=OPENAI_API_KEY)

        context_section = ""
        if context:
            context_section = f"Workflow context: {context}\n\n"

        response = client.chat.completions.create(
            model=SCHEMA_GEN_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT_TEMPLATE.format(
                    description=description,
                    context_section=context_section,
                )},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        schema = json.loads(raw)

        # Basic validation
        is_valid, errors = validate_schema(schema)
        if not is_valid:
            return _fallback_schema(description)

        return schema

    except Exception:
        return _fallback_schema(description)


def validate_schema(schema: dict) -> tuple[bool, list[str]]:
    """Validate that a dict is a reasonable JSON Schema.

    Returns (is_valid, error_messages).
    """
    errors: list[str] = []

    if not isinstance(schema, dict):
        errors.append("Schema must be a JSON object")
        return False, errors

    if schema.get("type") != "object":
        errors.append("Root schema must have \"type\": \"object\"")

    properties = schema.get("properties")
    if not isinstance(properties, dict) or len(properties) == 0:
        errors.append("Schema must have a non-empty \"properties\" object")

    valid_types = {"string", "number", "integer", "boolean", "array", "object", "null"}
    if isinstance(properties, dict):
        for prop_name, prop_def in properties.items():
            if not isinstance(prop_def, dict):
                errors.append(f"Property \"{prop_name}\" must be a JSON object")
                continue
            prop_type = prop_def.get("type")
            if prop_type and prop_type not in valid_types:
                errors.append(f"Property \"{prop_name}\" has invalid type \"{prop_type}\"")

    required = schema.get("required")
    if required is not None:
        if not isinstance(required, list):
            errors.append("\"required\" must be an array of strings")
        elif isinstance(properties, dict):
            for field in required:
                if field not in properties:
                    errors.append(f"Required field \"{field}\" not found in properties")

    return len(errors) == 0, errors


def _fallback_schema(description: str) -> dict:
    """Generate a basic template schema when LLM is unavailable."""
    return {
        "type": "object",
        "description": f"Success criteria: {description}",
        "properties": {
            "success": {
                "type": "boolean",
                "description": "Whether the workflow completed successfully",
            },
            "output": {
                "type": "string",
                "description": "The main output of the workflow",
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Confidence score of the output (0-1)",
            },
        },
        "required": ["success", "output"],
    }
