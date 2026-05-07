"""Post-deploy activation command for the active-product-availability rollout.

The schema migrations add is_active fields with default=False on:
  - catalog_exam_sessions
  - catalog_product_variations
  - catalog_product_product_variations

This command flips the right initial subset of those rows to True so the
products page repopulates after the audit-gate blackout.

Per-table policy (from the design doc):
  - ExamSession: activate every row whose end_date >= today (skip past ones)
  - ProductVariation: activate every row
  - ProductProductVariation: activate every row whose parent
    catalog.Product.is_active and ProductVariation.is_active are both True.

Idempotent: running twice has no additional effect.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from catalog.exam_session.models import ExamSession
from catalog.products.models import ProductVariation, ProductProductVariation


class Command(BaseCommand):
    help = "Flip is_active=True for the initial catalog subset (post-deploy)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print planned changes without modifying data.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        es_qs = ExamSession.objects.filter(end_date__gte=now, is_active=False)
        pv_qs = ProductVariation.objects.filter(is_active=False)

        self.stdout.write(self.style.NOTICE(
            f"{'DRY-RUN — ' if dry_run else ''}Activation plan:"
        ))
        self.stdout.write(f"  ExamSession to activate ({es_qs.count()}):")
        for es in es_qs:
            self.stdout.write(f"    - {es.session_code} (end_date={es.end_date.date()})")

        self.stdout.write(f"  ProductVariation to activate ({pv_qs.count()}):")
        for pv in pv_qs:
            self.stdout.write(f"    - [{pv.variation_type}] {pv.name}")

        if dry_run:
            # In dry-run, compute the would-be PPV set assuming PVs would be
            # activated. The PPV policy requires PV.is_active, so describe the
            # set that WOULD become eligible after this run.
            ppv_qs = ProductProductVariation.objects.filter(
                is_active=False,
                product__is_active=True,
            )
            self.stdout.write(
                f"  ProductProductVariation to activate "
                f"(after PV activation, ~{ppv_qs.count()}):"
            )
            for ppv in ppv_qs:
                self.stdout.write(f"    - {ppv}")
            self.stdout.write(self.style.WARNING("Dry run — no changes written."))
            return

        # Real run. Apply PV first, then PPV (so PV.is_active is True for
        # the PPV filter).
        es_count = es_qs.update(is_active=True)
        pv_count = pv_qs.update(is_active=True)
        ppv_qs = ProductProductVariation.objects.filter(
            is_active=False,
            product__is_active=True,
            product_variation__is_active=True,
        )
        ppv_count = ppv_qs.update(is_active=True)

        self.stdout.write(self.style.SUCCESS(
            f"Activated: {es_count} ExamSession, "
            f"{pv_count} ProductVariation, {ppv_count} ProductProductVariation."
        ))
