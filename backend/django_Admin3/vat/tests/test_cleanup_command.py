"""
Test suite for cleanup_vat_audit management command (Phase 4, Task T034)

Tests VAT audit cleanup functionality:
- Deletes records older than 2 years (730 days)
- Preserves recent records (< 2 years)
- Returns count of deleted records
- Supports dry-run mode (doesn't delete)

This command provides audit trail cleanup while maintaining compliance requirements.
"""
from django.test import TestCase
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from io import StringIO

from vat.models import VATAudit


class CleanupVATAuditCommandTestCase(TestCase):
    """Test cleanup_vat_audit management command"""

    def setUp(self):
        """Set up test data with old and recent audit records"""
        # Clear any existing records
        VATAudit.objects.all().delete()

        # Current time
        now = timezone.now()

        # Create recent records (within 2 years)
        self.recent_record_1 = VATAudit.objects.create(
            execution_id='recent_exec_1',
            rule_id='rule_vat_uk',
            rule_version=1,
            input_context={'user': 'test', 'cart_total': 100},
            output_data={'vat_amount': 20, 'rate': 0.2000}
        )
        # Manually set created_at to 1 year ago
        VATAudit.objects.filter(id=self.recent_record_1.id).update(
            created_at=now - timedelta(days=365)
        )

        self.recent_record_2 = VATAudit.objects.create(
            execution_id='recent_exec_2',
            rule_id='rule_vat_sa',
            rule_version=1,
            input_context={'user': 'test2', 'cart_total': 200},
            output_data={'vat_amount': 30, 'rate': 0.1500}
        )
        # Set to 6 months ago
        VATAudit.objects.filter(id=self.recent_record_2.id).update(
            created_at=now - timedelta(days=180)
        )

        # Create old records (older than 2 years)
        self.old_record_1 = VATAudit.objects.create(
            execution_id='old_exec_1',
            rule_id='rule_vat_uk',
            rule_version=1,
            input_context={'user': 'test_old', 'cart_total': 50},
            output_data={'vat_amount': 10, 'rate': 0.2000}
        )
        # Set to 3 years ago (1095 days)
        VATAudit.objects.filter(id=self.old_record_1.id).update(
            created_at=now - timedelta(days=1095)
        )

        self.old_record_2 = VATAudit.objects.create(
            execution_id='old_exec_2',
            rule_id='rule_vat_row',
            rule_version=1,
            input_context={'user': 'test_old2', 'cart_total': 150},
            output_data={'vat_amount': 0, 'rate': 0.0000}
        )
        # Set to exactly 2 years + 1 day ago (731 days)
        VATAudit.objects.filter(id=self.old_record_2.id).update(
            created_at=now - timedelta(days=731)
        )

        # Verify test data setup
        self.assertEqual(VATAudit.objects.count(), 4, "Should have 4 test records")

    def test_cleanup_deletes_records_older_than_2_years(self):
        """Test that cleanup_vat_audit deletes records older than 2 years (730 days)"""
        # Capture command output
        out = StringIO()

        # Run cleanup command
        call_command('cleanup_vat_audit', stdout=out)

        # Verify old records deleted
        self.assertFalse(
            VATAudit.objects.filter(execution_id='old_exec_1').exists(),
            "Record from 3 years ago should be deleted"
        )
        self.assertFalse(
            VATAudit.objects.filter(execution_id='old_exec_2').exists(),
            "Record from 731 days ago should be deleted"
        )

        # Verify only 2 recent records remain
        self.assertEqual(VATAudit.objects.count(), 2, "Should have 2 records remaining")

    def test_cleanup_preserves_recent_records(self):
        """Test that cleanup_vat_audit preserves records less than 2 years old"""
        # Run cleanup command
        call_command('cleanup_vat_audit')

        # Verify recent records still exist
        self.assertTrue(
            VATAudit.objects.filter(execution_id='recent_exec_1').exists(),
            "Record from 1 year ago should be preserved"
        )
        self.assertTrue(
            VATAudit.objects.filter(execution_id='recent_exec_2').exists(),
            "Record from 6 months ago should be preserved"
        )

        # Verify both recent records have correct data
        recent_1 = VATAudit.objects.get(execution_id='recent_exec_1')
        self.assertEqual(recent_1.rule_id, 'rule_vat_uk')

        recent_2 = VATAudit.objects.get(execution_id='recent_exec_2')
        self.assertEqual(recent_2.rule_id, 'rule_vat_sa')

    def test_cleanup_returns_count(self):
        """Test that cleanup_vat_audit reports count of deleted records"""
        # Capture command output
        out = StringIO()

        # Run cleanup command
        call_command('cleanup_vat_audit', stdout=out)

        # Get command output
        output = out.getvalue()

        # Verify output contains deletion count
        self.assertIn('2', output, "Output should mention 2 deleted records")
        self.assertIn('deleted', output.lower(), "Output should mention deletion")

        # Verify actual deletion count matches
        self.assertEqual(VATAudit.objects.count(), 2, "Should have 2 records remaining after deleting 2")

    def test_cleanup_dry_run_mode(self):
        """Test that --dry-run flag prevents actual deletion"""
        # Capture command output
        out = StringIO()

        # Run cleanup command with --dry-run flag
        call_command('cleanup_vat_audit', '--dry-run', stdout=out)

        # Verify no records deleted (all 4 should still exist)
        self.assertEqual(VATAudit.objects.count(), 4, "Dry run should not delete any records")

        # Verify old records still exist
        self.assertTrue(
            VATAudit.objects.filter(execution_id='old_exec_1').exists(),
            "Old record should still exist in dry run"
        )
        self.assertTrue(
            VATAudit.objects.filter(execution_id='old_exec_2').exists(),
            "Old record should still exist in dry run"
        )

        # Get command output
        output = out.getvalue()

        # Verify output mentions dry run mode
        self.assertIn('dry', output.lower(), "Output should mention dry run")
        self.assertIn('2', output, "Output should mention 2 records would be deleted")

    def test_cleanup_with_no_old_records(self):
        """Test cleanup when there are no old records to delete"""
        # Delete old records manually first
        VATAudit.objects.filter(execution_id__in=['old_exec_1', 'old_exec_2']).delete()

        # Verify only recent records remain
        self.assertEqual(VATAudit.objects.count(), 2)

        # Capture command output
        out = StringIO()

        # Run cleanup command
        call_command('cleanup_vat_audit', stdout=out)

        # Verify no records deleted
        self.assertEqual(VATAudit.objects.count(), 2, "Should still have 2 recent records")

        # Get command output
        output = out.getvalue()

        # Verify output indicates no deletions
        self.assertIn('0', output, "Output should mention 0 deleted records")

    def test_cleanup_with_empty_database(self):
        """Test cleanup when database is empty"""
        # Delete all records
        VATAudit.objects.all().delete()
        self.assertEqual(VATAudit.objects.count(), 0)

        # Capture command output
        out = StringIO()

        # Run cleanup command (should not crash)
        call_command('cleanup_vat_audit', stdout=out)

        # Verify no errors and database still empty
        self.assertEqual(VATAudit.objects.count(), 0)

        # Get command output
        output = out.getvalue()

        # Verify output indicates no deletions
        self.assertIn('0', output, "Output should mention 0 deleted records")

    def test_cleanup_boundary_exactly_730_days(self):
        """Test cleanup behavior for record just under 730 days old (boundary condition)"""
        now = timezone.now()

        # Create record at 729 days (just within retention period)
        # Using 729 instead of exactly 730 to avoid timing precision issues
        boundary_record = VATAudit.objects.create(
            execution_id='boundary_exec',
            rule_id='rule_vat_boundary',
            rule_version=1,
            input_context={'test': 'boundary'},
            output_data={'vat': 0}
        )
        VATAudit.objects.filter(id=boundary_record.id).update(
            created_at=now - timedelta(days=729)
        )

        # Run cleanup
        call_command('cleanup_vat_audit')

        # Verify record at 729 days is preserved (within retention period)
        # Cutoff is < 730 days ago, so 729 days ago should be preserved
        self.assertTrue(
            VATAudit.objects.filter(execution_id='boundary_exec').exists(),
            "Record at 729 days should be preserved (within 730 day retention)"
        )
