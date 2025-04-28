from django.core.management.base import BaseCommand
from cart.models import Cart
from django.db import transaction
from django.db import models

class Command(BaseCommand):
    help = 'Remove duplicate carts with the same session_key, keeping only the most recently updated.'

    def handle(self, *args, **options):
        duplicates = (
            Cart.objects.values('session_key')
            .exclude(session_key__isnull=True)
            .exclude(session_key='')
            .annotate(count=models.Count('id'))
            .filter(count__gt=1)
        )
        total_removed = 0
        for dup in duplicates:
            session_key = dup['session_key']
            carts = Cart.objects.filter(session_key=session_key).order_by('-updated_at')
            # Keep the most recently updated cart, delete the rest
            to_delete_ids = [c.id for c in carts[1:]]
            count = len(to_delete_ids)
            with transaction.atomic():
                Cart.objects.filter(id__in=to_delete_ids).delete()
            total_removed += count
            self.stdout.write(f"Removed {count} duplicate carts for session_key: {session_key}")
        self.stdout.write(self.style.SUCCESS(f"Cleanup complete. Total duplicate carts removed: {total_removed}"))
