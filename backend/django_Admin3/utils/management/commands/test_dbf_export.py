"""
Test DBF Export Functionality

This command tests the DBF export functionality with mock data
to verify the implementation works correctly.

Usage:
    python manage.py test_dbf_export
"""

import os
import datetime
import tempfile
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Test DBF export functionality with mock data"

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default=None,
            help='Output directory for test files (defaults to temp directory)'
        )

    def handle(self, *args, **options):
        self.stdout.write("Testing DBF Export Functionality")
        self.stdout.write("=" * 50)

        # Check if required libraries are available
        try:
            import ydbf
            self.stdout.write(self.style.SUCCESS("✓ ydbf library available"))
        except ImportError:
            self.stdout.write(
                self.style.ERROR("✗ ydbf library not found - run: pip install ydbf")
            )
            return

        try:
            import dbfread
            self.stdout.write(self.style.SUCCESS("✓ dbfread library available"))
        except ImportError:
            self.stdout.write(
                self.style.WARNING("⚠ dbfread library not found (optional) - run: pip install dbfread")
            )

        # Set up output directory
        if options['output_dir']:
            output_dir = options['output_dir']
        else:
            output_dir = tempfile.mkdtemp(prefix='dbf_test_')
        
        os.makedirs(output_dir, exist_ok=True)
        self.stdout.write(f"Using output directory: {output_dir}")

        # Test 1: Basic DBF creation with mock data
        self.test_basic_dbf_creation(output_dir)

        # Test 2: Test service class if available
        self.test_service_class(output_dir)

        # Test 3: Test management command interface
        self.test_management_command(output_dir)

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("All tests completed!"))
        self.stdout.write(f"Test files created in: {output_dir}")

    def test_basic_dbf_creation(self, output_dir):
        """Test basic DBF file creation with ydbf"""
        self.stdout.write("\n1. Testing basic DBF creation...")
        
        try:
            import ydbf
            
            # Define field structure
            fields = [
                ('ID', 'N', 10, 0),
                ('NAME', 'C', 50, 0),
                ('PRICE', 'N', 10, 2),
                ('IS_ACTIVE', 'L', 1, 0),
                ('CREATE_DT', 'D', 8, 0),
            ]
            
            # Mock data
            data = [
                {
                    'ID': 1,
                    'NAME': 'Test Product 1',
                    'PRICE': 29.99,
                    'IS_ACTIVE': True,
                    'CREATE_DT': datetime.date.today()
                },
                {
                    'ID': 2,
                    'NAME': 'Test Product 2',
                    'PRICE': 49.95,
                    'IS_ACTIVE': False,
                    'CREATE_DT': datetime.date(2024, 1, 1)
                }
            ]
            
            # Create DBF file
            output_file = os.path.join(output_dir, 'test_basic.dbf')
            
            with ydbf.open(output_file, 'w', fields, encoding='cp1252') as dbf:
                dbf.write(data)
            
            # Verify file was created
            if os.path.exists(output_file):
                file_size = os.path.getsize(output_file)
                self.stdout.write(self.style.SUCCESS(f"✓ DBF file created: {output_file} ({file_size} bytes)"))
                
                # Try to read it back
                self.verify_dbf_file(output_file)
            else:
                self.stdout.write(self.style.ERROR("✗ DBF file was not created"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Basic DBF test failed: {e}"))

    def test_service_class(self, output_dir):
        """Test the DbfExportService class"""
        self.stdout.write("\n2. Testing DbfExportService class...")
        
        try:
            from utils.services.dbf_export_service import DbfExportService, DbfExportError
            
            service = DbfExportService(debug=True)
            self.stdout.write(self.style.SUCCESS("✓ DbfExportService imported successfully"))
            
            # Test with mock QuerySet-like data
            mock_data = [
                {'id': 1, 'name': 'Product A', 'price': 19.99, 'active': True},
                {'id': 2, 'name': 'Product B', 'price': 39.99, 'active': False},
            ]
            
            # Mock field definitions using ydbf constants
            mock_fields = [
                ('ID', 'N', 10, 0),
                ('NAME', 'C', 50, 0),
                ('PRICE', 'N', 10, 2),
                ('ACTIVE', 'L', 1, 0),
            ]
            
            output_file = os.path.join(output_dir, 'test_service.dbf')
            count = service._export_data_to_dbf(mock_data, mock_fields, output_file)
            
            self.stdout.write(self.style.SUCCESS(f"✓ Service exported {count} records"))
            
        except ImportError as e:
            self.stdout.write(self.style.ERROR(f"✗ Service import failed: {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Service test failed: {e}"))

    def test_management_command(self, output_dir):
        """Test the management command interface"""
        self.stdout.write("\n3. Testing management command interface...")
        
        try:
            from django.core.management import call_command
            
            # Test with User model (should exist in all Django projects)
            output_file = os.path.join(output_dir, 'test_users.dbf')
            
            call_command(
                'export_to_dbf',
                '--model', 'auth.User',
                '--output', output_file,
                '--limit', '5',
                '--filter', 'is_active=True'
            )
            
            if os.path.exists(output_file):
                self.stdout.write(self.style.SUCCESS("✓ Management command export successful"))
                self.verify_dbf_file(output_file)
            else:
                self.stdout.write(self.style.ERROR("✗ Management command did not create file"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Management command test failed: {e}"))

    def verify_dbf_file(self, file_path):
        """Verify DBF file can be read"""
        try:
            import dbfread
            with dbfread.DBF(file_path) as dbf:
                records = list(dbf)
                self.stdout.write(f"  → File contains {len(records)} records")
                if records:
                    field_names = list(records[0].keys())
                    self.stdout.write(f"  → Fields: {', '.join(field_names)}")
        except ImportError:
            self.stdout.write("  → dbfread not available for verification")
        except Exception as e:
            self.stdout.write(f"  → Verification failed: {e}")

    def _get_ydbf_constant(self, constant_name):
        """Helper to get ydbf constants safely"""
        try:
            import ydbf
            return getattr(ydbf, constant_name)
        except (ImportError, AttributeError):
            # Return mock values for testing
            constants = {
                'NUMERAL': 'N',
                'CHAR': 'C', 
                'LOGICAL': 'L',
                'DATE': 'D'
            }
            return constants.get(constant_name, 'C')