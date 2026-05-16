"""Query-param filter helpers for the admin event list.

Each helper accepts the running queryset and the request query_params
mapping, returns the filtered queryset (or ``qs.none()`` for invalid
input — fail-closed).
"""
from __future__ import annotations

from django.db.models import Q


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
    # Phase 5b (2026-05-16): legacy start_date column dropped on
    # tutorial_events; the canonical filter target is lms_start_date
    # (DateTime). Query-string param names stay readable.
    start_from = params.get('start_from')
    if start_from:
        qs = qs.filter(lms_start_date__date__gte=start_from)
    start_to = params.get('start_to')
    if start_to:
        qs = qs.filter(lms_start_date__date__lte=start_to)
    return qs


def apply_finalisation_date_range(qs, params):
    f_from = params.get('finalisation_from')
    if f_from:
        qs = qs.filter(finalisation_date__gte=f_from)
    f_to = params.get('finalisation_to')
    if f_to:
        qs = qs.filter(finalisation_date__lte=f_to)
    return qs


def apply_location_ids(qs, params):
    ids = _split_csv_ints(params.get('location_ids'))
    if ids is None:
        return qs.none()
    if not ids:
        return qs
    return qs.filter(location_id__in=ids)


def apply_venue_ids(qs, params):
    ids = _split_csv_ints(params.get('venue_ids'))
    if ids is None:
        return qs.none()
    if not ids:
        return qs
    return qs.filter(venue_id__in=ids)


def apply_instructor(qs, params):
    raw = params.get('instructor_id')
    if not raw:
        return qs
    try:
        instr_id = int(raw)
    except (TypeError, ValueError):
        return qs.none()
    return qs.filter(
        Q(main_instructor_id=instr_id) | Q(sessions__instructors__id=instr_id),
    ).distinct()


def apply_sitting(qs, params):
    raw = params.get('sitting_id')
    if raw == 'all':
        return qs

    if raw:
        try:
            sitting_id = int(raw)
        except (TypeError, ValueError):
            return qs.none()
        return qs.filter(
            store_product__exam_session_subject__exam_session_id=sitting_id,
        )

    # No param → default to latest sitting by start_date desc.
    from catalog.exam_session.models import ExamSession
    latest = ExamSession.objects.order_by('-start_date').first()
    if latest is None:
        return qs
    return qs.filter(
        store_product__exam_session_subject__exam_session_id=latest.id,
    )


def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    qs = apply_start_date_range(qs, params)
    qs = apply_finalisation_date_range(qs, params)
    qs = apply_location_ids(qs, params)
    qs = apply_venue_ids(qs, params)
    qs = apply_instructor(qs, params)
    qs = apply_sitting(qs, params)
    return qs
