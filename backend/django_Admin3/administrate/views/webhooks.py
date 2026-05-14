from django.conf import settings
from django.utils.crypto import constant_time_compare
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@method_decorator(csrf_exempt, name='dispatch')
class AdministrateEventWebhookView(APIView):
    """Receives Administrate `Event` Created/Updated/Cancelled webhooks.

    Authentication is two-layered:
      1. The path-segment `route_token` must match
         settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN (404 on mismatch — we
         deliberately do not confirm the URL exists).
      2. The JSON body's `configuration.secret` must match
         settings.ADMINISTRATE_WEBHOOK_SECRET (401 on mismatch).

    Both comparisons are constant-time.
    """

    permission_classes = [AllowAny]

    def post(self, request, route_token, *args, **kwargs):
        expected_token = settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN
        if not constant_time_compare(route_token, expected_token):
            return Response(status=404)

        config = request.data.get('configuration') or {}
        secret = config.get('secret', '') if isinstance(config, dict) else ''
        if not constant_time_compare(secret, settings.ADMINISTRATE_WEBHOOK_SECRET):
            return Response(status=401)

        # Persistence + dispatch land in Task 4.
        return Response({'status': 'queued'}, status=202)
