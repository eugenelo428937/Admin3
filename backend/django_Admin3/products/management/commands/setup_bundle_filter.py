from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from products.models.filter_system import FilterConfiguration, FilterGroup


class Command(BaseCommand):
    help = 'Setup bundle filter configuration'

    def handle(self, *args, **options):
        # Get or create admin user for created_by field
        admin_user = User.objects.filter(is_superuser=True).first()
        
        if not admin_user:
            self.stdout.write(self.style.ERROR('No admin user found. Please create an admin user first.'))
            return
        
        # Create or update bundle filter configuration
        filter_config, created = FilterConfiguration.objects.get_or_create(
            name='bundle',
            defaults={
                'display_label': 'Bundle',
                'description': 'Filter to show only bundle products',
                'filter_type': 'bundle',
                'filter_key': 'bundle',
                'ui_component': 'checkbox',
                'display_order': 6,
                'is_active': True,
                'is_collapsible': False,
                'is_expanded_by_default': True,
                'is_required': False,
                'allow_multiple': False,
                'ui_config': {
                    'label': 'Show only bundles',
                    'description': 'When selected, only bundle products will be shown'
                },
                'validation_rules': {},
                'dependency_rules': {},
                'created_by': admin_user
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Successfully created bundle filter configuration'))
        else:
            self.stdout.write(self.style.WARNING('Bundle filter configuration already exists'))
        
        # Display the configuration
        self.stdout.write(f'Filter Name: {filter_config.name}')
        self.stdout.write(f'Display Label: {filter_config.display_label}')
        self.stdout.write(f'Filter Type: {filter_config.filter_type}')
        self.stdout.write(f'UI Component: {filter_config.ui_component}')
        self.stdout.write(f'Is Active: {filter_config.is_active}')
        
        self.stdout.write('\nBundle filter is now configured and ready to use!')
        self.stdout.write('The filter will show only bundle products when selected.')
        self.stdout.write('When other filters are applied, related bundles will also be included in results.')