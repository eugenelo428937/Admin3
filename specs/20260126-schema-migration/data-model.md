# Data Model: Schema Migration

**Feature**: 20260126-schema-migration
**Date**: 2026-01-26

## Table Migration Map

### marking app (1 table)

| Current Location | New Location | Django db_table |
|-----------------|--------------|-----------------|
| `public.acted_marking_paper` | `acted.marking_paper` | `'"acted"."marking_paper"'` |

**Model File**: `backend/django_Admin3/marking/models/marking_paper.py`

### tutorials app (1 table)

| Current Location | New Location | Django db_table |
|-----------------|--------------|-----------------|
| `public.acted_tutorial_events` | `acted.tutorial_events` | `'"acted"."tutorial_events"'` |

**Model File**: `backend/django_Admin3/tutorials/models/tutorial_event.py`

### rules_engine app (5 tables)

| Current Location | New Location | Django db_table |
|-----------------|--------------|-----------------|
| `public.acted_rules` | `acted.rules` | `'"acted"."rules"'` |
| `public.acted_rules_fields` | `acted.rules_fields` | `'"acted"."rules_fields"'` |
| `public.acted_rule_executions` | `acted.rule_executions` | `'"acted"."rule_executions"'` |
| `public.acted_rule_entry_points` | `acted.rule_entry_points` | `'"acted"."rule_entry_points"'` |
| `public.acted_rules_message_templates` | `acted.rules_message_templates` | `'"acted"."rules_message_templates"'` |

**Model Files**:
- `backend/django_Admin3/rules_engine/models/acted_rule.py`
- `backend/django_Admin3/rules_engine/models/acted_rules_fields.py`
- `backend/django_Admin3/rules_engine/models/acted_rule_execution.py`
- `backend/django_Admin3/rules_engine/models/rule_entry_point.py`
- `backend/django_Admin3/rules_engine/models/message_template.py`

### students app (1 table)

| Current Location | New Location | Django db_table |
|-----------------|--------------|-----------------|
| `public.acted_students` | `acted.students` | `'"acted"."students"'` |

**Model File**: `backend/django_Admin3/students/models.py`

### userprofile app (4 tables)

| Current Location | New Location | Django db_table |
|-----------------|--------------|-----------------|
| `public.acted_user_profile` | `acted.user_profile` | `'"acted"."user_profile"'` |
| `public.acted_user_profile_email` | `acted.user_profile_email` | `'"acted"."user_profile_email"'` |
| `public.acted_user_profile_address` | `acted.user_profile_address` | `'"acted"."user_profile_address"'` |
| `public.acted_user_profile_contact_number` | `acted.user_profile_contact_number` | `'"acted"."user_profile_contact_number"'` |

**Model Files**:
- `backend/django_Admin3/userprofile/models/user_profile.py`
- `backend/django_Admin3/userprofile/models/email.py`
- `backend/django_Admin3/userprofile/models/address.py`
- `backend/django_Admin3/userprofile/models/contact_number.py`

## Foreign Key Dependencies

### Tables with external FKs (to already-migrated tables)

| Table | FK Field | References |
|-------|----------|------------|
| `marking_paper` | `exam_session_subject_product_id` | `acted.catalog_exam_session_subject_products` |
| `tutorial_events` | `store_product_id` | `acted.products` |
| `students` | `user_id` | `public.auth_user` (Django built-in) |
| `user_profile` | `user_id` | `public.auth_user` (Django built-in) |

### Internal FK relationships (within migrating tables)

| Table | FK Field | References |
|-------|----------|------------|
| `user_profile_email` | `user_profile_id` | `user_profile` |
| `user_profile_address` | `user_profile_id` | `user_profile` |
| `user_profile_contact_number` | `user_profile_id` | `user_profile` |

**Note**: userprofile tables should be migrated together in a single migration to maintain FK integrity.

## Index Inventory

### rules_engine indexes (defined in models)

| Index Name | Table | Columns |
|------------|-------|---------|
| `acted_rules_entry_active` | `acted_rules` | `entry_point, active, priority` |
| `acted_rules_rule_code` | `acted_rules` | `rule_code` |
| `acted_rules_active_ent` | `acted_rules` | `active, entry_point` |
| `acted_exec_rule_created` | `acted_rule_executions` | `rule_code, created_at` |
| `acted_exec_entry_created` | `acted_rule_executions` | `entry_point, created_at` |
| `acted_exec_outcome_crtd` | `acted_rule_executions` | `outcome, created_at` |

**Note**: All index names are under PostgreSQL's 63-character limit and will be preserved during migration.
