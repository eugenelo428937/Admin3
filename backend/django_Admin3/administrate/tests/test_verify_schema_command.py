from io import StringIO

from django.core.management import call_command
from django.test import TestCase


class VerifySchemaPlacementTest(TestCase):
    """Test the verify_schema_placement management command."""

    def test_command_succeeds_when_tables_in_correct_schema(self):
        """Command exits 0 when all tables are correctly placed."""
        out = StringIO()
        call_command('verify_schema_placement', stdout=out)
        output = out.getvalue()
        self.assertIn('All tables verified', output)

    def test_command_json_output(self):
        """Command supports --json output format."""
        out = StringIO()
        call_command('verify_schema_placement', '--json', stdout=out)
        import json
        result = json.loads(out.getvalue())
        self.assertTrue(result['ok'])
        self.assertEqual(len(result['errors']), 0)
