"""Query-param filter helpers for the admin event list.

Each helper accepts the running queryset and the request query_params
mapping, returns the filtered queryset (or ``qs.none()`` for invalid
input — fail-closed).
"""
from __future__ import annotations


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(',') if v.strip()]


def _split_csv_ints(value: str | None) -> list[int] | None:
    """Returns parsed ints, or None if any token is invalid."""
    tokens = _split_csv(value)
    out: list[int] = []
    for t in tokens:
        try:
            out.append(int(t))
        except (TypeError, ValueError):
            return None
    return out


def apply_subject_codes(qs, params):
    codes = _split_csv(params.get('subject_codes'))
    if not codes:
        return qs
    return qs.filter(
        store_product__exam_session_subject__subject__code__in=codes,
    )


def apply_code_icontains(qs, params):
    code = (params.get('code') or '').strip()
    if not code:
        return qs
    return qs.filter(code__icontains=code)


def apply_start_date_range(qs, params):
    start_from = params.get('start_from')
    if start_from:
        qs = qs.filter(start_date__gte=start_from)
    start_to = params.get('start_to')
    if start_to:
        qs = qs.filter(start_date__lte=start_to)
    return qs


def apply_finalisation_date_range(qs, params):
    f_from = params.get('finalisation_from')
    if f_from:
        qs = qs.filter(finalisation_date__gte=f_from)
    f_to = params.get('finalisation_to')
    if f_to:
        qs = qs.filter(finalisation_date__lte=f_to)
    return qs


def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    qs = apply_start_date_range(qs, params)
    qs = apply_finalisation_date_range(qs, params)
    return qs
