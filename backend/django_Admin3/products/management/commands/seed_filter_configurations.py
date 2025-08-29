from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from products.models.filter_system import FilterConfiguration
import json


class Command(BaseCommand):
    help = 'Seed filter configurations with default settings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Replace existing configurations',
        )

    def handle(self, *args, **options):
        replace = options['replace']
        
        # Get or create admin user for created_by field
        admin_user = User.objects.filter(is_superuser=True).first()
        
        if replace:
            self.stdout.write('Removing existing filter configurations...')
            FilterConfiguration.objects.all().delete()
        
        # Define filter configurations
        filter_configs = [
            {
                'name': 'subject',
                'display_label': 'Subject',
                'description': 'Filter products by subject code or name',
                'filter_type': 'subject',
                'filter_key': 'subject',
                'ui_component': 'multi_select',
                'display_order': 1,
                'is_active': True,
                'is_collapsible': True,
                'is_expanded_by_default': True,
                'is_required': False,
                'allow_multiple': True,
                'ui_config': {
                    'placeholder': 'Select subjects...',
                    'search_placeholder': 'Search subjects...',
                    'show_count': True,
                    'show_select_all': True,
                    'show_code': True,
                    'group_by_category': False
                },
                'validation_rules': {},
                'dependency_rules': {},
                'option_provider': {
                    'source_type': 'database_table',
                    'source_config': {
                        'table_name': 'acted_subjects',
                        'value_field': 'id',
                        'label_field': 'description',
                        'order_by': 'code'
                    },
                    'cache_timeout': 900
                }
            },
            {
                'name': 'main_category',
                'display_label': 'Product Type',
                'description': 'Filter by main product categories (Materials, Marking, Tutorial)',
                'filter_type': 'product_group',
                'filter_key': 'main_category',
                'ui_component': 'multi_select',
                'display_order': 2,
                'is_active': True,
                'is_collapsible': True,
                'is_expanded_by_default': True,
                'is_required': False,
                'allow_multiple': True,
                'ui_config': {
                    'placeholder': 'Select product types...',
                    'show_count': True,
                    'show_select_all': True,
                    'include_children': False,
                    'show_hierarchy': False
                },
                'validation_rules': {},
                'dependency_rules': {},
                'option_provider': {
                    'source_type': 'database_table',
                    'source_config': {
                        'table_name': 'acted_filter_group',
                        'value_field': 'id',
                        'label_field': 'name',
                        'where_clause': "parent_id IS NULL",  # Only top-level categories
                        'order_by': 'name'
                    },
                    'cache_timeout': 900
                }
            },
            {
                'name': 'delivery_method',
                'display_label': 'Delivery Mode',
                'description': 'Filter by delivery method (Printed, eBook, The Hub)',
                'filter_type': 'product_group',
                'filter_key': 'delivery_method',
                'ui_component': 'multi_select',
                'display_order': 3,
                'is_active': True,
                'is_collapsible': True,
                'is_expanded_by_default': True,
                'is_required': False,
                'allow_multiple': True,
                'ui_config': {
                    'placeholder': 'Select delivery modes...',
                    'show_count': True,
                    'show_select_all': True,
                    'include_children': False
                },
                'validation_rules': {},
                'dependency_rules': {},
                'option_provider': {
                    'source_type': 'database_table',
                    'source_config': {
                        'table_name': 'acted_filter_group',
                        'value_field': 'id',
                        'label_field': 'name',
                        'where_clause': "name IN ('Printed', 'eBook', 'The Hub')",
                        'order_by': 'name'
                    },
                    'cache_timeout': 900
                }
            },
            {
                'name': 'tutorial_format',
                'display_label': 'Tutorial Format',
                'description': 'Filter tutorials by format (Face to Face, Live Online, Online Classroom)',
                'filter_type': 'tutorial_format',
                'filter_key': 'tutorial_format',
                'ui_component': 'multi_select',
                'display_order': 4,
                'is_active': True,
                'is_collapsible': True,
                'is_expanded_by_default': False,
                'is_required': False,
                'allow_multiple': True,
                'ui_config': {
                    'placeholder': 'Select tutorial formats...',
                    'show_count': True,
                    'format_mapping': {
                        'face_to_face': 'Face to Face',
                        'live_online': 'Live Online',
                        'online_classroom': 'Online Classroom'
                    }
                },
                'validation_rules': {},
                'dependency_rules': {
                    'depends_on': ['main_category'],
                    'show_when': {
                        'main_category': ['Tutorial']
                    }
                },
                'option_provider': {
                    'source_type': 'static_list',
                    'source_config': {
                        'options': [
                            {'id': 'face_to_face', 'label': 'Face to Face'},
                            {'id': 'live_online', 'label': 'Live Online'},
                            {'id': 'online_classroom', 'label': 'Online Classroom'}
                        ]
                    },
                    'cache_timeout': 3600
                }
            },
            {
                'name': 'product_subtype',
                'display_label': 'Product Subtype',
                'description': 'Filter by product subtypes and variations',
                'filter_type': 'product_variation',
                'filter_key': 'variation',
                'ui_component': 'multi_select',
                'display_order': 5,
                'is_active': True,
                'is_collapsible': True,
                'is_expanded_by_default': False,
                'is_required': False,
                'allow_multiple': True,
                'ui_config': {
                    'placeholder': 'Select product subtypes...',
                    'show_count': True,
                    'show_select_all': True,
                    'group_by_type': True
                },
                'validation_rules': {},
                'dependency_rules': {},
                'option_provider': {
                    'source_type': 'database_table',
                    'source_config': {
                        'table_name': 'acted_product_variations',
                        'value_field': 'id',
                        'label_field': 'name',
                        'order_by': 'variation_type, name'
                    },
                    'cache_timeout': 900
                }
            },
            {
                'name': 'bundle',
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
                'option_provider': {
                    'source_type': 'static_list',
                    'source_config': {
                        'options': [
                            {'id': 'bundle', 'label': 'Bundle', 'description': 'Show only bundle products'}
                        ]
                    },
                    'cache_timeout': 3600
                }
            }
        ]
        
        # Create filter configurations
        created_count = 0
        for config_data in filter_configs:
            option_provider_data = config_data.pop('option_provider')
            
            # Create or get filter configuration
            filter_config, created = FilterConfiguration.objects.get_or_create(
                name=config_data['name'],
                defaults={
                    **config_data,
                    'created_by': admin_user
                }
            )
            
            if created or replace:
                if not created:
                    # Update existing
                    for key, value in config_data.items():
                        setattr(filter_config, key, value)
                    filter_config.save()
                
                # Create or update option provider
                option_provider, provider_created = FilterOptionProvider.objects.get_or_create(
                    filter_configuration=filter_config,
                    defaults=option_provider_data
                )
                
                if not provider_created:
                    # Update existing
                    for key, value in option_provider_data.items():
                        setattr(option_provider, key, value)
                    option_provider.save()
                
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created/Updated filter: {filter_config.display_label}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Filter already exists: {filter_config.display_label}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully processed {created_count} filter configurations')
        )
        
        # Display summary
        self.stdout.write('\n--- Filter Configuration Summary ---')
        for config in FilterConfiguration.objects.filter(is_active=True).order_by('display_order'):
            self.stdout.write(f'{config.display_order}. {config.display_label} ({config.filter_type})')
        
        self.stdout.write('\nTo test the filters, visit the Django admin and go to Products > Filter Configurations')
        self.stdout.write('Use the "Test" button next to each filter to verify functionality.')
        
        # Instructions for frontend integration
        self.stdout.write('\n--- Frontend Integration Instructions ---')
        self.stdout.write('1. Update your frontend to use the new /api/products/filter-configuration/ endpoint')
        self.stdout.write('2. The endpoint now returns dynamic filter configurations instead of hard-coded ones')
        self.stdout.write('3. Each filter includes UI configuration, validation rules, and dependency rules')
        self.stdout.write('4. Staff can now modify filter behavior through the Django admin interface')