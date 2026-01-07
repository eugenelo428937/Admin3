"""
Catalog management command: import_subjects.

Imports subjects from CSV or Excel file into the catalog.
This command has been migrated from the subjects app as part of the
catalog API consolidation (specs/002-catalog-api-consolidation/).
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import pandas as pd
import os

# Import Subject model from catalog
from catalog.models import Subject


class Command(BaseCommand):
    help = 'Import subjects from CSV or Excel file'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the input file')
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing records instead of skipping them'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for processing'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without making changes'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        update_existing = options['update_existing']
        dry_run = options['dry_run']

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        try:
            # Read the file based on extension
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                raise CommandError("Unsupported file format. Use .csv, .xlsx, or .xls")

            # Validate required columns
            required_columns = ['code', 'description']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise CommandError(f"Missing required columns: {', '.join(missing_columns)}")

            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []

            if dry_run:
                self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))

            with transaction.atomic():
                for index, row in df.iterrows():
                    code = str(row['code']).strip()
                    description = str(row['description']).strip()
                    active = row.get('active', True)

                    # Handle boolean conversion for 'active' field
                    if isinstance(active, str):
                        active = active.lower() in ('true', '1', 'yes', 'y')

                    try:
                        existing_subject = Subject.objects.filter(code=code).first()

                        if existing_subject:
                            if update_existing:
                                if not dry_run:
                                    existing_subject.description = description
                                    existing_subject.active = active
                                    existing_subject.save()
                                updated_count += 1
                                self.stdout.write(f"  Updated: {code}")
                            else:
                                skipped_count += 1
                                self.stdout.write(f"  Skipped (exists): {code}")
                        else:
                            if not dry_run:
                                Subject.objects.create(
                                    code=code,
                                    description=description,
                                    active=active
                                )
                            created_count += 1
                            self.stdout.write(f"  Created: {code}")

                    except Exception as e:
                        errors.append({'code': code, 'error': str(e)})
                        self.stdout.write(self.style.ERROR(f"  Error on row {index + 1}: {str(e)}"))

                # Rollback if dry run
                if dry_run:
                    transaction.set_rollback(True)

            # Summary
            self.stdout.write("\n" + "=" * 50)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Import completed successfully:\n"
                    f"  Created: {created_count}\n"
                    f"  Updated: {updated_count}\n"
                    f"  Skipped: {skipped_count}\n"
                    f"  Errors: {len(errors)}"
                )
            )

            if errors:
                self.stdout.write(self.style.ERROR("\nErrors encountered:"))
                for error in errors:
                    self.stdout.write(f"  - {error['code']}: {error['error']}")

        except Exception as e:
            raise CommandError(f"Import failed: {str(e)}")
