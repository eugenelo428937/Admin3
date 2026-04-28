"""
Create addon (solution) Purchasable/Product rows cloned from their bases.

Mapping (base code segment -> addon code segment):
    */PX/*    -> */PXS/*    (Printed Series X Solutions)
    */CX/*    -> */CXS/*    (eBook Series X Solutions)
    */CM1/*   -> */CM1S/*   (M1 Solutions)
    */CPBOR/* -> */CYS/*    (Series Y Solutions for PBOR-base items)

For each base store.Product whose code matches one of the patterns, a new
Purchasable + Product row is created with:
  * is_addon        = True
  * code            = base code with the segment rewritten (new code)
  * exam_session_subject / product_product_variation = SAME as the base
    (unique_together on these columns was dropped in store migration
    0014 precisely to allow this).
  * name / description copied from the base with a "(Solutions)" suffix.

Usage:
    python manage.py create_addon_products              # dry-run
    python manage.py create_addon_products --commit     # persist
"""

import re
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from store.models import Price, Product, Purchasable


# Segment-level mapping. Patterns match a "/<seg>/" slice of the code so a
# code like "CB1/CPBOR/26" maps segment "CPBOR" -> "CYS".
SEGMENT_MAP = {
    "PX":    "PXS",
    "CX":    "CXS",
    "CM1":   "CM1S",
    "CPBOR": "CYS",
}

# Precompile a regex that captures the matching segment anywhere in the code.
SEGMENT_RE = re.compile(
    r"(?<=/)(" + "|".join(re.escape(k) for k in SEGMENT_MAP) + r")(?=/)"
)

# Price types we seed for every new addon (zero-amount, mirroring the
# pattern already in place for session-26 addons).
ADDON_PRICE_TYPES = ("standard", "retaker", "reduced", "additional")

# "Umbrella" addons: a single PMS/<token>/<session> product that historic
# orders refer to whenever a CAA-subject base of the indicated tokens is
# bought. The umbrella lives in the PMS subject namespace; we ensure one
# exists per session that has at least one matching CAA base. Templates
# come from any pre-existing PMS/<token>/* row (typically session 26).
PMS_UMBRELLAS = (
    ("CTB2", {"CSIL", "CGOL", "CTB", "CTB2"}),
    ("PTB2", {"PTB",  "PTB2"}),
)


class Command(BaseCommand):
    help = (
        "Clone base Products (PX/CX/CM1/CPBOR) into addon Products "
        "(PXS/CXS/CM1S/CYS) with Purchasable.is_addon=True."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Actually write the new rows (default: dry-run).",
        )
        parser.add_argument(
            "--no-prices",
            action="store_true",
            help=(
                "Skip seeding the four zero-amount Price rows "
                "(standard/retaker/reduced/additional) for new addons."
            ),
        )
        parser.add_argument(
            "--seed-prices-only",
            action="store_true",
            help=(
                "Don't create new addon Products. Instead, scan all "
                "existing addon Purchasables and add zero-amount Price "
                "rows for any of the four price_types that are missing."
            ),
        )

    def handle(self, *args, **options):
        commit = options["commit"]
        seed_prices = not options["no_prices"]

        # Mode 2: only backfill missing zero-price rows for existing addons.
        if options["seed_prices_only"]:
            self._seed_prices_for_existing(commit=commit)
            return

        bases = list(
            Product.objects.select_related("purchasable_ptr").filter(
                code__regex=r"/(" + "|".join(SEGMENT_MAP.keys()) + r")/"
            )
        )
        self.stdout.write(f"Found {len(bases)} base product(s) to clone.")

        existing_codes = set(
            Purchasable.objects.values_list("code", flat=True)
        )

        plan = []
        by_segment = defaultdict(int)
        for base in bases:
            match = SEGMENT_RE.search(base.code)
            if not match:
                continue
            old_seg = match.group(1)
            new_seg = SEGMENT_MAP[old_seg]
            new_code = SEGMENT_RE.sub(new_seg, base.code, count=1)
            status = "exists" if new_code in existing_codes else "new"
            plan.append((base, new_code, status))
            by_segment[f"{old_seg}->{new_seg}"] += 1

        self.stdout.write("Plan by segment:")
        for k, v in sorted(by_segment.items()):
            self.stdout.write(f"  {k}: {v}")

        to_create = [p for p in plan if p[2] == "new"]
        to_skip = [p for p in plan if p[2] == "exists"]
        self.stdout.write(f"  new addons to create: {len(to_create)}")
        self.stdout.write(f"  addons already present (skipped): {len(to_skip)}")

        # Plan PMS umbrella addons (independent of the segment plan above).
        umbrella_plan, umbrella_to_flip = self._plan_pms_umbrellas()

        if not commit:
            self.stdout.write(self.style.WARNING(
                "Dry run. Re-run with --commit to persist."
            ))
            return

        created = 0
        prices_created = 0
        with transaction.atomic():
            for base, new_code, status in to_create:
                new_name = (
                    f"{base.purchasable_ptr.name} (Solutions)"
                    if base.purchasable_ptr.name else new_code
                )
                addon = Product.objects.create(
                    kind=Purchasable.Kind.PRODUCT,
                    code=new_code,
                    product_code=new_code,
                    name=new_name,
                    description=base.purchasable_ptr.description,
                    is_active=base.purchasable_ptr.is_active,
                    is_addon=True,
                    dynamic_pricing=base.purchasable_ptr.dynamic_pricing,
                    vat_classification=base.purchasable_ptr.vat_classification,
                    exam_session_subject_id=base.exam_session_subject_id,
                    product_product_variation_id=base.product_product_variation_id,
                )
                created += 1
                if seed_prices:
                    prices_created += self._seed_zero_prices(addon)

            # Flip is_addon=True on existing PMS umbrella rows that aren't
            # yet marked, then create any missing umbrellas.
            flipped = self._flip_umbrellas_to_addon(umbrella_to_flip)
            umb_created, umb_prices = self._create_pms_umbrellas(
                umbrella_plan, seed_prices=seed_prices,
            )

        self.stdout.write(self.style.SUCCESS(
            f"Created {created} addon product(s); "
            f"seeded {prices_created} zero-amount Price row(s)."
        ))
        self.stdout.write(self.style.SUCCESS(
            f"PMS umbrellas: marked {flipped} existing as is_addon=True, "
            f"created {umb_created} new, seeded {umb_prices} price row(s)."
        ))

    # ──────────────────────────────────────────────────────────────────
    # PMS umbrella helpers
    # ──────────────────────────────────────────────────────────────────
    def _plan_pms_umbrellas(self):
        """Compute the umbrella plan: (to_create, to_flip).

        to_create: list of (template, target_code, ess_id) tuples for
        new umbrella StoreProducts to create.
        to_flip: queryset of existing PMS/<token>/* rows that need
        is_addon flipped to True.
        """
        from catalog.models.exam_session_subject import ExamSessionSubject

        to_create = []
        for umb_tok, base_tokens in PMS_UMBRELLAS:
            base_re = (
                r"^CAA[0-5]/(" + "|".join(re.escape(t) for t in base_tokens)
                + r")/"
            )
            sessions = sorted({
                c.split("/")[2]
                for c in Product.objects.filter(code__regex=base_re)
                .values_list("code", flat=True)
            })
            existing = set(
                Product.objects.filter(code__startswith=f"PMS/{umb_tok}/")
                .values_list("code", flat=True)
            )
            template = (
                Product.objects.filter(code__startswith=f"PMS/{umb_tok}/")
                .order_by("-code").first()
            )
            if not template:
                self.stdout.write(self.style.ERROR(
                    f"  No template for PMS/{umb_tok}/* — cannot derive "
                    "umbrellas; create one (e.g. session 26) first."
                ))
                continue
            ess_lookup = {
                e.exam_session.session_code: e.id
                for e in ExamSessionSubject.objects
                .select_related("subject", "exam_session")
                .filter(
                    subject__code="PMS",
                    exam_session__session_code__in=sessions,
                )
            }
            for ses in sessions:
                target = f"PMS/{umb_tok}/{ses}"
                if target in existing:
                    continue
                ess_id = ess_lookup.get(ses)
                if ess_id is None:
                    self.stdout.write(self.style.WARNING(
                        f"  Skipping {target}: no ExamSessionSubject "
                        f"for (PMS, {ses})"
                    ))
                    continue
                to_create.append((template, target, ess_id))

        to_flip = Product.objects.filter(
            code__regex=r"^PMS/(CTB2|PTB2)/", is_addon=False,
        )
        self.stdout.write(
            f"PMS umbrella plan: {len(to_create)} to create, "
            f"{to_flip.count()} existing to mark is_addon=True."
        )
        return to_create, to_flip

    @staticmethod
    def _flip_umbrellas_to_addon(qs):
        return qs.update(is_addon=True)

    def _create_pms_umbrellas(self, plan, *, seed_prices):
        created, prices = 0, 0
        for template, target_code, ess_id in plan:
            ptr = template.purchasable_ptr
            new = Product.objects.create(
                kind=Purchasable.Kind.PRODUCT,
                code=target_code,
                product_code=target_code,
                name=ptr.name,
                description=ptr.description,
                is_active=ptr.is_active,
                is_addon=True,
                dynamic_pricing=ptr.dynamic_pricing,
                vat_classification=ptr.vat_classification,
                exam_session_subject_id=ess_id,
                product_product_variation_id=template.product_product_variation_id,
            )
            created += 1
            if seed_prices:
                prices += self._seed_zero_prices(new)
        return created, prices

    # ──────────────────────────────────────────────────────────────────
    # Generic helpers
    # ──────────────────────────────────────────────────────────────────
    @staticmethod
    def _seed_zero_prices(purchasable):
        """Create the four standard zero-amount Price rows for a Purchasable.

        Uses get_or_create so the call is idempotent and safe to re-run.
        Returns the number of rows actually created.
        """
        created = 0
        for pt in ADDON_PRICE_TYPES:
            _, was_created = Price.objects.get_or_create(
                purchasable=purchasable,
                price_type=pt,
                defaults={"amount": 0, "currency": "GBP", "is_active": True},
            )
            if was_created:
                created += 1
        return created

    def _seed_prices_for_existing(self, *, commit):
        """Scan every addon Purchasable and add any missing zero-price rows."""
        addons = list(Purchasable.objects.filter(is_addon=True))
        self.stdout.write(
            f"Scanning {len(addons)} addon Purchasable(s) for missing Price rows…"
        )
        existing = {
            (p.purchasable_id, p.price_type)
            for p in Price.objects.filter(
                purchasable__is_addon=True, price_type__in=ADDON_PRICE_TYPES
            )
        }
        plan = []
        for a in addons:
            for pt in ADDON_PRICE_TYPES:
                if (a.id, pt) not in existing:
                    plan.append((a, pt))
        self.stdout.write(f"Missing Price rows to add: {len(plan)}")

        if not commit:
            self.stdout.write(self.style.WARNING(
                "Dry run. Re-run with --commit to persist."
            ))
            return

        with transaction.atomic():
            for a, pt in plan:
                Price.objects.create(
                    purchasable=a,
                    price_type=pt,
                    amount=0,
                    currency="GBP",
                    is_active=True,
                )
        self.stdout.write(self.style.SUCCESS(
            f"Added {len(plan)} zero-amount Price row(s)."
        ))
