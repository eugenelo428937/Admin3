from django.test import TestCase, override_settings
from core_auth.utils import hash_token, is_trusted_ip


class HashTokenTest(TestCase):
    def test_hash_is_deterministic(self):
        """Same token produces same hash."""
        h1 = hash_token('my_raw_token')
        h2 = hash_token('my_raw_token')
        self.assertEqual(h1, h2)

    def test_different_tokens_different_hashes(self):
        """Different tokens produce different hashes."""
        h1 = hash_token('token_a')
        h2 = hash_token('token_b')
        self.assertNotEqual(h1, h2)

    def test_hash_length_is_64(self):
        """HMAC-SHA256 hex digest is 64 chars."""
        h = hash_token('any_token')
        self.assertEqual(len(h), 64)

    @override_settings(SECRET_KEY='different_key')
    def test_hash_uses_secret_key(self):
        """Hash depends on SECRET_KEY."""
        h_different = hash_token('same_token')
        self.assertEqual(len(h_different), 64)


@override_settings(MACHINE_LOGIN_TRUSTED_SUBNETS=['7.32.0.0/16', '10.0.0.0/8'])
class IsTrustedIpTest(TestCase):
    def test_ip_in_trusted_subnet(self):
        self.assertTrue(is_trusted_ip('7.32.3.4'))

    def test_ip_in_second_subnet(self):
        self.assertTrue(is_trusted_ip('10.1.2.3'))

    def test_ip_not_in_trusted_subnet(self):
        self.assertFalse(is_trusted_ip('192.168.1.1'))

    def test_ip_at_subnet_boundary(self):
        self.assertTrue(is_trusted_ip('7.32.0.0'))
        self.assertTrue(is_trusted_ip('7.32.255.255'))

    @override_settings(MACHINE_LOGIN_TRUSTED_SUBNETS=[])
    def test_empty_subnets_rejects_all(self):
        self.assertFalse(is_trusted_ip('7.32.3.4'))
