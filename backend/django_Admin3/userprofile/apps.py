from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    name = 'userprofile'

    def ready(self):
        import userprofile.signals
