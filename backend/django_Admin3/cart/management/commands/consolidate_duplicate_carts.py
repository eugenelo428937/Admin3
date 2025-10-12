"""
Management command to consolidate duplicate carts per user.

This fixes the bug where multiple carts exist for the same user,
causing items to appear to "disappear" when added to different cart instances.

Usage:
    python manage.py consolidate_duplicate_carts [--dry-run]
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from cart.models import Cart, CartItem


class Command(BaseCommand):
    help = 'Consolidate duplicate carts per user into a single cart'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Find users with multiple carts
        duplicate_carts = Cart.objects.filter(
            user__isnull=False
        ).values('user').annotate(
            cart_count=Count('id')
        ).filter(cart_count__gt=1)

        total_users = duplicate_carts.count()
        self.stdout.write(f'\nFound {total_users} users with duplicate carts\n')

        if total_users == 0:
            self.stdout.write(self.style.SUCCESS('No duplicate carts found!'))
            return

        total_carts_deleted = 0
        total_items_moved = 0

        for item in duplicate_carts:
            user_id = item['user']
            cart_count = item['cart_count']

            # Get all carts for this user, ordered by most recent first
            user_carts = Cart.objects.filter(user_id=user_id).order_by('-updated_at')

            # Keep the most recently updated cart
            primary_cart = user_carts.first()
            carts_to_merge = user_carts[1:]  # All except the first one

            self.stdout.write(f'\nUser ID {user_id}: {cart_count} carts')
            self.stdout.write(f'  Keeping: Cart {primary_cart.id} ({primary_cart.items.count()} items, updated: {primary_cart.updated_at})')

            if dry_run:
                for cart in carts_to_merge:
                    self.stdout.write(f'  Would merge: Cart {cart.id} ({cart.items.count()} items)')
            else:
                # Merge carts in a transaction
                with transaction.atomic():
                    for cart in carts_to_merge:
                        items = cart.items.all()
                        items_count = items.count()

                        self.stdout.write(f'  Merging: Cart {cart.id} ({items_count} items)')

                        # Move all items to the primary cart
                        for cart_item in items:
                            # Check if primary cart already has this exact item
                            existing_item = CartItem.objects.filter(
                                cart=primary_cart,
                                product=cart_item.product,
                                price_type=cart_item.price_type,
                                metadata__variationId=cart_item.metadata.get('variationId')
                            ).first()

                            if existing_item:
                                # Item already exists, increase quantity
                                existing_item.quantity += cart_item.quantity
                                existing_item.save()
                                self.stdout.write(f'    Updated existing item {existing_item.id} (quantity: {existing_item.quantity})')
                                cart_item.delete()
                            else:
                                # Move item to primary cart
                                cart_item.cart = primary_cart
                                cart_item.save()
                                self.stdout.write(f'    Moved item {cart_item.id}')

                            total_items_moved += 1

                        # Delete the now-empty cart
                        cart.delete()
                        total_carts_deleted += 1
                        self.stdout.write(f'  Deleted Cart {cart.id}')

        if dry_run:
            self.stdout.write(self.style.WARNING(f'\nDRY RUN: Would delete {total_carts_deleted} carts and move {total_items_moved} items'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✓ Deleted {total_carts_deleted} duplicate carts'))
            self.stdout.write(self.style.SUCCESS(f'✓ Consolidated {total_items_moved} items'))
            self.stdout.write(self.style.SUCCESS('\nAll duplicate carts have been consolidated!'))
