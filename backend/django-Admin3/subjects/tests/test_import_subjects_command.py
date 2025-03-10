import os
import pandas as pd
from io import StringIO
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from subjects.models import Subject

class ImportSubjectsCommandTest(TestCase):
    """Test the import_subjects management command."""

    def setUp(self):
        """Set up test environment."""
        self.test_data = [
            {'code': 'MATH101', 'description': 'Basic Mathematics', 'active': True},
            {'code': 'PHY101', 'description': 'Physics 101', 'active': True},
            {'code': 'CHEM101', 'description': 'Chemistry 101', 'active': False}
        ]
        
        # Create test files
        self.csv_file = 'test_subjects.csv'
        self.excel_file = 'test_subjects.xlsx'
        self.invalid_file = 'test_subjects.txt'
        self.invalid_data_file = 'test_subjects_invalid.csv'
        
        # Create CSV test file
        pd.DataFrame(self.test_data).to_csv(self.csv_file, index=False)
        
        # Create Excel test file
        pd.DataFrame(self.test_data).to_excel(self.excel_file, index=False)
        
        # Create invalid format file
        with open(self.invalid_file, 'w') as f:
            f.write("This is not a valid format")
        
        # Create invalid data CSV file
        invalid_data = [
            {'wrong_column': 'MATH101', 'description': 'Basic Mathematics'},
            {'code': '', 'description': 'Invalid Code'},
        ]
        pd.DataFrame(invalid_data).to_csv(self.invalid_data_file, index=False)

    def tearDown(self):
        """Clean up test environment."""
        # Remove test files
        test_files = [
            self.csv_file,
            self.excel_file,
            self.invalid_file,
            self.invalid_data_file
        ]
        for file_path in test_files:
            if os.path.exists(file_path):
                os.remove(file_path)

    def test_import_csv_file(self):
        """Test importing subjects from CSV file."""
        out = StringIO()
        call_command('import_subjects', self.csv_file, stdout=out)
        output = out.getvalue()
        
        # Check command output
        self.assertIn('Import completed successfully', output)
        self.assertIn('Created: 3', output)
        
        # Check database
        self.assertEqual(Subject.objects.count(), 3)
        math_subject = Subject.objects.get(code='MATH101')
        self.assertEqual(math_subject.description, 'Basic Mathematics')
        self.assertTrue(math_subject.active)

    def test_import_excel_file(self):
        """Test importing subjects from Excel file."""
        out = StringIO()
        call_command('import_subjects', self.excel_file, stdout=out)
        output = out.getvalue()
        
        # Check command output
        self.assertIn('Import completed successfully', output)
        self.assertIn('Created: 3', output)
        
        # Check database
        self.assertEqual(Subject.objects.count(), 3)
        physics_subject = Subject.objects.get(code='PHY101')
        self.assertEqual(physics_subject.description, 'Physics 101')
        self.assertTrue(physics_subject.active)

    def test_update_existing_records(self):
        """Test updating existing records."""
        # First import
        call_command('import_subjects', self.csv_file)
        
        # Modify data and create new file
        modified_data = self.test_data.copy()
        modified_data[0]['description'] = 'Advanced Mathematics'
        modified_file = 'modified_subjects.csv'
        pd.DataFrame(modified_data).to_csv(modified_file, index=False)
        
        # Second import with update flag
        out = StringIO()
        call_command('import_subjects', modified_file, '--update-existing', stdout=out)
        output = out.getvalue()
        
        # Check output and database
        self.assertIn('Updated: 3', output)
        math_subject = Subject.objects.get(code='MATH101')
        self.assertEqual(math_subject.description, 'Advanced Mathematics')
        
        # Clean up
        os.remove(modified_file)

    def test_batch_size_parameter(self):
        """Test importing with different batch sizes."""
        out = StringIO()
        call_command('import_subjects', self.csv_file, '--batch-size=1', stdout=out)
        output = out.getvalue()
        
        self.assertIn('Import completed successfully', output)
        self.assertEqual(Subject.objects.count(), 3)

    def test_invalid_file_format(self):
        """Test importing file with invalid format."""
        out = StringIO()
        with self.assertRaises(CommandError):
            call_command('import_subjects', self.invalid_file, stdout=out)

    def test_invalid_data_format(self):
        """Test importing file with invalid data."""
        out = StringIO()
        call_command('import_subjects', self.invalid_data_file, stdout=out)
        output = out.getvalue()
        
        self.assertIn('Failed:', output)
        self.assertEqual(Subject.objects.count(), 0)

    def test_duplicate_handling(self):
        """Test handling of duplicate records."""
        # First import
        call_command('import_subjects', self.csv_file)
        
        # Second import without update flag
        out = StringIO()
        call_command('import_subjects', self.csv_file, stdout=out)
        output = out.getvalue()
        
        self.assertIn('Skipped: 3', output)
        self.assertEqual(Subject.objects.count(), 3)

    def test_empty_file(self):
        """Test importing empty file."""
        empty_file = 'empty.csv'
        pd.DataFrame([]).to_csv(empty_file, index=False)
        
        out = StringIO()
        call_command('import_subjects', empty_file, stdout=out)
        output = out.getvalue()
        
        self.assertIn('Total records: 0', output)
        self.assertEqual(Subject.objects.count(), 0)
        
        os.remove(empty_file)

    def test_missing_file(self):
        """Test importing non-existent file."""
        with self.assertRaises(CommandError):
            call_command('import_subjects', 'nonexistent.csv')

    def test_partial_success_import(self):
        """Test partial success in import (some records fail, others succeed)."""
        mixed_data = [
            {'code': 'MATH101', 'description': 'Valid Record', 'active': True},
            {'code': '', 'description': 'Invalid Record'},  # Should fail
            {'code': 'PHY101', 'description': 'Valid Record', 'active': True}
        ]
        mixed_file = 'mixed_subjects.csv'
        pd.DataFrame(mixed_data).to_csv(mixed_file, index=False)
        
        out = StringIO()
        call_command('import_subjects', mixed_file, stdout=out)
        output = out.getvalue()
        
        self.assertIn('Created:', output)
        self.assertIn('Failed:', output)
        self.assertEqual(Subject.objects.count(), 2)
        
        os.remove(mixed_file)

    def test_large_dataset_handling(self):
        """Test handling of large datasets."""
        # Create large dataset
        large_data = []
        for i in range(1000):
            large_data.append({
                'code': f'SUBJ{i:04d}',
                'description': f'Subject {i}',
                'active': True
            })
        
        large_file = 'large_subjects.csv'
        pd.DataFrame(large_data).to_csv(large_file, index=False)
        
        out = StringIO()
        call_command('import_subjects', large_file, '--batch-size=100', stdout=out)
        output = out.getvalue()
        
        self.assertIn('Created: 1000', output)
        self.assertEqual(Subject.objects.count(), 1000)
        
        os.remove(large_file)
