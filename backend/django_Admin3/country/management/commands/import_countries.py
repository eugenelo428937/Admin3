import csv
from django.core.management.base import BaseCommand
from country.models import Country

class Command(BaseCommand):
    help = 'Import countries from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the countries CSV file')

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        created, updated = 0, 0
        with open(csv_file, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                obj, is_created = Country.objects.update_or_create(
                    iso_code=row['iso_code'],
                    defaults={
                        'name': row['name'],
                        'phone_code': row['phone_code'],
                        'vat_percent': row['vat_percent'] if row['vat_percent'] else 0.0,
                        'have_postcode': row['have_postcode'].lower() in ['true', '1', 'yes'],
                    }
                )
                if is_created:
                    created += 1
                else:
                    updated += 1
        self.stdout.write(self.style.SUCCESS(f'Imported: {created} created, {updated} updated.'))
