"""
Catalog management command: import_product_product_variations.

Imports product-to-variation mappings from CSV into the
catalog_product_product_variations junction table.

CSV format:
  Column 1 (variations): P=Printed, C=eBook, M=Marking, T=Tutorial
  Column 2 (product code): matches Product.code
  Column 3 (product name): matches Product.fullname

Matching logic:
  - ProductVariation is matched by code (P, C, M, T)
  - Product is matched by code + fullname (both must match exactly)
  - Unmatched rows are written to an ambiguous report CSV
"""
import csv
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.products.models.product import Product
from catalog.products.models.product_product_variation import ProductProductVariation
from catalog.products.models.product_variation import ProductVariation


VARIATION_CODE_MAP = {
    'P': 'P',
    'C': 'C',
    'M': 'M',
    'T': 'T',
}


class Command(BaseCommand):
    help = (
        'Import product-variation mappings from CSV into '
        'catalog_product_product_variations'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'file_path', type=str, help='Path to the input CSV file'
        )
        parser.add_argument(
            '--output',
            type=str,
            default=None,
            help='Path for the ambiguous/unmatched report CSV '
                 '(default: <input>_unmatched.csv)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without making changes',
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        dry_run = options['dry_run']

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        output_path = options['output']
        if not output_path:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_unmatched.csv"

        # Pre-load all ProductVariations keyed by code
        pv_by_code = {}
        for pv in ProductVariation.objects.all():
            if pv.code:
                pv_by_code[pv.code] = pv

        # Pre-load all Products for matching
        products_by_code = {}
        for p in Product.objects.all():
            products_by_code.setdefault(p.code, []).append(p)

        # Pre-load existing PPV pairs to avoid duplicates
        existing_ppv = set(
            ProductProductVariation.objects.values_list(
                'product_id', 'product_variation_id'
            )
        )

        rows = self._read_csv(file_path)

        created_count = 0
        skipped_count = 0
        duplicate_count = 0
        unmatched_rows = []

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN - No changes will be made")
            )

        with transaction.atomic():
            for row_num, (variation_code, product_code, product_name) in enumerate(
                rows, start=2
            ):
                # 1. Match ProductVariation by code
                pv_code = VARIATION_CODE_MAP.get(variation_code)
                pv = pv_by_code.get(pv_code) if pv_code else None

                # 2. Match Product by code + fullname
                product = None
                candidates = products_by_code.get(product_code, [])
                for p in candidates:
                    if p.fullname.strip() == product_name.strip():
                        product = p
                        break

                # 3. Both matched -> insert
                if pv and product:
                    pair = (product.id, pv.id)
                    if pair in existing_ppv:
                        duplicate_count += 1
                        self.stdout.write(
                            f"  Row {row_num}: Duplicate skipped "
                            f"({variation_code}, {product_code}, "
                            f"\"{product_name}\")"
                        )
                        continue

                    if not dry_run:
                        ProductProductVariation.objects.create(
                            product=product,
                            product_variation=pv,
                        )
                    existing_ppv.add(pair)
                    created_count += 1
                    self.stdout.write(
                        f"  Row {row_num}: Created "
                        f"({variation_code}, {product_code}, "
                        f"\"{product_name}\")"
                    )
                    continue

                # 4. No full match -> build report row
                skipped_count += 1
                possible_pv = pv_code if pv else ''
                possible_p = self._find_possible_product_match(
                    product_code, product_name, candidates, products_by_code
                )

                reason = []
                if not pv:
                    reason.append(f"no ProductVariation with code '{variation_code}'")
                if not product:
                    reason.append(
                        f"no Product with code='{product_code}' "
                        f"and fullname='{product_name}'"
                    )

                self.stdout.write(
                    self.style.WARNING(
                        f"  Row {row_num}: Unmatched - {'; '.join(reason)}"
                    )
                )

                unmatched_rows.append({
                    'variations': variation_code,
                    'product_code': product_code,
                    'product_name': product_name,
                    'possible_pv_code': possible_pv,
                    'possible_p_codes': possible_p,
                })

            if dry_run:
                transaction.set_rollback(True)

        # Write unmatched report
        if unmatched_rows:
            self._write_unmatched_csv(output_path, unmatched_rows)
            self.stdout.write(
                self.style.WARNING(
                    f"\nUnmatched report written to: {output_path}"
                )
            )

        # Summary
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(
            self.style.SUCCESS(
                f"Import completed:\n"
                f"  Created: {created_count}\n"
                f"  Duplicates skipped: {duplicate_count}\n"
                f"  Unmatched: {skipped_count}"
            )
        )

    def _read_csv(self, file_path):
        """Read CSV and yield (variation_code, product_code, product_name) tuples."""
        rows = []
        with open(file_path, 'r', encoding='cp1252') as f:
            reader = csv.reader(f)
            header = next(reader)  # skip header row
            for row in reader:
                if len(row) < 3:
                    continue
                variation_code = row[0].strip()
                product_code = row[1].strip()
                product_name = row[2].strip()
                rows.append((variation_code, product_code, product_name))
        return rows

    def _find_possible_product_match(
        self, product_code, product_name, candidates, products_by_code
    ):
        """Find possible product matches for the unmatched report.

        Returns a comma-separated string of possible product codes.
        """
        possible = []

        # Check if there are products with matching code but different fullname
        if candidates:
            for p in candidates[:5]:
                possible.append(f"{p.code}(id={p.id},fn=\"{p.fullname}\")")

        # If no code match at all, try fuzzy name match across all products
        if not candidates:
            name_lower = product_name.strip().lower()
            for code, prods in products_by_code.items():
                for p in prods:
                    if p.fullname.strip().lower() == name_lower:
                        possible.append(
                            f"{p.code}(id={p.id},fn=\"{p.fullname}\")"
                        )
            possible = possible[:5]

        return '; '.join(possible) if possible else ''

    def _write_unmatched_csv(self, output_path, unmatched_rows):
        """Write the unmatched/ambiguous rows to a report CSV."""
        fieldnames = [
            'variations',
            'product_code',
            'product_name',
            'possible_pv_code',
            'possible_p_codes',
        ]
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(unmatched_rows)
