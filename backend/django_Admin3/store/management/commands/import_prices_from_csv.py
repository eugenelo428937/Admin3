"""
Import prices from docs/misc/prices_26.csv into "acted"."prices".

CSV columns: code, amount, price_type
  * code: matches Purchasable.code directly OR uses a "*/{token}/{exam}"
          wildcard whose middle segment maps to a global purchasable
          (e.g., "*/MV/26" -> Purchasable.code='MV').
  * amount: decimal price (currency assumed GBP)
  * price_type: STANDARD | RETAKER | ADDITIONAL  (REDUCED is not present
                in the source data; rows with that value would be lower-
                cased to 'reduced' on import.)

Behaviour:
  * Validates every row first (preloads purchasables into memory).
  * --commit truncates "acted"."prices" and re-inserts every row
    inside ONE transaction.
  * Wildcard codes resolve to the global Purchasable; multiple
    wildcard rows for the same purchasable are deduplicated by
    (purchasable_id, price_type) — the last one wins.
  * Issues are written to a CSV report alongside the input.

Usage:
  python manage.py import_prices_from_csv --csv ../../docs/misc/prices_26.csv
  python manage.py import_prices_from_csv --csv ../../docs/misc/prices_26.csv --commit
"""

import csv
import os
from collections import defaultdict
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from store.models import Price, Purchasable


PRICE_TYPE_MAP = {
    "STANDARD":   "standard",
    "RETAKER":    "retaker",
    "ADDITIONAL": "additional",
    "REDUCED":    "reduced",
    "REDUCERATE": "reduced",
}


class Command(BaseCommand):
    help = (
        "Truncate \"acted\".\"prices\" and re-import from prices_26.csv. "
        "Runs in validate mode by default; pass --commit to persist."
    )

    def add_arguments(self, parser):
        parser.add_argument("--csv", required=True, help="Path to prices_26.csv")
        parser.add_argument(
            "--commit",
            action="store_true",
            help=(
                "Truncate prices and insert validated rows. "
                "Without this flag the command only validates."
            ),
        )
        parser.add_argument(
            "--report",
            default=None,
            help="Path for the validation report CSV.",
        )

    def handle(self, *args, **options):
        csv_path = options["csv"]
        if not os.path.isabs(csv_path):
            csv_path = os.path.abspath(csv_path)
        if not os.path.exists(csv_path):
            raise CommandError(f"CSV not found: {csv_path}")

        report_path = options["report"] or csv_path + ".import_report.csv"

        rows = self._read_csv(csv_path)
        self.stdout.write(f"Read {len(rows)} rows from {csv_path}")

        purchasable_codes = dict(Purchasable.objects.values_list("code", "id"))

        errors, prepared = self._validate(rows, purchasable_codes)
        self._write_report(report_path, errors)
        self._summarise(rows, errors, prepared)

        # missing_purchasable + duplicate_row are treated as warnings, not
        # blockers. Only structural issues (bad_amount, bad_price_type) abort.
        fatal = [e for e in errors
                 if e["type"] in ("bad_amount", "bad_price_type")]
        if fatal:
            self.stdout.write(self.style.ERROR(
                f"Validation failed: {len(fatal)} fatal issue(s). "
                f"See {report_path}. Fix and re-run."
            ))
            return

        if not options["commit"]:
            self.stdout.write(self.style.SUCCESS(
                "Validation passed. Re-run with --commit to truncate "
                "and import."
            ))
            return

        self._commit(prepared)

    # ──────────────────────────────────────────────────────────────────
    # Header aliases: the source CSV ships with either descriptive names
    # or DBF export shorthand ("net" for amount, "exp_3" for price_type).
    _AMOUNT_KEYS = ("amount", "net")
    _PRICE_TYPE_KEYS = ("price_type", "exp_3")

    def _read_csv(self, path):
        with open(path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            headers = set(reader.fieldnames or [])
            if "code" not in headers:
                raise CommandError("CSV missing required 'code' column")
            amount_key = next((k for k in self._AMOUNT_KEYS if k in headers), None)
            type_key = next((k for k in self._PRICE_TYPE_KEYS if k in headers), None)
            if amount_key is None:
                raise CommandError(
                    f"CSV missing amount column (expected one of {self._AMOUNT_KEYS})"
                )
            if type_key is None:
                raise CommandError(
                    f"CSV missing price_type column "
                    f"(expected one of {self._PRICE_TYPE_KEYS})"
                )
            # Normalise to canonical keys so the rest of the command is
            # header-agnostic.
            rows = []
            for r in reader:
                rows.append({
                    "code": r["code"],
                    "amount": r[amount_key],
                    "price_type": r[type_key],
                })
            return rows

    def _validate(self, rows, purchasable_codes):
        errors = []
        prepared = {}  # (purchasable_id, price_type) -> Decimal amount
        for idx, row in enumerate(rows, start=2):
            code_raw = (row.get("code") or "").strip()
            amount_raw = (row.get("amount") or "").strip()
            type_raw = (row.get("price_type") or "").strip().upper()

            err_base = {
                "line": idx, "code": code_raw, "amount": amount_raw,
                "price_type": type_raw,
            }
            row_errors = []

            # price_type
            price_type = PRICE_TYPE_MAP.get(type_raw)
            if price_type is None:
                row_errors.append({**err_base, "type": "bad_price_type",
                                   "detail": f"unknown price_type '{type_raw}'"})

            # amount
            try:
                amount = Decimal(amount_raw or "0")
            except InvalidOperation:
                row_errors.append({**err_base, "type": "bad_amount",
                                   "detail": f"amount '{amount_raw}' not numeric"})
                amount = Decimal("0")

            # code → purchasable. Wildcard `*/X/Y` strips to `X`.
            lookup = code_raw
            parts = code_raw.split("/")
            if len(parts) == 3 and parts[0] == "*":
                lookup = parts[1]
            purchasable_id = purchasable_codes.get(lookup)
            if purchasable_id is None:
                row_errors.append({
                    **err_base, "type": "missing_purchasable",
                    "detail": f"no Purchasable.code='{lookup}'"
                              + (f" (mapped from '{code_raw}')"
                                 if lookup != code_raw else ""),
                })

            if row_errors:
                errors.extend(row_errors)
                continue

            key = (purchasable_id, price_type)
            if key in prepared:
                # Duplicates are not fatal — wildcard rows can clash with
                # explicit ones. Keep the later value, log a warning.
                errors.append({
                    **err_base, "type": "duplicate_row",
                    "detail": (
                        f"price ({price_type}) for purchasable_id={purchasable_id} "
                        f"already set; overwriting with {amount}"
                    ),
                })
            prepared[key] = amount

        return errors, prepared

    def _write_report(self, path, errors):
        with open(path, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["csv_line", "code", "amount", "price_type",
                        "error_type", "detail"])
            for e in errors:
                w.writerow([e["line"], e["code"], e["amount"],
                            e["price_type"], e["type"], e["detail"]])
        self.stdout.write(f"Validation report written: {path}")

    def _summarise(self, rows, errors, prepared):
        from collections import Counter
        c = Counter(e["type"] for e in errors)
        self.stdout.write("")
        self.stdout.write(f"Rows read:           {len(rows)}")
        self.stdout.write(f"Unique price keys:   {len(prepared)}")
        self.stdout.write(f"Issues:              {len(errors)}")
        for t, n in sorted(c.items()):
            self.stdout.write(f"   {t:30s} {n}")

    @transaction.atomic
    def _commit(self, prepared):
        existing = Price.objects.count()
        self.stdout.write(f"Truncating \"acted\".\"prices\" (was {existing} rows)…")
        Price.objects.all().delete()

        objs = [
            Price(
                purchasable_id=pid,
                price_type=pt,
                amount=amount,
                currency="GBP",
                is_active=True,
            )
            for (pid, pt), amount in prepared.items()
        ]
        Price.objects.bulk_create(objs, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(
            f"Inserted {len(objs)} Price rows."
        ))
