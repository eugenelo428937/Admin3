"""
Management command to import legacy orders from all_orders.csv.

Groups CSV rows into orders by (student_ref, date, delivery_pref) and
creates LegacyOrder + LegacyOrderItem records. Mixed-delivery orders
are split into separate orders per delivery preference.

Ignores */MV/* and */PBIN/* lines.

Usage:
  python manage.py import_legacy_orders --csv ../../docs/misc/all_orders.csv
  python manage.py import_legacy_orders --csv ../../docs/misc/all_orders.csv --dry-run
  python manage.py import_legacy_orders --csv ../../docs/misc/all_orders.csv --batch-size 5000
"""

import csv
import os
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from legacy.models import LegacyOrder, LegacyOrderItem, LegacyProduct


class Command(BaseCommand):
    help = "Import legacy orders from all_orders.csv into legacy.orders + legacy.order_items"

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            required=True,
            help="Path to all_orders.csv",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=5000,
            help="Orders per transaction batch (default: 5000)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report stats without writing to DB",
        )

    def handle(self, *args, **options):
        csv_path = options["csv"]
        if not os.path.isabs(csv_path):
            csv_path = os.path.join(os.getcwd(), csv_path)

        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f"CSV not found: {csv_path}"))
            return

        batch_size = options["batch_size"]
        dry_run = options["dry_run"]

        self.stdout.write(f"Reading {csv_path} ...")
        orders, stats = self._parse_csv(csv_path)

        self.stdout.write(f"  CSV lines read: {stats['total_lines']}")
        self.stdout.write(f"  Ignored (*/MV/*, */PBIN/*): {stats['ignored']}")
        self.stdout.write(f"  Orders to create: {len(orders)}")
        self.stdout.write(f"  Items to create: {stats['item_count']}")

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run complete. No data written."))
            return

        # Check for existing data
        existing = LegacyOrder.objects.count()
        if existing > 0:
            self.stderr.write(
                self.style.WARNING(
                    f"legacy.orders already has {existing} rows. "
                    f"Use --dry-run first or clear the table."
                )
            )
            return

        self._import_orders(orders, batch_size)

    def _parse_csv(self, csv_path):
        """Parse CSV into order groups.

        Returns:
            orders: list of (order_key, items) where order_key is
                    (student_ref, date_str, delivery_pref)
            stats: dict with parsing statistics
        """
        # Group by (ref, date, delivery_pref)
        groups = defaultdict(list)
        stats = {"total_lines": 0, "ignored": 0, "item_count": 0}

        with open(csv_path, "r") as f:
            reader = csv.reader(f)
            next(reader)  # skip header

            for line_no, row in enumerate(reader, start=2):
                stats["total_lines"] += 1
                code = row[1]

                # Skip */MV/* and */PBIN/*
                if code.startswith("*/MV") or code.startswith("*/PBIN"):
                    stats["ignored"] += 1
                    continue

                ref = int(row[0])
                date_str = row[4]
                dlv = row[5].strip()
                # Default blank delivery to H
                if dlv not in ("H", "W"):
                    dlv = "H"

                key = (ref, date_str, dlv)
                groups[key].append((line_no, row))
                stats["item_count"] += 1

        # Convert to sorted list for deterministic batching
        orders = sorted(groups.items(), key=lambda x: (x[0][1], x[0][0]))
        return orders, stats

    def _import_orders(self, orders, batch_size):
        """Import orders in batched transactions."""
        # Build product code -> LegacyProduct lookup
        code_to_product = dict(
            LegacyProduct.objects.values_list("full_code", "id")
        )
        self.stdout.write(
            f"  Product lookup: {len(code_to_product)} codes"
        )

        total = len(orders)
        created_orders = 0
        created_items = 0
        unlinked = 0

        for batch_start in range(0, total, batch_size):
            batch = orders[batch_start: batch_start + batch_size]
            batch_num = (batch_start // batch_size) + 1

            with transaction.atomic():
                for (ref, date_str, dlv), items in batch:
                    order_date = datetime.strptime(date_str, "%d/%m/%Y").date()

                    order = LegacyOrder.objects.create(
                        student_ref=ref,
                        order_date=order_date,
                        delivery_pref=dlv,
                    )
                    created_orders += 1

                    item_objects = []
                    for line_no, row in items:
                        code = row[1]
                        product_id = code_to_product.get(code)
                        if not product_id:
                            unlinked += 1

                        item_objects.append(LegacyOrderItem(
                            order=order,
                            order_no=int(row[6]),
                            product_id=product_id,
                            price=Decimal(row[2]),
                            quantity=int(row[3]),
                            free_of_charge=row[7].strip() == "T",
                            is_retaker=row[8].strip() == "Y",
                            is_reduced=row[9].strip() == "Y",
                            is_additional=row[10].strip() == "Y",
                            is_reduced_rate=row[11].strip() == "Y",
                            source_line=line_no,
                        ))

                    LegacyOrderItem.objects.bulk_create(item_objects)
                    created_items += len(item_objects)

            self.stdout.write(
                f"  Batch {batch_num}: orders {batch_start + 1}-"
                f"{batch_start + len(batch)} "
                f"(orders={created_orders}, items={created_items})"
            )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Import complete:"))
        self.stdout.write(f"  Orders created: {created_orders}")
        self.stdout.write(f"  Items created: {created_items}")
        self.stdout.write(f"  Items with no product link (session 26): {unlinked}")
