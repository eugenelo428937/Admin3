# Feature Specification: Migrate Models to Acted Schema

**Feature Branch**: `20260126-schema-migration`
**Created**: 2026-01-26
**Status**: Draft
**Input**: User description: "For models in marking, tutorials, rules_engine, students, and userprofile apps, change the schema from 'public' to 'acted'."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database Administrator Migrates Schema (Priority: P1)

A database administrator needs to migrate all tables from the five Django apps (marking, tutorials, rules_engine, students, userprofile) from the PostgreSQL `public` schema to the `acted` schema to maintain consistency with the catalog and store apps.

**Why this priority**: This is a foundational data layer change that affects all subsequent functionality. Without this migration, the database schema remains inconsistent, making maintenance and queries more complex.

**Independent Test**: Can be fully tested by verifying all tables exist in the `acted` schema and Django ORM queries return expected data after migration.

**Acceptance Scenarios**:

1. **Given** a database with tables in the `public` schema, **When** the migration runs, **Then** all affected tables exist in the `acted` schema with all data preserved
2. **Given** existing foreign key relationships between apps, **When** the migration completes, **Then** all FK constraints remain valid and queries work correctly
3. **Given** applications using these models, **When** the schema change is deployed, **Then** existing queries continue to work without code changes outside the model Meta class

---

### User Story 2 - Developer Confirms Model Configuration (Priority: P2)

A developer needs to verify that all Django models in the affected apps correctly reference tables in the `acted` schema using the `'"acted"."table_name"'` format in their `db_table` Meta option.

**Why this priority**: Model configuration changes are required for Django ORM to find tables in the new schema. This is a prerequisite for application functionality after migration.

**Independent Test**: Can be tested by running Django's `check` command and verifying models can be queried successfully.

**Acceptance Scenarios**:

1. **Given** a model with `db_table = 'acted_table_name'`, **When** the model is updated, **Then** `db_table` becomes `'"acted"."table_name"'`
2. **Given** a Django application, **When** `python manage.py check` runs, **Then** no schema-related errors are reported
3. **Given** a model with indexes, **When** the schema changes, **Then** index names remain valid and don't conflict with existing indexes

---

### User Story 3 - Developer Runs Migration Without Data Loss (Priority: P1)

A developer needs to run Django migrations that move tables to the new schema while preserving all existing data, including foreign key relationships and indexes.

**Why this priority**: Data integrity during migration is critical. Any data loss would be unacceptable in a production system.

**Independent Test**: Can be tested by comparing row counts before and after migration, and verifying FK relationships with spot-check queries.

**Acceptance Scenarios**:

1. **Given** tables with existing data, **When** the migration runs, **Then** all rows are preserved with identical values
2. **Given** tables with auto-increment primary keys, **When** the migration completes, **Then** sequences continue from the correct next value
3. **Given** a migration that fails midway, **When** the transaction rolls back, **Then** no partial changes remain

---

### Edge Cases

- What happens when a table name conflicts with an existing table in the `acted` schema?
- How does the system handle concurrent read/write operations during migration?
- What happens if a foreign key references a table that hasn't been migrated yet?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST update all model `db_table` Meta options in the marking app to use `'"acted"."table_name"'` format
- **FR-002**: System MUST update all model `db_table` Meta options in the tutorials app to use `'"acted"."table_name"'` format
- **FR-003**: System MUST update all model `db_table` Meta options in the rules_engine app to use `'"acted"."table_name"'` format
- **FR-004**: System MUST update all model `db_table` Meta options in the students app to use `'"acted"."table_name"'` format
- **FR-005**: System MUST update all model `db_table` Meta options in the userprofile app to use `'"acted"."table_name"'` format
- **FR-006**: System MUST create Django migrations to move tables from `public` schema to `acted` schema
- **FR-007**: System MUST preserve all existing data during migration
- **FR-008**: System MUST maintain all foreign key relationships during and after migration
- **FR-009**: System MUST preserve all existing indexes with valid names (max 63 characters for PostgreSQL)
- **FR-010**: System MUST ensure auto-increment sequences continue from correct values after migration
- **FR-011**: System MUST execute all schema changes within a transaction for atomicity

### Models to Migrate

#### marking app
| Current db_table | New db_table |
|-----------------|--------------|
| `acted_marking_paper` | `"acted"."marking_paper"` |

#### tutorials app
| Current db_table | New db_table |
|-----------------|--------------|
| `acted_tutorial_events` | `"acted"."tutorial_events"` |

#### rules_engine app
| Current db_table | New db_table |
|-----------------|--------------|
| `acted_rules` | `"acted"."rules"` |
| `acted_rules_fields` | `"acted"."rules_fields"` |
| `acted_rule_executions` | `"acted"."rule_executions"` |
| `acted_rule_entry_points` | `"acted"."rule_entry_points"` |
| `acted_rules_message_templates` | `"acted"."rules_message_templates"` |

#### students app
| Current db_table | New db_table |
|-----------------|--------------|
| `acted_students` | `"acted"."students"` |

#### userprofile app
| Current db_table | New db_table |
|-----------------|--------------|
| `acted_user_profile` | `"acted"."user_profile"` |
| `acted_user_profile_email` | `"acted"."user_profile_email"` |
| `acted_user_profile_address` | `"acted"."user_profile_address"` |
| `acted_user_profile_contact_number` | `"acted"."user_profile_contact_number"` |

### Key Entities *(include if feature involves data)*

- **MarkingPaper**: Marking paper with deadline information, linked to catalog.ExamSessionSubjectProduct
- **TutorialEvent**: Tutorial event with venue and scheduling, linked to store.Product
- **ActedRule**: Business rule definitions with JSONB condition and actions
- **ActedRulesFields**: JSON Schema definitions for rule context validation
- **ActedRuleExecution**: Audit trail for rule executions
- **RuleEntryPoint**: Predefined execution points for rules
- **MessageTemplate**: Reusable message templates for rule actions
- **Student**: Student profile linked to Django User model
- **UserProfile**: Extended user profile with preferences
- **UserProfileEmail**: User email addresses (multiple per user)
- **UserProfileAddress**: User addresses with JSON-based country format support
- **UserProfileContactNumber**: User phone numbers

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 12 tables are accessible via Django ORM queries after migration without any code changes outside model Meta classes
- **SC-002**: 100% of existing data rows are preserved after migration (verified by row count comparison)
- **SC-003**: All foreign key relationships resolve correctly after migration (verified by JOIN queries)
- **SC-004**: Migration completes successfully in a single transaction (no partial state)
- **SC-005**: Django's `python manage.py check` reports no errors related to schema configuration
- **SC-006**: Existing application features (cart, orders, rules engine) continue to function correctly after migration

## Assumptions

- The `acted` schema already exists in the PostgreSQL database (used by catalog and store apps)
- No tables with conflicting names exist in the `acted` schema
- The migration will be run during a maintenance window with no concurrent write operations
- PostgreSQL version supports `SET SCHEMA` command for table migration
- All referenced tables (catalog, store) are already in the `acted` schema

## Dependencies

- catalog app models must already be in the `acted` schema (confirmed: uses `'"acted"."catalog_*"'`)
- store app models must already be in the `acted` schema (confirmed: uses `'"acted"."products"'`)
- Django migration framework
- PostgreSQL database with `acted` schema created
