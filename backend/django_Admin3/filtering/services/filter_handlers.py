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

    def post_process_bucket(
        self,
        bucket: dict,
        selected_values: list,
        config: FilterConfiguration,
    ) -> dict:
        """Optional hook applied to the disjunctive-facet bucket after the
        raw counts are computed.

        Default: pass-through (no rename, no filtering). Override to:
          - resolve display names for opaque values (e.g. product IDs →
            catalog.Product.shortname);
          - restrict the bucket to a subset (e.g. only currently selected
            values for nav-only filters that shouldn't render as a full
            checkbox list).

        Args:
            bucket: ``{value: {'count': int, 'name': str}}`` — the raw bucket
                built by ``generate_filter_counts``.
            selected_values: the values currently in
                ``filters[config.filter_key]`` (i.e. what the user has
                selected for this filter section).
            config: the active ``FilterConfiguration`` for this filter.
        """
        return bucket


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
        # Use a subquery (id__in=…) rather than a direct JOIN-based filter.
        # Multiple filter_group filters all share the same JOIN chain
        # (product_product_variation → product_groups → product_group); if
        # we expressed the filter as a JOIN, Django would reuse the same
        # alias for the disjunctive-faceting GROUP BY, restricting the
        # count's scope to the filter's WHERE clause. The subquery keeps
        # the count's JOIN independent.
        # Phase 5 Task 4b: PPV is on MaterialProduct now. Filter groups
        # are linked to PPVs, so this handler can only match material
        # rows — traverse via the materialproduct reverse-OneToOne.
        from store.models import Product as StoreProduct
        matching = StoreProduct.objects.filter(
            materialproduct__product_product_variation__product_groups__product_group__name__in=values
        ).values_list('id', flat=True)
        return Q(id__in=matching)

    def count_path(self, config):
        return 'materialproduct__product_product_variation__product_groups__product_group__name'


class ProductIdHandler(FilterHandler):
    """For filter_type='product_id'. Filters store.Product by the
    catalog.Product (master template) ID. Driven by nav-menu drill-downs
    that point at a specific catalog.Product — e.g. "Products > Core
    Study Materials > Course Notes" sets values=['<catalog.Product.id>'].

    The filter is not browseable from the panel: there are ~160 catalog
    Products in production, so rendering them all as checkboxes would
    swamp the UI. Instead, the panel section appears only when the user
    has an active selection (set via nav click), labelled with the
    catalog.Product.shortname (or the tutorial/marking equivalent once
    those subclass-specific handlers are wired in a follow-up).
    """

    def get_options(self, config):
        # Hidden filter — populated by nav clicks, never rendered as a
        # checkbox section. Returning [] keeps the filter-configuration
        # API truthful: the section has no options to choose from.
        return []

    def build_q(self, config, values):
        # Coerce to int; ignore stray non-numeric entries (URL tampering,
        # legacy bookmarks).
        try:
            int_values = [int(v) for v in values]
        except (TypeError, ValueError):
            int_values = [int(v) for v in values if str(v).isdigit()]
        if not int_values:
            from django.db.models import Q as _Q
            return _Q(pk__in=[])  # no-op: matches nothing
        # Phase 5 Task 4b: PPV is on MaterialProduct now.
        return Q(materialproduct__product_product_variation__product__id__in=int_values)

    def count_path(self, config):
        return 'materialproduct__product_product_variation__product__id'

    def post_process_bucket(self, bucket, selected_values, config):
        """Restrict the bucket to the user's current selection and
        resolve catalog.Product.shortname for each entry's ``name``.

        Restricting to selected values keeps the panel section small
        (one row per active selection) — the rest of the catalog is
        accessed via the nav menu, not the panel.
        """
        if not bucket:
            return bucket

        # Normalize selected_values to a string-comparable set so callers
        # can pass ints, str, or a mix from URL/Redux.
        selected = {str(v) for v in (selected_values or [])}
        if not selected:
            # No selection → no section. (Avoids exposing ~160 catalog
            # products as checkboxes when the user hasn't drilled in.)
            return {}

        from catalog.models import Product as CatalogProduct

        kept = {
            v: entry for v, entry in bucket.items() if str(v) in selected
        }
        if not kept:
            return {}

        # Bulk-resolve shortnames for everything kept.
        numeric_ids = [int(v) for v in kept.keys() if str(v).lstrip('-').isdigit()]
        names_by_id: dict[int, str] = dict(
            CatalogProduct.objects.filter(id__in=numeric_ids)
            .values_list('id', 'shortname')
        ) if numeric_ids else {}

        for v in list(kept.keys()):
            try:
                pretty = names_by_id.get(int(v))
            except (ValueError, TypeError):
                pretty = None
            if pretty:
                # Each entry is {'count': N, 'name': value}; replace name
                # with the human-readable shortname for the UI.
                kept[v] = {**kept[v], 'name': pretty}
        return kept


# ──────────────────────────────────────────────────────────────────────
# Phase 4a — subclass-aware handlers that read from MTI subclass fields
# instead of joining through product_product_variation. Each survives
# Phase 5's PPV removal because they're rooted in the subclass table.
# ──────────────────────────────────────────────────────────────────────
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
        return Q(tutorialproduct__format__in=values)

    def count_path(self, config):
        return 'tutorialproduct__format'


class TutorialLocationHandler(FilterHandler):
    """Phase 4a: filters store.Product to TutorialProduct rows whose
    tutorial_location.code matches.
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

    Note that MarkingTemplate.code is NOT unique on its own —
    uniqueness is (code, name) — so filtering by code can match
    multiple templates with the same code but different names. That's
    intentional: callers want "all Series X marking", not "the
    specific Mock 1 Series X".
    """

    def get_options(self, config):
        from marking.models import MarkingTemplate
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


FILTER_HANDLERS: dict[str, FilterHandler] = {
    'subject':            SubjectHandler(),
    'subject_type':       SubjectTypeHandler(),
    'filter_group':       FilterGroupHandler(),
    'product_id':         ProductIdHandler(),
    'tutorial_format':    TutorialFormatHandler(),
    'tutorial_location':  TutorialLocationHandler(),
    'marking_template':   MarkingTemplateHandler(),
}
