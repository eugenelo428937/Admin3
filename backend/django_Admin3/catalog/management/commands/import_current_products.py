"""
Catalog management command: import_current_products.

Imports product data from a 7-column CSV into the full catalog/store pipeline:
  1. Seeds ProductVariation records (P, C, M)
  2. Creates catalog.Product records (deduplicated by canonical name)
  3. Creates ProductProductVariation junction records
  4. Creates store.Product records (linked to ExamSessionSubject)

CSV format (cp1252 encoded, no header):
  Col 1: subject_code   (e.g., CM1, CB1, *)
  Col 2: delivery_format (P=Printed, C=eBook, M=Marking)
  Col 3: template_code  (e.g., N, C, EX, M, X)
  Col 4: session_code   (e.g., 26)
  Col 5: full_code      (e.g., CM1/PN/26) — not used
  Col 6: fullname       (e.g., Course Notes eBook)
  Col 7: shortname      (e.g., Course Notes eBook)

Transformation rules:
  - Wildcard (*) subject rows are skipped entirely
  - Trailing " eBook" is stripped to derive canonical product name
  - "Mock Exam 2 Marking" and "Mock Exam 3 Marking" → "Mock Exam Marking"
  - Products are deduplicated by (template_code, canonical_name)
  - Shortname preference: P > C > M (first available)
"""
import csv
import os
import re

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.exam_session.models import ExamSession
from catalog.models.exam_session_subject import ExamSessionSubject
from catalog.products.models.product import Product
from catalog.products.models.product_product_variation import ProductProductVariation
from catalog.products.models.product_variation import ProductVariation
from store.models.product import Product as StoreProduct


# Delivery format → (variation_type, name, code)
VARIATION_SEED = {
    'P': ('Printed', 'Printed', 'P'),
    'C': ('eBook', 'eBook', 'C'),
    'M': ('Marking', 'Marking', 'M'),
}

# Priority for shortname selection: prefer P, then C, then M
FORMAT_PRIORITY = {'P': 0, 'C': 1, 'M': 2}

# Mock exam grouping pattern
MOCK_EXAM_RE = re.compile(r'^Mock Exam \d+ Marking$', re.IGNORECASE)


def canonicalize_name(fullname):
    """Derive canonical product name from CSV fullname.

    Rules:
      1. Strip trailing " eBook" (case-insensitive)
      2. "Mock Exam 2 Marking", "Mock Exam 3 Marking" → "Mock Exam Marking"
    """
    name = fullname.strip()
    # Strip trailing " eBook"
    if name.lower().endswith(' ebook'):
        name = name[:-6].rstrip()
    # Group numbered mock exam markings
    if MOCK_EXAM_RE.match(name):
        name = 'Mock Exam Marking'
    return name


class Command(BaseCommand):
    help = (
        'Import current products from CSV into catalog.Product, '
        'ProductProductVariation, and store.Product'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'file_path', type=str, help='Path to the input CSV file'
        )
        parser.add_argument(
            '--session-code', type=str, required=True,
            help='Exam session code to target (e.g., 26)'
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be imported without making changes'
        )
        parser.add_argument(
            '--output', type=str, default=None,
            help='Path for skipped rows report CSV'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        session_code = options['session_code']
        dry_run = options['dry_run']

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        # Validate session exists
        try:
            session = ExamSession.objects.get(session_code=session_code)
        except ExamSession.DoesNotExist:
            raise CommandError(
                f"ExamSession with session_code='{session_code}' not found"
            )

        # Pre-load ESS lookup: subject_code → ExamSessionSubject
        ess_by_subject = {}
        for ess in ExamSessionSubject.objects.filter(
            exam_session=session
        ).select_related('subject'):
            ess_by_subject[ess.subject.code] = ess

        # Read and parse CSV
        rows = self._read_csv(file_path)

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN — no changes will be made")
            )

        with transaction.atomic():
            stats = self._run_import(rows, ess_by_subject)

            if dry_run:
                transaction.set_rollback(True)

        self._print_summary(stats)

    def _read_csv(self, file_path):
        """Read CSV and return list of row tuples."""
        rows = []
        with open(file_path, 'r', encoding='cp1252') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) < 7:
                    continue
                rows.append(tuple(col.strip() for col in row))
        return rows

    def _run_import(self, rows, ess_by_subject):
        """Execute the 4-step import pipeline. Returns stats dict."""
        stats = {
            'products_created': 0,
            'products_existing': 0,
            'pvs_created': 0,
            'ppvs_created': 0,
            'ppvs_existing': 0,
            'store_created': 0,
            'store_existing': 0,
            'skipped_wildcard': 0,
            'skipped_no_ess': 0,
        }

        # Step 1: Seed ProductVariations
        pv_by_code = {}
        for code, (vtype, name, vcode) in VARIATION_SEED.items():
            pv, created = ProductVariation.objects.get_or_create(
                code=vcode,
                defaults={'variation_type': vtype, 'name': name}
            )
            pv_by_code[code] = pv
            if created:
                stats['pvs_created'] += 1

        # Step 2: Build product groups from CSV rows
        # Key: (template_code, canonical_name) → {formats, shortnames, subjects}
        product_groups = {}
        for subject, fmt, template_code, session, full_code, fullname, shortname in rows:
            if subject == '*':
                stats['skipped_wildcard'] += 1
                continue

            canonical = canonicalize_name(fullname)
            key = (template_code, canonical)

            if key not in product_groups:
                product_groups[key] = {
                    'formats': set(),
                    'shortnames': {},
                    'store_keys': set(),
                }
            group = product_groups[key]
            group['formats'].add(fmt)
            # Track shortname per format for priority selection
            if fmt not in group['shortnames']:
                group['shortnames'][fmt] = shortname
            # Track (subject, format) pairs for store.Product creation
            group['store_keys'].add((subject, fmt))

        # Step 2b: Create catalog.Product records
        product_by_key = {}
        for (template_code, canonical), group in product_groups.items():
            # Pick shortname: prefer P, then C, then M
            shortname = None
            for fmt in sorted(group['shortnames'].keys(),
                              key=lambda f: FORMAT_PRIORITY.get(f, 99)):
                shortname = group['shortnames'][fmt]
                break
            # Also strip " eBook" from shortname
            if shortname and shortname.lower().endswith(' ebook'):
                shortname = shortname[:-6].rstrip()

            product, created = Product.objects.get_or_create(
                code=template_code,
                fullname=canonical,
                defaults={'shortname': shortname or canonical}
            )
            product_by_key[(template_code, canonical)] = product
            if created:
                stats['products_created'] += 1
            else:
                stats['products_existing'] += 1

        # Step 3: Create ProductProductVariation records
        ppv_by_key = {}
        for (template_code, canonical), group in product_groups.items():
            product = product_by_key[(template_code, canonical)]
            for fmt in group['formats']:
                pv = pv_by_code.get(fmt)
                if not pv:
                    continue
                ppv, created = ProductProductVariation.objects.get_or_create(
                    product=product,
                    product_variation=pv,
                )
                ppv_by_key[(template_code, canonical, fmt)] = ppv
                if created:
                    stats['ppvs_created'] += 1
                else:
                    stats['ppvs_existing'] += 1

        # Step 4: Create store.Product records
        # Track used product_codes to detect collisions within this run
        used_codes = set(
            StoreProduct.objects.values_list('product_code', flat=True)
        )

        for (template_code, canonical), group in product_groups.items():
            for subject, fmt in group['store_keys']:
                ess = ess_by_subject.get(subject)
                if not ess:
                    stats['skipped_no_ess'] += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"  No ESS for subject '{subject}' — skipping"
                        )
                    )
                    continue

                ppv = ppv_by_key.get((template_code, canonical, fmt))
                if not ppv:
                    continue

                # Check if this (ESS, PPV) already exists
                existing = StoreProduct.objects.filter(
                    exam_session_subject=ess,
                    product_product_variation=ppv,
                ).first()
                if existing:
                    stats['store_existing'] += 1
                    continue

                # Pre-generate product_code with collision handling.
                # Multiple products can share the same template code
                # (e.g., EX for multiple ASET variants), causing identical
                # auto-generated codes. Append a numeric suffix if needed.
                variation = ppv.product_variation
                vcode = variation.code or ''
                base_code = (
                    f"{ess.subject.code}/{vcode}{template_code}"
                    f"/{ess.exam_session.session_code}"
                )
                code = base_code
                suffix = 2
                while code in used_codes:
                    code = f"{base_code}-{suffix}"
                    suffix += 1

                sp = StoreProduct(
                    exam_session_subject=ess,
                    product_product_variation=ppv,
                    product_code=code,
                )
                sp.save()
                used_codes.add(code)
                stats['store_created'] += 1

        return stats

    def _print_summary(self, stats):
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS(
            f"Import completed:\n"
            f"  Products created:       {stats['products_created']}\n"
            f"  Products existing:      {stats['products_existing']}\n"
            f"  Variations created:     {stats['pvs_created']}\n"
            f"  PPVs created:           {stats['ppvs_created']}\n"
            f"  PPVs existing:          {stats['ppvs_existing']}\n"
            f"  Store products created: {stats['store_created']}\n"
            f"  Store products existing:{stats['store_existing']}\n"
            f"  Skipped (wildcard):     {stats['skipped_wildcard']}\n"
            f"  Skipped (no ESS):       {stats['skipped_no_ess']}"
        ))
