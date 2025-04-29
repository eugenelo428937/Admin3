import csv
from django.core.management.base import BaseCommand, CommandError
from marking.models import MarkingPaper
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from django.utils.dateparse import parse_date
from products.models import ProductType, ProductSubtype, Product
from datetime import datetime

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
                subjects = [s.strip().replace('"','').replace("'","") for s in subject_col.replace('"','').split(',')]
                # Determine product_subtype and product_code by paper_name prefix
                if paper_name.startswith('X'):
                    subtype_name = 'Series X Marking'
                    product_code = None  # Will match any X marking product
                elif paper_name.startswith('Y'):
                    subtype_name = 'Series Y Marking'
                    product_code = None
                elif paper_name.startswith('M'):
                    subtype_name = 'Mock Exam Marking'
                    # Map M1/M2/M3 to MM1/MM2/MM3
                    if paper_name == 'M1':
                        product_code = 'MM1'
                    elif paper_name == 'M2':
                        product_code = 'MM2'
                    elif paper_name == 'M3':
                        product_code = 'MM3'
                    else:
                        self.stderr.write(f"Row {row_num}: Unknown mock paper name {paper_name}. Stopping import.")
                        raise CommandError(f"Unknown mock paper name {paper_name}")
                else:
                    self.stderr.write(f"Row {row_num}: Unknown paper type for {paper_name}. Stopping import.")
                    raise CommandError(f"Unknown paper type for {paper_name}")
                # Find product_type and product_subtype
                try:
                    product_type = ProductType.objects.get(name='Markings')
                    product_subtype = ProductSubtype.objects.get(name=subtype_name, product_type=product_type)
                except ProductType.DoesNotExist:
                    self.stderr.write(f"Row {row_num}: ProductType 'Markings' not found. Stopping import.")
                    raise CommandError("ProductType 'Markings' not found")
                except ProductSubtype.DoesNotExist:
                    self.stderr.write(f"Row {row_num}: ProductSubtype '{subtype_name}' not found. Stopping import.")
                    raise CommandError(f"ProductSubtype '{subtype_name}' not found")
                # Find product
                try:
                    product_qs = Product.objects.filter(product_type=product_type, product_subtype=product_subtype, is_active=True)
                    if product_code:
                        product_qs = product_qs.filter(code=product_code)
                    product = product_qs.order_by('-id').first()
                    if not product:
                        raise Product.DoesNotExist
                except Product.DoesNotExist:
                    self.stderr.write(f"Row {row_num}: No active Product for type 'Markings', subtype '{subtype_name}', code '{product_code}'. Stopping import.")
                    raise CommandError(f"No active Product for type 'Markings', subtype '{subtype_name}', code '{product_code}'")
                # Parse dates (expecting DD/MM/YYYY)
                try:
                    recommended = datetime.strptime(recommended_date.strip(), "%d/%m/%Y")
                    deadline = datetime.strptime(deadline_date.strip(), "%d/%m/%Y")
                except Exception as e:
                    self.stderr.write(f"Row {row_num}: Date parse error: {e}. Stopping import.")
                    raise CommandError(f"Date parse error: {e}")
                if not recommended or not deadline:
                    self.stderr.write(f"Row {row_num}: Invalid date(s). Stopping import.")
                    raise CommandError(
                        f"Invalid date(s) in row {row_num} {recommended_date} {deadline_date}")
                # For each subject, find ESSP and create MarkingPaper
                for subject in subjects:
                    try:
                        essp = ExamSessionSubjectProduct.objects.get(
                            exam_session_subject__subject__code=subject,
                            product=product
                        )
                    except ExamSessionSubjectProduct.DoesNotExist:
                        self.stderr.write(f"Row {row_num}: No matching ExamSessionSubjectProduct for subject '{subject}' and product '{product}'. Stopping import.")
                        raise CommandError(f"No matching ExamSessionSubjectProduct for subject '{subject}' and product '{product}'")
                    MarkingPaper.objects.create(
                        exam_session_subject_product=essp,
                        name=paper_name.strip(),
                        recommended_submit_date=recommended,
                        deadline=deadline
                    )
                    self.stdout.write(f"Row {row_num}: Imported {subject} {paper_name}")
        self.stdout.write(self.style.SUCCESS('Import completed successfully.'))
