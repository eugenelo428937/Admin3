"""
Management command to import marking deadlines from TSV file.

Updated 2026-01-25: Uses store.Product instead of ExamSessionSubjectProduct.
"""
import csv
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from marking.models import MarkingPaper
from catalog.models import ExamSessionSubject, Subject
from store.models import Product as StoreProduct, MarkingProduct


class Command(BaseCommand):
    help = 'Bulk import marking deadlines from a TSV file.'

    def add_arguments(self, parser):
        parser.add_argument('filepath', type=str, help='Path to the TSV file to import')

    def handle(self, *args, **options):
        filepath = options['filepath']
        with open(filepath, encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            for row_num, row in enumerate(reader, 1):
                if len(row) < 4:
                    self.stderr.write(f"Row {row_num}: Not enough columns. Skipping.")
                    continue
                subject_col, paper_name, recommended_date, deadline_date = row[:4]
                # Split multiple subjects (remove quotes, split by comma, strip spaces)
                subjects = [s.strip().replace('"', '').replace("'", "") for s in subject_col.replace('"', '').split(',')]
                # Determine product_code by paper_name prefix
                # Product codes in catalog: X (X papers), Y (Y papers), M1 (Mock Exam Marking)
                if paper_name.startswith('X'):
                    product_code = "X"
                elif paper_name.startswith('Y'):
                    product_code = "Y"
                elif paper_name.startswith('M'):
                    product_code = 'M1'
                else:
                    self.stderr.write(f"Row {row_num}: Unknown paper type for {paper_name}. Stopping import.")
                    raise CommandError(f"Unknown paper type for {paper_name}")
                # Find product_group by subject
                for subject_code in subjects:
                    try:
                        subject = Subject.objects.get(code=subject_code)
                    except Subject.DoesNotExist:
                        self.stderr.write(f"Row {row_num}: Subject '{subject_code}' not found. Skipping.")
                        continue
                    # Find ExamSessionSubject for this subject (latest by created_at)
                    ess = ExamSessionSubject.objects.filter(subject=subject).order_by('-created_at').first()
                    if not ess:
                        self.stderr.write(f"Row {row_num}: No ExamSessionSubject for subject '{subject_code}'. Skipping.")
                        continue
                    # Find store.Product directly by ESS, product code, and Marking
                    # variation type. The Product instance is also a valid Purchasable
                    # (shared PK via MTI), so we can pass it as the `purchasable` FK
                    # value below. This avoids ambiguity when multiple catalog
                    # products share the same code (e.g., M1 exists for both Mock
                    # Exam eBook and Mock Exam Marking).
                    # Phase 5 Task 4b: PPV is on MaterialProduct now. Legacy
                    # marking-deadline imports lookup by PPV match — only
                    # rows that still carry a PPV (i.e. MaterialProduct) can
                    # resolve. MarkingProduct rows (no PPV) are out of scope
                    # for this importer and must be matched via their
                    # subclass-local marking_template.
                    store_product = StoreProduct.objects.filter(
                        exam_session_subject=ess,
                        materialproduct__product_product_variation__product__code=product_code,
                        materialproduct__product_product_variation__product_variation__variation_type='Marking'
                    ).first()
                    if not store_product:
                        self.stderr.write(
                            f"Row {row_num}: No store.Product for subject '{subject_code}' "
                            f"and product code '{product_code}' with Marking variation. Skipping."
                        )
                        continue
                    # Parse dates (expecting DD/MM/YYYY)
                    try:
                        recommended = datetime.strptime(recommended_date.strip(), "%d/%m/%Y")
                        deadline = datetime.strptime(deadline_date.strip(), "%d/%m/%Y")
                    except Exception as e:
                        self.stderr.write(f"Row {row_num}: Date parse error: {e}. Skipping.")
                        continue
                    if not recommended or not deadline:
                        self.stderr.write(f"Row {row_num}: Invalid date(s). Skipping.")
                        continue
                    # Phase 4c: resolve the MarkingProduct subclass to
                    # get the series template. The filter above already
                    # restricted to variation_type='Marking', so
                    # store_product.markingproduct must exist.
                    try:
                        marking_template = store_product.markingproduct.marking_template
                    except MarkingProduct.DoesNotExist:
                        self.stderr.write(
                            f"Row {row_num}: store.Product {store_product.pk} "
                            f"has no MarkingProduct subclass row. Skipping."
                        )
                        continue
                    MarkingPaper.objects.create(
                        purchasable=store_product,
                        marking_template=marking_template,
                        name=paper_name.strip(),
                        recommended_submit_date=recommended,
                        deadline=deadline,
                    )
                    self.stdout.write(f"Row {row_num}: Imported {subject_code} {paper_name}")
        self.stdout.write(self.style.SUCCESS('Import completed successfully.'))
