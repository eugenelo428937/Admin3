"""Split existing store.Product rows into MTI subclasses.

For every store.Product row whose Purchasable.kind == 'product',
classify by `product_product_variation.product_variation.variation_type`
and create the matching subclass row (MaterialProduct / TutorialProduct
/ MarkingProduct) sharing the parent PK (MTI shared PK), then update
Purchasable.kind to the specialized value.

Modes:
  --dry-run (default): walk and report. Write nothing.
  --check: walk and report unmappable rows (unknown formats, missing
           tutorial templates, missing TutorialEvent). Write nothing.
  --commit: walk and split. Idempotent — re-runs skip already-split
            rows.

Usage:
  python manage.py split_products_by_kind --dry-run
  python manage.py split_products_by_kind --check
  python manage.py split_products_by_kind --commit
"""
from collections import Counter

from django.core.management.base import BaseCommand, CommandError

from store.models import Product


# Mapping from catalog ProductVariation.variation_type to the
# specialized Purchasable.kind value and the MTI subclass model.
KIND_BY_VARIATION_TYPE = {
    'eBook':    'material',
    'Printed':  'material',
    'Hub':      'material',
    'Tutorial': 'tutorial',
    'Marking':  'marking',
}


class Command(BaseCommand):
    help = 'Split existing store.Product rows into MTI subclasses.'

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument(
            '--dry-run',
            action='store_true',
            help='Walk and report; write nothing. Default when no mode flag is passed.',
        )
        mode.add_argument(
            '--check',
            action='store_true',
            help='Walk and report unmappable rows. Write nothing.',
        )
        mode.add_argument(
            '--commit',
            action='store_true',
            help='Walk and split. Idempotent.',
        )

    def handle(self, *args, **options):
        if options['commit']:
            raise CommandError('--commit mode is implemented in Phase 2 Task 6')
        if options['check']:
            self._walk_and_check()
            return

        # Default (no flag, or --dry-run explicitly) — walk and report.
        self._walk_and_report()

    def _walk_and_report(self):
        """Walk every legacy Product row and tally by resolved kind.

        Single joined queryset — Product MTI shares the Purchasable PK,
        so filtering by purchasable_ptr__kind='product' is the canonical
        way to get the legacy rows that still need splitting.
        """
        tally = Counter()
        unresolved = 0

        legacy = (
            Product.objects
            .filter(purchasable_ptr__kind='product')
            .select_related('product_product_variation__product_variation')
        )

        for product in legacy.iterator():
            vt = product.product_product_variation.product_variation.variation_type
            kind = KIND_BY_VARIATION_TYPE.get(vt)
            if kind is None:
                unresolved += 1
                continue
            tally[kind] += 1

        self.stdout.write(self.style.NOTICE(
            'split_products_by_kind --dry-run summary:'
        ))
        for kind in ('material', 'tutorial', 'marking'):
            self.stdout.write(f'  {kind:10s} {tally[kind]:6d}')
        self.stdout.write(f'  {"unresolved":10s} {unresolved:6d}')
        self.stdout.write(
            f'  {"total":10s} {sum(tally.values()) + unresolved:6d}'
        )

    def _walk_and_check(self):
        """Audit every legacy Product row for resolvable dimensions.

        Reports:
          - Tutorial format codes seen in the data that aren't in
            TutorialProduct.Format.values.
          - Tutorial products that lack a (subject, format) ->
            TutorialCourseTemplate match.
          - Tutorial products with no linked TutorialEvent AND format
            != 'OC' (these would have NULL location which is only
            semantically correct for OC).
          - Marking products whose ppv.product_id is missing from
            MarkingTemplate (would mean the Task 3 backfill missed
            something).

        Writes nothing.
        """
        from store.models import TutorialProduct
        from tutorials.models import TutorialCourseTemplate, TutorialEvents
        from marking.models import MarkingTemplate

        valid_formats = set(TutorialProduct.Format.values)
        existing_template_codes = set(
            TutorialCourseTemplate.objects.values_list('code', flat=True)
        )
        marking_template_pks = set(
            MarkingTemplate.objects.values_list('pk', flat=True)
        )
        # TutorialEvents.store_product is a non-nullable FK; every event has a
        # linked Product. Pre-fetch the set for O(1) membership lookup.
        tutorial_event_product_pks = set(
            TutorialEvents.objects.values_list('store_product_id', flat=True)
        )

        unmapped_formats = Counter()
        missing_templates = []     # list of (subject_code, format_code)
        non_oc_no_location = []    # list of product pks
        missing_marking_templates = []  # list of (product pk, catalog product id)

        legacy = (
            Product.objects
            .filter(purchasable_ptr__kind='product')
            .select_related(
                'exam_session_subject__subject',
                'product_product_variation__product_variation',
                'product_product_variation__product',
            )
        )

        for product in legacy.iterator():
            ppv = product.product_product_variation
            vt = ppv.product_variation.variation_type
            kind = KIND_BY_VARIATION_TYPE.get(vt)

            if kind == 'tutorial':
                fmt_code = ppv.product_variation.code
                if fmt_code not in valid_formats:
                    unmapped_formats[fmt_code] += 1
                    continue

                subject_code = product.exam_session_subject.subject.code
                template_code = self._build_template_code(
                    subject_code, fmt_code,
                )
                if template_code and template_code not in existing_template_codes:
                    missing_templates.append((subject_code, fmt_code))

                # Use set-membership instead of per-row .exists() — O(1) lookup.
                if fmt_code != 'OC' and product.pk not in tutorial_event_product_pks:
                    non_oc_no_location.append(product.pk)

            elif kind == 'marking':
                if ppv.product_id not in marking_template_pks:
                    missing_marking_templates.append((product.pk, ppv.product_id))

        self.stdout.write(self.style.NOTICE(
            'split_products_by_kind --check report:'
        ))
        self.stdout.write(f'  unmapped tutorial formats: {sum(unmapped_formats.values())}')
        for fmt, count in unmapped_formats.most_common():
            self.stdout.write(f'    {fmt}: {count}')
        self.stdout.write(f'  missing tutorial templates: {len(missing_templates)}')
        for subj, fmt in missing_templates[:20]:
            self.stdout.write(f'    {subj}_{fmt}')
        if len(missing_templates) > 20:
            self.stdout.write(f'    ... +{len(missing_templates) - 20} more')
        self.stdout.write(f'  non-OC tutorials with no TutorialEvent: {len(non_oc_no_location)}')
        self.stdout.write(f'  missing marking_template rows: {len(missing_marking_templates)}')
        for pk, cp_id in missing_marking_templates[:10]:
            self.stdout.write(f'    Product.pk={pk}, catalog_product.id={cp_id}')
        if len(missing_marking_templates) > 10:
            self.stdout.write(f'    ... +{len(missing_marking_templates) - 10} more')

    @staticmethod
    def _build_template_code(subject_code, fmt_code):
        """Map (subject, format) to expected TutorialCourseTemplate.code.

        Real template codes follow these conventions (controller-verified
        on dev DB, 2026-05-14):
          - f2f: '{subject}_f2f_{N}' where N is purely numeric (1–6)
          - LO:  '{subject}_LO_{N}'  where N is purely numeric (1–10)
          - OC:  'OC_{subject}'      (subject suffix, NOT prefix)

        Format codes from TutorialProduct.Format embed both day count and
        a duration-shape suffix (F=full day, H=half day, B=bundle, PD=Paper
        B Preparation Day). Templates ignore the shape suffix and key only
        on the day count. We strip non-digit characters after the prefix.

        Produces:
          'F2F_1F'   → 'CB1_f2f_1'
          'F2F_1PD'  → 'CB1_f2f_1'
          'F2F_5B'   → 'CB1_f2f_5'
          'F2F_6H'   → 'CB1_f2f_6'
          'LO_10H'   → 'CB1_LO_10'
          'LO_2F'    → 'CB1_LO_2'
          'OC'       → 'OC_CB1'
          'UNKNOWN'  → None
        """
        if fmt_code == 'OC':
            return f'OC_{subject_code}'
        if fmt_code.startswith('F2F_'):
            return f'{subject_code}_f2f_{Command._numeric_suffix(fmt_code[4:])}'
        if fmt_code.startswith('LO_'):
            return f'{subject_code}_LO_{Command._numeric_suffix(fmt_code[3:])}'
        return None

    @staticmethod
    def _numeric_suffix(s):
        """Extract leading digits from a string. 'F'->'', '10H'->'10',
        '5B'->'5', '1PD'->'1'. Internal helper for template-code mapping.
        """
        digits = []
        for ch in s:
            if ch.isdigit():
                digits.append(ch)
            else:
                break
        return ''.join(digits)
