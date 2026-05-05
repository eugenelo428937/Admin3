"""Create stub TutorialEvents for codes referenced by tutorial_orders.csv that
are NOT present in tutorial_import.csv.

These 4 events were referenced by historical orders but were never run (or
were cancelled after the orders were placed). We create stubs flagged
``cancelled=True`` so the orders backfill can resolve and create
TutorialChoice rows pointing to a valid FK target. Cancelled stubs are
excluded from registration and attendance flows.

USAGE
    python manage.py seed_orders_event_stubs

Idempotent — re-running is a no-op (uses get_or_create on the event code).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import List, NamedTuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from store.models import Product as StoreProduct
from tutorials.models import TutorialEvents


class StubSpec(NamedTuple):
    code: str             # full TutorialEvents.code (e.g., 'CP2-24-25S')
    subject_code: str     # 'CP2'
    sitting: str          # '25S' (matches ExamSession.session_code via the import rule)
    catalog_product_code: str  # 'Live' / 'Lon' / etc.
    variation_code: str   # 'LO_6H' / 'F2F_6H'
    location_label: str   # used in fullname / shortname only


# 4 codes from the orders backfill dry-run that have no real event.
# Defaults: face-to-face (`f2f` in xcode) → London + F2F_6H; Live Online
# (`LO` in xcode) → Live Online + LO_6H. These are reasonable cancelled-stub
# defaults; real attendance/registration flows ignore cancelled events.
STUBS: List[StubSpec] = [
    StubSpec('CP2-24-25S', 'CP2', '25S', 'Live', 'LO_6H', 'Live Online'),
    StubSpec('CP2-30-26A', 'CP2', '26',  'Lon',  'F2F_6H', 'London'),
    StubSpec('CS1-41-25S', 'CS1', '25S', 'Live', 'LO_6H', 'Live Online'),
    StubSpec('CS2-30-25S', 'CS2', '25S', 'Lon',  'F2F_6H', 'London'),
]


class Command(BaseCommand):
    help = (
        "Create stub TutorialEvents (cancelled=True) for codes referenced by "
        "tutorial_orders.csv but absent from tutorial_import.csv. Idempotent."
    )

    @transaction.atomic
    def handle(self, *args, **opts):
        created = 0
        skipped_existing = 0
        for spec in STUBS:
            existing = TutorialEvents.objects.filter(code=spec.code).first()
            if existing is not None:
                skipped_existing += 1
                self.stdout.write(f"  exists: {spec.code}")
                continue

            store_product = self._resolve_store_product(spec)
            TutorialEvents.objects.create(
                code=spec.code,
                store_product=store_product,
                start_date=date(2024, 1, 1),  # placeholder; cancelled events have no real schedule
                end_date=date(2024, 1, 1),
                cancelled=True,
            )
            created += 1
            self.stdout.write(f"  created: {spec.code}")

        self.stdout.write(self.style.SUCCESS(
            f"Done — created={created} skipped_existing={skipped_existing}"
        ))

    def _resolve_store_product(self, spec: StubSpec) -> StoreProduct:
        # Use lookup-only on master data (Subject/ProductVariation/catalog.Product).
        try:
            subject = Subject.objects.get(code=spec.subject_code)
        except Subject.DoesNotExist:
            raise CommandError(f"Master data missing: Subject(code={spec.subject_code!r})")
        try:
            variation = ProductVariation.objects.get(code=spec.variation_code)
        except ProductVariation.DoesNotExist:
            raise CommandError(f"Master data missing: ProductVariation(code={spec.variation_code!r})")
        try:
            cat_product = CatProduct.objects.get(code=spec.catalog_product_code)
        except CatProduct.DoesNotExist:
            raise CommandError(f"Master data missing: catalog.Product(code={spec.catalog_product_code!r})")

        es, _ = ExamSession.objects.get_or_create(
            session_code=spec.sitting,
            defaults={
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=60),
            },
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(exam_session=es, subject=subject)
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat_product, product_variation=variation,
        )
        sp = StoreProduct.objects.filter(
            exam_session_subject=ess, product_product_variation=ppv,
        ).first()
        if sp is not None:
            return sp
        canonical_code = f"{spec.subject_code}/{spec.catalog_product_code}/{spec.variation_code}/{spec.sitting}"
        sp = StoreProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code=canonical_code,
        )
        sp.save()
        return sp
