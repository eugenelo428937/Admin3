"""Deterministic hashing for anonymised search fields.

Uses HMAC-SHA256 with a secret key from Django settings so that:
  - The same input always produces the same hash (deterministic)
  - Without the key, the hash cannot be reversed or brute-forced easily
  - Search queries are hashed with the same key to match stored hashes
"""

import hashlib
import hmac

from django.conf import settings


def _get_hash_key() -> bytes:
    """Get the HMAC key from settings, falling back to SECRET_KEY."""
    key = getattr(settings, 'ANONYMISE_HASH_KEY', None) or settings.SECRET_KEY
    return key.encode('utf-8')


def compute_search_hash(value: str) -> str:
    """Compute a deterministic HMAC-SHA256 hash of a normalised value.

    Normalisation: lowercase + strip whitespace.
    Returns a 64-char hex digest, or empty string for empty input.
    """
    if not value or not value.strip():
        return ''
    normalised = value.strip().lower()
    return hmac.new(_get_hash_key(), normalised.encode('utf-8'), hashlib.sha256).hexdigest()
