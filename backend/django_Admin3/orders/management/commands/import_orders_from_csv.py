"""
Import historical orders from docs/misc/orders_26.csv into
"acted"."orders" + "acted"."order_items".

CSV columns (1-based):
  A ref, B subject, C code, D quantity, E date, F cancel_date,
  G homework, H is_cancel, I cancel by, J orderno, K binders,
  L nosale, M retaker, N additional, O reducerate

Behaviour:
  * ref  → students.student_ref → students.user → orders.user_id
  * code → purchasables.code (used as-is, no transformation)
  * Rows with the same (ref, date) are grouped into ONE Order with
    multiple OrderItems. The CSV `orderno` is stored in each
    OrderItem.metadata.orderno.
  * Price-flag columns L/M/N/O map to:
        nosale=T       → is_foc = True
        retaker=T      → price_type = 'retaker'
        additional=T   → price_type = 'additional'
        reducerate=T   → price_type = 'reduced'
        all F          → price_type = 'standard'
    When multiple discount flags are T we use a precedence
    (retaker > reduced > additional) and WARN the row. The rules for
    combined discounts are open — see
    docs/to-dos/multiple-discount-price-resolution.md.
  * actual_price is set to 999 and orders.total_amount to 9999 as
    placeholders; once the discount rule above is agreed we backfill.
  * A row whose Price(price_type, purchasable) does not exist is
    reported as an error in the validation phase.
  * Cancelled rows (`is_cancel = 'Canc'`) set is_cancelled=True and
    populate metadata = {orderno, cancel_date, cancel_by}.
  * Two-phase flow:
        python manage.py import_orders_from_csv --csv <path>
            → validate only, writes import_report.csv
        python manage.py import_orders_from_csv --csv <path> --commit
            → after validation passes, inserts data inside a single
              transaction (batched).

Usage:
    python manage.py import_orders_from_csv --csv ../../docs/misc/orders_26.csv
    python manage.py import_orders_from_csv --csv ../../docs/misc/orders_26.csv --commit
    python manage.py import_orders_from_csv --csv ../../docs/misc/orders_26.csv --commit --batch-size 1000
"""

import csv
import os
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from orders.models import Order, OrderItem
from store.models import Price, Purchasable
from students.models import Student

PLACEHOLDER_ITEM_AMOUNT = Decimal("999")
PLACEHOLDER_ORDER_TOTAL = Decimal("9999")

# Precedence order when multiple discount flags are T (warning emitted).
DISCOUNT_PRECEDENCE = ("retaker", "reduced", "additional")

# Codes whose middle segment maps to a non-subject purchasable. The CSV
# uses {subject}/{token}/{exam} but the catalog has a single global
# purchasable keyed by `token` (e.g. CB1/MV/26 → purchasable.code='MV').
SPECIAL_TOKEN_TO_CODE = {
    "MV":   "MV",     # Marking Voucher
    "PBIN": "PBIN",   # Document Binder
}

# Middle-segment tokens that should be silently skipped with a warning
# rather than treated as a fatal missing_purchasable error. These are
# legacy product types intentionally excluded from the catalog
# (e.g. CL7A/CL4A/CATA were rejected as additional-charge purchasables).
IGNORED_TOKENS = {"CL7A", "CL4A", "CATA"}


class Command(BaseCommand):
    help = (
        "Import historical orders from orders_26.csv into "
        '"acted"."orders" + "acted"."order_items". Runs in validate mode '
        "by default; pass --commit to persist."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            required=True,
            help="Path to orders_26.csv",
        )
        parser.add_argument(
            "--commit",
            action="store_true",
            help="After validation passes, write data to the database.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Orders committed per transaction batch (default: 1000).",
        )
        parser.add_argument(
            "--report",
            default=None,
            help=(
                "Path for the validation report CSV. "
                "Defaults to <csv>.import_report.csv next to the input."
            ),
        )
        parser.add_argument(
            "--allow-existing",
            action="store_true",
            help=(
                "Proceed with --commit even when the orders table already "
                "contains rows. Use with care."
            ),
        )

    # ──────────────────────────────────────────────────────────────────
    # entrypoint
    # ──────────────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        csv_path = self._resolve_path(options["csv"])
        if not os.path.exists(csv_path):
            raise CommandError(f"CSV not found: {csv_path}")

        report_path = options["report"] or csv_path + ".import_report.csv"

        rows, headers = self._read_csv(csv_path)
        self.stdout.write(f"Read {len(rows)} data rows from {csv_path}")

        # Preload lookup tables into memory (avoids 55k roundtrips).
        student_refs = self._load_student_refs()
        purchasable_codes = self._load_purchasable_codes()
        price_amounts = self._load_price_amounts()

        errors, parsed_rows = self._validate_rows(
            rows,
            student_refs=student_refs,
            purchasable_codes=purchasable_codes,
            price_amounts=price_amounts,
        )

        self._write_report(report_path, errors)
        self._print_summary(rows, errors, parsed_rows)

        # multi_discount_warning is informational (the row was still
        # accepted). ignored_token rows are intentionally skipped by
        # policy and also non-fatal. Treat any other error type as fatal.
        non_fatal = {"multi_discount_warning", "ignored_token"}
        fatal = [e for e in errors if e["type"] not in non_fatal]
        if fatal:
            self.stdout.write(
                self.style.ERROR(
                    f"Validation failed: {len(fatal)} fatal issue(s). "
                    f"See {report_path}. "
                    "Fix inputs and re-run before using --commit."
                )
            )
            return

        if not options["commit"]:
            self.stdout.write(
                self.style.SUCCESS(
                    "Validation passed. Re-run with --commit to insert."
                )
            )
            return

        existing_count = Order.objects.count()
        if existing_count > 0 and not options["allow_existing"]:
            raise CommandError(
                f'"acted"."orders" already has {existing_count} rows. '
                "Pass --allow-existing to append anyway."
            )

        self._import(
            parsed_rows,
            batch_size=options["batch_size"],
        )

    # ──────────────────────────────────────────────────────────────────
    # CSV I/O
    # ──────────────────────────────────────────────────────────────────
    def _resolve_path(self, p):
        return p if os.path.isabs(p) else os.path.abspath(p)

    def _read_csv(self, path):
        with open(path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            headers = reader.fieldnames or []
            # Some exports use "cancel by" (space), others "cancel_by" (underscore).
            cancel_by_col = "cancel by" if "cancel by" in headers else (
                "cancel_by" if "cancel_by" in headers else None
            )
            required = {
                "ref", "code", "quantity", "date", "cancel_date",
                "is_cancel", "orderno", "nosale",
                "retaker", "additional", "reducerate",
            }
            missing = required - set(headers)
            if cancel_by_col is None:
                missing.add("cancel by/cancel_by")
            if missing:
                raise CommandError(
                    f"CSV is missing required columns: {sorted(missing)}"
                )
            rows = list(reader)
            # Normalize the cancel-by column key so downstream code can use
            # a single name regardless of the source header style.
            if cancel_by_col == "cancel_by":
                for r in rows:
                    r["cancel by"] = r.pop("cancel_by", "")
        return rows, headers

    def _write_report(self, path, errors):
        with open(path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            writer.writerow([
                "csv_line", "ref", "code", "orderno", "error_type", "detail",
            ])
            for e in errors:
                writer.writerow([
                    e["line"], e["ref"], e["code"], e["orderno"],
                    e["type"], e["detail"],
                ])
        self.stdout.write(f"Validation report written: {path}")

    # ──────────────────────────────────────────────────────────────────
    # Lookup preloaders
    # ──────────────────────────────────────────────────────────────────
    def _load_student_refs(self):
        """Return {student_ref: user_id}. One in-memory dict covers all rows."""
        return dict(
            Student.objects.values_list("student_ref", "user_id")
        )

    def _load_purchasable_codes(self):
        """Return {code: purchasable_id}."""
        return dict(
            Purchasable.objects.values_list("code", "id")
        )

    def _load_price_amounts(self):
        """Return {(purchasable_id, price_type): Decimal amount} for active prices."""
        return {
            (pid, ptype): amount
            for pid, ptype, amount in Price.objects.filter(
                is_active=True
            ).values_list("purchasable_id", "price_type", "amount")
        }

    # ──────────────────────────────────────────────────────────────────
    # Row parsing / validation
    # ──────────────────────────────────────────────────────────────────
    def _validate_rows(self, rows, *, student_refs, purchasable_codes, price_amounts):
        errors = []
        parsed = []
        for idx, row in enumerate(rows, start=2):  # +1 for header, +1 for 1-based
            record, row_errors = self._parse_row(
                row, idx, student_refs, purchasable_codes, price_amounts
            )
            # `_parse_row` returns (None, errors) for fatal issues and
            # (record, warnings) for accepted-with-warnings rows. Always
            # extend errors; only skip when the record is unusable.
            errors.extend(row_errors)
            if record is None:
                continue
            parsed.append(record)
        return errors, parsed

    def _parse_row(self, row, line_no, student_refs, purchasable_codes, price_amounts):
        errors = []

        ref_raw = (row.get("ref") or "").strip()
        code = (row.get("code") or "").strip()
        orderno = (row.get("orderno") or "").strip()

        def err(type_, detail):
            return {
                "line": line_no,
                "ref": ref_raw,
                "code": code,
                "orderno": orderno,
                "type": type_,
                "detail": detail,
            }

        # ref → student → user
        try:
            ref = int(ref_raw)
        except (TypeError, ValueError):
            errors.append(err("bad_ref", f"ref '{ref_raw}' is not an integer"))
            return None, errors
        user_id = student_refs.get(ref)
        if user_id is None:
            errors.append(err("missing_student", f"no Student with ref={ref}"))

        # code → purchasable
        # Most codes match a Purchasable.code directly. A few special tokens
        # (MV, PBIN) appear in the CSV as {subject}/{token}/{exam} but
        # resolve to a single global Purchasable keyed by the token alone.
        lookup_code = code
        parts = code.split("/")
        token = parts[1] if len(parts) == 3 else None
        # Tokens excluded from the catalog by policy — emit a warning and
        # skip the row so it does not block the rest of the import.
        if token in IGNORED_TOKENS:
            errors.append(err(
                "ignored_token",
                f"token '{token}' is excluded from purchasables; row skipped",
            ))
            return None, errors
        if token in SPECIAL_TOKEN_TO_CODE:
            lookup_code = SPECIAL_TOKEN_TO_CODE[token]
        purchasable_id = purchasable_codes.get(lookup_code)
        if purchasable_id is None:
            errors.append(err(
                "missing_purchasable",
                f"no Purchasable.code='{lookup_code}'"
                + (f" (mapped from '{code}')" if lookup_code != code else ""),
            ))

        # quantity
        qty_raw = (row.get("quantity") or "").strip()
        try:
            quantity = int(qty_raw) if qty_raw else 1
        except ValueError:
            errors.append(err("bad_quantity", f"quantity '{qty_raw}' is not integer"))
            quantity = 1

        # date
        order_date = self._parse_date(row.get("date"))
        if order_date is None:
            errors.append(err("bad_date", f"date '{row.get('date')}' not DD/MM/YYYY"))

        cancel_date = self._parse_date(row.get("cancel_date"))

        # flags
        nosale = self._flag(row.get("nosale"))
        is_cancel = (row.get("is_cancel") or "").strip().lower() == "canc"
        cancel_by = (row.get("cancel by") or "").strip() or None

        flags = {
            "retaker": self._flag(row.get("retaker")),
            "additional": self._flag(row.get("additional")),
            "reduced": self._flag(row.get("reducerate")),
        }
        price_type, multi_flag_warning = self._resolve_price_type(flags)

        # Resolve the line-level price.
        #   FOC rows                 -> 0 (no charge)
        #   multi-discount warnings  -> placeholder PLACEHOLDER_ITEM_AMOUNT
        #                               (resolution rule deferred)
        #   normal rows              -> Price.amount looked up by
        #                               (purchasable_id, price_type)
        actual_price = None
        if purchasable_id is not None:
            if nosale:
                actual_price = Decimal("0")
            elif multi_flag_warning:
                actual_price = PLACEHOLDER_ITEM_AMOUNT
            else:
                amount = price_amounts.get((purchasable_id, price_type))
                if amount is None:
                    errors.append(err(
                        "missing_price",
                        f"no active Price(purchasable.code='{code}', "
                        f"price_type='{price_type}')",
                    ))
                else:
                    actual_price = amount

        if multi_flag_warning:
            # Not fatal — logged as a warning row in the report.
            errors.append(err("multi_discount_warning", multi_flag_warning))

        # Warning-only types: row still accepted, but every warning is
        # surfaced in the import report.
        WARNING_TYPES = {"multi_discount_warning"}
        if errors and any(e["type"] not in WARNING_TYPES for e in errors):
            return None, errors

        record = {
            "line_no": line_no,
            "ref": ref,
            "user_id": user_id,
            "purchasable_id": purchasable_id,
            "code": code,
            "orderno": orderno,
            "quantity": quantity,
            "order_date": order_date,
            "cancel_date": cancel_date,
            "is_cancelled": is_cancel,
            "cancel_by": cancel_by,
            "is_foc": nosale,
            "price_type": price_type,
            "actual_price": actual_price,
        }
        return record, [e for e in errors if e["type"] in WARNING_TYPES]

    @staticmethod
    def _flag(v):
        return (v or "").strip().upper() == "T"

    @staticmethod
    def _parse_date(v):
        v = (v or "").strip()
        if not v or v == "/  /":
            return None
        try:
            return datetime.strptime(v, "%d/%m/%Y").date()
        except ValueError:
            return None

    @staticmethod
    def _resolve_price_type(flags):
        """
        Return (price_type, warning_or_None).

        All F  → standard
        Exactly one T → corresponding price_type
        Multiple T    → precedence retaker > reduced > additional, with a
                        warning so the row is logged in the report.
        """
        truthy = [k for k, v in flags.items() if v]
        if not truthy:
            return "standard", None
        if len(truthy) == 1:
            return truthy[0], None
        for candidate in DISCOUNT_PRECEDENCE:
            if candidate in truthy:
                return candidate, (
                    f"multiple discount flags set {truthy}; "
                    f"using '{candidate}' (see "
                    f"docs/to-dos/multiple-discount-price-resolution.md)"
                )
        # Shouldn't reach here, but fall back to standard just in case.
        return "standard", f"multiple unknown flags {truthy}; fell back to 'standard'"

    # ──────────────────────────────────────────────────────────────────
    # Import phase
    # ──────────────────────────────────────────────────────────────────
    def _import(self, parsed_rows, *, batch_size):
        groups = self._group_rows(parsed_rows)
        self.stdout.write(
            f"Importing {len(groups)} orders / "
            f"{sum(len(items) for items in groups.values())} items…"
        )

        batch = []
        created_orders = 0
        created_items = 0
        for key, items in groups.items():
            batch.append((key, items))
            if len(batch) >= batch_size:
                o, i = self._commit_batch(batch)
                created_orders += o
                created_items += i
                batch = []
                self.stdout.write(
                    f"  …{created_orders} orders / {created_items} items so far"
                )
        if batch:
            o, i = self._commit_batch(batch)
            created_orders += o
            created_items += i

        self.stdout.write(self.style.SUCCESS(
            f"Done. Inserted {created_orders} orders and {created_items} items."
        ))

    def _group_rows(self, parsed_rows):
        """Group by (user_id, order_date) → list of item dicts."""
        groups = defaultdict(list)
        for rec in parsed_rows:
            key = (rec["user_id"], rec["order_date"])
            groups[key].append(rec)
        return groups

    @transaction.atomic
    def _commit_batch(self, batch):
        created_orders = 0
        created_items = 0
        for (user_id, _order_date), items in batch:
            # Compute order subtotal from per-item actual_price * quantity
            # so the summed line totals match the order header. VAT and
            # fees are out of scope for legacy import (subtotal == total).
            subtotal = sum(
                (rec["actual_price"] or Decimal("0")) * rec["quantity"]
                for rec in items
            )
            order = Order.objects.create(
                user_id=user_id,
                subtotal=subtotal,
                total_amount=subtotal,
            )
            created_orders += 1
            for rec in items:
                metadata = {"orderno": rec["orderno"]}
                if rec["is_cancelled"]:
                    metadata["cancel_date"] = (
                        rec["cancel_date"].isoformat()
                        if rec["cancel_date"] else None
                    )
                    metadata["cancel_by"] = rec["cancel_by"]

                OrderItem.objects.create(
                    order=order,
                    purchasable_id=rec["purchasable_id"],
                    quantity=rec["quantity"],
                    price_type=rec["price_type"],
                    actual_price=rec["actual_price"],
                    is_cancelled=rec["is_cancelled"],
                    is_foc=rec["is_foc"],
                    metadata=metadata,
                )
                created_items += 1
        return created_orders, created_items

    # ──────────────────────────────────────────────────────────────────
    # reporting
    # ──────────────────────────────────────────────────────────────────
    def _print_summary(self, rows, errors, parsed_rows):
        by_type = defaultdict(int)
        for e in errors:
            by_type[e["type"]] += 1
        self.stdout.write("")
        self.stdout.write(f"Rows read:       {len(rows)}")
        self.stdout.write(f"Rows accepted:   {len(parsed_rows)}")
        self.stdout.write(f"Issues:          {len(errors)}")
        for t, c in sorted(by_type.items()):
            self.stdout.write(f"   {t:30s} {c}")
