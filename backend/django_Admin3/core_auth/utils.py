import hmac
import hashlib
import ipaddress
from django.conf import settings


def hash_token(raw_token: str) -> str:
    """HMAC-SHA256 hash a raw token using SECRET_KEY.

    Defense-in-depth: even with full DB access, tokens cannot
    be verified without also knowing SECRET_KEY.
    """
    return hmac.new(
        settings.SECRET_KEY.encode(),
        raw_token.encode(),
        hashlib.sha256
    ).hexdigest()


def is_trusted_ip(client_ip: str) -> bool:
    """Check if client IP is within any trusted VPN subnet."""
    try:
        addr = ipaddress.ip_address(client_ip)
        return any(
            addr in ipaddress.ip_network(subnet)
            for subnet in settings.MACHINE_LOGIN_TRUSTED_SUBNETS
        )
    except (ValueError, TypeError):
        return False
