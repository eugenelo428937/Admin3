"""Sign/unsign tests for the attendance magic-link signer."""
import time
from unittest import mock

from django.test import TestCase

from tutorials.services.attendance_link import (
    AttendanceLinkPayload, AttendanceLinkSigner, ExpiredLink, InvalidLink,
)


class AttendanceLinkSignerTests(TestCase):
    def test_sign_returns_token_and_issued_at(self):
        signer = AttendanceLinkSigner()
        token, issued_at = signer.sign(session_id=42, instructor_id=7)
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 16)
        self.assertIsNotNone(issued_at)

    def test_unsign_roundtrip_returns_payload(self):
        signer = AttendanceLinkSigner()
        token, issued_at = signer.sign(session_id=42, instructor_id=7)
        payload = signer.unsign(token)
        self.assertIsInstance(payload, AttendanceLinkPayload)
        self.assertEqual(payload.session_id, 42)
        self.assertEqual(payload.instructor_id, 7)
        self.assertEqual(payload.issued_at, issued_at)

    def test_unsign_tampered_token_raises_invalid(self):
        signer = AttendanceLinkSigner()
        token, _ = signer.sign(session_id=42, instructor_id=7)
        tampered = token[:-2] + ('AA' if token[-2:] != 'AA' else 'BB')
        with self.assertRaises(InvalidLink):
            signer.unsign(tampered)

    def test_unsign_garbage_raises_invalid(self):
        signer = AttendanceLinkSigner()
        with self.assertRaises(InvalidLink):
            signer.unsign('not-a-real-token')

    def test_unsign_expired_raises_expired(self):
        signer = AttendanceLinkSigner()
        token, _ = signer.sign(session_id=42, instructor_id=7)
        # Patch MAX_AGE to 0 to simulate expiry, after a small sleep.
        time.sleep(1)
        with mock.patch.object(AttendanceLinkSigner, 'MAX_AGE', 0):
            with self.assertRaises(ExpiredLink):
                signer.unsign(token)
