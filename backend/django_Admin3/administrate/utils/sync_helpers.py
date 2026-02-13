"""
Shared utilities for Administrate sync management commands.

Provides common data structures and functions used across all sync_* commands
for matching API records against tutorial tables, reporting discrepancies,
and interactive prompting.
"""
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SyncStats:
    """Track statistics for a sync operation."""
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    deleted: int = 0
    skipped: int = 0
    errors: int = 0
    unmatched_tutorial: list = field(default_factory=list)
    unmatched_api: list = field(default_factory=list)

    @property
    def total_processed(self):
        return self.created + self.updated + self.unchanged + self.deleted

    def summary_line(self):
        return (
            f"{self.created} created, {self.updated} updated, "
            f"{self.unchanged} unchanged, {self.deleted} deleted, "
            f"{self.skipped} skipped, {self.errors} errors"
        )


def match_records(tutorial_records, api_records, match_field, case_insensitive=True):
    """
    Match API records against tutorial records by a common field.

    Args:
        tutorial_records: dict of {match_key: model_instance} (keys already lowered if needed)
        api_records: list of API record dicts (edge nodes)
        match_field: API field name to match on (e.g., 'code', 'name')
        case_insensitive: whether to lowercase the match field value

    Returns:
        tuple of (matched, unmatched_tutorial, unmatched_api):
            matched: {api_id: (api_record, tutorial_instance)}
            unmatched_tutorial: [tutorial_instance, ...]
            unmatched_api: [api_record, ...]
    """
    matched = {}
    unmatched_api = []
    matched_tutorial_keys = set()

    for api_record in api_records:
        node = api_record.get('node', api_record)
        api_id = node.get('id')
        match_value = node.get(match_field, '')

        if case_insensitive and match_value:
            match_value = match_value.lower()

        if match_value in tutorial_records:
            matched[api_id] = (node, tutorial_records[match_value])
            matched_tutorial_keys.add(match_value)
        else:
            unmatched_api.append(node)

    unmatched_tutorial = [
        instance for key, instance in tutorial_records.items()
        if key not in matched_tutorial_keys
    ]

    return matched, unmatched_tutorial, unmatched_api


def report_discrepancies(stdout, style, unmatched_tutorial, unmatched_api, entity_name):
    """
    Report unmatched records in both directions.

    Args:
        stdout: command stdout writer
        style: command style object
        unmatched_tutorial: list of tutorial model instances with no API match
        unmatched_api: list of API record dicts with no tutorial match
        entity_name: human-readable entity name (e.g., "course template")
    """
    if unmatched_tutorial:
        stdout.write(style.WARNING(
            f'\n⚠ {len(unmatched_tutorial)} tutorial {entity_name}(s) had no match in Administrate:'
        ))
        for record in unmatched_tutorial:
            stdout.write(f'  - {record}')

    if unmatched_api:
        stdout.write(style.WARNING(
            f'\n⚠ {len(unmatched_api)} Administrate {entity_name}(s) had no match in tutorial tables:'
        ))
        for record in unmatched_api:
            name = record.get('name') or record.get('code') or record.get('title') or record.get('id', 'unknown')
            stdout.write(f'  - {name} (id: {record.get("id", "?")})')


def prompt_create_unmatched(stdout, style, unmatched_tutorial, entity_name, no_prompt, create_fn=None):
    """
    Prompt user to create unmatched tutorial records in Administrate.

    Args:
        stdout: command stdout writer
        style: command style object
        unmatched_tutorial: list of tutorial model instances
        entity_name: human-readable entity name
        no_prompt: if True, skip prompting and return False
        create_fn: optional callable to create records if user confirms

    Returns:
        True if user chose to create, False otherwise.
    """
    if not unmatched_tutorial:
        return False

    if no_prompt:
        stdout.write(
            f'{len(unmatched_tutorial)} unmatched tutorial {entity_name}(s) logged (--no-prompt set)'
        )
        return False

    stdout.write(style.WARNING(
        f'\n{len(unmatched_tutorial)} tutorial {entity_name}(s) have no match in Administrate.'
    ))

    if create_fn is None:
        stdout.write(
            f'Creation of {entity_name}s in Administrate is not yet supported.'
        )
        return False

    try:
        response = input(f'Create unmatched tutorial {entity_name}(s) in Administrate? [y/N]: ')
        if response.strip().lower() == 'y':
            create_fn(unmatched_tutorial)
            return True
    except (EOFError, KeyboardInterrupt):
        stdout.write('\nSkipped.')

    return False


def validate_dependencies(stdout, style, dependencies):
    """
    Validate that required dependencies are met before running a sync command.

    Args:
        stdout: command stdout writer
        style: command style object
        dependencies: dict of {'DependencyName': callable_that_returns_bool}
            e.g., {'Location': Location.objects.exists, 'PriceLevel': PriceLevel.objects.exists}

    Returns:
        True if all dependencies met, False otherwise.
    """
    all_met = True
    for name, check_fn in dependencies.items():
        if not check_fn():
            stdout.write(style.ERROR(
                f'Dependency not met: {name} records must be synced first. '
                f'Run the appropriate sync command before this one.'
            ))
            all_met = False

    return all_met
