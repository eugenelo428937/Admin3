"""Magic-link signer for the public tutorial attendance flow.

Wraps ``django.core.signing.TimestampSigner`` so the public attendance
endpoints can verify a tutor's magic link without a login. The token
encodes the session and instructor IDs and a signed timestamp; tampering
or expiry both fail closed.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone as _tz

from django.core import signing


@dataclass(frozen=True)
class AttendanceLinkPayload:
    session_id: int
    instructor_id: int
    issued_at: datetime


class ExpiredLink(Exception):
    """Token is well-formed and signed, but past max_age."""


class InvalidLink(Exception):
    """Token is missing, malformed, or HMAC-invalid."""


class AttendanceLinkSigner:
    """Sign and verify (session_id, instructor_id) tokens for the public link."""
    SALT = 'tutorials.attendance_link.v1'
    MAX_AGE = 60 * 60 * 24 * 7  # 7 days

    def __init__(self) -> None:
        self._signer = signing.TimestampSigner(salt=self.SALT)

    def sign(self, session_id: int, instructor_id: int) -> tuple[str, datetime]:
        """Return (token, issued_at)."""
        issued_at = datetime.now(_tz.utc).replace(microsecond=0)
        payload = f"{session_id}:{instructor_id}:{int(issued_at.timestamp())}"
        token = self._signer.sign(payload)
        return token, issued_at

    def unsign(self, token: str) -> AttendanceLinkPayload:
        """Return the decoded payload or raise ExpiredLink / InvalidLink."""
        if not token or not isinstance(token, str):
            raise InvalidLink('empty token')
        try:
            raw = self._signer.unsign(token, max_age=self.MAX_AGE)
        except signing.SignatureExpired as exc:
            raise ExpiredLink(str(exc)) from exc
        except signing.BadSignature as exc:
            raise InvalidLink(str(exc)) from exc
        try:
            sid, iid, ts = raw.split(':')
            return AttendanceLinkPayload(
                session_id=int(sid),
                instructor_id=int(iid),
                issued_at=datetime.fromtimestamp(int(ts), tz=_tz.utc),
            )
        except (ValueError, TypeError) as exc:
            raise InvalidLink(f'unparseable payload: {raw!r}') from exc
