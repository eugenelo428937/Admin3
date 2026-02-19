# Contracts: Tutorial Schema Refactor

This feature is a **backend-only schema refactor** with no new API endpoints.

## Why No API Contracts

- No new REST endpoints are created
- Existing tutorial API endpoints (`/api/tutorials/`) will have their serializers updated to use FK references instead of text fields, but the response shape changes are minimal (venue/location return object or ID instead of string)
- Serializer changes will be handled during implementation as part of model field updates

## Serializer Impact

The existing `TutorialSessionSerializer` in `tutorials/serializers.py` will need updates:
- `venue` field: changes from CharField to FK (may serialize as nested object or ID)
- `location` field: changes from CharField to FK (may serialize as nested object or ID)
- `instructor` field: new FK field to be added to serializer

These are implementation details that follow from the model changes and don't warrant separate contract definitions.
