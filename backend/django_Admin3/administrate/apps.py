from django.apps import AppConfig


class AdministrateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'administrate'
    verbose_name = 'Administrate'

    def ready(self):
        # Register the webhook-credentials system check on app load.
        # The check itself only runs during `manage.py check` or server
        # startup (runserver/gunicorn), NOT during build-phase commands
        # like collectstatic or migrate. This keeps the UAT/Railway
        # build pipeline from failing on missing runtime env vars.
        from administrate import checks  # noqa: F401 — registers the check
