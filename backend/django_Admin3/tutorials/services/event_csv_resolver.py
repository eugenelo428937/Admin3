"""Resolves catalog/store/tutorials dependencies for a ParsedEvent.

Strategy (per CLAUDE-level decision 2026-05-01):
- Master catalog data (Subject, ProductVariation, location-keyed catalog.Product)
  is **lookup-only**. A missing value records a human-readable error in the
  Resolution.errors list and the resolver returns without populating
  ``store_product`` — the orchestrator skips the event and surfaces the errors
  in the import report.
- Junction/instance entities (ExamSession, ExamSessionSubject,
  ProductProductVariation, store.Product, TutorialLocation, TutorialVenue,
  TutorialInstructor + supporting User + Staff) are ``get_or_create``.

Locations in the CSV are mapped to existing catalog.Product codes via
``LOCATION_TO_CATALOG_CODE`` — these mirror the 10 location-products that
already exist in the database (Bir/Bri/Dub/Edi/GLA/Lee/Live/Lon/Man/OC).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import List, Optional

from django.contrib.auth.models import User
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from staff.models import Staff
from store.models import TutorialProduct
from tutorials.models import (
    TutorialLocation, TutorialVenue, TutorialInstructor,
)
from tutorials.services.event_csv_parser import ParsedEvent


# Maps the CSV "Location" string to a catalog.Product.code (location-keyed
# product templates). Locations IN this map are valid; the resolver
# get_or_creates the catalog.Product if missing. Locations NOT in this map
# produce an error — protects master data from polluted location strings.
LOCATION_TO_CATALOG_CODE: dict[str, str] = {
    'Live Online': 'Live',
    'London': 'Lon',
    'Edinburgh': 'Edi',
    'Manchester': 'Man',
    'Birmingham': 'Bir',
    'Leeds': 'Lee',
    'Glasgow': 'GLA',
    'Bristol': 'Bri',
    'Dublin': 'Dub',
    'Reading': 'Rea',
    'Online': 'OC',  # OC events are skipped earlier; included for completeness
}


class ResolutionError(ValueError):
    """Raised by individual lookup helpers when master data is missing."""


@dataclass
class Resolution:
    subject: Optional[Subject] = None
    exam_session: Optional[ExamSession] = None
    exam_session_subject: Optional[ExamSessionSubject] = None
    product_variation: Optional[ProductVariation] = None
    catalog_product: Optional[CatProduct] = None
    product_product_variation: Optional[ProductProductVariation] = None
    store_product: Optional[TutorialProduct] = None
    tutorial_location: Optional[TutorialLocation] = None
    tutorial_venue: Optional[TutorialVenue] = None
    instructors: List[TutorialInstructor] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


def resolve_event_dependencies(parsed: ParsedEvent) -> Resolution:
    """Resolve all dependencies for a single ParsedEvent."""
    resolution = Resolution()

    # 1. Subject (lookup-only, master data).
    try:
        resolution.subject = _lookup_subject(parsed.subject_code)
    except ResolutionError as e:
        resolution.errors.append(str(e))

    # 2. ProductVariation (lookup-only, master data).
    try:
        resolution.product_variation = _lookup_product_variation(parsed.product_variation_code)
    except ResolutionError as e:
        resolution.errors.append(str(e))

    # 3. catalog.Product (lookup-only, location-keyed).
    try:
        resolution.catalog_product = _lookup_location_catalog_product(parsed.location_name)
    except ResolutionError as e:
        resolution.errors.append(str(e))

    # 4. ExamSession (get_or_create, instance entity).
    resolution.exam_session = _get_or_create_exam_session(parsed)

    # 5. TutorialLocation + TutorialVenue (get_or_create).
    resolution.tutorial_location = _get_or_create_tutorial_location(parsed.location_name)
    if parsed.venue_name:
        resolution.tutorial_venue = _get_or_create_tutorial_venue(
            parsed.venue_name, resolution.tutorial_location,
        )

    # 6. TutorialInstructors (auto-create User + Staff + Instructor chain).
    resolution.instructors = [
        _get_or_create_instructor(name) for name in parsed.instructor_names if name.strip()
    ]

    # 7. ExamSessionSubject (junction; needs subject + exam_session).
    if resolution.subject and resolution.exam_session:
        resolution.exam_session_subject, _ = ExamSessionSubject.objects.get_or_create(
            exam_session=resolution.exam_session,
            subject=resolution.subject,
        )

    # 8. ProductProductVariation (junction; needs catalog_product + variation).
    if resolution.catalog_product and resolution.product_variation:
        resolution.product_product_variation, _ = ProductProductVariation.objects.get_or_create(
            product=resolution.catalog_product,
            product_variation=resolution.product_variation,
        )

    # 9. store.Product (the Purchasable). Requires ESS + PPV.
    if resolution.exam_session_subject and resolution.product_product_variation:
        resolution.store_product = _get_or_create_store_product(
            resolution.exam_session_subject,
            resolution.product_product_variation,
            parsed.code,
        )

    return resolution


# ─────────────────────────────────────────────────────────────────────
# Master-data lookup helpers (raise ResolutionError on miss)
# ─────────────────────────────────────────────────────────────────────

def _lookup_subject(code: str) -> Subject:
    s = Subject.objects.filter(code=code).first()
    if s is None:
        raise ResolutionError(f"Subject not found: {code!r}")
    return s


def _lookup_product_variation(code: str) -> ProductVariation:
    pv = ProductVariation.objects.filter(code=code).first()
    if pv is None:
        raise ResolutionError(f"ProductVariation not found: {code!r}")
    return pv


def _lookup_location_catalog_product(location_name: str) -> CatProduct:
    """Resolve location → catalog.Product. Get_or_create if the location is
    in LOCATION_TO_CATALOG_CODE (the whitelist); error otherwise.
    """
    catalog_code = LOCATION_TO_CATALOG_CODE.get(location_name)
    if catalog_code is None:
        raise ResolutionError(
            f"No catalog.Product mapping for location {location_name!r}; "
            f"add to LOCATION_TO_CATALOG_CODE if this is a real location."
        )
    p, _ = CatProduct.objects.get_or_create(
        code=catalog_code,
        defaults={
            'fullname': f'Tutorial - {location_name}',
            'shortname': f'Tutorial {location_name}',
        },
    )
    return p


# ─────────────────────────────────────────────────────────────────────
# Instance/junction get_or_create helpers
# ─────────────────────────────────────────────────────────────────────

def _get_or_create_exam_session(parsed: ParsedEvent) -> ExamSession:
    # ExamSession requires start_date/end_date. Use parsed event dates as a
    # reasonable seed when creating; existing rows aren't modified.
    es, _ = ExamSession.objects.get_or_create(
        session_code=parsed.session_code,
        defaults={
            'start_date': timezone.make_aware(datetime.combine(parsed.start_date, datetime.min.time())),
            'end_date': timezone.make_aware(datetime.combine(parsed.end_date, datetime.min.time())),
        },
    )
    return es


def _get_or_create_tutorial_location(name: str) -> TutorialLocation:
    # Derive a 3-letter code (Lon, Edi, ...) when creating; existing rows
    # keep whatever code they already have.
    code = (name[:3]).capitalize()
    loc, _ = TutorialLocation.objects.get_or_create(
        name=name,
        defaults={'code': code, 'is_active': True},
    )
    return loc


def _get_or_create_tutorial_venue(name: str, location: TutorialLocation) -> TutorialVenue:
    venue, _ = TutorialVenue.objects.get_or_create(
        name=name, location=location,
    )
    return venue


def _get_or_create_instructor(full_name: str) -> TutorialInstructor:
    """Auto-create User → Staff → TutorialInstructor for an instructor name.

    Idempotent on (first_name, last_name) match — avoids duplicate users
    when the same instructor appears across many events.
    """
    parts = full_name.strip().split(maxsplit=1)
    first = parts[0]
    last = parts[1] if len(parts) > 1 else ''

    # Look up existing first+last user; reuse instead of creating duplicates.
    user = User.objects.filter(first_name=first, last_name=last).first()
    if user is None:
        username = _slugify_username(full_name)
        user = User.objects.create(
            username=_unique_username(username),
            first_name=first,
            last_name=last,
            email='',
        )
        user.set_unusable_password()
        user.save()

    staff, _ = Staff.objects.get_or_create(
        user=user,
        defaults={
            'job_title': 'Tutor',
            'initials': (first[:1] + last[:1]).upper(),
        },
    )
    instructor, _ = TutorialInstructor.objects.get_or_create(
        staff=staff,
        defaults={'is_active': True},
    )
    return instructor


def _get_or_create_store_product(
    ess: ExamSessionSubject,
    ppv: ProductProductVariation,
    legacy_code: str,  # kept in signature for back-compat / debugging; not used
) -> TutorialProduct:
    """Look up store.TutorialProduct by (ess, ppv); create with a canonical
    ``{subject}/{location_code}/{variation}/{sitting}`` product_code if missing.

    Phase 4b: was store.Product, now store.TutorialProduct. The format field
    is derived from the ProductVariation.code (e.g. 'LO_6H' → format='LO_6H').
    All Tutorial variation codes match TutorialProduct.Format choices exactly.

    The legacy CSV Code (e.g. 'CB1_f2f_3') is shared across many events so
    it can't be the unique product_code. Pre-setting our own canonical code
    skips the Product.save() auto-generation path (which would fail because
    no TutorialEvent is linked yet — chicken-and-egg).
    """
    # Phase 5 Task 4b: TutorialProduct has no PPV — match by the same
    # signature used to derive the canonical code below.
    subject_code = ess.subject.code
    sitting_code = ess.exam_session.session_code
    variation_code = ppv.product_variation.code
    location_code = ppv.product.code  # 'Lon', 'Live', 'Edi', etc.
    canonical_code = f"{subject_code}/{location_code}/{variation_code}/{sitting_code}"

    # First try to find an existing TutorialProduct by canonical code
    # (subject + location + format + sitting uniquely identifies it).
    tp = TutorialProduct.objects.filter(product_code=canonical_code).first()
    if tp is not None:
        return tp

    tp = TutorialProduct(
        exam_session_subject=ess,
        product_code=canonical_code,
        format=variation_code,  # ProductVariation.code == TutorialProduct.Format value
    )
    tp.save()
    return tp


def _slugify_username(full_name: str) -> str:
    """Return a lowercase, alphanumeric+underscore username from a name."""
    cleaned = ''.join(c.lower() if c.isalnum() else '_' for c in full_name).strip('_')
    return cleaned or 'instructor'


def _unique_username(base: str) -> str:
    """Return a username that doesn't already exist; suffix with _2, _3, ... if needed."""
    if not User.objects.filter(username=base).exists():
        return base
    n = 2
    while User.objects.filter(username=f"{base}_{n}").exists():
        n += 1
    return f"{base}_{n}"
