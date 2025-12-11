from django.apps import AppConfig


class RulesEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rules_engine'

    def ready(self):
        """Import signals when app is ready to connect them"""
        import rules_engine.signals  # noqa: F401 