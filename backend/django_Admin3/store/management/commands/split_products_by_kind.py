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
            self._walk_and_commit()
            return
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

        # Phase 5 Task 4b: PPV is on MaterialProduct now. This command
        # operates on legacy 'product'-kind rows; with the kind value
        # removed in Phase 4e the query is effectively dead-code, but the
        # select_related still needs to resolve against the live schema.
        legacy = (
            Product.objects
            .filter(purchasable_ptr__kind='product')
            .select_related('materialproduct__product_product_variation__product_variation')
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

        # Phase 5 Task 4b: PPV is on MaterialProduct now. Same dead-code
        # caveat as above; we just need select_related to parse.
        legacy = (
            Product.objects
            .filter(purchasable_ptr__kind='product')
            .select_related(
                'exam_session_subject__subject',
                'materialproduct__product_product_variation__product_variation',
                'materialproduct__product_product_variation__product',
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

    def _walk_and_commit(self):
        """Create subclass rows + reassign Purchasable.kind.

        Idempotent: rows with an existing subclass child are skipped
        for the subclass-create step but still have their
        Purchasable.kind corrected if it's stale.

        Transactional: one outer atomic() block. Failures (unmapped
        variation_type, unknown tutorial Format, missing MarkingTemplate)
        abort the entire run with a clear CommandError naming the
        offending Product.
        """
        from django.db import transaction
        from store.models import (
            Purchasable,
            MaterialProduct, TutorialProduct, MarkingProduct,
        )
        from marking.models import MarkingTemplate
        from tutorials.models import (
            TutorialCourseTemplate, TutorialEvents,
        )

        valid_formats = set(TutorialProduct.Format.values)
        template_by_code = {
            t.code: t for t in TutorialCourseTemplate.objects.all()
        }
        # Pre-fetch tutorial-event-to-location mapping for non-OC rows.
        event_location_by_product = {
            evt.store_product_id: evt.location_id
            for evt in TutorialEvents.objects
                .filter(location__isnull=False)
                .only('store_product_id', 'location_id')
        }
        # MarkingTemplate is keyed by catalog.Product.id (Task 3 backfill).
        marking_template_pks = set(
            MarkingTemplate.objects.values_list('pk', flat=True)
        )
        # Pre-fetch existing subclass PKs as sets. Re-runs (idempotency)
        # hit these the most — set membership avoids 3 N+1 queries per row.
        existing_material_pks = set(MaterialProduct.objects.values_list('pk', flat=True))
        existing_tutorial_pks = set(TutorialProduct.objects.values_list('pk', flat=True))
        existing_marking_pks = set(MarkingProduct.objects.values_list('pk', flat=True))

        tally = Counter()
        with transaction.atomic():
            # Phase 5 Task 4b: dead-code parse-fix (see _dry_run docstring).
            legacy = (
                Product.objects
                .filter(purchasable_ptr__kind='product')
                .select_related(
                    'exam_session_subject__subject',
                    'materialproduct__product_product_variation__product_variation',
                    'materialproduct__product_product_variation__product',
                )
            )

            for product in legacy.iterator():
                ppv = product.product_product_variation
                vt = ppv.product_variation.variation_type
                kind = KIND_BY_VARIATION_TYPE.get(vt)
                if kind is None:
                    raise CommandError(
                        f'Cannot map variation_type={vt!r} '
                        f'(Product.pk={product.pk}). '
                        f'Update KIND_BY_VARIATION_TYPE in '
                        f'split_products_by_kind.py.'
                    )

                if kind == 'material':
                    if product.pk not in existing_material_pks:
                        mp = MaterialProduct(product_ptr_id=product.pk)
                        mp.save_base(raw=True, force_insert=True)
                        existing_material_pks.add(product.pk)
                        tally['material_created'] += 1
                    else:
                        tally['material_already_split'] += 1

                elif kind == 'tutorial':
                    fmt_code = ppv.product_variation.code
                    if fmt_code not in valid_formats:
                        raise CommandError(
                            f'Tutorial format {fmt_code!r} not in '
                            f'TutorialProduct.Format. Update the enum '
                            f'before re-running. (Product.pk={product.pk})'
                        )
                    subject_code = product.exam_session_subject.subject.code
                    template_code = self._build_template_code(subject_code, fmt_code)
                    template_id = (
                        template_by_code[template_code].pk
                        if template_code in template_by_code
                        else None
                    )
                    location_id = (
                        event_location_by_product.get(product.pk)
                        if fmt_code != 'OC' else None
                    )
                    if product.pk not in existing_tutorial_pks:
                        tp = TutorialProduct(
                            product_ptr_id=product.pk,
                            tutorial_course_template_id=template_id,
                            tutorial_location_id=location_id,
                            format=fmt_code,
                        )
                        tp.save_base(raw=True, force_insert=True)
                        existing_tutorial_pks.add(product.pk)
                        tally['tutorial_created'] += 1
                    else:
                        tally['tutorial_already_split'] += 1

                elif kind == 'marking':
                    if ppv.product_id not in marking_template_pks:
                        raise CommandError(
                            f'No MarkingTemplate with pk={ppv.product_id} '
                            f'(needed by Product.pk={product.pk}). '
                            f'Re-run marking migration 0019_backfill.'
                        )
                    if product.pk not in existing_marking_pks:
                        mkp = MarkingProduct(
                            product_ptr_id=product.pk,
                            marking_template_id=ppv.product_id,
                        )
                        mkp.save_base(raw=True, force_insert=True)
                        existing_marking_pks.add(product.pk)
                        tally['marking_created'] += 1
                    else:
                        tally['marking_already_split'] += 1

                # Update Purchasable.kind regardless of whether we
                # created or skipped (idempotency: fix stale kind).
                Purchasable.objects.filter(pk=product.pk).update(kind=kind)

        self.stdout.write(self.style.SUCCESS('split_products_by_kind --commit done'))
        for key in (
            'material_created', 'material_already_split',
            'tutorial_created', 'tutorial_already_split',
            'marking_created', 'marking_already_split',
        ):
            self.stdout.write(f'  {key:30s} {tally[key]:6d}')

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
