from io import StringIO
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.auth.models import User
from core_auth.models import MachineToken


class CreateMachineTokenCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_cmd',
            email='admin@bpp.com',
            password='testpass123'
        )

    def test_creates_token_for_user(self):
        """Command creates a MachineToken linked to the user."""
        out = StringIO()
        call_command('create_machine_token',
                     '--email', 'admin@bpp.com',
                     '--machine', 'LAPTOP-CMD01',
                     stdout=out)
        self.assertEqual(MachineToken.objects.count(), 1)
        mt = MachineToken.objects.first()
        self.assertEqual(mt.user, self.user)
        self.assertEqual(mt.machine_name, 'LAPTOP-CMD01')
        self.assertTrue(mt.is_active)

    def test_output_contains_token_and_url(self):
        """Command output shows raw token and full URL."""
        out = StringIO()
        call_command('create_machine_token',
                     '--email', 'admin@bpp.com',
                     '--machine', 'LAPTOP-CMD01',
                     stdout=out)
        output = out.getvalue()
        self.assertIn('Token:', output)
        self.assertIn('#machine_token=', output)
        self.assertIn('LAPTOP-CMD01', output)

    def test_nonexistent_user_error(self):
        """Command fails for non-existent email."""
        out = StringIO()
        with self.assertRaises(CommandError):
            call_command('create_machine_token',
                         '--email', 'noone@bpp.com',
                         '--machine', 'LAPTOP-X',
                         stdout=out)


class RevokeMachineTokenCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_rev',
            email='admin@bpp.com',
            password='testpass123'
        )
        self.mt = MachineToken.objects.create(
            token_hash='hash_to_revoke',
            user=self.user,
            machine_name='LAPTOP-REV01'
        )

    def test_revoke_by_machine(self):
        """Revoke deactivates all tokens for machine."""
        out = StringIO()
        call_command('revoke_machine_token',
                     '--machine', 'LAPTOP-REV01',
                     '--force',
                     stdout=out)
        self.mt.refresh_from_db()
        self.assertFalse(self.mt.is_active)

    def test_revoke_by_user(self):
        """Revoke by --user deactivates all user tokens."""
        out = StringIO()
        call_command('revoke_machine_token',
                     '--user', 'admin@bpp.com',
                     '--force',
                     stdout=out)
        self.mt.refresh_from_db()
        self.assertFalse(self.mt.is_active)


class ListMachineTokensCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_list',
            email='admin@bpp.com',
            password='testpass123'
        )
        MachineToken.objects.create(
            token_hash='hash_list_1',
            user=self.user,
            machine_name='LAPTOP-LIST01'
        )

    def test_list_shows_tokens(self):
        """List command shows token details."""
        out = StringIO()
        call_command('list_machine_tokens', stdout=out)
        output = out.getvalue()
        self.assertIn('LAPTOP-LIST01', output)
        self.assertIn('admin@bpp.com', output)

    def test_list_filter_by_user(self):
        """List with --user filters correctly."""
        out = StringIO()
        call_command('list_machine_tokens',
                     '--user', 'admin@bpp.com',
                     stdout=out)
        output = out.getvalue()
        self.assertIn('LAPTOP-LIST01', output)
