# Implementation Plan: Administrate-Tutorial Bidirectional Sync

**Branch**: `20260212-administrate-tutorial-sync` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260212-administrate-tutorial-sync/spec.md`

## Summary

Update the 7 existing Administrate sync management commands to match API records against `acted.tutorial_*` tables and link them via FK in `adm.*` bridge tables, add a `sync_all` orchestrator command, and refactor the event importer to create `acted.tutorial_events`/`tutorial_sessions` records before calling the Administrate GraphQL API — storing returned external_ids in `adm.events` via a new `tutorial_event` FK.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0
**Primary Dependencies**: Django REST Framework, `AdministrateAPIService` (GraphQL client), `openpyxl` (Excel parsing)
**Storage**: PostgreSQL with `acted` schema (tutorial models) and `adm` schema (administrate bridge models)
**Testing**: `python manage.py test` (Django TestCase/APITestCase against PostgreSQL)
**Target Platform**: Django management commands (CLI), Django ORM
**Project Type**: Web (backend only — no frontend changes for this feature)
**Performance Goals**: Event import processing ≤ 20% slower than current (SC-006); sync commands maintain current throughput
**Constraints**: Must preserve existing sync command behavior for records without tutorial matches; must not break existing Administrate API integration
**Scale/Scope**: 7 existing sync commands to modify + 1 new `sync_all` command + 1 event importer refactor; ~7 tutorial models, ~7 adm bridge models

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TDD (Non-Negotiable) | ✅ PASS | Tests will be written first for each sync command and importer change. Coverage target: 80%+ |
| II. Modular Architecture | ✅ PASS | Changes scoped to `administrate` app (sync commands, event importer) and one migration. No cross-app entanglement. |
| III. Security First | ✅ PASS | No auth changes. Administrate API credentials remain in env vars. No new user-facing endpoints. |
| IV. Performance Optimization | ✅ PASS | Sync commands maintain per-item transaction pattern. Event importer adds DB writes before existing API calls (minimal overhead). |
| V. Code Quality & Conventions | ✅ PASS | Following existing snake_case, `external_id` patterns, `__str__` methods. Will fix `adm.events`/`adm.sessions` db_table format inconsistency. |

**Pre-Phase 0 Gate: PASS** — No violations. Proceed to research.

## Project Structure

### Documentation (this feature)

```text
specs/20260212-administrate-tutorial-sync/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file
├── research.md          # Phase 0 output - research findings
├── data-model.md        # Phase 1 output - entity model changes
├── quickstart.md        # Phase 1 output - dev setup guide
├── contracts/           # Phase 1 output - command interface contracts
│   └── sync-commands.md # Management command interfaces
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── administrate/
│   ├── models/
│   │   └── events.py              # MODIFY: Add tutorial_event FK to Event, fix db_table format
│   ├── migrations/
│   │   └── 0007_add_event_tutorial_fk.py  # NEW: Migration for Event.tutorial_event FK + db_table fix
│   ├── management/commands/
│   │   ├── sync_course_templates.py       # MODIFY: Add tutorial FK matching
│   │   ├── sync_locations.py              # MODIFY: Add tutorial FK matching
│   │   ├── sync_venues.py                 # MODIFY: Add tutorial FK matching
│   │   ├── sync_instructors.py            # MODIFY: Add tutorial FK matching
│   │   ├── sync_custom_fields.py          # MODIFY: Add --no-prompt flag (no tutorial matching needed)
│   │   ├── sync_price_levels.py           # MODIFY: Add --no-prompt flag (no tutorial matching needed)
│   │   ├── sync_course_template_price_levels.py  # MODIFY: Add --no-prompt, dependency validation
│   │   └── sync_all.py                    # NEW: Master sync orchestrator command
│   ├── utils/
│   │   ├── event_importer.py              # MODIFY: Add tutorial table writes before API calls
│   │   └── sync_helpers.py                # NEW: Shared utilities for sync commands
│   └── templates/graphql/
│       └── mutations/                     # NEW: Create mutations for unmatched records
│           ├── create_course_template.graphql  # NEW (if Administrate API supports it)
│           ├── create_location.graphql         # NEW (if Administrate API supports it)
│           ├── create_venue.graphql             # NEW (if Administrate API supports it)
│           └── create_instructor.graphql        # NEW (if Administrate API supports it)
│
├── administrate/tests/
│   ├── test_sync_course_templates.py      # MODIFY: Add tutorial matching tests
│   ├── test_sync_locations.py             # MODIFY: Add tutorial matching tests
│   ├── test_sync_venues.py                # MODIFY: Add tutorial matching tests
│   ├── test_sync_instructors.py           # MODIFY: Add tutorial matching tests
│   ├── test_sync_all.py                   # NEW: Tests for sync_all orchestrator
│   ├── test_event_importer.py             # MODIFY: Add dual-write tests
│   └── test_sync_helpers.py               # NEW: Tests for shared utilities
│
└── tutorials/
    └── (no model changes needed — models already exist)
```

**Structure Decision**: Backend-only changes within the existing `administrate` Django app. Tutorial models in the `tutorials` app are consumed read-only (queried for FK matching). No frontend changes required.

## Complexity Tracking

> No constitution violations to justify. All changes follow existing patterns.

| Item | Decision | Rationale |
|------|----------|-----------|
| Shared `sync_helpers.py` | Extract common matching/reporting logic | Reduces duplication across 7 sync commands; keeps individual commands focused |
| `db_table` format fix | Fix `adm.events` and `adm.sessions` in same migration | Prevents schema placement bugs; per CLAUDE.md conventions |
