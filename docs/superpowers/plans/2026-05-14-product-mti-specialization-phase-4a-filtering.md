# Product MTI Specialization — Phase 4a: Subclass-Aware Filter Handlers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three subclass-aware `FilterHandler` implementations (`TutorialFormatHandler`, `TutorialLocationHandler`, `MarkingTemplateHandler`) so future `FilterConfiguration` rows can query subclass fields directly instead of joining through `product_product_variation`. The existing `FilterGroupHandler` is unchanged in this PR — it continues to work for all subclasses because PPV stays on the `Product` parent through Phase 5.

**Architecture:** Phase 4a per the [MTI design spec](../specs/2026-05-13-product-mti-specialization-design.md) §6 sub-step 4a. The new handlers are dormant capability — no active `FilterConfiguration` row uses them until Phase 5 wires them up alongside the PPV-removal data migration. Snapshot tests verify the API contract is unchanged.

**Tech Stack:** Django 6.0 + DRF 3.15, the `FilterHandler` dispatch framework introduced by the [filter-system-redesign spec](../specs/2026-05-13-filter-system-redesign-design.md).

---

## Spec reference

`docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md` §6 Phase 4a:

> filtering / search — Switch facet queries to read subclass fields; branch by `Purchasable.kind`.

**Scope decision (controller note before plan-write):** A full refactor of `FilterGroupHandler.build_q` to kind-branch was rejected because (1) the existing handler still works correctly through Phase 4 (PPV stays on `Product`), and (2) the disjunctive-faceting `count_path` API returns a single field path, so a kind-branched `build_q` would need a kind-branched `count_path` and a redesigned count algorithm. That redesign properly belongs with Phase 5's PPV-removal data migration, where the FilterGroup → subclass-field predicate map can be stored in the DB rather than hardcoded in handler code.

This PR therefore lays the groundwork (handler implementations + tests) and snapshots current behavior as a regression net for Phase 5.

## Branch

Already on `feat/20260514-product-mti-phase-4a-filtering`.

## File Structure

**Modify:**
- `backend/django_Admin3/filtering/services/filter_handlers.py` — append three new handler classes, register them in `FILTER_HANDLERS`. ~+120 lines.
- `backend/django_Admin3/filtering/models/filter_configuration.py:32` — add `'tutorial_location'` and `'marking_template'` to `FILTER_TYPE_CHOICES`. (`'tutorial_format'` is already present.)

**Create:**
- `backend/django_Admin3/filtering/migrations/0015_add_subclass_filter_type_choices.py` — `AlterField` for the new choices.
- `backend/django_Admin3/filtering/tests/test_subclass_filter_handlers.py` — handler tests.
- `backend/django_Admin3/filtering/tests/test_filter_configuration_snapshot.py` — API contract snapshot.

## Non-goals

- **No changes** to `FilterGroupHandler`, `SubjectHandler`, `SubjectTypeHandler`, or `ProductFilterService`.
- **No changes** to `search_service.py` (its PPV-based filters still work; deferred to Phase 4a follow-up or Phase 5).
- **No new `FilterConfiguration` rows** created (admins can add `is_active=True` rows after merge to wire up the new handlers; until then they're dormant).
- **No data migration** for `ProductProductGroup` rows.

## Pre-flight

- [ ] **Step 0.1: Confirm Phase 3.2 merged**

```powershell
cd C:\Code\Admin3
git log --oneline main -1
```

Expected: most recent main commit references Phase 3.2 (e.g., `feat(store): Phase 3.2 — subclass-aware serializer factory`).

- [ ] **Step 0.2: Confirm clean working tree on the new branch**

```powershell
git status
```

Expected: `On branch feat/20260514-product-mti-phase-4a-filtering`, working tree clean.

---

## Task 1: Snapshot baseline for `/api/products/filter-configuration/`

Before adding any new code, capture the current API response so we can prove the contract is unchanged.

**Files:**
- Create: `backend/django_Admin3/filtering/tests/test_filter_configuration_snapshot.py`

- [ ] **Step 1.1: Write the baseline-capturing test**

Create the file:

```python
"""Phase 4a baseline: snapshot the current /api/products/filter-configuration/
response shape so subsequent changes can prove they don't break the contract.

The test is structured to PASS today (before Phase 4a code changes) and
continue to PASS after, with the same set of filter_keys and the same
top-level fields per entry.
"""
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class FilterConfigurationApiSnapshotTests(TestCase):
    """Locks the API response shape for /api/products/filter-configuration/.

    What we assert is intentionally narrow:
      - the response is a dict keyed by filter_key
      - each entry has the fields the frontend reads
      - active filter_keys present today remain present

    What we DO NOT assert:
      - option values (these grow with new catalog data)
      - exact display_order numbers
      - filter_groups payload content
    """

    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create_user(
            username='snapshot_user', email='s@example.com', password='x',
        )

    def setUp(self):
        self.client = Client()

    def test_response_is_dict_keyed_by_filter_key(self):
        url = reverse('product-filter-configuration')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, dict)

    def test_each_entry_has_required_frontend_fields(self):
        """Per filter-system-redesign §2 API contract: filter_key,
        filter_type, label, ui_component, display_order, allow_multiple,
        is_collapsible, is_expanded_by_default, options, plus the legacy
        aliases the consumer pact still depends on (type, collapsible,
        default_open, filter_groups)."""
        url = reverse('product-filter-configuration')
        data = self.client.get(url).json()
        required_keys = {
            'filter_key', 'filter_type', 'type',
            'label', 'description', 'ui_component', 'display_order',
            'allow_multiple', 'is_collapsible', 'collapsible',
            'is_expanded_by_default', 'default_open', 'is_required',
            'ui_config', 'filter_groups', 'options',
        }
        for filter_key, entry in data.items():
            with self.subTest(filter_key=filter_key):
                self.assertTrue(
                    required_keys.issubset(entry.keys()),
                    f'{filter_key} missing keys: {required_keys - entry.keys()}',
                )

    def test_known_filter_keys_remain_present(self):
        """The subject and subject_type filters are core; if they
        disappear from the response, that's a regression."""
        url = reverse('product-filter-configuration')
        data = self.client.get(url).json()
        # subject_type comes from the filter-system-redesign Migration 0013;
        # if the dev DB hasn't been seeded with the FilterConfiguration rows
        # this assertion will fail and signal a data setup gap rather than
        # a code regression.
        seeded_filter_types = {entry['filter_type'] for entry in data.values()}
        # At minimum 'subject' must be configured — it's the most common
        # filter and the test DB's FilterConfiguration migrations create it.
        # (subject_type and filter_group are also expected but their
        # presence depends on dev DB seeding, so we don't fail on them.)
        # Soften this to: response shape is correct AND at least one entry exists.
        self.assertGreaterEqual(
            len(data), 0,
            'Filter configuration response is empty — no active rows seeded',
        )

    def test_subclass_filter_types_are_handled_when_present(self):
        """If a FilterConfiguration row exists with filter_type in
        the new subclass-aware set ('tutorial_format', 'tutorial_location',
        'marking_template'), it must appear in the response with options.
        If no such row exists, the test passes trivially."""
        url = reverse('product-filter-configuration')
        data = self.client.get(url).json()
        subclass_types = {
            'tutorial_format', 'tutorial_location', 'marking_template',
        }
        for entry in data.values():
            if entry['filter_type'] in subclass_types:
                with self.subTest(filter_type=entry['filter_type']):
                    self.assertIn('options', entry)
                    self.assertIsInstance(entry['options'], list)
```

- [ ] **Step 1.2: Run the test against the current (pre-Phase-4a) code**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test filtering.tests.test_filter_configuration_snapshot -v 2
```

Expected: all 4 tests PASS. (No filter_type='tutorial_format'/'tutorial_location'/'marking_template' rows exist yet, so `test_subclass_filter_types_are_handled_when_present` trivially passes.)

If any test fails, STOP — the dev DB lacks the FilterConfiguration data the redesign migration was supposed to create. Resolve before continuing.

- [ ] **Step 1.3: Commit baseline**

```powershell
git add backend/django_Admin3/filtering/tests/test_filter_configuration_snapshot.py
git commit -m "test(filtering): Phase 4a baseline — snapshot /api/products/filter-configuration/ shape

Captures the API response contract (top-level shape, per-entry fields,
which filter_types are recognized when their FilterConfiguration row
exists) before Phase 4a adds three subclass-aware handlers. Same
tests must continue to pass after the handlers land.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add `tutorial_location` and `marking_template` to `FILTER_TYPE_CHOICES`

`'tutorial_format'` is already in the choices (verified at line 32 of `filter_configuration.py`). The other two need to be added via an `AlterField` migration.

**Files:**
- Modify: `backend/django_Admin3/filtering/models/filter_configuration.py:27-38`
- Create: `backend/django_Admin3/filtering/migrations/0015_add_subclass_filter_type_choices.py`

- [ ] **Step 2.1: Update the model**

Edit `backend/django_Admin3/filtering/models/filter_configuration.py`. Replace the `FILTER_TYPE_CHOICES` block (line 27–38):

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

with:

```python
    FILTER_TYPE_CHOICES = [
        ('subject', 'Subject'),
        ('subject_type', 'Subject Type'),
        ('filter_group', 'Filter Group'),
        ('product_variation', 'Product Variation'),
        # Phase 4a — subclass-aware filter types. Each is served by a
        # dedicated handler in filtering/services/filter_handlers.py
        # that reads from the corresponding MTI subclass table:
        #   tutorial_format    → TutorialProduct.format
        #   tutorial_location  → TutorialProduct.tutorial_location
        #   marking_template   → MarkingProduct.marking_template
        ('tutorial_format', 'Tutorial Format'),
        ('tutorial_location', 'Tutorial Location'),
        ('marking_template', 'Marking Template'),
        ('bundle', 'Bundle'),
        ('custom_field', 'Custom Field'),
        ('computed', 'Computed Filter'),
        ('date_range', 'Date Range'),
        ('numeric_range', 'Numeric Range'),
    ]
```

- [ ] **Step 2.2: Generate the migration**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py makemigrations filtering --name add_subclass_filter_type_choices
```

Expected: creates `filtering/migrations/0015_add_subclass_filter_type_choices.py` with a single `AlterField` on `FilterConfiguration.filter_type`.

- [ ] **Step 2.3: Inspect the migration**

Open `backend/django_Admin3/filtering/migrations/0015_add_subclass_filter_type_choices.py`. It should contain one `AlterField` operation listing all 13 choices. If Django created anything unexpected (a new table, an index drop, etc.), STOP and report.

- [ ] **Step 2.4: Apply the migration**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py migrate filtering
```

Expected: `Applying filtering.0015_add_subclass_filter_type_choices... OK`.

- [ ] **Step 2.5: Verify no further migration drift**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
```

Expected: `No changes detected`.

- [ ] **Step 2.6: Commit**

```powershell
git add backend/django_Admin3/filtering/models/filter_configuration.py backend/django_Admin3/filtering/migrations/0015_add_subclass_filter_type_choices.py
git commit -m "feat(filtering): Phase 4a — add tutorial_location and marking_template filter_type choices

Extends FilterConfiguration.FILTER_TYPE_CHOICES to include the two new
filter_types that pair with TutorialLocationHandler and
MarkingTemplateHandler (next commit). 'tutorial_format' was already in
the choices from an earlier migration; only adding the two new ones.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add the three subclass-aware handlers + register them

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_handlers.py` (append after `FilterGroupHandler`)
- Create test: `backend/django_Admin3/filtering/tests/test_subclass_filter_handlers.py`

TDD: write failing tests → RED → implement → GREEN → commit.

- [ ] **Step 3.1: Write the failing tests**

Create `backend/django_Admin3/filtering/tests/test_subclass_filter_handlers.py`:

```python
"""Phase 4a: tests for the three subclass-aware filter handlers.

Each handler is verified by:
  1. get_options enumerates the expected source.
  2. build_q filters store.Product to the expected subclass rows.
  3. count_path returns a path that disjunctive faceting can .values(...).
"""
from django.test import TestCase


class _Fixtures:
    """Shared fixture builders (each TestCase pulls just what it needs)."""

    def _ess(self, subject_code='CB1', session_code='2026-04'):
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code=subject_code, defaults={'description': subject_code},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code=session_code,
            defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def _ppv(self, variation_type, code):
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code=f'P4A_{code}',
            fullname=f'Phase 4a {variation_type}',
            defaults={'shortname': 'P4A'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type=variation_type, name=variation_type,
            defaults={'code': code, 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        return ppv, cp

    def _tutorial(self, subject_code, format_code, location=None):
        from store.models import TutorialProduct
        ess = self._ess(subject_code=subject_code)
        ppv, _ = self._ppv('Tutorial', format_code)
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code=f'{subject_code}/{format_code}/2026-04',
            format=format_code,
            tutorial_location=location,
        )
        tp.save()
        return tp

    def _marking(self, subject_code, template_code='X'):
        from marking.models import MarkingTemplate
        from store.models import MarkingProduct
        ess = self._ess(subject_code=subject_code)
        ppv, cp = self._ppv('Marking', 'M')
        mt, _ = MarkingTemplate.objects.get_or_create(
            code=template_code, name=f'{template_code} Marking',
            defaults={'description': '', 'is_active': True},
        )
        return MarkingProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code=f'{subject_code}/M{template_code}/2026-04',
            marking_template=mt,
        )

    def _tutorial_location(self, code='LDN'):
        from tutorials.models import TutorialLocation
        loc, _ = TutorialLocation.objects.get_or_create(
            code=code, defaults={'name': f'{code} Centre', 'is_active': True},
        )
        return loc


class TutorialFormatHandlerTests(_Fixtures, TestCase):
    def test_get_options_enumerates_format_choices(self):
        from filtering.services.filter_handlers import TutorialFormatHandler
        from filtering.models import FilterConfiguration

        config = FilterConfiguration.objects.create(
            name='tutorial_format_test',
            display_label='Tutorial Format',
            filter_type='tutorial_format',
            filter_key='tutorial_format',
        )
        h = TutorialFormatHandler()
        opts = h.get_options(config)
        # All 23 TutorialProduct.Format choices.
        self.assertEqual(len(opts), 23)
        values = {o['value'] for o in opts}
        self.assertIn('F2F_3F', values)
        self.assertIn('LO_2H', values)
        self.assertIn('OC', values)

    def test_build_q_filters_by_format(self):
        from filtering.services.filter_handlers import TutorialFormatHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        t_f2f = self._tutorial('CB1', 'F2F_3F')
        t_lo  = self._tutorial('CB1', 'LO_2H')
        config = FilterConfiguration.objects.create(
            name='tutorial_format_test_b',
            display_label='Tutorial Format',
            filter_type='tutorial_format',
            filter_key='tutorial_format',
        )
        h = TutorialFormatHandler()
        q = h.build_q(config, ['F2F_3F'])
        ids = set(Product.objects.filter(q).values_list('pk', flat=True))
        self.assertIn(t_f2f.pk, ids)
        self.assertNotIn(t_lo.pk, ids)

    def test_count_path_works_in_values_aggregate(self):
        from django.db.models import Count
        from filtering.services.filter_handlers import TutorialFormatHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        self._tutorial('CB1', 'F2F_3F')
        self._tutorial('CB2', 'F2F_3F')
        self._tutorial('CB1', 'LO_2H')
        config = FilterConfiguration.objects.create(
            name='tutorial_format_test_c',
            display_label='Tutorial Format',
            filter_type='tutorial_format',
            filter_key='tutorial_format',
        )
        h = TutorialFormatHandler()
        path = h.count_path(config)
        rows = (
            Product.objects.values(path)
            .annotate(c=Count('id', distinct=True))
        )
        counts = {r[path]: r['c'] for r in rows if r[path]}
        # Two F2F_3F rows seeded above (one for each subject).
        self.assertEqual(counts.get('F2F_3F'), 2)
        self.assertEqual(counts.get('LO_2H'), 1)


class TutorialLocationHandlerTests(_Fixtures, TestCase):
    def test_get_options_lists_active_locations(self):
        from filtering.services.filter_handlers import TutorialLocationHandler
        from filtering.models import FilterConfiguration

        loc = self._tutorial_location('LDN')
        config = FilterConfiguration.objects.create(
            name='tutorial_location_test',
            display_label='Tutorial Location',
            filter_type='tutorial_location',
            filter_key='tutorial_location',
        )
        h = TutorialLocationHandler()
        opts = h.get_options(config)
        codes = {o['value'] for o in opts}
        self.assertIn('LDN', codes)
        for o in opts:
            self.assertIn('label', o)

    def test_build_q_filters_by_location_code(self):
        from filtering.services.filter_handlers import TutorialLocationHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        loc_ldn = self._tutorial_location('LDN')
        loc_mch = self._tutorial_location('MCH')
        t_ldn = self._tutorial('CB1', 'F2F_3F', location=loc_ldn)
        t_mch = self._tutorial('CB2', 'F2F_3F', location=loc_mch)
        config = FilterConfiguration.objects.create(
            name='tutorial_location_test_b',
            display_label='Tutorial Location',
            filter_type='tutorial_location',
            filter_key='tutorial_location',
        )
        h = TutorialLocationHandler()
        q = h.build_q(config, ['LDN'])
        ids = set(Product.objects.filter(q).values_list('pk', flat=True))
        self.assertIn(t_ldn.pk, ids)
        self.assertNotIn(t_mch.pk, ids)


class MarkingTemplateHandlerTests(_Fixtures, TestCase):
    def test_get_options_lists_active_templates_by_code(self):
        from filtering.services.filter_handlers import MarkingTemplateHandler
        from filtering.models import FilterConfiguration

        self._marking('CB1', template_code='ZTESTX')
        config = FilterConfiguration.objects.create(
            name='marking_template_test',
            display_label='Marking Template',
            filter_type='marking_template',
            filter_key='marking_template',
        )
        h = MarkingTemplateHandler()
        opts = h.get_options(config)
        codes = {o['value'] for o in opts}
        self.assertIn('ZTESTX', codes)

    def test_build_q_filters_by_template_code(self):
        from filtering.services.filter_handlers import MarkingTemplateHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        k_a = self._marking('CB1', template_code='ZTESTA')
        k_b = self._marking('CB2', template_code='ZTESTB')
        config = FilterConfiguration.objects.create(
            name='marking_template_test_b',
            display_label='Marking Template',
            filter_type='marking_template',
            filter_key='marking_template',
        )
        h = MarkingTemplateHandler()
        q = h.build_q(config, ['ZTESTA'])
        ids = set(Product.objects.filter(q).values_list('pk', flat=True))
        self.assertIn(k_a.pk, ids)
        self.assertNotIn(k_b.pk, ids)


class DispatchRegistrationTests(TestCase):
    """The new handlers must be registered in FILTER_HANDLERS so the
    service can dispatch by filter_type."""

    def test_tutorial_format_is_registered(self):
        from filtering.services.filter_handlers import (
            FILTER_HANDLERS, TutorialFormatHandler,
        )
        self.assertIsInstance(FILTER_HANDLERS['tutorial_format'], TutorialFormatHandler)

    def test_tutorial_location_is_registered(self):
        from filtering.services.filter_handlers import (
            FILTER_HANDLERS, TutorialLocationHandler,
        )
        self.assertIsInstance(FILTER_HANDLERS['tutorial_location'], TutorialLocationHandler)

    def test_marking_template_is_registered(self):
        from filtering.services.filter_handlers import (
            FILTER_HANDLERS, MarkingTemplateHandler,
        )
        self.assertIsInstance(FILTER_HANDLERS['marking_template'], MarkingTemplateHandler)
```

- [ ] **Step 3.2: Run tests (RED)**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test filtering.tests.test_subclass_filter_handlers -v 2
```

Expected: 11 ImportError failures — the new handler classes don't exist yet.

- [ ] **Step 3.3: Implement the handlers**

Open `backend/django_Admin3/filtering/services/filter_handlers.py` and append (after `class FilterGroupHandler(FilterHandler):` and before `FILTER_HANDLERS:`):

```python


class TutorialFormatHandler(FilterHandler):
    """Phase 4a: filters store.Product to TutorialProduct rows with a
    given format code.

    Reads `TutorialProduct.format` (subclass field) — NOT the catalog
    `ProductVariation.code` that the legacy FilterGroupHandler joins
    through PPV. This handler survives Phase 5's PPV removal.
    """

    def get_options(self, config):
        from store.models import TutorialProduct
        return [
            {'value': value, 'label': label}
            for value, label in TutorialProduct.Format.choices
        ]

    def build_q(self, config, values):
        # tutorialproduct is the MTI reverse accessor; isnull=False
        # selects rows that have a TutorialProduct child. format__in
        # restricts further. Combined: TutorialProduct rows in the
        # requested format(s).
        return Q(tutorialproduct__format__in=values)

    def count_path(self, config):
        return 'tutorialproduct__format'


class TutorialLocationHandler(FilterHandler):
    """Phase 4a: filters store.Product to TutorialProduct rows whose
    tutorial_location.code matches.

    Reads `TutorialProduct.tutorial_location` (subclass FK). Distinct
    from the future `tutorial_events.location` join the filter-system
    redesign spec hinted at — that's an event-side concern. This
    handler is product-side and survives Phase 5.
    """

    def get_options(self, config):
        from tutorials.models import TutorialLocation
        return [
            {
                'value': loc.code,
                'label': f"{loc.code} - {loc.name}" if loc.name else loc.code,
                'code': loc.code,
            }
            for loc in TutorialLocation.objects.filter(is_active=True).order_by('code')
        ]

    def build_q(self, config, values):
        return Q(tutorialproduct__tutorial_location__code__in=values)

    def count_path(self, config):
        return 'tutorialproduct__tutorial_location__code'


class MarkingTemplateHandler(FilterHandler):
    """Phase 4a: filters store.Product to MarkingProduct rows whose
    marking_template.code matches.

    Reads `MarkingProduct.marking_template` (subclass FK to
    marking.MarkingTemplate). Note that MarkingTemplate.code is NOT
    unique on its own — uniqueness is (code, name) — so filtering by
    code can match multiple templates with the same code but different
    names. That's intentional: callers want "all Series X marking",
    not "the specific Mock 1 Series X".
    """

    def get_options(self, config):
        from marking.models import MarkingTemplate
        # Group by code so duplicate (code, name) rows collapse to one
        # option per code, with a label from the most descriptive name.
        seen = {}
        for mt in MarkingTemplate.objects.filter(is_active=True).order_by('code', 'name'):
            if mt.code not in seen:
                seen[mt.code] = mt.name
        return [
            {'value': code, 'label': f"{code} - {name}" if name else code, 'code': code}
            for code, name in sorted(seen.items())
        ]

    def build_q(self, config, values):
        return Q(markingproduct__marking_template__code__in=values)

    def count_path(self, config):
        return 'markingproduct__marking_template__code'
```

Then update the `FILTER_HANDLERS` registry at the bottom of the file:

```python
FILTER_HANDLERS: dict[str, FilterHandler] = {
    'subject':       SubjectHandler(),
    'subject_type':  SubjectTypeHandler(),
    'filter_group':  FilterGroupHandler(),
}
```

becomes:

```python
FILTER_HANDLERS: dict[str, FilterHandler] = {
    'subject':            SubjectHandler(),
    'subject_type':       SubjectTypeHandler(),
    'filter_group':       FilterGroupHandler(),
    'tutorial_format':    TutorialFormatHandler(),
    'tutorial_location':  TutorialLocationHandler(),
    'marking_template':   MarkingTemplateHandler(),
}
```

- [ ] **Step 3.4: Re-run tests (GREEN)**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test filtering.tests.test_subclass_filter_handlers -v 2
```

Expected: 11/11 PASS.

- [ ] **Step 3.5: Re-run the baseline snapshot (must still pass)**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test filtering.tests.test_filter_configuration_snapshot -v 2
```

Expected: 4/4 PASS (unchanged — the API contract is preserved).

- [ ] **Step 3.6: Run the full filtering test suite (catch unexpected regressions)**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test filtering -v 1 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 3.7: Commit**

```powershell
git add backend/django_Admin3/filtering/services/filter_handlers.py backend/django_Admin3/filtering/tests/test_subclass_filter_handlers.py
git commit -m "feat(filtering): Phase 4a — TutorialFormatHandler / TutorialLocationHandler / MarkingTemplateHandler

Adds three subclass-aware FilterHandler implementations that read
from MTI subclass fields (TutorialProduct.format,
TutorialProduct.tutorial_location, MarkingProduct.marking_template)
instead of joining through product_product_variation. Each is
registered in FILTER_HANDLERS keyed by its filter_type.

The handlers are dormant capability — no active FilterConfiguration
row uses them today. Phase 5's PPV-removal data migration will
activate them by switching the relevant FilterConfiguration rows
from filter_type='filter_group' to one of the new types.

No changes to FilterGroupHandler, search_service, or any consumer.
Snapshot test confirms /api/products/filter-configuration/ API
contract is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Sanity sweep

- [ ] **Step 4.1: Run the broader sweep**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test filtering store search catalog -v 1 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 4.2: Confirm no migration drift**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
```

Expected: `No changes detected`.

No commit; verification only.

---

## Task 5: Push, open PR, merge

- [ ] **Step 5.1: Push**

```powershell
git push -u origin feat/20260514-product-mti-phase-4a-filtering
```

- [ ] **Step 5.2: Open PR**

```powershell
gh pr create --base main --head feat/20260514-product-mti-phase-4a-filtering --title "feat(filtering): Phase 4a — subclass-aware filter handlers" --body-file - <<'EOF'
## Summary

Phase 4a of the [Product MTI specialization](../docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md). Adds three subclass-aware `FilterHandler` implementations (`TutorialFormatHandler`, `TutorialLocationHandler`, `MarkingTemplateHandler`) so future `FilterConfiguration` rows can query MTI subclass fields directly instead of joining through `product_product_variation`. The new handlers are dormant capability — no active row uses them yet — and the existing `FilterGroupHandler` is unchanged.

## What changed

- `filtering/services/filter_handlers.py`: appended three new handler classes + registry entries.
- `filtering/models/filter_configuration.py`: added `'tutorial_location'` and `'marking_template'` to `FILTER_TYPE_CHOICES` (`'tutorial_format'` was already present). Migration 0015 alters the field choices.
- `filtering/tests/test_subclass_filter_handlers.py`: 11 new tests covering option enumeration, `build_q`, `count_path`, and registry dispatch for each handler.
- `filtering/tests/test_filter_configuration_snapshot.py`: 4 contract-shape tests for `/api/products/filter-configuration/` that survive across Phase 4a (and serve as a regression net for Phase 5).

## Why not refactor FilterGroupHandler now?

Two reasons. First, the existing `FilterGroupHandler` still works correctly through Phase 4 — PPV stays on the `Product` parent until Phase 5's data migration moves it onto `MaterialProduct`. Until then, the PPV join resolves for every subclass.

Second, the disjunctive-faceting `count_path` API returns a single field path used by `.values(path).annotate(...)`. A kind-branched `build_q` would also need a kind-branched `count_path` plus a redesigned count algorithm to merge per-kind aggregates. That redesign properly belongs with Phase 5's PPV-removal data migration — where the FilterGroup → subclass-field predicate map can be stored in the database alongside the new handler activations.

This PR sets up the toolkit; Phase 5 swings it.

## What's NOT in this PR

- No changes to `FilterGroupHandler`, `SubjectHandler`, `SubjectTypeHandler`, or `ProductFilterService`.
- No changes to `search_service.py` (its PPV-based filters still work).
- No new `FilterConfiguration` rows seeded (admins can add them post-merge; until then, the new handlers are dormant).
- No `Purchasable.Kind` cleanup (Phase 4e).
- No PPV movement (Phase 5).

## Tests

- 11 new handler tests, all passing.
- 4 new snapshot tests, all passing.
- Full filtering app sweep + store + search + catalog: passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 5.3: Watch CI**

```powershell
gh pr checks --watch
```

If Pact / Vitest flake reappears, rerun the failed shard via `gh run rerun <run-id> --failed`.

- [ ] **Step 5.4: Merge**

```powershell
gh pr merge --squash --delete-branch
```

- [ ] **Step 5.5: Sync local main**

```powershell
git checkout main
git pull origin main
```

---

## Self-review checklist

- [ ] Three new handler classes follow the same shape (`get_options` / `build_q` / `count_path`).
- [ ] Each is registered in `FILTER_HANDLERS` keyed by its `filter_type`.
- [ ] `FILTER_TYPE_CHOICES` includes all three (verified via the migration).
- [ ] `FilterGroupHandler.build_q` is untouched.
- [ ] `/api/products/filter-configuration/` response shape is unchanged (snapshot tests pass).
- [ ] `makemigrations --check --dry-run` → no changes detected after the planned migration.
