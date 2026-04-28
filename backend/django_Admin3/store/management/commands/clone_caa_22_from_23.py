"""
Clone CAA-subject store.Product (and Price) rows from session 23/23S
into 22/22S where missing.

Mapping:
    CAA*/<token>/23   →  CAA*/<token>/22   (regular stream)
    CAA*/<token>/23S  →  CAA*/<token>/22S  (supplementary stream)

Used to fill historical-order references for sessions 22/22S that were
absent from prods_22-25.csv (the source data for those subjects only
covered 23-25S). Cloning preserves the catalog Product + variation; only
the ExamSessionSubject (subject is the same, session changes) and the
code/product_code change. Prices are duplicated at the same amounts.

Idempotent — destinations that already exist are left alone.

Usage:
    python manage.py clone_caa_22_from_23              # dry-run
    python manage.py clone_caa_22_from_23 --commit     # persist
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models.exam_session_subject import ExamSessionSubject
from store.models import Price, Purchasable, Product as StoreProduct


SUBJECTS = ("CAA0", "CAA1", "CAA2", "CAA3", "CAA4", "CAA5")
SESSION_PAIRS = (("23", "22"), ("23S", "22S"))


class Command(BaseCommand):
    help = (
        "Clone CAA*/X/23(S) store products and prices into CAA*/X/22(S) "
        "for missing historical sessions."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--commit", action="store_true",
            help="Actually write the new rows (default: dry-run).",
        )

    def handle(self, *args, **options):
        commit = options["commit"]

        # Index existing CAA store products by code (only for CAA subjects).
        caa_codes = set(
            StoreProduct.objects
            .filter(code__regex=r"^CAA[0-5]/")
            .values_list("code", flat=True)
        )

        # Index ExamSessionSubject by (subject_code, session_code).
        # Build only the entries we'll need.
        wanted_ess = {(subj, dst) for subj in SUBJECTS for _, dst in SESSION_PAIRS}
        ess_lookup = {
            (e.subject.code, e.exam_session.session_code): e.id
            for e in ExamSessionSubject.objects
            .select_related("subject", "exam_session")
            .filter(
                subject__code__in=SUBJECTS,
                exam_session__session_code__in={dst for _, dst in SESSION_PAIRS},
            )
        }
        missing_ess = wanted_ess - set(ess_lookup.keys())
        if missing_ess:
            self.stdout.write(self.style.WARNING(
                f"ExamSessionSubject missing for {sorted(missing_ess)}; "
                "those subject/session pairs will be skipped."
            ))

        plan = []  # list of (src_sp, dst_code, dst_ess_id)
        skipped_no_src = 0
        skipped_exists = 0

        for src_ses, dst_ses in SESSION_PAIRS:
            sources = StoreProduct.objects.filter(
                code__regex=r"^CAA[0-5]/[^/]+/" + src_ses + r"$",
            ).select_related("purchasable_ptr")
            for src in sources:
                subj, tok, _ = src.code.split("/")
                dst_code = f"{subj}/{tok}/{dst_ses}"
                if dst_code in caa_codes:
                    skipped_exists += 1
                    continue
                dst_ess_id = ess_lookup.get((subj, dst_ses))
                if dst_ess_id is None:
                    skipped_no_src += 1
                    continue
                plan.append((src, dst_code, dst_ess_id))

        self.stdout.write(f"Existing CAA store products: {len(caa_codes)}")
        self.stdout.write(f"Plan: clone {len(plan)} source product(s)")
        self.stdout.write(f"  already-exists skipped: {skipped_exists}")
        self.stdout.write(f"  no-target-ESS skipped : {skipped_no_src}")

        if not plan:
            return
        if not commit:
            self.stdout.write(self.style.WARNING(
                "Dry run. Re-run with --commit to persist."
            ))
            return

        prices_cloned = 0
        with transaction.atomic():
            for src, dst_code, dst_ess_id in plan:
                ptr = src.purchasable_ptr
                new_sp = StoreProduct.objects.create(
                    kind=Purchasable.Kind.PRODUCT,
                    code=dst_code,
                    product_code=dst_code,
                    name=ptr.name,
                    description=ptr.description,
                    is_active=ptr.is_active,
                    is_addon=ptr.is_addon,
                    dynamic_pricing=ptr.dynamic_pricing,
                    vat_classification=ptr.vat_classification,
                    exam_session_subject_id=dst_ess_id,
                    product_product_variation_id=src.product_product_variation_id,
                )
                # Clone Price rows.
                for p in Price.objects.filter(purchasable=src):
                    Price.objects.create(
                        purchasable=new_sp,
                        price_type=p.price_type,
                        amount=p.amount,
                        currency=p.currency,
                        is_active=p.is_active,
                    )
                    prices_cloned += 1

        self.stdout.write(self.style.SUCCESS(
            f"Cloned {len(plan)} product(s) and {prices_cloned} price row(s)."
        ))
