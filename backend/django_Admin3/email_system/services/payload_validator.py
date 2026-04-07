"""Validates batch send payloads against an EmailTemplate's payload_schema."""


TYPE_VALIDATORS = {
    'string': lambda v: isinstance(v, str),
    'int': lambda v: isinstance(v, int) and not isinstance(v, bool),
    'float': lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    'bool': lambda v: isinstance(v, bool),
}


def validate_payload(payload, schema):
    """Validate a payload dict against a template's payload_schema.

    Returns a dict of field_path -> error_message. Empty dict means valid.
    """
    errors = {}
    _validate_node(payload, schema, '', errors)
    return errors


def _is_leaf(node):
    """Check if a schema node is a leaf field descriptor (has 'type' key)."""
    return isinstance(node, dict) and 'type' in node


def _validate_node(payload, schema, prefix, errors):
    """Recursively validate payload against schema nodes."""
    for key, node in schema.items():
        field_path = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"

        if _is_leaf(node):
            _validate_field(payload, key, node, field_path, errors)
        else:
            # Branch node — recurse into nested object
            child_payload = payload.get(key, {}) if isinstance(payload, dict) else {}
            if not isinstance(child_payload, dict):
                errors[field_path] = f"Expected object, got '{type(child_payload).__name__}'"
                continue
            _validate_node(child_payload, node, field_path, errors)


def _validate_field(payload, key, field_schema, field_path, errors):
    """Validate a single leaf field."""
    expected_type = field_schema.get('type', 'string')
    is_required = field_schema.get('required', False)
    has_default = 'default' in field_schema

    value = payload.get(key) if isinstance(payload, dict) else None
    is_missing = isinstance(payload, dict) and key not in payload

    if is_missing:
        if is_required:
            errors[field_path] = f"Required field is missing (expected type '{expected_type}')"
        return

    if value is None:
        if is_required:
            errors[field_path] = f"Required field is null (expected type '{expected_type}')"
        return

    validator = TYPE_VALIDATORS.get(expected_type)
    if validator and not validator(value):
        actual_type = type(value).__name__
        errors[field_path] = f"Expected type '{expected_type}', got '{actual_type}'"
