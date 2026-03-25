import hmac
import hashlib
from django.test import TestCase
from django.contrib.auth.models import User
from django.conf import settings
from core_auth.models import MachineToken


class MachineTokenModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_test',
            email='admin@bpp.com',
            password='testpass123'
        )

    def test_create_machine_token(self):
        """MachineToken can be created with required fields."""
        token_hash = hmac.new(
            settings.SECRET_KEY.encode(),
            b'test_raw_token',
            hashlib.sha256
        ).hexdigest()

        mt = MachineToken.objects.create(
            token_hash=token_hash,
            user=self.user,
            machine_name='LAPTOP-TEST01'
        )
        self.assertEqual(mt.machine_name, 'LAPTOP-TEST01')
        self.assertEqual(mt.user, self.user)
        self.assertTrue(mt.is_active)
        self.assertIsNone(mt.last_used_at)
        self.assertIsNotNone(mt.created_at)

    def test_str_representation(self):
        """__str__ shows machine_name → user email."""
        mt = MachineToken.objects.create(
            token_hash='abc123',
            user=self.user,
            machine_name='LAPTOP-TEST01'
        )
        self.assertEqual(str(mt), 'LAPTOP-TEST01 → admin@bpp.com')

    def test_token_hash_unique(self):
        """token_hash must be unique."""
        MachineToken.objects.create(
            token_hash='unique_hash_1',
            user=self.user,
            machine_name='LAPTOP-A'
        )
        with self.assertRaises(Exception):
            MachineToken.objects.create(
                token_hash='unique_hash_1',
                user=self.user,
                machine_name='LAPTOP-B'
            )

    def test_db_table_name(self):
        """Model uses acted schema."""
        self.assertEqual(
            MachineToken._meta.db_table,
            '"acted"."machine_tokens"'
        )
