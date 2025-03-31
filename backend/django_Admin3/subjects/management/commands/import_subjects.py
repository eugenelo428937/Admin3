from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import pandas as pd
import os
from subjects.models import Subject

class Command(BaseCommand):
    help = 'Import subjects from CSV or Excel file'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the input file')
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing records'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for processing'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        
        try:
            # Basic implementation for testing
            df = pd.read_csv(file_path) if file_path.endswith('.csv') else pd.read_excel(file_path)
            
            created_count = 0
            for _, row in df.iterrows():
                Subject.objects.create(
                    code=row['code'],
                    description=row['description'],
                    active=row.get('active', True)
                )
                created_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Import completed successfully:\n"
                    f"Created: {created_count}"
                )
            )
            
        except Exception as e:
            raise CommandError(f"Import failed: {str(e)}")
