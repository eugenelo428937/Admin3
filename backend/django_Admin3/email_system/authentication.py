import hashlib
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExternalApiKeyAuthentication(BaseAuthentication):
    """Authenticates requests using X-Api-Key header against ExternalApiKey model."""

    def authenticate(self, request):
        raw_key = request.META.get('HTTP_X_API_KEY')
        if not raw_key:
            return None

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        from email_system.models import ExternalApiKey
        try:
            api_key = ExternalApiKey.objects.get(key_hash=key_hash)
        except ExternalApiKey.DoesNotExist:
            raise AuthenticationFailed('Invalid API key.')

        if not api_key.is_active:
            raise AuthenticationFailed('API key is inactive.')

        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])

        return (api_key.user, api_key)

    def authenticate_header(self, request):
        return 'X-Api-Key'
