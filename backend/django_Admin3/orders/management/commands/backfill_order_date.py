"""
Backfill Order.order_date for orders previously imported via
`import_orders_from_csv` before the `order_date` field existed.

Strategy:
    1. Read one or more legacy order CSVs and build:
           orderno (str)  ->  parsed datetime (midnight, tz-aware)
    2. For each Order whose order_date IS NULL, pick any of its OrderItems
       and read metadata['orderno']. Look that up in the map and update
       Order.order_date.

All items inside a single Order share the same calendar date because the
import groups by (user, date), so any item's orderno yields the right
answer for the whole Order.

Usage:
    # Dry-run against one CSV
    python manage.py backfill_order_date \\
        --csv c:/Code/Admin3/docs/misc/orders_26.csv

    # Multiple CSVs in one pass, then commit
    python manage.py backfill_order_date \\
        --csv c:/Code/Admin3/docs/misc/orders_26.csv \\
        --csv c:/Code/Admin3/docs/misc/orders_22-25.csv \\
        --commit
"""
import csv
from datetime import datetime, time

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from orders.models.order import Order
from orders.models.order_item import OrderItem


class Command(BaseCommand):
    help = "Backfill Order.order_date from historical order CSV(s)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv", action="append", required=True,
            help="Path to a legacy order CSV. Repeat for multiple files.",
        )
        parser.add_argument(
            "--commit", action="store_true",
            help="Persist the updates (default: dry-run).",
        )
        parser.add_argument(
            "--batch-size", type=int, default=2000,
            help="Bulk update batch size (default: 2000).",
        )

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        csv_paths = options["csv"]
        commit = options["commit"]

        # 1. Build orderno -> datetime map across all input CSVs.
        orderno_to_dt = {}
        collisions = 0
        for path in csv_paths:
            n_in_file = 0
            for row in self._read_csv(path):
                orderno = (row.get("orderno") or "").strip()
                date_raw = (row.get("date") or "").strip()
                if not orderno or not date_raw:
                    continue
                dt = self._parse_dt(date_raw)
                if dt is None:
                    continue
                if orderno in orderno_to_dt and orderno_to_dt[orderno] != dt:
                    collisions += 1
                orderno_to_dt[orderno] = dt
                n_in_file += 1
            self.stdout.write(f"  {path}: {n_in_file} (orderno, date) rows")
        self.stdout.write(
            f"Total distinct ordernos in lookup: {len(orderno_to_dt)} "
            f"(collisions resolved by last-wins: {collisions})"
        )

        # 2. Walk Orders missing order_date.
        targets = list(
            Order.objects.filter(order_date__isnull=True)
            .values_list("id", flat=True)
        )
        self.stdout.write(f"Orders missing order_date: {len(targets)}")
        if not targets:
            return

        # 3. Resolve each Order via any of its items' metadata.orderno.
        # One row per Order is enough; we pick the first we encounter.
        item_qs = (
            OrderItem.objects
            .filter(order_id__in=targets)
            .values_list("order_id", "metadata")
        )
        first_orderno_per_order = {}
        for oid, md in item_qs:
            if oid in first_orderno_per_order:
                continue
            if isinstance(md, dict) and md.get("orderno"):
                first_orderno_per_order[oid] = str(md["orderno"]).strip()

        # 4. Build the update plan.
        plan = []          # (order_id, dt)
        unmatched_no_item = 0
        unmatched_no_csv = 0
        for oid in targets:
            orderno = first_orderno_per_order.get(oid)
            if not orderno:
                unmatched_no_item += 1
                continue
            dt = orderno_to_dt.get(orderno)
            if dt is None:
                unmatched_no_csv += 1
                continue
            plan.append((oid, dt))

        self.stdout.write(
            f"Resolvable: {len(plan)}; "
            f"no-orderno-on-items: {unmatched_no_item}; "
            f"orderno-not-in-csv: {unmatched_no_csv}"
        )

        if not commit:
            self.stdout.write(self.style.WARNING(
                "Dry run. Re-run with --commit to persist."
            ))
            return

        # 5. Apply in bulk batches.
        batch_size = options["batch_size"]
        updated = 0
        with transaction.atomic():
            for i in range(0, len(plan), batch_size):
                chunk = plan[i:i + batch_size]
                updates = [
                    Order(id=oid, order_date=dt) for oid, dt in chunk
                ]
                Order.objects.bulk_update(updates, ["order_date"])
                updated += len(chunk)
        self.stdout.write(self.style.SUCCESS(
            f"Updated {updated} Order.order_date row(s)."
        ))

    # ------------------------------------------------------------------
    @staticmethod
    def _read_csv(path):
        try:
            fh = open(path, newline="", encoding="utf-8-sig")
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc
        with fh:
            yield from csv.DictReader(fh)

    @staticmethod
    def _parse_dt(s):
        try:
            d = datetime.strptime(s, "%d/%m/%Y").date()
        except ValueError:
            return None
        return timezone.make_aware(datetime.combine(d, time.min))
