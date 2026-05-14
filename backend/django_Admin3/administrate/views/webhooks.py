import logging

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils.crypto import constant_time_compare
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from administrate.services.webhook_ingress import (
    InvalidPayload,
    dispatch_inbox_task,
    persist_inbox_row,
)
from administrate.services.webhook_metrics import incr_received


logger = logging.getLogger('administrate.webhook')


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
        if not expected_token or not constant_time_compare(route_token, expected_token):
            incr_received('', 'auth_failed')
            return Response(status=404)

        config = request.data.get('configuration') or {}
        secret = config.get('secret', '') if isinstance(config, dict) else ''
        configured_secret = settings.ADMINISTRATE_WEBHOOK_SECRET
        if not configured_secret or not constant_time_compare(secret, configured_secret):
            incr_received('', 'auth_failed')
            return Response(status=401)

        try:
            # Wrap in an atomic block so an IntegrityError (dedup hit) on the
            # UniqueConstraint doesn't poison the surrounding transaction
            # (e.g. the pytest-django outer atomic block).
            with transaction.atomic():
                row = persist_inbox_row(request.data, dict(request.headers))
        except InvalidPayload as exc:
            incr_received('', 'bad_request')
            return Response({'error': str(exc)}, status=400)
        except IntegrityError:
            metadata = request.data.get('metadata') or {}
            type_name = metadata.get('webhookTypeName', '') if isinstance(metadata, dict) else ''
            entity_id = str(metadata.get('entityId', '')) if isinstance(metadata, dict) else ''
            incr_received(type_name, 'duplicate')
            logger.info(
                'administrate.webhook.received',
                extra={
                    'inbox_id': None,
                    'type': type_name,
                    'entity_id': entity_id,
                    'duplicate': True,
                },
            )
            return Response({'status': 'duplicate'}, status=200)

        logger.info(
            'administrate.webhook.received',
            extra={
                'inbox_id': row.id,
                'type': row.webhook_type_name,
                'entity_id': row.entity_external_id,
                'duplicate': False,
            },
        )
        incr_received(row.webhook_type_name, 'queued')

        # Under ImmediateBackend (slice 1), this call runs the handler
        # synchronously in-request and may raise. The inbox row is already
        # persisted with its outcome (failed/dead), so we MUST suppress
        # exceptions here — otherwise a handler bug returns HTTP 500 to
        # Administrate, which retries the webhook, which we then dedup
        # (200), which masks the failure. Logging stays as the operator
        # signal; replay is via the inbox CLI command.
        try:
            dispatch_inbox_task(row.id)
        except Exception:  # noqa: BLE001 — see comment above
            logger.exception(
                'administrate.webhook.dispatch_failed',
                extra={'inbox_id': row.id},
            )

        return Response({'status': 'queued', 'inbox_id': row.id}, status=202)
