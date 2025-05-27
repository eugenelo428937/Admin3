from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from userprofile.models import UserProfile

class Command(BaseCommand):
    help = 'Create missing UserProfile objects for users without one.'

    def handle(self, *args, **options):
        users = User.objects.all()
        created_count = 0
        for user in users:
            if not hasattr(user, 'userprofile'):
                UserProfile.objects.create(user=user)
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} missing UserProfile(s).'))
