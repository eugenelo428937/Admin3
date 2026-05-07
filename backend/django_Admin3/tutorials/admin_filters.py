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


def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    return qs
