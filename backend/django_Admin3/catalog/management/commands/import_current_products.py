"""
Catalog management command: import_current_products.

Imports product data from CSV into the full catalog/store pipeline:
  1. Seeds ProductVariation records (P, C, M)
  2. Creates catalog.Product records (deduplicated by canonical name)
  3. Creates ProductProductVariation junction records
  4. Creates store.Product records (linked to ExamSessionSubject)
  5. (Optional) Creates store.Price records when price columns are present

Two CSV layouts are supported:

  A. Legacy positional (no header, cp1252) — 7 columns:
       subject, type, item, version, code, fullname, shortname

  B. Headered (UTF-8 by default) — same 7 base columns, optionally
     followed by price columns:
       net          → standard price
       retakernet   → retaker price
       reducenet    → reduced price
       additnet     → additional price

The header row is auto-detected on the first cell ("subject"). When a
header is found, DictReader is used and the CSV's `code` column is
written verbatim into store.Product.product_code (preserving edition
suffixes like PEX2, PSWE2, MM1 that the legacy auto-generator would
otherwise drop).

Transformation rules (unchanged from before):
  * Rows where subject == '*' AND the `code` column also has a `*` prefix
    are skipped. For new-format CSVs, if subject is '*' but the code
    carries a real subject prefix, the prefix is used as the subject.
  * Trailing " eBook" stripped from fullname/shortname for canonical name.
  * "Mock Exam {N} Marking" → "Mock Exam Marking".
  * Catalog Products deduped by (item, canonical_name).

Usage:
  # New format (header detected automatically; multi-session)
  python manage.py import_current_products docs/misc/prods_22-25.csv --dry-run
  python manage.py import_current_products docs/misc/prods_22-25.csv

  # Legacy single-session format
  python manage.py import_current_products docs/misc/prods_26.csv \\
      --session-code 26 --encoding cp1252
"""
import csv
import os
import re
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.exam_session.models import ExamSession
from catalog.models.exam_session_subject import ExamSessionSubject
from catalog.products.models.product import Product
from catalog.products.models.product_product_variation import ProductProductVariation
from catalog.products.models.product_variation import ProductVariation
from store.models.price import Price
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

# Header → canonical key mapping. Accept a few aliases so input variations
# (e.g. `template_code` vs `item`, `session_code` vs `version`) all work.
HEADER_ALIASES = {
    'subject':       'subject',
    'subject_code':  'subject',
    'type':          'type',
    'fmt':           'type',
    'delivery_format': 'type',
    'item':          'item',
    'template_code': 'item',
    'version':       'version',
    'session_code':  'version',
    'code':          'code',
    'full_code':     'code',
    'fullname':      'fullname',
    'shortname':     'shortname',
    'net':           'net',
    'standard':      'net',
    'retakernet':    'retakernet',
    'retaker':       'retakernet',
    'reducenet':     'reducenet',
    'reduced':       'reducenet',
    'additnet':      'additnet',
    'additional':    'additnet',
}

PRICE_COLS = (
    ('net',         'standard'),
    ('retakernet',  'retaker'),
    ('reducenet',   'reduced'),
    ('additnet',    'additional'),
)


def canonicalize_name(fullname):
    """Derive canonical product name from CSV fullname."""
    name = (fullname or '').strip()
    if name.lower().endswith(' ebook'):
        name = name[:-6].rstrip()
    if MOCK_EXAM_RE.match(name):
        name = 'Mock Exam Marking'
    return name


class Command(BaseCommand):
    help = (
        'Import current products from CSV into catalog.Product, '
        'ProductProductVariation, store.Product (and store.Price when '
        'price columns are present).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'file_path', type=str, help='Path to the input CSV file'
        )
        parser.add_argument(
            '--session-code', type=str, default=None,
            help=(
                'Optional. Filter CSV rows to a single session. Required '
                'for legacy positional CSVs. New header-format CSVs may '
                'span multiple sessions.'
            ),
        )
        parser.add_argument(
            '--encoding', type=str, default=None,
            help=(
                "CSV encoding. Defaults: 'utf-8-sig' for headered CSVs, "
                "'cp1252' for legacy positional CSVs."
            ),
        )
        parser.add_argument(
            '--skip-prices', action='store_true',
            help='Do not import Price rows even when price columns exist.',
        )
        parser.add_argument(
            '--no-addons', action='store_true',
            help=(
                'Skip the addon clone step (CM1→CM1S, CX→CXS, PX→PXS, '
                'CPBOR→CYS) that runs by default at the end of import.'
            ),
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be imported without making changes.',
        )
        parser.add_argument(
            '--report', type=str, default=None,
            help='Path for the validation/skip report CSV.',
        )

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        file_path = options['file_path']
        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        rows, has_header = self._read_csv(file_path, options['encoding'])
        if has_header is False and options['session_code'] is None:
            raise CommandError(
                "Legacy positional CSVs require --session-code; the file "
                "has no header row."
            )

        # Optional filter by session_code
        if options['session_code']:
            sc = options['session_code']
            rows = [r for r in rows if r['version'] == sc]
            if not rows:
                raise CommandError(
                    f"No rows match --session-code {sc!r}."
                )

        # Pre-load ESS for every (subject, version) pair the CSV needs.
        ess_lookup = self._load_ess_lookup(rows)

        report_rows = []

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(
                "DRY RUN — no changes will be made"
            ))

        with transaction.atomic():
            stats = self._run_import(
                rows, ess_lookup,
                import_prices=not options['skip_prices'],
                report_rows=report_rows,
            )
            # Auto-clone addons (CM1→CM1S, CX→CXS, PX→PXS, CPBOR→CYS) for
            # any base products we just imported. Runs in the same
            # transaction so a dry run shows the plan and rolls back.
            if not options['no_addons']:
                from django.core.management import call_command
                self.stdout.write("")
                self.stdout.write("Running addon clone step…")
                call_command(
                    'create_addon_products',
                    commit=not options['dry_run'],
                    stdout=self.stdout,
                )
            if options['dry_run']:
                transaction.set_rollback(True)

        # Optional report
        if options['report']:
            self._write_report(options['report'], report_rows)

        self._print_summary(stats, has_header)

    # ------------------------------------------------------------------
    # CSV reading
    # ------------------------------------------------------------------
    def _read_csv(self, file_path, encoding):
        """Read CSV into a list of dicts with normalised keys.

        Returns (rows, has_header) where has_header is True for the new
        DictReader path and False for the legacy positional path.
        """
        # Peek at the first non-empty line to decide.
        with open(file_path, 'rb') as fh:
            first = fh.readline()
        first_text = first.decode('utf-8', errors='replace').strip()
        first_lower = first_text.lower()
        has_header = (
            'subject' in first_lower
            and ('type' in first_lower or 'fmt' in first_lower)
        )

        enc = encoding or ('utf-8-sig' if has_header else 'cp1252')

        if has_header:
            with open(file_path, 'r', newline='', encoding=enc) as fh:
                reader = csv.DictReader(fh)
                # Map raw headers to canonical keys.
                key_map = {}
                for raw in reader.fieldnames or []:
                    canon = HEADER_ALIASES.get(raw.strip().lower())
                    if canon:
                        key_map[raw] = canon
                missing = {'subject', 'type', 'item', 'version',
                           'code', 'fullname', 'shortname'} - set(key_map.values())
                if missing:
                    raise CommandError(
                        f"CSV header missing required column(s): "
                        f"{sorted(missing)}"
                    )
                rows = []
                for raw in reader:
                    rec = {}
                    for k, v in raw.items():
                        canon = key_map.get(k)
                        if canon:
                            rec[canon] = (v or '').strip()
                    # Resolve subject from code prefix when CSV has a
                    # bare wildcard subject but the code carries a real
                    # subject prefix (e.g. subject='*', code='PMS/PPMBP/23').
                    if rec.get('subject') == '*' and rec.get('code'):
                        prefix = rec['code'].split('/', 1)[0]
                        if prefix and prefix != '*':
                            rec['subject'] = prefix
                    rows.append(rec)
            return rows, True

        # Legacy positional path
        rows = []
        with open(file_path, 'r', encoding=enc) as fh:
            reader = csv.reader(fh)
            for row in reader:
                if len(row) < 7:
                    continue
                rows.append({
                    'subject':   row[0].strip(),
                    'type':      row[1].strip(),
                    'item':      row[2].strip(),
                    'version':   row[3].strip(),
                    'code':      row[4].strip(),
                    'fullname':  row[5].strip(),
                    'shortname': row[6].strip(),
                })
        return rows, False

    def _load_ess_lookup(self, rows):
        """Return {(subject_code, session_code): ExamSessionSubject}.

        Loads only the (subject, version) combinations referenced by the
        CSV — typically a few hundred rows even for a multi-thousand-row
        CSV, so this is cheaper than loading every ESS in the DB.
        """
        wanted = {
            (r['subject'], r['version'])
            for r in rows
            if r['subject'] and r['subject'] != '*' and r['version']
        }
        if not wanted:
            return {}
        # Index ExamSession ids by code once.
        sessions_needed = {v for _, v in wanted}
        sessions = {
            es.session_code: es.id
            for es in ExamSession.objects.filter(
                session_code__in=sessions_needed,
            )
        }
        # Pull all matching ESS rows in one go via session_code IN list.
        ess_qs = (
            ExamSessionSubject.objects
            .filter(exam_session_id__in=sessions.values())
            .select_related('subject', 'exam_session')
        )
        lookup = {}
        for ess in ess_qs:
            lookup[(ess.subject.code, ess.exam_session.session_code)] = ess
        return lookup

    # ------------------------------------------------------------------
    # Import pipeline
    # ------------------------------------------------------------------
    def _run_import(self, rows, ess_lookup, *, import_prices, report_rows):
        stats = {
            'products_created':   0,
            'products_existing':  0,
            'pvs_created':        0,
            'ppvs_created':       0,
            'ppvs_existing':      0,
            'store_created':      0,
            'store_existing':     0,
            'prices_created':     0,
            'prices_existing':    0,
            'skipped_wildcard':   0,
            'skipped_no_ess':     0,
            'skipped_bad_format': 0,
        }

        # Step 1: ProductVariations
        pv_by_code = {}
        for code, (vtype, name, vcode) in VARIATION_SEED.items():
            pv, created = ProductVariation.objects.get_or_create(
                code=vcode,
                defaults={'variation_type': vtype, 'name': name},
            )
            pv_by_code[code] = pv
            if created:
                stats['pvs_created'] += 1

        # Step 2: Build product groups for catalog dedup.
        # Key: (item, canonical_name) → {formats, shortnames, store_lines}
        # store_lines is a list of dicts (subject, fmt, version, csv_code, prices)
        # because a single template can ship across many sessions / subjects.
        product_groups = {}
        for r in rows:
            subject = r.get('subject', '')
            fmt = r.get('type', '')
            item = r.get('item', '')
            version = r.get('version', '')

            if subject == '*' or not subject:
                stats['skipped_wildcard'] += 1
                report_rows.append({**r, 'reason': 'wildcard_subject'})
                continue
            if fmt not in VARIATION_SEED:
                stats['skipped_bad_format'] += 1
                report_rows.append({**r, 'reason': f'unsupported_format:{fmt}'})
                continue
            # Subject ↔ code-prefix consistency. If the CSV gives both,
            # they must agree — otherwise we'd silently mis-route the
            # store.Product to the wrong ExamSessionSubject.
            csv_code = r.get('code') or ''
            if csv_code and '/' in csv_code:
                prefix = csv_code.split('/', 1)[0]
                if prefix and prefix != '*' and prefix != subject:
                    stats['skipped_bad_format'] += 1
                    report_rows.append({
                        **r,
                        'reason':
                            f'subject_code_mismatch:'
                            f'subject={subject},code_prefix={prefix}',
                    })
                    continue

            canonical = canonicalize_name(r.get('fullname'))
            key = (item, canonical)
            if key not in product_groups:
                product_groups[key] = {
                    'formats':    set(),
                    'shortnames': {},
                    'store_lines': [],
                }
            grp = product_groups[key]
            grp['formats'].add(fmt)
            if fmt not in grp['shortnames']:
                grp['shortnames'][fmt] = r.get('shortname', '')
            grp['store_lines'].append({
                'subject':  subject,
                'fmt':      fmt,
                'version':  version,
                'csv_code': r.get('code') or None,
                'prices':   self._extract_prices(r) if import_prices else {},
            })

        # Step 2b: catalog.Product
        product_by_key = {}
        for (item, canonical), grp in product_groups.items():
            shortname = None
            for fmt in sorted(grp['shortnames'].keys(),
                              key=lambda f: FORMAT_PRIORITY.get(f, 99)):
                shortname = grp['shortnames'][fmt]
                break
            if shortname and shortname.lower().endswith(' ebook'):
                shortname = shortname[:-6].rstrip()

            product, created = Product.objects.get_or_create(
                code=item,
                fullname=canonical,
                defaults={'shortname': shortname or canonical},
            )
            product_by_key[(item, canonical)] = product
            stats['products_created' if created else 'products_existing'] += 1

        # Step 3: ProductProductVariation
        ppv_by_key = {}
        for (item, canonical), grp in product_groups.items():
            product = product_by_key[(item, canonical)]
            for fmt in grp['formats']:
                pv = pv_by_code.get(fmt)
                if not pv:
                    continue
                ppv, created = ProductProductVariation.objects.get_or_create(
                    product=product,
                    product_variation=pv,
                )
                ppv_by_key[(item, canonical, fmt)] = ppv
                stats['ppvs_created' if created else 'ppvs_existing'] += 1

        # Step 4: store.Product (+ optional Price rows)
        used_codes = set(StoreProduct.objects.values_list('product_code', flat=True))
        for (item, canonical), grp in product_groups.items():
            for line in grp['store_lines']:
                ess = ess_lookup.get((line['subject'], line['version']))
                if not ess:
                    stats['skipped_no_ess'] += 1
                    report_rows.append({
                        **line,
                        'reason': f"no_ess:{line['subject']}/{line['version']}",
                    })
                    continue

                ppv = ppv_by_key.get((item, canonical, line['fmt']))
                if not ppv:
                    continue

                # Skip if this (ess, ppv) already has a non-addon Product.
                # (We cannot rely on unique_together — it was dropped to
                # accommodate addons sharing a PPV with their base.)
                existing = StoreProduct.objects.filter(
                    exam_session_subject=ess,
                    product_product_variation=ppv,
                    is_addon=False,
                ).first()
                if existing:
                    stats['store_existing'] += 1
                    sp = existing
                else:
                    code = line['csv_code'] or self._auto_code(
                        ess, ppv, item, used_codes,
                    )
                    if code in used_codes:
                        # The CSV explicitly gave us a colliding code —
                        # likely a duplicate row. Report and skip.
                        stats['skipped_bad_format'] += 1
                        report_rows.append({
                            **line,
                            'reason': f'duplicate_code:{code}',
                        })
                        continue
                    sp = StoreProduct(
                        exam_session_subject=ess,
                        product_product_variation=ppv,
                        product_code=code,
                    )
                    sp.save()
                    used_codes.add(code)
                    stats['store_created'] += 1

                # Prices
                if import_prices and line['prices']:
                    for price_type, amount in line['prices'].items():
                        _, created = Price.objects.update_or_create(
                            purchasable_id=sp.purchasable_ptr_id,
                            price_type=price_type,
                            defaults={
                                'amount': amount,
                                'currency': 'GBP',
                                'is_active': True,
                            },
                        )
                        stats['prices_created' if created else 'prices_existing'] += 1

        return stats

    # ------------------------------------------------------------------
    def _extract_prices(self, row):
        """Return {price_type: Decimal} for whatever price columns are set."""
        prices = {}
        for src, price_type in PRICE_COLS:
            raw = (row.get(src) or '').strip()
            if not raw:
                continue
            try:
                prices[price_type] = Decimal(raw)
            except InvalidOperation:
                continue
        return prices

    @staticmethod
    def _auto_code(ess, ppv, item, used_codes):
        vcode = ppv.product_variation.code or ''
        base = (
            f"{ess.subject.code}/{vcode}{item}"
            f"/{ess.exam_session.session_code}"
        )
        code = base
        suffix = 2
        while code in used_codes:
            code = f"{base}-{suffix}"
            suffix += 1
        return code

    # ------------------------------------------------------------------
    def _write_report(self, path, report_rows):
        if not report_rows:
            return
        keys = sorted({k for r in report_rows for k in r.keys()})
        with open(path, 'w', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=keys)
            w.writeheader()
            for r in report_rows:
                w.writerow(r)
        self.stdout.write(f"Skip/issue report written: {path}")

    def _print_summary(self, stats, has_header):
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS(
            f"Import {'completed' if not stats['skipped_no_ess'] else 'completed (with skips)'} "
            f"({'header' if has_header else 'positional'} format):\n"
            f"  Catalog Products created:  {stats['products_created']}\n"
            f"  Catalog Products existing: {stats['products_existing']}\n"
            f"  Variations created:        {stats['pvs_created']}\n"
            f"  PPVs created:              {stats['ppvs_created']}\n"
            f"  PPVs existing:             {stats['ppvs_existing']}\n"
            f"  Store products created:    {stats['store_created']}\n"
            f"  Store products existing:   {stats['store_existing']}\n"
            f"  Prices created:            {stats['prices_created']}\n"
            f"  Prices updated/existing:   {stats['prices_existing']}\n"
            f"  Skipped (wildcard):        {stats['skipped_wildcard']}\n"
            f"  Skipped (no ESS):          {stats['skipped_no_ess']}\n"
            f"  Skipped (bad format/dup):  {stats['skipped_bad_format']}"
        ))
