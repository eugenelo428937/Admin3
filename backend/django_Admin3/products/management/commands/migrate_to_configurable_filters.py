from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from products.models.filter_configuration import FilterConfiguration, FilterOptionProvider
from products.models.product_group_filter import ProductGroupFilter
import json


class Command(BaseCommand):
    help = 'Migrate existing ProductGroupFilter data to new configurable filter system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually doing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get admin user
        admin_user = User.objects.filter(is_superuser=True).first()
        
        # Get existing ProductGroupFilter objects
        old_filters = ProductGroupFilter.objects.all()
        
        if not old_filters.exists():
            self.stdout.write(self.style.WARNING('No existing ProductGroupFilter objects found'))
            return
        
        self.stdout.write(f'Found {old_filters.count()} existing filter configurations to migrate')
        
        migrated_count = 0
        skipped_count = 0
        
        for old_filter in old_filters:
            self.stdout.write(f'\nProcessing: {old_filter.name} ({old_filter.filter_type})')
            
            # Map old filter types to new filter types
            filter_type_mapping = {
                'type': 'product_group',
                'delivery': 'product_group',
                'custom': 'product_group'
            }
            
            new_filter_type = filter_type_mapping.get(old_filter.filter_type, 'product_group')
            
            # Generate filter key from name
            filter_key = old_filter.name.lower().replace(' ', '_').replace('-', '_')
            
            # Create display label
            display_label = old_filter.name
            if old_filter.filter_type == 'type':
                display_label = f'{old_filter.name} (Type)'
            elif old_filter.filter_type == 'delivery':
                display_label = f'{old_filter.name} (Delivery)'
            
            # Determine display order based on filter type
            display_order_mapping = {
                'type': 10,
                'delivery': 20,
                'custom': 30
            }
            display_order = display_order_mapping.get(old_filter.filter_type, 99)
            
            # Get group IDs for this filter
            group_ids = list(old_filter.groups.values_list('id', flat=True))
            
            if not group_ids:
                self.stdout.write(f'  Skipping - no groups associated')
                skipped_count += 1
                continue
            
            # Check if already migrated
            if FilterConfiguration.objects.filter(name=filter_key).exists():
                self.stdout.write(f'  Skipping - already migrated')
                skipped_count += 1
                continue
            
            if not dry_run:
                # Create new FilterConfiguration
                filter_config = FilterConfiguration.objects.create(
                    name=filter_key,
                    display_label=display_label,
                    description=f'Migrated from ProductGroupFilter: {old_filter.name}',
                    filter_type=new_filter_type,
                    filter_key=filter_key,
                    ui_component='multi_select',
                    display_order=display_order,
                    is_active=True,
                    is_collapsible=True,
                    is_expanded_by_default=old_filter.filter_type in ['type', 'delivery'],
                    is_required=False,
                    allow_multiple=True,
                    ui_config={
                        'placeholder': f'Select {display_label.lower()}...',
                        'show_count': True,
                        'show_select_all': True,
                        'include_children': False,
                        'migrated_from': old_filter.id
                    },
                    validation_rules={},
                    dependency_rules={},
                    created_by=admin_user
                )
                
                # Create FilterOptionProvider
                option_provider = FilterOptionProvider.objects.create(
                    filter_configuration=filter_config,
                    source_type='database_table',
                    source_config={
                        'table_name': 'acted_product_group',
                        'value_field': 'id',
                        'label_field': 'name',
                        'where_clause': f"id IN ({','.join(map(str, group_ids))})",
                        'order_by': 'name',
                        'migrated_group_ids': group_ids
                    },
                    cache_timeout=900
                )
                
                self.stdout.write(f'  ✅ Migrated successfully')
                migrated_count += 1
            else:
                self.stdout.write(f'  Would migrate: {filter_key} -> {display_label}')
                self.stdout.write(f'    Groups: {group_ids}')
                migrated_count += 1
        
        # Summary
        self.stdout.write(f'\n--- Migration Summary ---')
        self.stdout.write(f'Migrated: {migrated_count}')
        self.stdout.write(f'Skipped: {skipped_count}')
        self.stdout.write(f'Total: {migrated_count + skipped_count}')
        
        if not dry_run and migrated_count > 0:
            self.stdout.write(f'\n--- Next Steps ---')
            self.stdout.write('1. Run the seed_filter_configurations command to add standard filters')
            self.stdout.write('2. Review and adjust filter configurations in Django admin')
            self.stdout.write('3. Test filters using the admin test functionality')
            self.stdout.write('4. Update frontend to use new filter configuration endpoint')
            self.stdout.write('5. Consider deprecating old ProductGroupFilter system')
        
        if dry_run:
            self.stdout.write(f'\nRun without --dry-run to perform the actual migration')
        
        # Show what the new API response would look like
        if migrated_count > 0:
            self.stdout.write(f'\n--- Sample New API Response ---')
            if not dry_run:
                from products.services.configurable_filter_service import get_configurable_filter_service
                service = get_configurable_filter_service()
                config = service.get_filter_configuration()
                
                for key, value in list(config.items())[:2]:  # Show first 2 filters
                    self.stdout.write(f'{key}: {value["label"]} ({len(value["options"])} options)')
            else:
                self.stdout.write('Run migration to see actual API response')