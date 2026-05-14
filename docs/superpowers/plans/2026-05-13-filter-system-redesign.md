# Filter System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the filter system so a new filter type is a DB row + one backend handler, not a 6-file frontend dance. Replace per-dimension Redux state with a generic `byKey` bag; replace the descendant-tree filter backend with a dispatcher on `FilterConfiguration.filter_type`; switch the URL contract to canonical `?{filter_key}={comma_values}`; declare nav-link filter targets in the API response.

**Architecture:**
- **Backend:** `FilterHandler` ABC dispatched on `filter_type`; three concrete handlers ship (`subject`, `subject_type`, `filter_group`). Drop `FilterGroup.parent_id`, drop dead `dependency_rules` / `validation_rules` JSONFields. Navigation API embeds `{filter_key, value, preserve}` per item. A 30-day Django middleware rewrites legacy URLs to canonical form.
- **Frontend:** Redux `filters.byKey: Record<string, string[]>` + `filters.scalar: Record<string, string | null>` driven entirely by the registry boot-loaded from the backend. Three generic actions (`setFilter` / `toggleFilter` / `removeFilter`) replace 20+ named ones. Per-filter named actions live in a deprecation shim (deletable in a follow-up PR).
- **Nav menu:** One generic `handleNavClick({filter})` replaces six bespoke click handlers; `navigation-data` API embeds the target filter key per item.

**Tech Stack:** Django 6.0, DRF, PostgreSQL `acted` schema, React 19.2, Redux Toolkit, Material-UI v7, Vitest, pytest, Vite.

**Spec:** [docs/superpowers/specs/2026-05-13-filter-system-redesign-design.md](../specs/2026-05-13-filter-system-redesign-design.md) — read this before starting any task.

**Branch:** `feat/20260513-filter-system-redesign` (created from `main` after PR #106 merged).

---

## Phase ordering and verification gates

| Phase | Tasks | What's testable at end of phase |
|---|---|---|
| **A** — Backend schema + handlers + service rewrite | 1–14 | Backend tests pass; new API contract via `/api/products/filter-configuration/` |
| **B** — Backend nav-data API | 15–17 | `/api/catalog/navigation-data/` returns `filter` per clickable item |
| **C** — Backend legacy URL middleware | 18–20 | Legacy URLs (e.g. `?subject_code=CB1`) → 301 redirect to canonical |
| **D** — Frontend generic Redux + shim | 21–28 | New generic actions tested; legacy shim re-exports working |
| **E** — Frontend registry + URL sync | 29–32 | Registry boots from backend; URL sync uses canonical contract |
| **F** — Frontend UI + boot gate | 33–35 | App renders 6 filter sections in display_order from DB only |
| **G** — Frontend nav menu generic handler | 36–38 | Clicking any nav item dispatches the right filter via single handler |
| **H** — Cleanup | 39–41 | Dead files deleted; full test suite green |

**Verification command after each phase:**
```bash
# Backend
cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ catalog/ -x -q

# Frontend
cd frontend/react-Admin3 && npx vitest run
```

Both must be green before opening the PR.

---

## Conventions used in this plan

- File paths are absolute from the repo root.
- Each task is 2–5 minutes; commits happen at the end of each task.
- Commit messages follow Conventional Commits + the project's required trailer:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- Run pytest with:
  ```
  cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest <args>
  ```
- Run vitest with:
  ```
  cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npx vitest run <args>
  ```

---

# Phase A — Backend: schema + handlers + service rewrite

## Task 1: Migration — drop `FilterGroup.parent_id`

**Files:**
- Create: `backend/django_Admin3/filtering/migrations/0012_drop_filter_group_parent.py`
- Modify: `backend/django_Admin3/filtering/models/filter_group.py:32-39` (remove the `parent` field and the tree-walking helpers at lines 69-94)
- Test: `backend/django_Admin3/filtering/tests/test_models.py` (add a regression test asserting `parent` is no longer an attribute)

- [ ] **Step 1: Write the failing test**

In `backend/django_Admin3/filtering/tests/test_models.py`, append:

```python
import pytest
from filtering.models import FilterGroup

@pytest.mark.django_db
def test_filter_group_no_parent_field():
    """FilterGroup is flat — parent_id was removed in migration 0012."""
    fg = FilterGroup(name='Test', code='test')
    fg.save()
    assert not hasattr(fg, 'parent'), \
        "FilterGroup should no longer have a 'parent' field after migration 0012"
    assert 'parent_id' not in [f.name for f in fg._meta.get_fields()]
```

- [ ] **Step 2: Run test to verify it fails**

```
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_models.py::test_filter_group_no_parent_field -v
```

Expected: FAIL with `AssertionError: FilterGroup should no longer have a 'parent' field…`

- [ ] **Step 3: Remove `parent` field and tree helpers from the model**

In `backend/django_Admin3/filtering/models/filter_group.py`, delete:
- The `parent = models.ForeignKey(...)` block (lines 32-39)
- The `get_full_path` method (lines 69-76)
- The `get_descendants` method (lines 78-85)
- The `get_level` method (lines 87-94)

- [ ] **Step 4: Create migration 0012**

Create `backend/django_Admin3/filtering/migrations/0012_drop_filter_group_parent.py`:

```python
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0011_alter_productproductgroup_product_group'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='filtergroup',
            name='parent',
        ),
    ]
```

- [ ] **Step 5: Run migration check and test**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  /Users/work/Documents/Code/Admin3/.venv/bin/python manage.py makemigrations --check --dry-run filtering
```
Expected: `No changes detected` (our migration covers the model change).

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_models.py::test_filter_group_no_parent_field -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/filtering/migrations/0012_drop_filter_group_parent.py \
        backend/django_Admin3/filtering/models/filter_group.py \
        backend/django_Admin3/filtering/tests/test_models.py
git commit -m "$(cat <<'EOF'
refactor(filtering): drop FilterGroup.parent_id and tree helpers

The flat product↔group mapping in filter_product_product_groups now
covers what the tree conveyed. Tree walking is no longer needed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Migration — clean up dead JSONFields on `FilterConfiguration`

**Files:**
- Create: `backend/django_Admin3/filtering/migrations/0013_filter_configuration_cleanup.py`
- Modify: `backend/django_Admin3/filtering/models/filter_configuration.py` (drop `dependency_rules`, `validation_rules`, and `is_dependent_on()`; add `subject_type` to `FILTER_TYPE_CHOICES`)
- Modify: `backend/django_Admin3/filtering/admin.py:62` (remove the fieldset entry referencing those fields)
- Test: `backend/django_Admin3/filtering/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/django_Admin3/filtering/tests/test_models.py`:

```python
@pytest.mark.django_db
def test_filter_configuration_no_dead_jsonfields():
    """validation_rules + dependency_rules dropped in migration 0013."""
    from filtering.models import FilterConfiguration
    fc = FilterConfiguration(
        name='TEST_FILTER', filter_key='test', filter_type='subject',
        display_label='Test',
    )
    assert not hasattr(fc, 'dependency_rules')
    assert not hasattr(fc, 'validation_rules')
    assert not hasattr(fc, 'is_dependent_on')


def test_filter_configuration_subject_type_choice_allowed():
    from filtering.models import FilterConfiguration
    choices = dict(FilterConfiguration._meta.get_field('filter_type').choices)
    assert 'subject_type' in choices
```

- [ ] **Step 2: Run tests to verify they fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_models.py::test_filter_configuration_no_dead_jsonfields \
  filtering/tests/test_models.py::test_filter_configuration_subject_type_choice_allowed -v
```
Expected: FAIL — both attributes still exist; `subject_type` not in choices.

- [ ] **Step 3: Modify the model**

In `backend/django_Admin3/filtering/models/filter_configuration.py`:

Update `FILTER_TYPE_CHOICES` (around line 27) to insert `('subject_type', 'Subject Type'),` after `('subject', 'Subject'),`. Final list:

```python
FILTER_TYPE_CHOICES = [
    ('subject', 'Subject'),
    ('subject_type', 'Subject Type'),
    ('filter_group', 'Filter Group'),
    ('product_variation', 'Product Variation'),
    ('tutorial_format', 'Tutorial Format'),
    ('bundle', 'Bundle'),
    ('custom_field', 'Custom Field'),
    ('computed', 'Computed Filter'),
    ('date_range', 'Date Range'),
    ('numeric_range', 'Numeric Range'),
]
```

Delete the `validation_rules = models.JSONField(...)` block (lines 101-105).
Delete the `dependency_rules = models.JSONField(...)` block (lines 106-110).
Delete the `is_dependent_on(self, other_filter)` method (lines 176-179).

- [ ] **Step 4: Update admin.py**

In `backend/django_Admin3/filtering/admin.py:62`, change the fieldset block:

```python
# OLD
('Advanced Configuration', {
    'fields': ['ui_config', 'validation_rules', 'dependency_rules']
}),
# NEW
('Advanced Configuration', {
    'fields': ['ui_config']
}),
```

- [ ] **Step 5: Create migration 0013**

Create `backend/django_Admin3/filtering/migrations/0013_filter_configuration_cleanup.py`:

```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0012_drop_filter_group_parent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filterconfiguration',
            name='filter_type',
            field=models.CharField(
                choices=[
                    ('subject', 'Subject'),
                    ('subject_type', 'Subject Type'),
                    ('filter_group', 'Filter Group'),
                    ('product_variation', 'Product Variation'),
                    ('tutorial_format', 'Tutorial Format'),
                    ('bundle', 'Bundle'),
                    ('custom_field', 'Custom Field'),
                    ('computed', 'Computed Filter'),
                    ('date_range', 'Date Range'),
                    ('numeric_range', 'Numeric Range'),
                ],
                help_text='Type of filter',
                max_length=32,
            ),
        ),
        migrations.RemoveField(
            model_name='filterconfiguration',
            name='dependency_rules',
        ),
        migrations.RemoveField(
            model_name='filterconfiguration',
            name='validation_rules',
        ),
    ]
```

- [ ] **Step 6: Verify migration + tests pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  /Users/work/Documents/Code/Admin3/.venv/bin/python manage.py makemigrations --check --dry-run filtering
```
Expected: `No changes detected`.

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_models.py -v
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/filtering/migrations/0013_filter_configuration_cleanup.py \
        backend/django_Admin3/filtering/models/filter_configuration.py \
        backend/django_Admin3/filtering/admin.py \
        backend/django_Admin3/filtering/tests/test_models.py
git commit -m "$(cat <<'EOF'
refactor(filtering): drop dead JSONFields + add subject_type filter_type

dependency_rules and validation_rules had zero readers outside the admin
form. is_dependent_on() helper goes with them. Add 'subject_type' to
FILTER_TYPE_CHOICES so the existing FilterConfiguration row with
filter_type='subject_type' has a valid handler in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Migration — delete leftover `subject_type → "South Africa"` FCG row

**Files:**
- Create: `backend/django_Admin3/filtering/migrations/0014_clean_subject_type_fcg_mapping.py`

- [ ] **Step 1: Create the migration**

```python
from django.db import migrations


def cleanup_subject_type_mapping(apps, schema_editor):
    """Remove the leftover FilterConfigurationGroup row mapping subject_type
    to the 'South Africa' FilterGroup. subject_type enumerates UK/SA/CAA/PMS
    from Subject.SubjectType, not from filter_groups."""
    FCG = apps.get_model('filtering', 'FilterConfigurationGroup')
    FCG.objects.filter(
        filter_configuration__filter_key='subject_type'
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0013_filter_configuration_cleanup'),
    ]

    operations = [
        migrations.RunPython(
            cleanup_subject_type_mapping,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
```

- [ ] **Step 2: Run it on the dev DB and verify**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  /Users/work/Documents/Code/Admin3/.venv/bin/python manage.py migrate filtering 0014_clean_subject_type_fcg_mapping
```

Verify zero rows remain:
```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -c "
import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','django_Admin3.settings.development'); django.setup()
from filtering.models import FilterConfigurationGroup
n = FilterConfigurationGroup.objects.filter(filter_configuration__filter_key='subject_type').count()
print(f'remaining subject_type FCG rows: {n}')
assert n == 0
"
```
Expected: `remaining subject_type FCG rows: 0`.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/filtering/migrations/0014_clean_subject_type_fcg_mapping.py
git commit -m "$(cat <<'EOF'
refactor(filtering): delete leftover subject_type→South Africa FCG mapping

subject_type's options come from Subject.SubjectType (UK/SA/CAA/PMS),
not from FilterGroups. The pre-existing FilterConfigurationGroup row
was dead weight from an earlier prototype.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create `FilterHandler` ABC

**Files:**
- Create: `backend/django_Admin3/filtering/services/filter_handlers.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_handlers.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/filtering/tests/test_filter_handlers.py`:

```python
"""Tests for the FilterHandler ABC and the three concrete handlers."""
import pytest
from django.db.models import Q
from filtering.services.filter_handlers import FilterHandler, FILTER_HANDLERS


def test_filter_handler_is_abstract():
    """FilterHandler cannot be instantiated directly."""
    with pytest.raises(TypeError):
        FilterHandler()


def test_filter_handlers_registry_has_three_handlers():
    """FILTER_HANDLERS dict ships with subject, subject_type, filter_group."""
    assert set(FILTER_HANDLERS.keys()) == {'subject', 'subject_type', 'filter_group'}


def test_filter_handlers_all_implement_required_methods():
    """Each handler must implement get_options, build_q, count_path."""
    for filter_type, handler in FILTER_HANDLERS.items():
        assert callable(handler.get_options), \
            f"{filter_type} handler missing get_options"
        assert callable(handler.build_q), \
            f"{filter_type} handler missing build_q"
        assert callable(handler.count_path), \
            f"{filter_type} handler missing count_path"
```

- [ ] **Step 2: Run test to verify failure**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -v
```
Expected: FAIL with `ModuleNotFoundError: filtering.services.filter_handlers`.

- [ ] **Step 3: Create the ABC and registry skeleton**

Create `backend/django_Admin3/filtering/services/filter_handlers.py`:

```python
"""Filter handlers — one per filter_type.

Each handler encapsulates how to compute options, build a Q for filtering,
and identify the field path for disjunctive-facet counting. Adding a new
filter_type means adding a handler class and one line in FILTER_HANDLERS.

See docs/superpowers/specs/2026-05-13-filter-system-redesign-design.md
section 2 for the full design.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any
from django.db.models import Q

from filtering.models import FilterConfiguration


class FilterHandler(ABC):
    """One per filter_type. Knows how to list options, build a Q,
    and compute counts for filters of its type."""

    @abstractmethod
    def get_options(self, config: FilterConfiguration) -> list[dict[str, Any]]:
        """Return options to render in this filter's UI section.

        Each option is a dict with at minimum {'value': str, 'label': str}.
        """

    @abstractmethod
    def build_q(self, config: FilterConfiguration, values: list[str]) -> Q:
        """Return a Q object that filters store.Product to rows whose
        relation through this filter matches any of `values`.

        Empty `values` → caller skips, so this method may assume values
        is non-empty.
        """

    @abstractmethod
    def count_path(self, config: FilterConfiguration) -> str:
        """Return the queryset .values(<path>) used in disjunctive faceting
        to roll up counts by this filter's discrete option."""


# Concrete handlers added in subsequent tasks
FILTER_HANDLERS: dict[str, FilterHandler] = {}
```

- [ ] **Step 4: Run tests — only 1 of 3 should pass now**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -v
```
Expected: `test_filter_handler_is_abstract` PASSES; the other two FAIL (no handlers registered yet — that's fine, they'll pass in Task 8).

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_handlers.py \
        backend/django_Admin3/filtering/tests/test_filter_handlers.py
git commit -m "$(cat <<'EOF'
feat(filtering): FilterHandler ABC + empty FILTER_HANDLERS registry

Foundation for the per-filter_type dispatcher. Concrete handlers added
in subsequent tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Implement `SubjectHandler`

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_handlers.py` (add `SubjectHandler` class)
- Test: `backend/django_Admin3/filtering/tests/test_filter_handlers.py` (add tests)

- [ ] **Step 1: Write the failing tests**

Append to `backend/django_Admin3/filtering/tests/test_filter_handlers.py`:

```python
@pytest.mark.django_db
def test_subject_handler_get_options_returns_active_subjects():
    from catalog.models import Subject
    from filtering.services.filter_handlers import SubjectHandler

    Subject.objects.create(code='ZZ1', description='Active', active=True)
    Subject.objects.create(code='ZZ2', description='Inactive', active=False)

    handler = SubjectHandler()
    options = handler.get_options(config=None)  # config unused for subject

    codes = [o['value'] for o in options]
    assert 'ZZ1' in codes
    assert 'ZZ2' not in codes
    # Each option has value + label
    opt = next(o for o in options if o['value'] == 'ZZ1')
    assert opt['label'].startswith('ZZ1')


@pytest.mark.django_db
def test_subject_handler_build_q():
    from filtering.services.filter_handlers import SubjectHandler

    handler = SubjectHandler()
    q = handler.build_q(config=None, values=['CB1', 'CB2'])

    # Children of Q should match exam_session_subject__subject__code__in
    assert q.children == [
        ('exam_session_subject__subject__code__in', ['CB1', 'CB2'])
    ]


def test_subject_handler_count_path():
    from filtering.services.filter_handlers import SubjectHandler
    handler = SubjectHandler()
    assert handler.count_path(config=None) == \
        'exam_session_subject__subject__code'
```

- [ ] **Step 2: Run tests to verify failure**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py::test_subject_handler_get_options_returns_active_subjects \
  filtering/tests/test_filter_handlers.py::test_subject_handler_build_q \
  filtering/tests/test_filter_handlers.py::test_subject_handler_count_path -v
```
Expected: FAIL with `ImportError: cannot import SubjectHandler`.

- [ ] **Step 3: Implement `SubjectHandler`**

In `backend/django_Admin3/filtering/services/filter_handlers.py`, add (above the `FILTER_HANDLERS` dict):

```python
class SubjectHandler(FilterHandler):
    """Lists active Subject rows; filters store.Product by subject code."""

    def get_options(self, config):
        from catalog.models import Subject
        return [
            {
                'value': s.code,
                'label': f"{s.code} - {s.description}" if s.description else s.code,
                'code': s.code,
            }
            for s in Subject.objects.filter(active=True).order_by('code')
        ]

    def build_q(self, config, values):
        return Q(exam_session_subject__subject__code__in=values)

    def count_path(self, config):
        return 'exam_session_subject__subject__code'
```

- [ ] **Step 4: Verify tests pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -v
```
Expected: 4 PASS, 2 FAIL (registry not yet populated — fixed in Task 8).

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_handlers.py \
        backend/django_Admin3/filtering/tests/test_filter_handlers.py
git commit -m "$(cat <<'EOF'
feat(filtering): SubjectHandler — lists subjects, filters by code

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Implement `SubjectTypeHandler`

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_handlers.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_handlers.py`

- [ ] **Step 1: Write the failing tests**

Append to test file:

```python
def test_subject_type_handler_get_options_returns_text_choices():
    from filtering.services.filter_handlers import SubjectTypeHandler
    handler = SubjectTypeHandler()
    options = handler.get_options(config=None)

    values = {o['value'] for o in options}
    assert values == {'UK', 'SA', 'CAA', 'PMS'}

    uk = next(o for o in options if o['value'] == 'UK')
    assert uk['label'] == 'UK Exam'


def test_subject_type_handler_build_q():
    from filtering.services.filter_handlers import SubjectTypeHandler
    handler = SubjectTypeHandler()
    q = handler.build_q(config=None, values=['UK', 'SA'])
    assert q.children == [
        ('exam_session_subject__subject__subject_type__in', ['UK', 'SA'])
    ]


def test_subject_type_handler_count_path():
    from filtering.services.filter_handlers import SubjectTypeHandler
    handler = SubjectTypeHandler()
    assert handler.count_path(config=None) == \
        'exam_session_subject__subject__subject_type'
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -k subject_type -v
```
Expected: FAIL — `SubjectTypeHandler` doesn't exist.

- [ ] **Step 3: Implement `SubjectTypeHandler`**

In `filter_handlers.py`, add:

```python
class SubjectTypeHandler(FilterHandler):
    """Enumerates Subject.SubjectType.choices (UK / SA / CAA / PMS);
    filters store.Product by Subject.subject_type column."""

    def get_options(self, config):
        from catalog.subject.models import Subject
        return [
            {'value': value, 'label': label}
            for value, label in Subject.SubjectType.choices
        ]

    def build_q(self, config, values):
        return Q(exam_session_subject__subject__subject_type__in=values)

    def count_path(self, config):
        return 'exam_session_subject__subject__subject_type'
```

- [ ] **Step 4: Verify pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -k subject_type -v
```
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_handlers.py \
        backend/django_Admin3/filtering/tests/test_filter_handlers.py
git commit -m "$(cat <<'EOF'
feat(filtering): SubjectTypeHandler — UK/SA/CAA/PMS from Subject.SubjectType

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Implement `FilterGroupHandler`

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_handlers.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_handlers.py`

- [ ] **Step 1: Write the failing tests**

Append:

```python
@pytest.mark.django_db
def test_filter_group_handler_get_options_returns_assigned_groups():
    from filtering.models import (
        FilterConfiguration, FilterGroup, FilterConfigurationGroup,
    )
    from filtering.services.filter_handlers import FilterGroupHandler

    fc = FilterConfiguration.objects.create(
        name='TEST_CAT', filter_key='test_cat', filter_type='filter_group',
        display_label='Test Category',
    )
    fg1 = FilterGroup.objects.create(name='Alpha', code='alpha', display_order=1)
    fg2 = FilterGroup.objects.create(name='Beta',  code='beta',  display_order=2)
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg1)
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg2)

    handler = FilterGroupHandler()
    options = handler.get_options(fc)

    assert [o['value'] for o in options] == ['Alpha', 'Beta']
    assert options[0]['label'] == 'Alpha'


def test_filter_group_handler_build_q():
    from filtering.services.filter_handlers import FilterGroupHandler
    handler = FilterGroupHandler()
    q = handler.build_q(config=None, values=['Material', 'Marking'])
    assert q.children == [
        ('product_product_variation__product_groups__product_group__name__in',
         ['Material', 'Marking'])
    ]


def test_filter_group_handler_count_path():
    from filtering.services.filter_handlers import FilterGroupHandler
    handler = FilterGroupHandler()
    assert handler.count_path(config=None) == \
        'product_product_variation__product_groups__product_group__name'
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -k filter_group -v
```
Expected: FAIL — `FilterGroupHandler` doesn't exist.

- [ ] **Step 3: Implement `FilterGroupHandler`**

```python
class FilterGroupHandler(FilterHandler):
    """For filter_type='filter_group'. Lists FilterGroup rows mapped to
    this configuration via FilterConfigurationGroup; filters store.Product
    through filter_product_product_groups → filter_groups.name."""

    def get_options(self, config):
        groups = config.filter_groups.all().order_by('display_order', 'name')
        return [
            {
                'value': g.name,
                'label': g.name,
                'code': g.code or '',
            }
            for g in groups
        ]

    def build_q(self, config, values):
        return Q(
            product_product_variation__product_groups__product_group__name__in=values
        )

    def count_path(self, config):
        return 'product_product_variation__product_groups__product_group__name'
```

- [ ] **Step 4: Verify pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -k filter_group -v
```
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_handlers.py \
        backend/django_Admin3/filtering/tests/test_filter_handlers.py
git commit -m "$(cat <<'EOF'
feat(filtering): FilterGroupHandler — flat join on filter_product_product_groups

Replaces the descendant-tree walker. Joins directly on FilterGroup.name
(URL-canonical identifier). Convention: FilterGroup.name values do not
contain commas — guarded by the no-comma rule in the spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Wire up `FILTER_HANDLERS` registry

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_handlers.py`
- Test: existing `test_filter_handlers.py` tests should pass

- [ ] **Step 1: Update registry**

Replace `FILTER_HANDLERS: dict[str, FilterHandler] = {}` at the bottom of `filter_handlers.py` with:

```python
FILTER_HANDLERS: dict[str, FilterHandler] = {
    'subject':       SubjectHandler(),
    'subject_type':  SubjectTypeHandler(),
    'filter_group':  FilterGroupHandler(),
}
```

- [ ] **Step 2: Run all handler tests**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_handlers.py -v
```
Expected: ALL pass — including the registry-shape tests from Task 4.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_handlers.py
git commit -m "$(cat <<'EOF'
feat(filtering): register the three concrete handlers in FILTER_HANDLERS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Rewrite `ProductFilterService.get_filter_configuration` to use dispatcher

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_service.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py` (new)

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py`:

```python
"""Integration tests for the new filter_type dispatcher in ProductFilterService."""
import pytest
from filtering.models import FilterConfiguration, FilterGroup, FilterConfigurationGroup
from filtering.services.filter_service import ProductFilterService


@pytest.mark.django_db
def test_get_filter_configuration_keys_are_filter_keys():
    """Top-level keys in the response are now FilterConfiguration.filter_key,
    not .name (was 'SUBJECT_FILTER', now 'subjects')."""
    FilterConfiguration.objects.create(
        name='X_FILTER', filter_key='x_key',
        filter_type='subject', display_label='X', display_order=1,
    )
    service = ProductFilterService()
    cfg = service.get_filter_configuration()

    assert 'x_key' in cfg
    assert 'X_FILTER' not in cfg


@pytest.mark.django_db
def test_get_filter_configuration_skips_unknown_filter_type(caplog):
    """A FilterConfiguration with an unhandled filter_type produces a
    warning and is omitted from the response (instead of crashing)."""
    FilterConfiguration.objects.create(
        name='WEIRD', filter_key='weird',
        filter_type='date_range',  # no handler registered
        display_label='Weird', display_order=99,
    )
    service = ProductFilterService()
    with caplog.at_level('WARNING'):
        cfg = service.get_filter_configuration()
    assert 'weird' not in cfg
    assert any('No handler for filter_type' in r.message for r in caplog.records)


@pytest.mark.django_db
def test_get_filter_configuration_response_shape():
    """Each entry has filter_key, filter_type, label, options, display_order,
    ui_component, allow_multiple, is_collapsible, is_expanded_by_default."""
    FilterConfiguration.objects.create(
        name='X', filter_key='x', filter_type='subject',
        display_label='Test', display_order=5, allow_multiple=True,
    )
    service = ProductFilterService()
    cfg = service.get_filter_configuration()

    entry = cfg['x']
    assert entry['filter_key'] == 'x'
    assert entry['filter_type'] == 'subject'
    assert entry['label'] == 'Test'
    assert entry['display_order'] == 5
    assert entry['allow_multiple'] is True
    assert 'options' in entry
    # The removed fields must not appear
    assert 'validation_rules' not in entry
    assert 'dependency_rules' not in entry
    assert 'filter_groups' not in entry  # junction array no longer needed
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_service_dispatch.py -v
```
Expected: FAIL — response shape still uses old `name` keys and includes removed fields.

- [ ] **Step 3: Rewrite `get_filter_configuration`**

In `backend/django_Admin3/filtering/services/filter_service.py`, replace the `get_filter_configuration` method (currently lines 163-204) with:

```python
def get_filter_configuration(self) -> dict[str, dict]:
    """Build the registry payload by dispatching to handlers per filter_type."""
    from filtering.services.filter_handlers import FILTER_HANDLERS

    result = {}
    configs = FilterConfiguration.objects.filter(is_active=True).order_by('display_order')
    for config in configs:
        handler = FILTER_HANDLERS.get(config.filter_type)
        if not handler:
            logger.warning(
                f"No handler for filter_type={config.filter_type!r} "
                f"(filter_key={config.filter_key}); skipping."
            )
            continue
        result[config.filter_key] = {
            'filter_key': config.filter_key,
            'filter_type': config.filter_type,
            'label': config.display_label,
            'description': config.description,
            'ui_component': config.ui_component,
            'display_order': config.display_order,
            'allow_multiple': config.allow_multiple,
            'is_collapsible': config.is_collapsible,
            'is_expanded_by_default': config.is_expanded_by_default,
            'is_required': config.is_required,
            'ui_config': config.get_ui_config(),
            'options': handler.get_options(config),
        }
    return result
```

- [ ] **Step 4: Verify pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_service_dispatch.py -v
```
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_service.py \
        backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py
git commit -m "$(cat <<'EOF'
refactor(filtering): get_filter_configuration dispatches on filter_type

Top-level keys are now filter_key (was: name). Drops validation_rules,
dependency_rules, and the filter_groups junction array from the response.

BREAKING: API contract for /api/products/filter-configuration/. Frontend
follow-up in Phase D switches to consume the new shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Rewrite `apply_filters` to use dispatcher

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_service.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py`

- [ ] **Step 1: Write the failing test**

Append to `test_filter_service_dispatch.py`:

```python
@pytest.mark.django_db
def test_apply_filters_dispatches_on_filter_type(django_assert_num_queries):
    """apply_filters loops through active FilterConfigurations and calls
    each handler's build_q for the corresponding filter_key in input."""
    from catalog.models import (
        Subject, ExamSession, ExamSessionSubject, Product as CatalogProduct,
        ProductVariation, ProductProductVariation,
    )
    from store.models import Product as StoreProduct

    subj1 = Subject.objects.create(code='CB1', description='Test 1', active=True)
    subj2 = Subject.objects.create(code='CB2', description='Test 2', active=True)
    sess = ExamSession.objects.create(
        session_code='2026-04', start_date='2026-04-01', end_date='2026-04-30',
    )
    ess1 = ExamSessionSubject.objects.create(exam_session=sess, subject=subj1)
    ess2 = ExamSessionSubject.objects.create(exam_session=sess, subject=subj2)
    cprod = CatalogProduct.objects.create(shortname='X', fullname='X', code='X', is_active=True)
    pvar = ProductVariation.objects.create(
        code='P', name='Printed', variation_type='Material',
    )
    ppv = ProductProductVariation.objects.create(product=cprod, product_variation=pvar)
    StoreProduct.objects.create(
        exam_session_subject=ess1, product_product_variation=ppv, product_code='P1',
    )
    StoreProduct.objects.create(
        exam_session_subject=ess2, product_product_variation=ppv, product_code='P2',
    )

    FilterConfiguration.objects.create(
        name='SUBJ', filter_key='subjects', filter_type='subject',
        display_label='Subject',
    )

    service = ProductFilterService()
    qs = StoreProduct.objects.all()
    filtered = service.apply_filters(qs, {'subjects': ['CB1']})

    assert filtered.count() == 1
    assert filtered.first().product_code == 'P1'


@pytest.mark.django_db
def test_apply_filters_empty_or_no_handler_returns_unfiltered():
    """Empty filters dict or unmatched keys → unfiltered queryset."""
    from store.models import Product as StoreProduct

    service = ProductFilterService()
    qs = StoreProduct.objects.all()
    assert service.apply_filters(qs, {}).count() == qs.count()
    # Unknown filter_key is silently ignored
    assert service.apply_filters(qs, {'nonexistent_key': ['x']}).count() == qs.count()
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_service_dispatch.py::test_apply_filters_dispatches_on_filter_type \
  filtering/tests/test_filter_service_dispatch.py::test_apply_filters_empty_or_no_handler_returns_unfiltered -v
```
Expected: FAIL — old `apply_store_product_filters` method has different name + signature.

- [ ] **Step 3: Replace the old method**

In `backend/django_Admin3/filtering/services/filter_service.py`:

Delete the methods:
- `_build_descendant_map` (lines 259-281)
- `_resolve_group_ids_with_hierarchy` (lines 283-323)
- `apply_store_product_filters` (lines 325-411)
- `_apply_filters_excluding` (lines 413-434)

Add a new method (place it where the old `apply_store_product_filters` was):

```python
def apply_filters(self, queryset, filters: dict[str, list[str]]):
    """Apply filters to a queryset by dispatching to per-filter_type handlers.

    Args:
        queryset: base queryset (typically store.Product.objects.all()).
        filters: dict mapping filter_key → list of selected values.

    Returns:
        Filtered, distinct queryset.
    """
    from filtering.services.filter_handlers import FILTER_HANDLERS

    if not filters:
        return queryset.distinct()

    for config in FilterConfiguration.objects.filter(is_active=True):
        values = filters.get(config.filter_key) or []
        if not values:
            continue
        handler = FILTER_HANDLERS.get(config.filter_type)
        if not handler:
            continue
        queryset = queryset.filter(handler.build_q(config, values))

    return queryset.distinct()

def _apply_filters_excluding(self, queryset, filters, exclude_filter_key):
    """Apply all filters EXCEPT the excluded filter_key (disjunctive faceting)."""
    reduced = {k: v for k, v in filters.items() if k != exclude_filter_key}
    return self.apply_filters(queryset, reduced)
```

- [ ] **Step 4: Verify pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_service_dispatch.py -v
```
Expected: ALL 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_service.py \
        backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py
git commit -m "$(cat <<'EOF'
refactor(filtering): apply_filters dispatches on filter_type

Replaces apply_store_product_filters + descendant-tree resolution with
a per-config handler loop. Deletes _build_descendant_map and
_resolve_group_ids_with_hierarchy (no longer needed with flat PPG data).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Rewrite `generate_filter_counts` to use dispatcher

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_service.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py`

- [ ] **Step 1: Write the failing test**

Append:

```python
@pytest.mark.django_db
def test_generate_filter_counts_uses_handlers_for_path_and_q():
    """Counts are computed via disjunctive faceting using each handler's
    count_path() for grouping and build_q() to exclude itself."""
    from catalog.models import (
        Subject, ExamSession, ExamSessionSubject, Product as CatalogProduct,
        ProductVariation, ProductProductVariation,
    )
    from store.models import Product as StoreProduct

    cb1 = Subject.objects.create(code='CB1', description='T1', active=True)
    cb2 = Subject.objects.create(code='CB2', description='T2', active=True)
    sess = ExamSession.objects.create(
        session_code='2026-04', start_date='2026-04-01', end_date='2026-04-30',
    )
    e1 = ExamSessionSubject.objects.create(exam_session=sess, subject=cb1)
    e2 = ExamSessionSubject.objects.create(exam_session=sess, subject=cb2)
    cp = CatalogProduct.objects.create(shortname='X', fullname='X', code='X', is_active=True)
    pv = ProductVariation.objects.create(code='P', name='Printed', variation_type='Material')
    ppv = ProductProductVariation.objects.create(product=cp, product_variation=pv)
    StoreProduct.objects.create(
        exam_session_subject=e1, product_product_variation=ppv, product_code='P1',
    )
    StoreProduct.objects.create(
        exam_session_subject=e2, product_product_variation=ppv, product_code='P2',
    )

    FilterConfiguration.objects.create(
        name='SUBJ', filter_key='subjects', filter_type='subject',
        display_label='Subject',
    )

    service = ProductFilterService()
    counts = service.generate_filter_counts(StoreProduct.objects.all(), filters={})

    assert 'subjects' in counts
    assert counts['subjects']['CB1']['count'] == 1
    assert counts['subjects']['CB2']['count'] == 1
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_service_dispatch.py::test_generate_filter_counts_uses_handlers_for_path_and_q -v
```
Expected: FAIL — current `generate_filter_counts` returns hardcoded `{'subjects':…,'categories':…,…}` keys, doesn't iterate configs.

- [ ] **Step 3: Replace `generate_filter_counts`**

In `filter_service.py`, replace the existing `generate_filter_counts` method (currently around lines 436-540) with:

```python
def generate_filter_counts(self, base_queryset, filters=None):
    """Generate disjunctive facet counts keyed by FilterConfiguration.filter_key.

    For each active filter configuration, compute counts against a queryset
    with all OTHER active filters applied (disjunctive faceting).
    """
    from django.db.models import Count
    from filtering.services.filter_handlers import FILTER_HANDLERS

    filters = filters or {}
    result = {}

    configs = FilterConfiguration.objects.filter(is_active=True)
    for config in configs:
        handler = FILTER_HANDLERS.get(config.filter_type)
        if not handler:
            continue

        dimension_qs = self._apply_filters_excluding(
            base_queryset, filters, config.filter_key,
        )
        path = handler.count_path(config)
        rows = (
            dimension_qs.values(path)
            .annotate(count=Count('id', distinct=True))
            .order_by('-count')
        )
        bucket = {}
        for row in rows:
            value = row[path]
            n = row['count']
            if value and n > 0:
                bucket[value] = {'count': n, 'name': value}
        result[config.filter_key] = bucket

    return result
```

- [ ] **Step 4: Verify pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/test_filter_service_dispatch.py -v
```
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/services/filter_service.py \
        backend/django_Admin3/filtering/tests/test_filter_service_dispatch.py
git commit -m "$(cat <<'EOF'
refactor(filtering): generate_filter_counts dispatches on filter_type

Counts are now keyed by filter_key (was: hardcoded named dimensions).
Adding a new filter_type registers a count_path automatically.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Delete dead code from `filter_service.py`

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_service.py`

- [ ] **Step 1: Delete dead classes/methods**

In `filter_service.py`, delete:
- The entire `FilterOptionProvider` class (lines 16-118 in the original).
- `ProductFilterService._load_filter_configurations` (now unused — verify no callers first).
- `ProductFilterService.option_providers` attribute on `__init__` and assignments.
- `ProductFilterService.get_filter_options` (was the per-name option loader; counts handler takes over).
- `ProductFilterService.get_main_category_filter` (verify call sites — if dead, delete; if used, mark with FIXME and a follow-up issue).
- `ProductFilterService.validate_filters` (verify call sites).
- `ProductFilterService.invalidate_cache` (verify call sites).
- `ProductFilterService.reload_configurations`.

The `__init__` becomes just:

```python
class ProductFilterService:
    """Thin facade: dispatches each FilterConfiguration to its handler."""

    # No __init__ state needed; the handler dict is module-level.
    pass

    def get_filter_configuration(self) -> dict[str, dict]:
        ...  # (kept from Task 9)

    def apply_filters(self, queryset, filters: dict[str, list[str]]):
        ...  # (kept from Task 10)

    def _apply_filters_excluding(self, queryset, filters, exclude_filter_key):
        ...  # (kept from Task 10)

    def generate_filter_counts(self, base_queryset, filters=None):
        ...  # (kept from Task 11)


def get_filter_service() -> ProductFilterService:
    return ProductFilterService()
```

- [ ] **Step 2: Find call sites that might break**

```
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  grep -rn "option_providers\|get_main_category_filter\|validate_filters\|invalidate_cache\|reload_configurations\|FilterOptionProvider\|get_filter_options" \
    --include="*.py" .
```

For any non-test caller found, either:
- Delete the caller if it's also dead, OR
- Update it to use the new API (`get_filter_configuration` returns options inline).

- [ ] **Step 3: Run full filtering test suite**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ -v 2>&1 | tail -30
```

Expected: failures in tests that referenced the removed methods. Note them — they'll be addressed in Task 13.

- [ ] **Step 4: Commit (intermediate state)**

```bash
git add backend/django_Admin3/filtering/services/filter_service.py
git commit -m "$(cat <<'EOF'
refactor(filtering): delete FilterOptionProvider and option_providers state

The handler dispatcher replaces both. ProductFilterService is now a
thin facade with four methods: get_filter_configuration, apply_filters,
_apply_filters_excluding, generate_filter_counts.

Tests for removed methods are addressed in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Delete obsolete test files

**Files:**
- Delete: `backend/django_Admin3/filtering/tests/test_filter_group_hierarchy.py`
- Delete: `backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py`
- Delete: `backend/django_Admin3/filtering/tests/test_resolve_group_warns_on_miss.py`

- [ ] **Step 1: Verify these tests are about deleted code**

```
head -5 backend/django_Admin3/filtering/tests/test_filter_group_hierarchy.py
head -5 backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py
head -5 backend/django_Admin3/filtering/tests/test_resolve_group_warns_on_miss.py
```
Each should reference `parent_id`, descendant-walking, or `_resolve_group_ids_with_hierarchy` — all gone.

- [ ] **Step 2: Delete the files**

```bash
git rm backend/django_Admin3/filtering/tests/test_filter_group_hierarchy.py
git rm backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py
git rm backend/django_Admin3/filtering/tests/test_resolve_group_warns_on_miss.py
```

- [ ] **Step 3: Run filtering tests to see what remains**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ -v 2>&1 | tail -30
```

Address remaining failures in Task 14.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
test(filtering): delete tree-hierarchy tests for code that no longer exists

test_filter_group_hierarchy.py, test_hierarchy_resolution.py, and
test_resolve_group_warns_on_miss.py covered the descendant-walking
behavior in apply_store_product_filters, which was deleted in Task 10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Update remaining filtering tests for new API contract

**Files:**
- Modify: `backend/django_Admin3/filtering/tests/test_filter_service.py` — replace named-dimension assertions
- Modify: `backend/django_Admin3/filtering/tests/test_filter_configuration_api.py` — new response shape
- Modify: `backend/django_Admin3/filtering/tests/test_filter_partitioning.py` — add subject_type partitioning case
- Modify: `backend/django_Admin3/filtering/tests/test_filter_counts.py` — new shape
- Modify: `backend/django_Admin3/filtering/tests/test_views.py` — new shape
- Modify: `backend/django_Admin3/filtering/tests/test_models.py` — drop dependency_rules / parent tests
- Modify: `backend/django_Admin3/filtering/tests/test_coverage_gaps.py` — drop dependency_rules tests
- Modify: `backend/django_Admin3/filtering/tests/test_serializer_field_coverage.py` — drop deleted fields

- [ ] **Step 1: Run filtering tests and capture failures**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ 2>&1 | grep -E "FAILED|PASSED" | head -40
```

- [ ] **Step 2: For each FAILED test, update the assertion to match the new shape**

The transformation is mechanical:
- `result['SUBJECT_FILTER']` → `result['subjects']`
- `result['SUBJECT_TYPE_FILTER']` → `result['subject_type']`
- `result['PRODUCT_CATEGORY']` → `result['categories']`
- `result['PRODUCT_TYPE']` → `result['product_types']`
- `result['DELIVERY_MODE']` → `result['modes_of_delivery']`
- `result['PROGRAMME_TYPE']` → `result['programme_type']`
- Assertions on `entry['validation_rules']` / `entry['dependency_rules']` / `entry['filter_groups']` → delete those assertions.
- Tests calling `service.apply_store_product_filters(...)` → rename to `service.apply_filters(...)`.

- [ ] **Step 3: Add a new test for `subject_type` partitioning in `test_filter_partitioning.py`**

```python
@pytest.mark.django_db
def test_subject_type_filter_partitions_by_subject_type_column():
    """A subject_type filter dispatches to SubjectTypeHandler."""
    from catalog.models import Subject, ExamSession, ExamSessionSubject
    from filtering.models import FilterConfiguration

    uk = Subject.objects.create(
        code='UK1', description='UK Subject', active=True, subject_type='UK',
    )
    sa = Subject.objects.create(
        code='SA1', description='SA Subject', active=True, subject_type='SA',
    )
    # ... create ESS + Products as in earlier tasks
    FilterConfiguration.objects.create(
        name='ST', filter_key='subject_type', filter_type='subject_type',
        display_label='Region',
    )

    service = ProductFilterService()
    # apply just SA filter
    filtered = service.apply_filters(
        StoreProduct.objects.all(), {'subject_type': ['SA']},
    )
    assert all(
        p.exam_session_subject.subject.subject_type == 'SA'
        for p in filtered
    )
```

- [ ] **Step 4: Run filtering tests until green**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ -q
```
Expected: 100% PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/tests/
git commit -m "$(cat <<'EOF'
test(filtering): update remaining tests for new dispatcher API contract

- Top-level keys are filter_key (was: name)
- Drop assertions on validation_rules / dependency_rules / filter_groups
- Rename apply_store_product_filters → apply_filters call sites
- Add subject_type partitioning test

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase A verification gate:** Run the full backend suite. Both filtering and catalog tests must pass.

```
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ catalog/ -q
```

---

# Phase B — Backend: navigation-data API

## Task 15: Helper to resolve a FilterGroup name to its filter_key

**Files:**
- Create: `backend/django_Admin3/catalog/services/navigation_filter_mapping.py`
- Test: `backend/django_Admin3/catalog/tests/test_navigation_filter_mapping.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/catalog/tests/test_navigation_filter_mapping.py`:

```python
import pytest
from catalog.services.navigation_filter_mapping import resolve_nav_filter


@pytest.mark.django_db
def test_resolve_nav_filter_returns_filter_key_for_group():
    """A FilterGroup mapped to a FilterConfiguration via FilterConfigurationGroup
    yields {key, value, preserve} aligned to the configuration's filter_key."""
    from filtering.models import (
        FilterConfiguration, FilterGroup, FilterConfigurationGroup,
    )

    fc = FilterConfiguration.objects.create(
        name='CAT', filter_key='categories',
        filter_type='filter_group', display_label='Category',
    )
    fg = FilterGroup.objects.create(name='Material', code='material')
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg)

    result = resolve_nav_filter('Material', preserve=['subjects'])
    assert result == {
        'key': 'categories',
        'value': 'Material',
        'preserve': ['subjects'],
    }


@pytest.mark.django_db
def test_resolve_nav_filter_returns_none_for_unmapped_group():
    """A FilterGroup not mapped to any FilterConfiguration returns None."""
    from filtering.models import FilterGroup
    FilterGroup.objects.create(name='Lonely', code='lonely')
    assert resolve_nav_filter('Lonely', preserve=[]) is None


@pytest.mark.django_db
def test_resolve_nav_filter_returns_none_for_missing_group():
    """An unknown group name returns None (caller handles)."""
    assert resolve_nav_filter('NotARealGroup', preserve=[]) is None
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  catalog/tests/test_navigation_filter_mapping.py -v
```
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the helper**

Create `backend/django_Admin3/catalog/services/navigation_filter_mapping.py`:

```python
"""Resolve a FilterGroup name to its target filter_key + value + preserve.

Used by the navigation-data endpoint to embed `filter` objects per
clickable nav item. Reads filter_configuration_groups, so reassigning a
group in admin automatically updates the nav targets.
"""
from typing import Optional

from filtering.models import FilterConfigurationGroup


def resolve_nav_filter(group_name: str, preserve: list[str]) -> Optional[dict]:
    """Return {'key': filter_key, 'value': group_name, 'preserve': [...]}
    for a FilterGroup mapped to a FilterConfiguration; None if unmapped.
    """
    fcg = (
        FilterConfigurationGroup.objects
        .filter(
            filter_group__name=group_name,
            filter_configuration__is_active=True,
        )
        .select_related('filter_configuration')
        .first()
    )
    if not fcg:
        return None
    return {
        'key': fcg.filter_configuration.filter_key,
        'value': group_name,
        'preserve': list(preserve),
    }
```

If `backend/django_Admin3/catalog/services/` doesn't exist, also create `__init__.py` there.

- [ ] **Step 4: Verify tests pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  catalog/tests/test_navigation_filter_mapping.py -v
```
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/catalog/services/navigation_filter_mapping.py \
        backend/django_Admin3/catalog/services/__init__.py \
        backend/django_Admin3/catalog/tests/test_navigation_filter_mapping.py
git commit -m "$(cat <<'EOF'
feat(catalog): resolve_nav_filter — group_name → {filter_key, value, preserve}

Reads filter_configuration_groups so the nav target stays in sync with
admin reassignments. Returns None for unmapped groups (caller decides
whether to render the item without a filter target).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Update `navigation_data` view to embed `filter` per item

**Files:**
- Modify: `backend/django_Admin3/catalog/views/navigation_views.py`
- Modify: `backend/django_Admin3/catalog/tests/test_navigation_data_available.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/django_Admin3/catalog/tests/test_navigation_data_available.py`:

```python
@pytest.mark.django_db
def test_navigation_data_subjects_carry_filter_object(api_client):
    """Each subject item carries filter={key:'subjects', value:<code>, preserve:[]}."""
    from catalog.models import Subject
    Subject.objects.create(code='CB1', description='Test', active=True)

    response = api_client.get('/api/catalog/navigation-data/')
    assert response.status_code == 200

    subjects = response.json()['subjects']
    cb1 = next(s for s in subjects if s['code'] == 'CB1')
    assert cb1['filter'] == {
        'key': 'subjects',
        'value': 'CB1',
        'preserve': [],
    }


@pytest.mark.django_db
def test_navigation_data_product_groups_carry_filter_object(api_client):
    """Each navbarProductGroup carries filter resolved from filter_configuration_groups."""
    from filtering.models import (
        FilterConfiguration, FilterGroup, FilterConfigurationGroup,
    )
    fc = FilterConfiguration.objects.create(
        name='CAT', filter_key='categories', filter_type='filter_group',
        display_label='Category',
    )
    fg = FilterGroup.objects.create(name='Material', code='material')
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg)

    response = api_client.get('/api/catalog/navigation-data/')
    groups = response.json()['navbarProductGroups']
    material = next((g for g in groups if g.get('label') == 'Material'), None)
    assert material is not None
    assert material['filter'] == {
        'key': 'categories',
        'value': 'Material',
        'preserve': ['subjects'],
    }
```

If `api_client` fixture is not in `conftest.py`, add to test file:
```python
@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  catalog/tests/test_navigation_data_available.py -v
```
Expected: FAIL — `filter` key not in response.

- [ ] **Step 3: Modify `navigation_views.py`**

Open `backend/django_Admin3/catalog/views/navigation_views.py`. Find each location where nav items are serialized (subjects, navbarProductGroups, distanceLearningData, tutorialData). For each clickable item, add a `filter` field.

For subjects:
```python
from catalog.services.navigation_filter_mapping import resolve_nav_filter

subjects = [
    {
        'code': s.code,
        'label': f"{s.code} - {s.description}" if s.description else s.code,
        'filter': {'key': 'subjects', 'value': s.code, 'preserve': []},
    }
    for s in Subject.objects.filter(active=True).order_by('code')
]
```

For product groups (and similarly for distance-learning, tutorial root):
```python
def annotate_with_filter(group_dict, preserve=('subjects',)):
    f = resolve_nav_filter(group_dict['label'], preserve=list(preserve))
    if f is not None:
        group_dict['filter'] = f
    return group_dict

navbarProductGroups = [annotate_with_filter(g) for g in raw_groups]
```

The "Marking Vouchers" magic item — make sure it appears as a regular `navbarProductGroups` child with `label='Marking Vouchers'` so `resolve_nav_filter` finds its mapping.

- [ ] **Step 4: Run tests until green**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  catalog/tests/test_navigation_data_available.py \
  catalog/tests/test_navigation_online_classroom_lookup.py -v
```
Expected: PASS for navigation-data tests; the online_classroom_lookup test should be unaffected.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/catalog/views/navigation_views.py \
        backend/django_Admin3/catalog/tests/test_navigation_data_available.py
git commit -m "$(cat <<'EOF'
feat(catalog): navigation-data embeds filter target per clickable item

Each subject, product group, and distance-learning item now carries
filter={key, value, preserve} resolved from filter_configuration_groups.
Frontend uses a single generic click handler against this contract.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Cache invalidation for navigation-data

**Files:**
- Modify: `backend/django_Admin3/catalog/views/navigation_views.py` (only if it has caching — verify first)

- [ ] **Step 1: Check for existing cache**

```
grep -n "cache" /Users/work/Documents/Code/Admin3/backend/django_Admin3/catalog/views/navigation_views.py
```

If the view uses Django cache (`cache.get / cache.set`), ensure the cache key incorporates a version stamp tied to `FilterConfigurationGroup` updates. Otherwise admin reassignments won't propagate. If no cache exists, skip this task.

- [ ] **Step 2: (Conditional) Add an `updated_at`-based cache version key**

If caching exists:

```python
def _nav_cache_key():
    from filtering.models import FilterConfigurationGroup
    latest = FilterConfigurationGroup.objects.aggregate(
        latest=models.Max('id')  # IDs monotonically increase; cheap stand-in
    )['latest'] or 0
    return f"navigation_data_v{latest}"
```

- [ ] **Step 3: Commit (or skip)**

```bash
git add backend/django_Admin3/catalog/views/navigation_views.py
git commit -m "$(cat <<'EOF'
fix(catalog): invalidate nav-data cache on filter_configuration_groups changes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase B verification gate:**

```
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ catalog/ -q
```

---

# Phase C — Backend: legacy URL alias middleware

## Task 18: Create `LegacyFilterURLAliasMiddleware`

**Files:**
- Create: `backend/django_Admin3/filtering/middleware/__init__.py` (empty)
- Create: `backend/django_Admin3/filtering/middleware/legacy_url_alias.py`
- Test: `backend/django_Admin3/filtering/tests/middleware/__init__.py` (empty)
- Test: `backend/django_Admin3/filtering/tests/middleware/test_legacy_url_alias.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/django_Admin3/filtering/tests/middleware/test_legacy_url_alias.py`:

```python
"""Tests for LegacyFilterURLAliasMiddleware (30-day deprecation shim)."""
import pytest
from django.http import HttpResponse, QueryDict
from django.test import RequestFactory

from filtering.middleware.legacy_url_alias import LegacyFilterURLAliasMiddleware


@pytest.fixture
def middleware():
    return LegacyFilterURLAliasMiddleware(get_response=lambda req: HttpResponse('ok'))


@pytest.fixture
def factory():
    return RequestFactory()


def test_rewrites_subject_code_to_subjects(middleware, factory):
    req = factory.get('/products', {'subject_code': 'CB1'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'subjects=CB1' in response['Location']
    assert 'subject_code' not in response['Location']


def test_merges_indexed_subjects(middleware, factory):
    req = factory.get('/products', {
        'subject_code': 'CB1', 'subject_1': 'CB2', 'subject_2': 'CB3',
    })
    response = middleware(req)
    assert response.status_code == 301
    assert 'subjects=CB1%2CCB2%2CCB3' in response['Location'] \
        or 'subjects=CB1,CB2,CB3' in response['Location']


def test_rewrites_group_to_product_types(middleware, factory):
    req = factory.get('/products', {'group': 'PRINTED,EBOOK'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'product_types=PRINTED' in response['Location']


def test_rewrites_category_code_to_categories(middleware, factory):
    req = factory.get('/products', {'category_code': 'MAT', 'category_1': 'TUT'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'categories=MAT' in response['Location']
    assert 'TUT' in response['Location']


def test_passes_through_canonical_url_unchanged(middleware, factory):
    """If the URL already uses canonical form, no redirect happens."""
    req = factory.get('/products', {'subjects': 'CB1,CB2'})
    response = middleware(req)
    assert response.status_code == 200  # falls through to get_response


def test_passes_through_non_products_paths(middleware, factory):
    """Requests to paths other than /products are not affected."""
    req = factory.get('/cart/', {'subject_code': 'CB1'})
    response = middleware(req)
    assert response.status_code == 200


def test_passes_through_when_no_query_string(middleware, factory):
    req = factory.get('/products')
    response = middleware(req)
    assert response.status_code == 200


def test_preserves_unknown_params(middleware, factory):
    """Foreign params (e.g., from analytics) are preserved."""
    req = factory.get('/products', {'subject_code': 'CB1', 'utm_source': 'email'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'utm_source=email' in response['Location']
```

- [ ] **Step 2: Run to verify fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/middleware/test_legacy_url_alias.py -v
```
Expected: FAIL — middleware module doesn't exist.

- [ ] **Step 3: Implement the middleware**

Create `backend/django_Admin3/filtering/middleware/__init__.py` (empty).

Create `backend/django_Admin3/filtering/middleware/legacy_url_alias.py`:

```python
"""Legacy URL alias middleware — 30-day deprecation shim.

Rewrites old filter-param shapes to canonical form before the React app
sees them. Scheduled for removal 30 days after deploy of the filter
redesign (2026-06-12 — see docs/superpowers/specs/2026-05-13-
filter-system-redesign-design.md).

Recognized rewrites:
- subject_code, subject_1, subject_2, ...  →  subjects=A,B,C
- category_code, category_1, ...           →  categories=A,B,C
- group=A,B                                →  product_types=A,B
- mode_of_delivery=A,B                     →  modes_of_delivery=A,B

Unknown params are preserved verbatim. Requests with canonical params
already in place pass through without redirect. Requests to paths other
than /products are not touched.
"""
from urllib.parse import urlencode
from django.http import HttpResponseRedirect, QueryDict


class LegacyFilterURLAliasMiddleware:
    """Rewrites legacy filter params on /products to canonical form."""

    # Direct param renames: old key → canonical filter_key
    ALIAS_MAP = {
        'group': 'product_types',
        'mode_of_delivery': 'modes_of_delivery',
    }

    # Indexed-format mergers: base param prefix → canonical filter_key
    INDEXED_PREFIXES = {
        'subject_code': ('subject', 'subjects'),     # subject_code + subject_1 + …
        'category_code': ('category', 'categories'),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != '/products' or not request.GET:
            return self.get_response(request)

        canonical = self._canonicalize(request.GET)
        original = {k: v for k, v in request.GET.lists()}
        if canonical == original:
            return self.get_response(request)

        query = urlencode(canonical, doseq=True)
        return HttpResponseRedirect(f"/products?{query}", status=301)

    def _canonicalize(self, qs: QueryDict) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        consumed = set()

        # Pass 1: indexed prefixes
        for base_key, (prefix, target) in self.INDEXED_PREFIXES.items():
            values: list[str] = []
            # base value first (subject_code=A)
            if base_key in qs:
                values.extend(qs.getlist(base_key))
                consumed.add(base_key)
            # then numbered siblings (subject_1=B, subject_2=C) sorted by index
            indexed_keys = [
                k for k in qs.keys()
                if k.startswith(prefix + '_') and k.rsplit('_', 1)[1].isdigit()
            ]
            indexed_keys.sort(key=lambda k: int(k.rsplit('_', 1)[1]))
            for k in indexed_keys:
                values.extend(qs.getlist(k))
                consumed.add(k)
            if values:
                # canonicalize as a single comma-joined value (one param)
                out.setdefault(target, []).append(','.join(values))

        # Pass 2: direct alias renames + passthrough
        for key, values in qs.lists():
            if key in consumed:
                continue
            canonical_key = self.ALIAS_MAP.get(key, key)
            out.setdefault(canonical_key, []).extend(values)

        return out
```

- [ ] **Step 4: Verify tests pass**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/middleware/test_legacy_url_alias.py -v
```
Expected: ALL 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/middleware/ \
        backend/django_Admin3/filtering/tests/middleware/
git commit -m "$(cat <<'EOF'
feat(filtering): LegacyFilterURLAliasMiddleware (30-day deprecation shim)

Rewrites legacy filter-param shapes (subject_code+subject_N, group=,
category_code+category_N, mode_of_delivery=) to canonical form
(subjects=, product_types=, categories=, modes_of_delivery=) before
the React app sees them. 301-redirects so external link-checkers see
the new form.

Removal date: 2026-06-12 (30 days post-deploy).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Wire middleware into settings

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/base.py`

- [ ] **Step 1: Add to MIDDLEWARE list**

Open `backend/django_Admin3/django_Admin3/settings/base.py`, find the `MIDDLEWARE` list, and insert near the top (so it runs before view dispatch):

```python
MIDDLEWARE = [
    # ... other middleware
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    # ↓ Add this line — scheduled for removal 2026-06-12
    'filtering.middleware.legacy_url_alias.LegacyFilterURLAliasMiddleware',
    # ... rest
]
```

- [ ] **Step 2: Verify it loads without errors**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  /Users/work/Documents/Code/Admin3/.venv/bin/python manage.py check
```
Expected: `System check identified no issues.`

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/django_Admin3/settings/base.py
git commit -m "$(cat <<'EOF'
chore(settings): register LegacyFilterURLAliasMiddleware

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Smoke test the middleware end-to-end

**Files:**
- Modify: `backend/django_Admin3/filtering/tests/middleware/test_legacy_url_alias.py`

- [ ] **Step 1: Add an integration test using the real Django test client**

Append:

```python
@pytest.mark.django_db
def test_legacy_url_redirects_via_test_client(client):
    """End-to-end: Django test client follows the redirect chain."""
    response = client.get('/products?subject_code=CB1&group=PRINTED', follow=False)
    assert response.status_code == 301
    assert 'subjects=CB1' in response['Location']
    assert 'product_types=PRINTED' in response['Location']
```

- [ ] **Step 2: Run**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest \
  filtering/tests/middleware/test_legacy_url_alias.py::test_legacy_url_redirects_via_test_client -v
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/filtering/tests/middleware/test_legacy_url_alias.py
git commit -m "$(cat <<'EOF'
test(filtering): end-to-end smoke test for legacy URL middleware

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase C verification gate:**

```
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest filtering/ catalog/ -q
```

All backend changes complete. Frontend phases follow.

---

# Phase D — Frontend: generic Redux + legacy shim

## Task 21: New generic state shape in `baseFilters.slice.ts`

**Files:**
- Modify: `frontend/react-Admin3/src/store/slices/baseFilters.slice.ts`
- Test: `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js`:

```javascript
import filtersReducer, {
  setFilter,
  toggleFilter,
  removeFilter,
  clearFilterKey,
  clearAllFilters,
  setScalar,
} from '../filtersSlice';

describe('filtersSlice generic actions', () => {
  let state;
  beforeEach(() => {
    state = filtersReducer(undefined, { type: '@@INIT' });
  });

  it('initial state has byKey + scalar bags', () => {
    expect(state.byKey).toEqual({});
    expect(state.scalar).toEqual({});
  });

  it('setFilter overwrites byKey[key]', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1', 'CB2'] }));
    expect(state.byKey.subjects).toEqual(['CB1', 'CB2']);

    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB3'] }));
    expect(state.byKey.subjects).toEqual(['CB3']);
  });

  it('toggleFilter adds then removes', () => {
    state = filtersReducer(state, toggleFilter({ filterKey: 'categories', value: 'Material' }));
    expect(state.byKey.categories).toEqual(['Material']);

    state = filtersReducer(state, toggleFilter({ filterKey: 'categories', value: 'Material' }));
    expect(state.byKey.categories).toEqual([]);
  });

  it('removeFilter removes a specific value', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'product_types', values: ['A', 'B', 'C'] }));
    state = filtersReducer(state, removeFilter({ filterKey: 'product_types', value: 'B' }));
    expect(state.byKey.product_types).toEqual(['A', 'C']);
  });

  it('clearFilterKey empties one key only', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1'] }));
    state = filtersReducer(state, setFilter({ filterKey: 'categories', values: ['Material'] }));
    state = filtersReducer(state, clearFilterKey('subjects'));
    expect(state.byKey.subjects).toEqual([]);
    expect(state.byKey.categories).toEqual(['Material']);
  });

  it('clearAllFilters empties byKey + scalar', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1'] }));
    state = filtersReducer(state, setScalar({ filterKey: 'searchQuery', value: 'exam' }));
    state = filtersReducer(state, clearAllFilters());
    expect(state.byKey).toEqual({});
    expect(state.scalar).toEqual({});
  });

  it('setScalar updates the scalar bag', () => {
    state = filtersReducer(state, setScalar({ filterKey: 'searchQuery', value: 'tutorial' }));
    expect(state.scalar.searchQuery).toBe('tutorial');
  });

  it('setFilter resets currentPage to 1', () => {
    state = { ...state, currentPage: 5 };
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1'] }));
    expect(state.currentPage).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify fail**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npx vitest run \
  src/store/slices/__tests__/filtersSlice.generic.test.js
```
Expected: FAIL — generic actions don't exist yet.

- [ ] **Step 3: Replace `baseFilters.slice.ts` with the new generic shape**

Open `frontend/react-Admin3/src/store/slices/baseFilters.slice.ts`. Replace its full contents with:

```typescript
/**
 * Generic byKey filter state (Story redesign-1).
 *
 * Replaces the per-dimension state (subjects/categories/product_types/…)
 * and named reducers (setSubjects, toggleSubjectFilter, …) with three
 * generic actions over a Record<filterKey, string[]> bag.
 *
 * Legacy action names (setSubjects, etc.) are re-exported from
 * filtersSlice.legacy.ts as thin wrappers for backward compatibility.
 * That shim is deletable in a follow-up PR once all call sites have
 * been migrated to the generic actions.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FilterCounts {
  [filterKey: string]: Record<string, { count: number; name: string }>;
}

export interface BaseFiltersState {
  byKey: Record<string, string[]>;
  scalar: Record<string, string | null>;
  appliedFilters: { byKey: Record<string, string[]>; scalar: Record<string, string | null> };
  currentPage: number;
  pageSize: number;
  isFilterPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  filterCounts: FilterCounts;
  lastUpdated: number | null;
}

export const baseFiltersInitialState: BaseFiltersState = {
  byKey: {},
  scalar: {},
  appliedFilters: { byKey: {}, scalar: {} },
  currentPage: 1,
  pageSize: 20,
  isFilterPanelOpen: false,
  isLoading: false,
  error: null,
  filterCounts: {},
  lastUpdated: null,
};

const stamp = (state: BaseFiltersState) => {
  state.currentPage = 1;
  state.lastUpdated = Date.now();
};

export const baseFiltersReducers = {
  setFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; values: string[] }>,
  ) => {
    const { filterKey, values } = action.payload;
    state.byKey[filterKey] = values;
    stamp(state);
  },

  toggleFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string }>,
  ) => {
    const { filterKey, value } = action.payload;
    const current = state.byKey[filterKey] ?? [];
    const idx = current.indexOf(value);
    if (idx === -1) {
      state.byKey[filterKey] = [...current, value];
    } else {
      state.byKey[filterKey] = current.filter(v => v !== value);
    }
    stamp(state);
  },

  removeFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string }>,
  ) => {
    const { filterKey, value } = action.payload;
    const current = state.byKey[filterKey] ?? [];
    state.byKey[filterKey] = current.filter(v => v !== value);
    stamp(state);
  },

  clearFilterKey: (state: BaseFiltersState, action: PayloadAction<string>) => {
    delete state.byKey[action.payload];
    delete state.scalar[action.payload];
    stamp(state);
  },

  clearAllFilters: (state: BaseFiltersState) => {
    state.byKey = {};
    state.scalar = {};
    stamp(state);
  },

  resetFilters: (state: BaseFiltersState) => {
    Object.assign(state, baseFiltersInitialState, { lastUpdated: Date.now() });
  },

  setScalar: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string | null }>,
  ) => {
    const { filterKey, value } = action.payload;
    if (value === null || value === '') {
      delete state.scalar[filterKey];
    } else {
      state.scalar[filterKey] = value;
    }
    stamp(state);
  },

  setMultipleFilters: (
    state: BaseFiltersState,
    action: PayloadAction<{ byKey?: Record<string, string[]>; scalar?: Record<string, string | null> }>,
  ) => {
    if (action.payload.byKey) state.byKey = { ...action.payload.byKey };
    if (action.payload.scalar) state.scalar = { ...action.payload.scalar };
    stamp(state);
  },

  applyFilters: (state: BaseFiltersState) => {
    state.appliedFilters = {
      byKey: { ...state.byKey },
      scalar: { ...state.scalar },
    };
    state.lastUpdated = Date.now();
  },

  setFilterCounts: (state: BaseFiltersState, action: PayloadAction<FilterCounts>) => {
    state.filterCounts = action.payload;
  },

  setCurrentPage: (state: BaseFiltersState, action: PayloadAction<number>) => {
    state.currentPage = action.payload;
  },

  setPageSize: (state: BaseFiltersState, action: PayloadAction<number>) => {
    state.pageSize = action.payload;
  },

  setIsFilterPanelOpen: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isFilterPanelOpen = action.payload;
  },

  setLoading: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isLoading = action.payload;
  },

  setError: (state: BaseFiltersState, action: PayloadAction<string | null>) => {
    state.error = action.payload;
  },
};
```

- [ ] **Step 4: Wire these reducers into `filtersSlice.ts`**

Open `frontend/react-Admin3/src/store/slices/filtersSlice.ts`. Replace the createSlice call so its `reducers` block uses `baseFiltersReducers`:

```typescript
import { createSlice } from '@reduxjs/toolkit';
import { baseFiltersInitialState, baseFiltersReducers } from './baseFilters.slice';

const filtersSlice = createSlice({
  name: 'filters',
  initialState: baseFiltersInitialState,
  reducers: {
    ...baseFiltersReducers,
    // navSelectFilter added in Task 24
  },
});

export const {
  setFilter,
  toggleFilter,
  removeFilter,
  clearFilterKey,
  clearAllFilters,
  resetFilters,
  setScalar,
  setMultipleFilters,
  applyFilters,
  setFilterCounts,
  setCurrentPage,
  setPageSize,
  setIsFilterPanelOpen,
  setLoading,
  setError,
} = filtersSlice.actions;

export default filtersSlice.reducer;
```

- [ ] **Step 5: Verify the new tests pass**

```
npx vitest run src/store/slices/__tests__/filtersSlice.generic.test.js
```
Expected: 8 PASS.

Note: many OTHER tests will be broken right now because of the state-shape change. They'll be addressed via the legacy shim in Task 28.

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/store/slices/baseFilters.slice.ts \
        frontend/react-Admin3/src/store/slices/filtersSlice.ts \
        frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js
git commit -m "$(cat <<'EOF'
refactor(filters): generic byKey state + 3 generic actions

Replaces per-dimension state (subjects, categories, product_types, …) and
named reducers (setSubjects, toggleSubjectFilter, …) with byKey/scalar
bags + setFilter/toggleFilter/removeFilter/clearFilterKey/setScalar.

Legacy action names will be re-added as deprecation shims in a later
task so existing call sites keep working in this PR.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: Generic selectors

**Files:**
- Modify: `frontend/react-Admin3/src/store/slices/filterSelectors.js`
- Test: `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js` (add tests)

- [ ] **Step 1: Add failing selector tests**

Append:

```javascript
import { configureStore } from '@reduxjs/toolkit';
import {
  selectFilterValues,
  selectAllFilters,
  selectActiveFilterCount,
} from '../filterSelectors';

const mkStore = () => configureStore({ reducer: { filters: filtersReducer } });

it('selectFilterValues returns [] for unknown key', () => {
  const store = mkStore();
  expect(selectFilterValues('unknown')(store.getState())).toEqual([]);
});

it('selectFilterValues returns the array for the key', () => {
  const store = mkStore();
  store.dispatch(setFilter({ filterKey: 'subjects', values: ['CB1'] }));
  expect(selectFilterValues('subjects')(store.getState())).toEqual(['CB1']);
});

it('selectActiveFilterCount counts byKey values + scalar entries', () => {
  const store = mkStore();
  store.dispatch(setFilter({ filterKey: 'subjects', values: ['CB1', 'CB2'] }));
  store.dispatch(setFilter({ filterKey: 'categories', values: ['Material'] }));
  store.dispatch(setScalar({ filterKey: 'searchQuery', value: 'exam' }));
  expect(selectActiveFilterCount(store.getState())).toBe(4);
});
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run src/store/slices/__tests__/filtersSlice.generic.test.js -t selectFilter
```
Expected: FAIL — selectors not exported with the new shape.

- [ ] **Step 3: Rewrite `filterSelectors.js`**

Open `frontend/react-Admin3/src/store/slices/filterSelectors.js`. Replace with:

```javascript
import { createSelector } from '@reduxjs/toolkit';

export const selectFilterValues = (filterKey) => (state) =>
  state.filters.byKey[filterKey] ?? [];

export const selectFilterScalar = (filterKey) => (state) =>
  state.filters.scalar[filterKey] ?? null;

export const selectAllFilters = (state) => state.filters.byKey;
export const selectAllScalars = (state) => state.filters.scalar;
export const selectFilterCounts = (state) => state.filters.filterCounts;

export const selectActiveFilterCount = createSelector(
  [selectAllFilters, selectAllScalars],
  (byKey, scalar) =>
    Object.values(byKey).reduce((n, v) => n + v.length, 0) +
    Object.values(scalar).filter(v => v !== null && v !== '').length,
);

export const selectCurrentPage = (state) => state.filters.currentPage;
export const selectPageSize = (state) => state.filters.pageSize;
export const selectIsLoading = (state) => state.filters.isLoading;
export const selectError = (state) => state.filters.error;
export const selectIsFilterPanelOpen = (state) => state.filters.isFilterPanelOpen;
```

- [ ] **Step 4: Verify pass**

```
npx vitest run src/store/slices/__tests__/filtersSlice.generic.test.js
```
Expected: All generic-action + selector tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/store/slices/filterSelectors.js \
        frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js
git commit -m "$(cat <<'EOF'
refactor(filters): generic selectors over byKey/scalar bags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 23: `navSelectFilter` action (preserves some filter keys)

**Files:**
- Modify: `frontend/react-Admin3/src/store/slices/filtersSlice.ts`
- Test: `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js`

- [ ] **Step 1: Failing test**

Append:

```javascript
import { navSelectFilter } from '../filtersSlice';

it('navSelectFilter sets the target key and clears others except preserved', () => {
  const store = mkStore();
  store.dispatch(setFilter({ filterKey: 'subjects', values: ['CB1'] }));
  store.dispatch(setFilter({ filterKey: 'modes_of_delivery', values: ['eBook'] }));

  store.dispatch(navSelectFilter({
    filterKey: 'categories', value: 'Material',
    preserve: ['subjects'],
  }));

  const s = store.getState().filters;
  expect(s.byKey.subjects).toEqual(['CB1']);           // preserved
  expect(s.byKey.categories).toEqual(['Material']);    // newly set
  expect(s.byKey.modes_of_delivery ?? []).toEqual([]); // cleared
});

it('navSelectFilter with empty preserve clears all other filters', () => {
  const store = mkStore();
  store.dispatch(setFilter({ filterKey: 'subjects', values: ['CB1'] }));
  store.dispatch(setFilter({ filterKey: 'categories', values: ['Material'] }));

  store.dispatch(navSelectFilter({
    filterKey: 'subjects', value: 'CB2', preserve: [],
  }));

  const s = store.getState().filters;
  expect(s.byKey.subjects).toEqual(['CB2']);
  expect(s.byKey.categories ?? []).toEqual([]);
});
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run src/store/slices/__tests__/filtersSlice.generic.test.js -t navSelectFilter
```
Expected: FAIL — `navSelectFilter` not exported.

- [ ] **Step 3: Add reducer**

In `baseFilters.slice.ts`, add to `baseFiltersReducers`:

```typescript
navSelectFilter: (
  state: BaseFiltersState,
  action: PayloadAction<{ filterKey: string; value: string; preserve?: string[] }>,
) => {
  const { filterKey, value, preserve = [] } = action.payload;
  const preserveSet = new Set(preserve);
  // Clear everything except preserved keys
  for (const k of Object.keys(state.byKey)) {
    if (!preserveSet.has(k)) state.byKey[k] = [];
  }
  state.byKey[filterKey] = [value];
  stamp(state);
},
```

In `filtersSlice.ts`, add `navSelectFilter` to the destructured export.

- [ ] **Step 4: Verify**

```
npx vitest run src/store/slices/__tests__/filtersSlice.generic.test.js -t navSelectFilter
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/store/slices/baseFilters.slice.ts \
        frontend/react-Admin3/src/store/slices/filtersSlice.ts \
        frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.generic.test.js
git commit -m "$(cat <<'EOF'
feat(filters): navSelectFilter — set target key, clear non-preserved

Replaces navSelectSubject / navViewAllProducts / navSelectProductGroup /
navSelectProduct named actions. The nav menu API now declares which
keys to preserve per item; default preserve=['subjects'] matches today's
'keep subject when picking a category' semantic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 24: Update validation triggers and applyFilters wiring

**Files:**
- Modify: `frontend/react-Admin3/src/store/slices/filtersSlice.ts`

- [ ] **Step 1: Update `validationTriggers` array**

Inside `filtersSlice.ts` (or wherever `validationTriggers` lives — search for it), replace:

```typescript
const validationTriggers = [
  setSubjects.type, toggleSubjectFilter.type, removeSubjectFilter.type,
  setCategories.type, /* ... twenty-something entries ... */
];
```

with:

```typescript
const validationTriggers = [
  setFilter.type,
  toggleFilter.type,
  removeFilter.type,
  navSelectFilter.type,
  clearFilterKey.type,
  clearAllFilters.type,
  setScalar.type,
];
```

- [ ] **Step 2: Run tests touching validation triggers**

```
npx vitest run src/store/slices
```
Expected: many failures still — these are addressed in Tasks 28 + 32.

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/store/slices/filtersSlice.ts
git commit -m "$(cat <<'EOF'
refactor(filters): collapse validationTriggers to 7 generic actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 25: Delete `navigationFilters.slice.ts` (folded into main slice)

**Files:**
- Delete: `frontend/react-Admin3/src/store/slices/navigationFilters.slice.ts`
- Delete: `frontend/react-Admin3/src/store/slices/__tests__/navigationFilters.slice.test.js`

- [ ] **Step 1: Verify no live imports**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && \
  grep -rn "navigationFilters" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  | grep -v "__tests__/navigationFilters"
```

If any live (non-test) imports of `navigationFilters.slice` exist, update them to import the equivalent from `filtersSlice` (e.g., `navSelectFilter`) before deletion.

- [ ] **Step 2: Delete the files**

```bash
git rm frontend/react-Admin3/src/store/slices/navigationFilters.slice.ts \
       frontend/react-Admin3/src/store/slices/__tests__/navigationFilters.slice.test.js
```

If imports were updated in Step 1, also stage those.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
refactor(filters): delete navigationFilters slice — folded into main slice

navSelectFilter is now a reducer on filtersSlice. The separate
navigation slice was only one reducer thick.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 26: Create the legacy action shim

**Files:**
- Create: `frontend/react-Admin3/src/store/slices/filtersSlice.legacy.ts`
- Modify: `frontend/react-Admin3/src/store/slices/filtersSlice.ts` (re-export from shim)

- [ ] **Step 1: Create the shim**

Create `frontend/react-Admin3/src/store/slices/filtersSlice.legacy.ts`:

```typescript
/**
 * @deprecated Backward-compatibility shim — re-exports named action
 * creators as thin wrappers around the generic setFilter / toggleFilter /
 * removeFilter / setScalar / navSelectFilter actions.
 *
 * Schedule: this file is deleted in a follow-up PR after all call sites
 * (currently ~12 files) have been migrated to dispatch generic actions
 * directly. Migration is a mechanical grep-replace.
 *
 * Each wrapper emits a console.warn ONCE per action name in development
 * to encourage migration.
 */
import {
  setFilter as _setFilter,
  toggleFilter as _toggleFilter,
  removeFilter as _removeFilter,
  setScalar as _setScalar,
  navSelectFilter as _navSelectFilter,
} from './filtersSlice';

const warned = new Set<string>();
function warnOnce(name: string) {
  if ((import.meta as any).env?.PROD) return;
  if (warned.has(name)) return;
  warned.add(name);
  // eslint-disable-next-line no-console
  console.warn(
    `[filtersSlice.legacy] '${name}' is deprecated. ` +
    `Use the generic setFilter/toggleFilter/removeFilter/setScalar/navSelectFilter actions directly. ` +
    `This shim will be removed in a follow-up PR.`,
  );
}

// === Array-filter shims ===
export const setSubjects = (values: string[]) => {
  warnOnce('setSubjects');
  return _setFilter({ filterKey: 'subjects', values });
};
export const toggleSubjectFilter = (value: string) => {
  warnOnce('toggleSubjectFilter');
  return _toggleFilter({ filterKey: 'subjects', value });
};
export const removeSubjectFilter = (value: string) => {
  warnOnce('removeSubjectFilter');
  return _removeFilter({ filterKey: 'subjects', value });
};

export const setCategories = (values: string[]) => {
  warnOnce('setCategories');
  return _setFilter({ filterKey: 'categories', values });
};
export const toggleCategoryFilter = (value: string) => {
  warnOnce('toggleCategoryFilter');
  return _toggleFilter({ filterKey: 'categories', value });
};
export const removeCategoryFilter = (value: string) => {
  warnOnce('removeCategoryFilter');
  return _removeFilter({ filterKey: 'categories', value });
};

export const setProductTypes = (values: string[]) => {
  warnOnce('setProductTypes');
  return _setFilter({ filterKey: 'product_types', values });
};
export const toggleProductTypeFilter = (value: string) => {
  warnOnce('toggleProductTypeFilter');
  return _toggleFilter({ filterKey: 'product_types', value });
};
export const removeProductTypeFilter = (value: string) => {
  warnOnce('removeProductTypeFilter');
  return _removeFilter({ filterKey: 'product_types', value });
};

export const setProgrammeTypes = (values: string[]) => {
  warnOnce('setProgrammeTypes');
  return _setFilter({ filterKey: 'programme_type', values });
};
export const toggleProgrammeTypeFilter = (value: string) => {
  warnOnce('toggleProgrammeTypeFilter');
  return _toggleFilter({ filterKey: 'programme_type', value });
};
export const removeProgrammeTypeFilter = (value: string) => {
  warnOnce('removeProgrammeTypeFilter');
  return _removeFilter({ filterKey: 'programme_type', value });
};

export const setProducts = (values: string[]) => {
  warnOnce('setProducts');
  return _setFilter({ filterKey: 'products', values });
};
export const toggleProductFilter = (value: string) => {
  warnOnce('toggleProductFilter');
  return _toggleFilter({ filterKey: 'products', value });
};
export const removeProductFilter = (value: string) => {
  warnOnce('removeProductFilter');
  return _removeFilter({ filterKey: 'products', value });
};

export const setModesOfDelivery = (values: string[]) => {
  warnOnce('setModesOfDelivery');
  return _setFilter({ filterKey: 'modes_of_delivery', values });
};
export const toggleModeOfDeliveryFilter = (value: string) => {
  warnOnce('toggleModeOfDeliveryFilter');
  return _toggleFilter({ filterKey: 'modes_of_delivery', value });
};
export const removeModeOfDeliveryFilter = (value: string) => {
  warnOnce('removeModeOfDeliveryFilter');
  return _removeFilter({ filterKey: 'modes_of_delivery', value });
};

// === Scalar shim ===
export const setSearchQuery = (value: string) => {
  warnOnce('setSearchQuery');
  return _setScalar({ filterKey: 'searchQuery', value });
};

// === Nav shims ===
export const navSelectSubject = (code: string) => {
  warnOnce('navSelectSubject');
  return _navSelectFilter({ filterKey: 'subjects', value: code, preserve: [] });
};
export const navViewAllProducts = () => {
  warnOnce('navViewAllProducts');
  // "View all" preserves subjects, clears everything else
  return _navSelectFilter({ filterKey: 'subjects', value: '__keep__', preserve: ['subjects'] });
};
export const navSelectProductGroup = (groupName: string) => {
  warnOnce('navSelectProductGroup');
  return _navSelectFilter({ filterKey: 'product_types', value: groupName, preserve: ['subjects'] });
};
export const navSelectProduct = (productId: string | number) => {
  warnOnce('navSelectProduct');
  return _navSelectFilter({ filterKey: 'products', value: String(productId), preserve: ['subjects'] });
};
```

- [ ] **Step 2: Re-export from `filtersSlice.ts`**

At the bottom of `frontend/react-Admin3/src/store/slices/filtersSlice.ts`, add:

```typescript
// Legacy shim re-exports — deletable in a follow-up PR
export * from './filtersSlice.legacy';
```

- [ ] **Step 3: Run the slice-level tests**

```
npx vitest run src/store/slices/
```
Expected: significantly more tests passing now that legacy names resolve. Some failures may remain in test fixtures expecting the old state shape — those are addressed in Task 28.

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/store/slices/filtersSlice.legacy.ts \
        frontend/react-Admin3/src/store/slices/filtersSlice.ts
git commit -m "$(cat <<'EOF'
feat(filters): legacy action shim (filtersSlice.legacy.ts)

Re-exports setSubjects, toggleSubjectFilter, navSelectSubject, etc., as
thin wrappers around the new generic actions. Emits a console.warn
once per action name in dev to encourage migration. Deletable in a
follow-up PR once all call sites are migrated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 27: Add deprecated per-dimension selector shims

**Files:**
- Modify: `frontend/react-Admin3/src/store/slices/filterSelectors.js`

- [ ] **Step 1: Append shimmed selectors**

```javascript
/** @deprecated Use selectFilterValues('subjects') */
export const selectSubjects = (state) => state.filters.byKey.subjects ?? [];
/** @deprecated Use selectFilterValues('categories') */
export const selectCategories = (state) => state.filters.byKey.categories ?? [];
/** @deprecated Use selectFilterValues('product_types') */
export const selectProductTypes = (state) => state.filters.byKey.product_types ?? [];
/** @deprecated Use selectFilterValues('programme_type') */
export const selectProgrammeType = (state) => state.filters.byKey.programme_type ?? [];
/** @deprecated Use selectFilterValues('products') */
export const selectProducts = (state) => state.filters.byKey.products ?? [];
/** @deprecated Use selectFilterValues('modes_of_delivery') */
export const selectModesOfDelivery = (state) => state.filters.byKey.modes_of_delivery ?? [];
/** @deprecated Use selectFilterScalar('searchQuery') */
export const selectSearchQuery = (state) => state.filters.scalar.searchQuery ?? '';
/** @deprecated Use selectAllFilters + reduce over byKey */
export const selectFilters = (state) => ({
  subjects: state.filters.byKey.subjects ?? [],
  categories: state.filters.byKey.categories ?? [],
  product_types: state.filters.byKey.product_types ?? [],
  programme_type: state.filters.byKey.programme_type ?? [],
  products: state.filters.byKey.products ?? [],
  modes_of_delivery: state.filters.byKey.modes_of_delivery ?? [],
  searchQuery: state.filters.scalar.searchQuery ?? '',
});
```

- [ ] **Step 2: Run selector tests**

```
npx vitest run src/store/slices
```
Expected: Many previously-failing tests now pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/store/slices/filterSelectors.js
git commit -m "$(cat <<'EOF'
feat(filters): per-dimension selector shims (deprecated, deletable later)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 28: Update `testHelpers.js` and migrate broken tests

**Files:**
- Modify: `frontend/react-Admin3/src/test-utils/testHelpers.js` (`createMockStore` default preloadedState)
- Modify: as needed — any test still failing due to state shape

- [ ] **Step 1: Update `createMockStore` default preloadedState**

In `testHelpers.js`, find `createMockStore` and change the default `preloadedState.filters`:

```javascript
preloadedState = {
  filters: {
    byKey: {},
    scalar: {},
    appliedFilters: { byKey: {}, scalar: {} },
    currentPage: 1,
    pageSize: 20,
    isFilterPanelOpen: false,
    isLoading: false,
    error: null,
    filterCounts: {},
    lastUpdated: null,
  },
},
```

Also update `renderWithProviders` (or whichever helper accepts an `initialState`) to merge `initialState` into the new shape. If the helper currently spreads top-level filter keys into `state.filters`, add a translation layer:

```javascript
function normalizeInitialState(initialState = {}) {
  // Legacy callers passed {subjects: [...], categories: [...]} which used
  // to spread into state.filters. Translate to the new byKey shape.
  const byKey = {};
  const scalar = {};
  const knownArrayKeys = [
    'subjects', 'categories', 'product_types', 'programme_type',
    'products', 'modes_of_delivery',
  ];
  for (const key of knownArrayKeys) {
    if (initialState[key] !== undefined) byKey[key] = initialState[key];
  }
  if (initialState.searchQuery !== undefined) scalar.searchQuery = initialState.searchQuery;
  // Pass-through the rest (filterCounts, isLoading, etc.)
  return { ...initialState, byKey, scalar };
}
```

Then use `normalizeInitialState(initialState)` when constructing the store.

- [ ] **Step 2: Run the full frontend suite**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npx vitest run --reporter=dot 2>&1 | tail -10
```

Address remaining failures one by one. Most should pass via the legacy shim. Specific failures likely to remain:
- Tests asserting on `state.filters.subjects` directly → either update to `state.filters.byKey.subjects` OR rely on the deprecated selector if used.
- Tests asserting URL formats — addressed in Task 31.

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/test-utils/testHelpers.js
git commit -m "$(cat <<'EOF'
test(filters): testHelpers normalizes legacy initialState to byKey shape

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase D verification gate:**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npx vitest run --reporter=dot 2>&1 | tail -5
```
Aim: ≥ 95% of tests passing. Remaining failures should be confined to URL sync (Phase E) and FilterPanel/Nav (Phase F-G).

---

# Phase E — Frontend: registry + URL sync

## Task 29: Remove static fallback registrations from `filterRegistry.ts`

**Files:**
- Modify: `frontend/react-Admin3/src/store/filters/filterRegistry.ts`
- Test: `frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js`

- [ ] **Step 1: Write the failing regression test**

Append to `filterRegistry.test.js`:

```javascript
it('static fallback registrations are gone — registry is empty until boot', async () => {
  const mod = await import('../filterRegistry');
  const { FilterRegistry: FreshRegistry } = mod;
  FreshRegistry.clear();
  // Importing the module no longer self-registers ANY filters
  // The boot flow in App.js calls registerFromBackend() to populate it.
  expect(FreshRegistry.getAll()).toEqual([]);
});
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run src/store/filters/__tests__/filterRegistry.test.js -t "static fallback"
```
Expected: FAIL — registry currently has 6 static entries.

- [ ] **Step 3: Delete the static block**

In `filterRegistry.ts`, delete the entire static registration block (the `FilterRegistry.register({type: 'programme_type', …})` through `FilterRegistry.register({type: 'searchQuery', …})` calls, currently around lines 280-371). Leave the class definition and the `registerFromBackend` static method intact.

- [ ] **Step 4: Verify**

```
npx vitest run src/store/filters/__tests__/filterRegistry.test.js
```
Expected: New regression test PASSES; existing tests that depended on static registration may now fail — update them to call `FilterRegistry.registerFromBackend({...mockConfig})` in their setUp.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/store/filters/filterRegistry.ts \
        frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js
git commit -m "$(cat <<'EOF'
refactor(filters): remove static fallback registrations

The registry is now populated exclusively by registerFromBackend() called
from App.js boot. A boot gate (Task 34) ensures the registry is filled
before any URL parsing or panel rendering.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 30: Make `filterUrlManager.ts` fully registry-driven

**Files:**
- Modify: `frontend/react-Admin3/src/utils/filterUrlManager.ts`
- Modify: `frontend/react-Admin3/src/utils/__tests__/filterUrlManager.test.js`

- [ ] **Step 1: Update tests to canonical URL format**

In `filterUrlManager.test.js`, replace every indexed-format expectation:
- `subject_code=CB1&subject_1=CB2` → `subjects=CB1,CB2`
- `category_code=MAT&category_1=TUT` → `categories=MAT,TUT`

Add a new test:

```javascript
it('DEFAULT_FILTERS is derived dynamically from the registry', () => {
  FilterRegistry.clear();
  FilterRegistry.register({
    type: 'foo', label: 'Foo', urlParam: 'foo',
    multiple: true, dataType: 'array', urlFormat: 'comma-separated', order: 1,
  });
  const defaults = buildDefaultFilters();
  expect(defaults.byKey.foo).toEqual([]);
  expect(defaults.byKey.subjects).toBeUndefined();
});
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run src/utils/__tests__/filterUrlManager.test.js
```
Expected: FAIL on the new test + on the canonical-format assertions.

- [ ] **Step 3: Rewrite `filterUrlManager.ts`**

```typescript
import { FilterRegistry } from '../store/filters/filterRegistry';

export interface FilterState {
  byKey: Record<string, string[]>;
  scalar: Record<string, string | null>;
}

export function buildDefaultFilters(): FilterState {
  const byKey: Record<string, string[]> = {};
  const scalar: Record<string, string | null> = {};
  for (const cfg of FilterRegistry.getAll()) {
    if (cfg.dataType === 'array') byKey[cfg.urlParam] = [];
    else scalar[cfg.urlParam] = null;
  }
  return { byKey, scalar };
}

export function parseUrlToFilters(params: URLSearchParams): FilterState {
  const result = buildDefaultFilters();
  for (const cfg of FilterRegistry.getAll()) {
    const raw = params.get(cfg.urlParam);
    if (raw === null || raw === '') continue;
    if (cfg.dataType === 'array') {
      result.byKey[cfg.urlParam] = raw.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      result.scalar[cfg.urlParam] = raw;
    }
  }
  return result;
}

export function buildUrlFromState(state: FilterState): string {
  const parts: string[] = [];
  for (const cfg of FilterRegistry.getAll()) {
    if (cfg.dataType === 'array') {
      const values = state.byKey?.[cfg.urlParam] ?? [];
      if (values.length === 0) continue;
      parts.push(`${cfg.urlParam}=${encodeURIComponent(values.join(','))}`);
    } else {
      const value = state.scalar?.[cfg.urlParam];
      if (!value) continue;
      parts.push(`${cfg.urlParam}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length ? `/products?${parts.join('&')}` : '/products';
}
```

- [ ] **Step 4: Verify**

```
npx vitest run src/utils/__tests__/filterUrlManager.test.js
```
Expected: PASS (with the test setUp ensuring `registerFromBackend` was called with a fixture config that includes subjects/categories/product_types/etc.).

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/utils/filterUrlManager.ts \
        frontend/react-Admin3/src/utils/__tests__/filterUrlManager.test.js
git commit -m "$(cat <<'EOF'
refactor(filters): filterUrlManager is fully registry-driven

DEFAULT_FILTERS built dynamically from FilterRegistry.getAll().
URL format is canonical comma-separated for arrays; the indexed
format (subject_code=A&subject_1=B) is gone — legacy URLs are
rewritten by LegacyFilterURLAliasMiddleware at the Django layer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 31: Update `urlSyncMiddleware.ts` to generic action allowlist

**Files:**
- Modify: `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.ts`
- Modify: `frontend/react-Admin3/src/store/middleware/__tests__/urlSyncMiddleware.test.js`

- [ ] **Step 1: Update tests for canonical contract**

In `urlSyncMiddleware.test.js`, update expectations:
- `setSubjects(['CB1','CB2'])` dispatched should produce URL containing `subjects=CB1%2CCB2` (canonical).
- Add a test: dispatching `setFilter({filterKey:'subjects',values:['CB1']})` produces the same URL.
- Add a regression test: dispatching a future filter via `setFilter({filterKey:'tutorial_location',values:['London']})` AFTER registering it produces `tutorial_location=London` in the URL with no middleware code change.

- [ ] **Step 2: Run to verify fail**

```
npx vitest run src/store/middleware/__tests__/urlSyncMiddleware.test.js
```
Expected: FAIL.

- [ ] **Step 3: Rewrite middleware**

In `urlSyncMiddleware.ts`, replace the hardcoded `FILTER_ACTION_TYPES` array and `FILTER_PARAM_PATTERNS` regex list with a generic allowlist derived from action types:

```typescript
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { buildUrlFromState } from '../../utils/filterUrlManager';
import {
  setFilter, toggleFilter, removeFilter, clearFilterKey, clearAllFilters,
  resetFilters, setScalar, navSelectFilter, setMultipleFilters,
} from '../slices/filtersSlice';

export const urlSyncMiddleware = createListenerMiddleware();

const ACTION_TYPES = new Set([
  setFilter.type,
  toggleFilter.type,
  removeFilter.type,
  clearFilterKey.type,
  clearAllFilters.type,
  resetFilters.type,
  setScalar.type,
  navSelectFilter.type,
  setMultipleFilters.type,
]);

let lastUrl = '';

urlSyncMiddleware.startListening({
  predicate: (action) => ACTION_TYPES.has(action.type),
  effect: (action, api) => {
    const state = (api.getState() as any).filters;
    const url = buildUrlFromState({ byKey: state.byKey, scalar: state.scalar });
    if (url === lastUrl) return;
    window.history.replaceState({}, '', url);
    lastUrl = url;
  },
});

export { parseUrlToFilters } from '../../utils/filterUrlManager';
```

- [ ] **Step 4: Verify**

```
npx vitest run src/store/middleware/__tests__/urlSyncMiddleware.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.ts \
        frontend/react-Admin3/src/store/middleware/__tests__/urlSyncMiddleware.test.js
git commit -m "$(cat <<'EOF'
refactor(filters): urlSyncMiddleware uses generic action types

Allowlist is 9 generic action types instead of ~30 named action types.
Adding a new filter requires no middleware change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 32: Update integration test `filterRegistry.integration.test.js`

**Files:**
- Modify: `frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.integration.test.js`

- [ ] **Step 1: Refactor tests to call `registerFromBackend` in setUp**

Add a `beforeEach`:

```javascript
beforeEach(() => {
  FilterRegistry.clear();
  FilterRegistry.registerFromBackend({
    subjects: { filter_key: 'subjects', label: 'Subject', display_order: 2, allow_multiple: true },
    categories: { filter_key: 'categories', label: 'Category', display_order: 3, allow_multiple: true },
    product_types: { filter_key: 'product_types', label: 'Product Type', display_order: 4, allow_multiple: true },
    modes_of_delivery: { filter_key: 'modes_of_delivery', label: 'Mode of Delivery', display_order: 5, allow_multiple: true },
    programme_type: { filter_key: 'programme_type', label: 'Programme', display_order: 1, allow_multiple: true },
  });
});
```

Update the "filters in correct order" test if needed (should still hold).

- [ ] **Step 2: Run**

```
npx vitest run src/store/filters/__tests__/filterRegistry.integration.test.js
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.integration.test.js
git commit -m "$(cat <<'EOF'
test(filters): integration tests register from backend in beforeEach

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase E verification gate:**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npx vitest run --reporter=dot 2>&1 | tail -5
```

---

# Phase F — Frontend: UI + boot gate

## Task 33: `useFilterPanelVM.ts` iterates registry

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/useFilterPanelVM.ts`

- [ ] **Step 1: Replace per-filter switch with registry iteration**

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { FilterRegistry } from '../../store/filters/filterRegistry';
import {
  toggleFilter,
  clearFilterKey,
  clearAllFilters,
} from '../../store/slices/filtersSlice';
import {
  selectAllFilters,
  selectFilterCounts,
} from '../../store/slices/filterSelectors';

const useFilterPanelVM = () => {
  const dispatch = useDispatch();
  const filters = useSelector(selectAllFilters);  // { subjects: [...], … }
  const filterCounts = useSelector(selectFilterCounts);

  // Sections are everything in the registry except scalar (searchQuery)
  const sections = FilterRegistry.getAll().filter(c => c.dataType === 'array');

  const handleFilterChange = (filterKey: string, value: string) => {
    dispatch(toggleFilter({ filterKey, value }));
  };

  const handleClearKey = (filterKey: string) => {
    dispatch(clearFilterKey(filterKey));
  };

  const handleClearAll = () => dispatch(clearAllFilters());

  return { sections, filters, filterCounts, handleFilterChange, handleClearKey, handleClearAll };
};

export default useFilterPanelVM;
```

If the existing `useFilterPanelVM.ts` has additional helpers (expanded-panel state, etc.), preserve those — only collapse the per-filter switch.

- [ ] **Step 2: Run FilterPanel tests**

```
npx vitest run src/components/Product/FilterPanel.test.js \
              src/components/Product/__tests__/useFilterPanelVM.test.* 2>&1 | tail -10
```
Address fixture stale-ness as needed (some tests may need to call `registerFromBackend` in setUp).

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/useFilterPanelVM.ts
git commit -m "$(cat <<'EOF'
refactor(filters): useFilterPanelVM iterates registry, no per-filter switch

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 34: Add boot gate to `App.js`

**Files:**
- Modify: `frontend/react-Admin3/src/App.js`

- [ ] **Step 1: Replace the existing useEffect that registers from backend**

```javascript
import { FilterRegistry } from './store/filters/filterRegistry';
import productService from './services/productService';
import { setMultipleFilters } from './store/slices/filtersSlice';
import { parseUrlToFilters } from './utils/filterUrlManager';

const App = () => {
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    productService.getFilterConfiguration()
      .then(cfg => {
        if (cancelled) return;
        FilterRegistry.registerFromBackend(cfg);
        // Now that the registry knows about all filter keys, parse URL.
        const fromUrl = parseUrlToFilters(new URLSearchParams(window.location.search));
        store.dispatch(setMultipleFilters(fromUrl));
        setBootComplete(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[App] Filter configuration failed to load; rendering app without filters.', err);
        setBootComplete(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!bootComplete) {
    return <BootLoadingScreen />;  // small spinner, no router yet
  }

  return (
    <Provider store={store}>
      <Router>
        {/* ... routes ... */}
      </Router>
    </Provider>
  );
};
```

The `BootLoadingScreen` component can be a simple centered MUI CircularProgress.

- [ ] **Step 2: Run App-level tests**

```
npx vitest run src/__tests__/App.test.* 2>&1 | tail -10
```
Most likely fix needed: mock `productService.getFilterConfiguration` in test setUp so the boot resolves immediately. Look for a `mockApi.js` or jest/vitest setup file.

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/App.js
git commit -m "$(cat <<'EOF'
feat(filters): App.js boot gate waits for filter config before mounting

Without the static fallback registrations (removed in Task 29), the
registry is empty until the backend response lands. The boot gate
prevents components from mounting with zero registered filters and
silently stripping all URL params.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 35: Run FilterPanel + App test families to ensure green

**Files:**
- Modify: any remaining test fixtures that fail

- [ ] **Step 1: Run all UI tests**

```
npx vitest run src/components/Product/ src/__tests__/ 2>&1 | tail -10
```

- [ ] **Step 2: Fix any remaining stale fixtures**

Most fixes will be:
- Adding `FilterRegistry.registerFromBackend({...})` to test setUp.
- Updating test assertions for the new "Programmes" section header.

- [ ] **Step 3: Commit any fixture updates**

```bash
git add frontend/react-Admin3/src/components/Product/
git commit -m "$(cat <<'EOF'
test(filters): align FilterPanel fixtures with registry-driven sections

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase F verification gate:** Full frontend suite green.

---

# Phase G — Frontend: nav menu generic handler

## Task 36: Collapse 6 nav handlers to one in `useMainNavBarVM.ts`

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/useMainNavBarVM.ts`
- Test: `frontend/react-Admin3/src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js` (new)

- [ ] **Step 1: Write the failing tests**

Create `frontend/react-Admin3/src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js`:

```javascript
import { renderHook, act } from '@testing-library/react';
import useMainNavBarVM from '../useMainNavBarVM';
import { FilterRegistry } from '../../../store/filters/filterRegistry';
// ... necessary providers (Redux, router) wrapper

beforeEach(() => {
  FilterRegistry.clear();
  FilterRegistry.registerFromBackend({
    subjects: { filter_key: 'subjects', label: 'Subject', display_order: 1, allow_multiple: true },
    categories: { filter_key: 'categories', label: 'Category', display_order: 2, allow_multiple: true },
  });
});

it('handleNavClick dispatches navSelectFilter with the item.filter payload', () => {
  // ... render hook with mocked Redux + Router
  const { result } = renderHook(() => useMainNavBarVM());

  act(() => {
    result.current.handleNavClick({
      key: 'categories', value: 'Material', preserve: ['subjects'],
    });
  });

  // assert: store state.filters.byKey.categories === ['Material']
});

it('handleNavClick ignores items with unknown filter_key (warns)', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const { result } = renderHook(() => useMainNavBarVM());
  act(() => {
    result.current.handleNavClick({ key: 'made_up', value: 'x' });
  });
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown filter_key'));
  warn.mockRestore();
});
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js
```
Expected: FAIL — `handleNavClick` not exported.

- [ ] **Step 3: Rewrite `useMainNavBarVM.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useConfig } from '../../contexts/ConfigContext';
import productService from '../../services/productService';
import { navSelectFilter } from '../../store/slices/filtersSlice';
import { FilterRegistry } from '../../store/filters/filterRegistry';

interface NavFilter {
  key: string;
  value: string;
  preserve?: string[];
}

const useMainNavBarVM = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isInternal, configLoaded } = useConfig();
  // ... existing state (expanded, modals, etc.)

  // ... existing useEffect to fetch nav data

  const handleNavClick = useCallback((filter?: NavFilter) => {
    if (!filter) {
      navigate('/products');
      return;
    }
    if (!FilterRegistry.has(filter.key)) {
      console.warn(`[Nav] Unknown filter_key: ${filter.key}. Item ignored.`);
      navigate('/products');
      return;
    }
    dispatch(navSelectFilter({
      filterKey: filter.key,
      value: filter.value,
      preserve: filter.preserve ?? [],
    }));
    navigate('/products');
  }, [dispatch, navigate]);

  return {
    // ... existing state
    handleNavClick,
    // KEEP for backward compat (uses shim) — TODO remove in follow-up PR
    handleSubjectClick: (code: string) => handleNavClick({ key: 'subjects', value: code, preserve: [] }),
    handleProductClick: () => handleNavClick(undefined),
    handleProductGroupClick: (groupName: string) =>
      handleNavClick({ key: 'categories', value: groupName, preserve: ['subjects'] }),
    handleSpecificProductClick: (productId: number | string) =>
      handleNavClick({ key: 'products', value: String(productId), preserve: ['subjects'] }),
    handleProductVariationClick: () => navigate('/products'),
    handleMarkingVouchersClick: (e: React.MouseEvent) => {
      e.preventDefault();
      handleNavClick({ key: 'product_types', value: 'Marking Vouchers', preserve: ['subjects'] });
    },
  };
};
```

The shims keep the existing `NavigationMenu` / `MobileNavigation` prop signatures working in this PR; follow-up PR collapses them to `handleNavClick`.

- [ ] **Step 4: Verify**

```
npx vitest run src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/Navigation/useMainNavBarVM.ts \
        frontend/react-Admin3/src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js
git commit -m "$(cat <<'EOF'
refactor(navigation): single handleNavClick generic + backward shims

Original 6 click handlers now delegate to handleNavClick({filter}).
NavigationMenu / MobileNavigation prop signatures unchanged in this PR;
a follow-up PR will collapse them to a single onNavClick prop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 37: NavigationMenu reads `filter` field per item

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/NavigationMenu.tsx` (or wherever clicks are wired to specific handlers)

- [ ] **Step 1: Update click wiring to use `handleNavClick`**

Find places where nav items are rendered with `onClick={() => handleSubjectClick(...)}` style. Where the item has a `filter` field (Task 16 added it), prefer:

```typescript
<MenuItem onClick={() => handleNavClick(subject.filter)}>
  {subject.label}
</MenuItem>
```

Existing call sites that don't have a `filter` field yet keep using the shim. Mark them with `// TODO: switch to filter-object click in follow-up PR`.

- [ ] **Step 2: Run navigation tests**

```
npx vitest run src/components/Navigation 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/Navigation/NavigationMenu.tsx
git commit -m "$(cat <<'EOF'
refactor(navigation): NavigationMenu prefers item.filter when available

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 38: Update MainNavBar tests for new generic handler

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/__tests__/MainNavBar.test.js`
- Modify: `frontend/react-Admin3/src/components/Navigation/__tests__/NavigationMenu.test.js`

- [ ] **Step 1: Update fixtures**

Mock `productService.getNavigationData` to return items with `filter` fields populated. Pattern:

```javascript
productService.getNavigationData.mockResolvedValue({
  subjects: [
    { code: 'CB1', label: 'CB1 - Test', filter: { key: 'subjects', value: 'CB1', preserve: [] } },
  ],
  navbarProductGroups: [
    { id: 1, label: 'Material', filter: { key: 'categories', value: 'Material', preserve: ['subjects'] }, children: [] },
  ],
  // ...
});
```

- [ ] **Step 2: Run**

```
npx vitest run src/components/Navigation 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/Navigation/__tests__/
git commit -m "$(cat <<'EOF'
test(navigation): fixture items carry filter field

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase G verification gate:** All navigation tests pass.

---

# Phase H — Cleanup + verification

## Task 39: Delete dead files

**Files:**
- Delete (if not already deleted in Task 25): `frontend/react-Admin3/src/store/slices/navigationFilters.slice.ts`

- [ ] **Step 1: Grep for any leftover dead imports**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && \
  grep -rn "FilterOptionProvider\|_resolve_group_ids_with_hierarchy\|_build_descendant_map\|navigationFilters" \
    --include="*.ts" --include="*.tsx" --include="*.js" src/
```

Each hit is a dead import — update or delete.

- [ ] **Step 2: Commit cleanups**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove leftover dead imports referencing deleted symbols

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 40: Final full-suite verification

- [ ] **Step 1: Run backend suite**

```
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && \
  DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  /Users/work/Documents/Code/Admin3/.venv/bin/python -m pytest -q
```
Expected: 100% PASS.

- [ ] **Step 2: Run frontend suite**

```
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npx vitest run --reporter=dot
```
Expected: 0 failures.

- [ ] **Step 3: Manual smoke test in dev server**

```
# In terminal 1 — backend
cd backend/django_Admin3 && python manage.py runserver 8888

# In terminal 2 — frontend
cd frontend/react-Admin3 && npm start
```

In the browser:
- Open `http://127.0.0.1:3000/products` and confirm 6 filter sections render in DB display_order.
- Click each nav item. URL changes to canonical `?<filter_key>=<value>` form.
- Paste `http://127.0.0.1:3000/products?subjects=CB1,CB2&categories=Material` — confirm filter restoration.
- Paste a legacy URL `http://127.0.0.1:3000/products?subject_code=CB1&group=PRINTED` — confirm a 301 redirect to canonical, with filters applied.

---

## Task 41: Open PR

- [ ] **Step 1: Push the branch**

```bash
git push origin feat/20260513-filter-system-redesign
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --base main --title "feat(filters): DB-driven filter system redesign (full vertical)" \
  --body "$(cat <<'EOF'
## Summary

Refactors the filter system so a new filter is a DB row + one backend handler, not a 6-file frontend dance.

Implements [docs/superpowers/specs/2026-05-13-filter-system-redesign-design.md](../tree/main/docs/superpowers/specs/2026-05-13-filter-system-redesign-design.md).

### What changes

- **Backend:** `FilterHandler` ABC dispatches on `filter_type`; three handlers ship (subject, subject_type, filter_group). Drop FilterGroup.parent_id, dead JSONFields, descendant-tree walking. Navigation API embeds `{filter_key, value, preserve}` per item. 30-day Django middleware rewrites legacy URLs.
- **Frontend:** Generic `byKey`/`scalar` Redux state with three generic actions; FilterPanel + URL sync entirely registry-driven; nav menu collapses to one `handleNavClick`. Legacy action shims preserved for one PR.
- **URL contract:** Hard switch to canonical `?{filter_key}={comma_values}`. Legacy URLs auto-redirect for 30 days.

### Out of scope
- Removing the legacy action shim file (`filtersSlice.legacy.ts`) — follow-up PR after grep-replacing ~12 call sites.
- Adding `tutorial_location` filter — designed-for, not implemented.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Watch CI**

```bash
gh pr checks --watch --fail-fast
```

- [ ] **Step 4: Merge**

```bash
gh pr merge --squash --delete-branch
```

---

# Appendix: Spec coverage matrix

| Spec section | Tasks |
|---|---|
| §1 Data Model: drop parent_id, drop dead JSONFields, clean up FCG mapping | 1, 2, 3 |
| §2 Backend Filter Dispatcher: handlers, service rewrite | 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 |
| §3 Frontend Generic Redux State | 21, 22, 23, 24, 25, 26, 27, 28 |
| §4 URL Sync — Canonical Contract | 30, 31 |
| §5 Nav Menu API + Handlers | 15, 16, 17, 36, 37, 38 |
| §6 Migration, Tests, Rollout | 1, 2, 3, 13, 14, 18, 19, 20, 39, 40, 41 |
| Boot gate (registry empty until backend response) | 29, 34 |
| Legacy URL alias middleware | 18, 19, 20 |

# Appendix: Quick reference of file changes

| File | Created | Modified | Deleted |
|---|---|---|---|
| `filtering/services/filter_handlers.py` | ✓ | — | — |
| `filtering/services/filter_service.py` | — | ✓ | — |
| `filtering/models/filter_group.py` | — | ✓ (drop parent) | — |
| `filtering/models/filter_configuration.py` | — | ✓ (drop JSONFields) | — |
| `filtering/middleware/legacy_url_alias.py` | ✓ | — | — |
| `filtering/migrations/0012_drop_filter_group_parent.py` | ✓ | — | — |
| `filtering/migrations/0013_filter_configuration_cleanup.py` | ✓ | — | — |
| `filtering/migrations/0014_clean_subject_type_fcg_mapping.py` | ✓ | — | — |
| `filtering/tests/test_filter_group_hierarchy.py` | — | — | ✓ |
| `filtering/tests/test_hierarchy_resolution.py` | — | — | ✓ |
| `filtering/tests/test_resolve_group_warns_on_miss.py` | — | — | ✓ |
| `catalog/services/navigation_filter_mapping.py` | ✓ | — | — |
| `catalog/views/navigation_views.py` | — | ✓ (embed filter) | — |
| `frontend/react-Admin3/src/store/slices/baseFilters.slice.ts` | — | ✓ (rewrite) | — |
| `frontend/react-Admin3/src/store/slices/filtersSlice.ts` | — | ✓ (rewrite) | — |
| `frontend/react-Admin3/src/store/slices/filtersSlice.legacy.ts` | ✓ | — | — |
| `frontend/react-Admin3/src/store/slices/filterSelectors.js` | — | ✓ (rewrite) | — |
| `frontend/react-Admin3/src/store/slices/navigationFilters.slice.ts` | — | — | ✓ |
| `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.ts` | — | ✓ (rewrite) | — |
| `frontend/react-Admin3/src/store/filters/filterRegistry.ts` | — | ✓ (delete static block) | — |
| `frontend/react-Admin3/src/utils/filterUrlManager.ts` | — | ✓ (rewrite) | — |
| `frontend/react-Admin3/src/components/Product/useFilterPanelVM.ts` | — | ✓ (iterate registry) | — |
| `frontend/react-Admin3/src/components/Navigation/useMainNavBarVM.ts` | — | ✓ (one handler) | — |
| `frontend/react-Admin3/src/App.js` | — | ✓ (boot gate) | — |
| `frontend/react-Admin3/src/test-utils/testHelpers.js` | — | ✓ (new mock shape) | — |
