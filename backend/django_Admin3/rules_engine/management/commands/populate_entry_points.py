"""
Management command to populate RuleEntryPoint table with predefined entry points
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from rules_engine.models import RuleEntryPoint


class Command(BaseCommand):
    help = 'Populate RuleEntryPoint table with predefined entry points from PRD'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing entry points',
        )

    def handle(self, *args, **options):
        """
        Populate entry points as defined in Epic 1 PRD
        """
        force_update = options.get('force', False)
        
        entry_points_data = [
            {
                'code': 'home_page_mount',
                'name': 'Home Page Mount',
                'description': 'Entry point when home page is loaded/mounted',
                'is_active': True
            },
            {
                'code': 'product_list_mount',
                'name': 'Product List Mount',
                'description': 'Entry point when product list page is loaded/mounted',
                'is_active': True
            },
            {
                'code': 'product_card_mount',
                'name': 'Product Card Mount',
                'description': 'Entry point when individual product cards are rendered',
                'is_active': True
            },
            {
                'code': 'checkout_start',
                'name': 'Checkout Start',
                'description': 'Entry point when checkout process begins',
                'is_active': True
            },
            {
                'code': 'checkout_preference',
                'name': 'Checkout Preference',
                'description': 'Entry point for checkout preferences step',
                'is_active': True
            },
            {
                'code': 'checkout_terms',
                'name': 'Checkout Terms',
                'description': 'Entry point for checkout terms & conditions step',
                'is_active': True
            },
            {
                'code': 'checkout_payment',
                'name': 'Checkout Payment',
                'description': 'Entry point for checkout payment step',
                'is_active': True
            },
            {
                'code': 'user_registration',
                'name': 'User Registration',
                'description': 'Entry point when user registration is initiated',
                'is_active': True
            }
        ]
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            for entry_point_data in entry_points_data:
                code = entry_point_data['code']
                
                try:
                    entry_point = RuleEntryPoint.objects.get(code=code)
                    
                    if force_update:
                        # Update existing entry point
                        for field, value in entry_point_data.items():
                            if field != 'code':  # Don't update the code itself
                                setattr(entry_point, field, value)
                        entry_point.save()
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'Updated entry point: {code}')
                        )
                    else:
                        skipped_count += 1
                        self.stdout.write(
                            self.style.WARNING(f'Skipped existing entry point: {code}')
                        )
                        
                except RuleEntryPoint.DoesNotExist:
                    # Create new entry point
                    RuleEntryPoint.objects.create(**entry_point_data)
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Created entry point: {code}')
                    )
        
        # Print summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'Created: {created_count} entry points'))
        if force_update:
            self.stdout.write(self.style.SUCCESS(f'Updated: {updated_count} entry points'))
        self.stdout.write(self.style.WARNING(f'Skipped: {skipped_count} entry points'))
        self.stdout.write('='*50)
        
        # Display all entry points
        self.stdout.write('\nCurrent entry points in database:')
        for ep in RuleEntryPoint.objects.all():
            status = 'ACTIVE' if ep.is_active else 'INACTIVE'
            self.stdout.write(f'  [{status}] {ep.code} - {ep.name}')
