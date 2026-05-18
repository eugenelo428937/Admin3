"""Django system checks for the administrate app.

These run during `manage.py check` and at server startup
(runserver/gunicorn), but NOT during build-phase management commands
like collectstatic or migrate. That distinction is critical: the UAT
build pipeline runs collectstatic before runtime env vars are injected,
so any boot-time validation that raises must live in a system check
rather than AppConfig.ready().
"""

from django.conf import settings
from django.core.checks import Error, Tags, register


@register(Tags.security)
def webhook_credentials_present(app_configs, **kwargs):
    """Refuse to start in non-debug environments with empty webhook secrets.

    Empty values would let constant_time_compare('', '') return True and
    silently authorize every inbound request. Runs at server startup
    (runserver/gunicorn) but NOT during build-phase commands.
    """
    if settings.DEBUG:
        return []

    errors = []
    for name in ('ADMINISTRATE_WEBHOOK_SECRET', 'ADMINISTRATE_WEBHOOK_ROUTE_TOKEN'):
        if not getattr(settings, name, ''):
            errors.append(
                Error(
                    f'Empty {name}',
                    hint=(
                        f'Set {name} in the deployment environment. The '
                        'webhook receiver authorizes requests with a '
                        'constant-time compare of this value; an empty '
                        'value would silently accept any request.'
                    ),
                    id='administrate.E001',
                )
            )
    return errors
