"""
Seed Purchasable rows referenced by prices_26.csv / orders_26.csv but
missing from the catalog.

Two groups are created:

  1. Wildcard tokens (e.g. "*/CAF/26") — a single global Purchasable
     keyed by the token (e.g. code='CAF'). Most of these are fees /
     additional charges, so they default to kind='additional_charge'.

  2. Subject-specific codes (e.g. "CAA5/MM1/26") — a Purchasable per
     full code. These are kind='product' but, because we lack the
     supporting catalog rows (subject, ESS, PPV, catalog_product), we
     do NOT create a corresponding store.Product row. Order and price
     imports only need Purchasable.code, so this is sufficient to
     unblock them.

Usage:
    python manage.py seed_missing_purchasables --report-csv <prices report>
    python manage.py seed_missing_purchasables --report-csv <prices report> --commit
    python manage.py seed_missing_purchasables --codes "CAA5/MM1/26,CAA0/CRG/26" --commit
"""

import csv
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from store.models import Purchasable


# Some wildcard tokens already map to existing kinds. Anything else
# defaults to 'additional_charge' (the safe catch-all).
WILDCARD_KIND_OVERRIDES = {
    "MV":   Purchasable.Kind.MARKING_VOUCHER,
    "PBIN": Purchasable.Kind.DOCUMENT_BINDER,
}


class Command(BaseCommand):
    help = "Create missing Purchasable rows referenced by prices/orders CSVs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--report-csv",
            help=(
                "Path to a prices/orders import report CSV. "
                "Reads its 'code' column for codes flagged as "
                "missing_purchasable."
            ),
        )
        parser.add_argument(
            "--codes",
            help="Comma-separated list of explicit codes to seed.",
        )
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Persist changes (default: dry-run).",
        )

    def handle(self, *args, **options):
        codes = self._collect_codes(options)
        if not codes:
            raise CommandError("No codes to seed (use --report-csv or --codes).")

        existing = set(Purchasable.objects.values_list("code", flat=True))
        plan = []
        for code in sorted(codes):
            target_code, kind, name = self._classify(code)
            if target_code in existing:
                plan.append((code, target_code, kind, name, "exists"))
            else:
                plan.append((code, target_code, kind, name, "create"))

        wildcard_creates = [p for p in plan if p[4] == "create" and p[0].startswith("*/")]
        subject_creates = [p for p in plan if p[4] == "create" and not p[0].startswith("*/")]
        skipped = [p for p in plan if p[4] == "exists"]

        self.stdout.write(f"Wildcard tokens to create:    {len(wildcard_creates)}")
        for src, target, kind, _, _ in wildcard_creates:
            self.stdout.write(f"   {src:25s} -> {target:15s} kind={kind}")

        self.stdout.write(f"Subject-specific to create:   {len(subject_creates)}")
        if subject_creates:
            sample = subject_creates[:8]
            for src, target, kind, _, _ in sample:
                self.stdout.write(f"   {target:25s} kind={kind}")
            if len(subject_creates) > 8:
                self.stdout.write(f"   ... ({len(subject_creates) - 8} more)")
        self.stdout.write(f"Already present (skipped):    {len(skipped)}")

        if not options["commit"]:
            self.stdout.write(self.style.WARNING(
                "Dry-run. Re-run with --commit to persist."
            ))
            return

        created = 0
        with transaction.atomic():
            seen_in_run = set()
            for src, target, kind, name, status in plan:
                if status != "create":
                    continue
                if target in seen_in_run:
                    continue
                seen_in_run.add(target)
                Purchasable.objects.create(
                    kind=kind,
                    code=target,
                    name=name,
                    description="",
                    is_active=True,
                    is_addon=False,
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f"Created {created} Purchasable row(s)."
        ))

    # ------------------------------------------------------------------
    def _collect_codes(self, options):
        codes = set()
        if options.get("codes"):
            codes.update(c.strip() for c in options["codes"].split(",") if c.strip())
        if options.get("report_csv"):
            path = options["report_csv"]
            if not os.path.isabs(path):
                path = os.path.abspath(path)
            with open(path, newline="", encoding="utf-8") as fh:
                reader = csv.DictReader(fh)
                if "code" not in (reader.fieldnames or []):
                    raise CommandError("report CSV missing 'code' column")
                for row in reader:
                    if (row.get("error_type") or "") != "missing_purchasable":
                        continue
                    c = (row.get("code") or "").strip()
                    if c:
                        codes.add(c)
        return codes

    def _classify(self, source_code):
        """Return (target_code, kind, name) for a missing source code."""
        parts = source_code.split("/")
        if len(parts) == 3 and parts[0] == "*":
            token = parts[1]
            kind = WILDCARD_KIND_OVERRIDES.get(token, Purchasable.Kind.ADDITIONAL_CHARGE)
            return token, kind, token
        # Subject-specific code: store full string.
        return source_code, Purchasable.Kind.PRODUCT, source_code
