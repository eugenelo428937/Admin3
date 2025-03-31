from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    name = 'userprofiles'

    def ready(self):
        import userprofiles.signals
