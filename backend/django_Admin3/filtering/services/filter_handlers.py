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


# Concrete handlers added in subsequent tasks
FILTER_HANDLERS: dict[str, FilterHandler] = {}
