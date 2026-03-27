"""
Tests for the create_api_key management command.
"""
import hashlib
from io import StringIO
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from email_system.models import ExternalApiKey


class CreateApiKeyCommandTest(TestCase):
    """Tests for create_api_key management command."""

    def call_command(self, *args, **kwargs):
        """Helper to call the command and capture output."""
        out = StringIO()
        err = StringIO()
        call_command('create_api_key', *args, stdout=out, stderr=err, **kwargs)
        return out.getvalue(), err.getvalue()

    def test_creates_api_key_with_name(self):
        """Test that the command creates an ExternalApiKey record."""
        out, _ = self.call_command('--name', 'Staff Laptop - Eugene')

        self.assertEqual(ExternalApiKey.objects.count(), 1)
        api_key = ExternalApiKey.objects.first()
        self.assertEqual(api_key.name, 'Staff Laptop - Eugene')
        self.assertTrue(api_key.is_active)

    def test_outputs_raw_key(self):
        """Test that the command outputs a raw key the user can copy."""
        out, _ = self.call_command('--name', 'Test Key')

        # Output should contain the raw key
        self.assertIn('API Key created successfully', out)
        # Should display the key prefix
        api_key = ExternalApiKey.objects.first()
        self.assertIn(api_key.key_prefix, out)

    def test_stored_hash_matches_output_key(self):
        """Test that the stored hash matches the SHA-256 of the displayed key."""
        out, _ = self.call_command('--name', 'Hash Check Key')

        # Extract the raw key from output — look for line with "Key:"
        raw_key = None
        for line in out.strip().split('\n'):
            if 'Key:' in line and '...' not in line:
                # The raw key value after "Key: "
                raw_key = line.split('Key:')[-1].strip()
                break

        self.assertIsNotNone(raw_key, 'Raw key not found in command output')
        self.assertTrue(len(raw_key) > 20, 'Key should be a secure random token')

        api_key = ExternalApiKey.objects.first()
        expected_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        self.assertEqual(api_key.key_hash, expected_hash)

    def test_key_prefix_matches_raw_key(self):
        """Test that stored key_prefix is the first 8 chars of the raw key."""
        out, _ = self.call_command('--name', 'Prefix Key')

        raw_key = None
        for line in out.strip().split('\n'):
            if 'Key:' in line and '...' not in line:
                raw_key = line.split('Key:')[-1].strip()
                break

        api_key = ExternalApiKey.objects.first()
        self.assertEqual(api_key.key_prefix, raw_key[:8])

    def test_name_is_required(self):
        """Test that --name is required."""
        with self.assertRaises(CommandError):
            self.call_command()

    def test_multiple_keys_have_unique_hashes(self):
        """Test that creating multiple keys produces unique entries."""
        self.call_command('--name', 'Key 1')
        self.call_command('--name', 'Key 2')

        self.assertEqual(ExternalApiKey.objects.count(), 2)
        hashes = list(ExternalApiKey.objects.values_list('key_hash', flat=True))
        self.assertNotEqual(hashes[0], hashes[1])

    def test_inactive_flag(self):
        """Test that --inactive creates a deactivated key."""
        self.call_command('--name', 'Inactive Key', '--inactive')

        api_key = ExternalApiKey.objects.first()
        self.assertFalse(api_key.is_active)
