from django.apps import AppConfig


class AdministrateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'administrate'
    verbose_name = 'Administrate'

    def ready(self):
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured

        # Refuse to boot in a non-debug environment with empty webhook secrets.
        # Empty values would let constant_time_compare('', '') return True and
        # silently authorize every inbound request.
        if not settings.DEBUG:
            missing = [
                name for name in (
                    'ADMINISTRATE_WEBHOOK_SECRET',
                    'ADMINISTRATE_WEBHOOK_ROUTE_TOKEN',
                )
                if not getattr(settings, name, '')
            ]
            if missing:
                raise ImproperlyConfigured(
                    f"Empty Administrate webhook settings: {', '.join(missing)}. "
                    f"Set these in the deployment environment or disable the webhook "
                    f"endpoint."
                )
