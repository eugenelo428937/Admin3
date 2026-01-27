import csv
from django.core.management.base import BaseCommand, CommandError
from marking.models import MarkingPaper
from catalog.models import Product, ExamSessionSubject
from store.models import Product as StoreProduct
from datetime import datetime
from subjects.models import Subject

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
                # Determine product_code by paper_name prefix
                if paper_name.startswith('X'):
                    product_code = "MX" 
                elif paper_name.startswith('Y'):
                    product_code = "MY"
                elif paper_name.startswith('M'):
                    product_code = 'MM'                
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
                    # Find product in this group
                    try:
                        product_qs = Product.objects.filter(is_active=True)
                        if product_code:
                            product_qs = product_qs.filter(code=product_code)
                        product = product_qs.order_by('-id').first()
                        if not product:
                            raise Product.DoesNotExist
                    except Product.DoesNotExist:
                        self.stderr.write(f"Row {row_num}: No active Product with code '{product_code}'. Skipping.")
                        continue
                    # Find store.Product via ESS + PPV
                    store_product = StoreProduct.objects.filter(
                        exam_session_subject=ess,
                        product_product_variation__product=product
                    ).first()
                    if not store_product:
                        self.stderr.write(f"Row {row_num}: No store Product for subject '{subject_code}' and product '{product}'. Skipping.")
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
                    MarkingPaper.objects.create(
                        store_product=store_product,
                        name=paper_name.strip(),
                        recommended_submit_date=recommended,
                        deadline=deadline
                    )
                    self.stdout.write(f"Row {row_num}: Imported {subject_code} {paper_name}")
        self.stdout.write(self.style.SUCCESS('Import completed successfully.'))
