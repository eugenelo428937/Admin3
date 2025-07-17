from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Refactor the filter system to use the new unified approach'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            default=False,
            help='Run in dry-run mode (no changes to database)',
        )
        parser.add_argument(
            '--setup-main-category',
            action='store_true',
            dest='setup_main_category',
            default=False,
            help='Setup the main category filter specifically',
        )

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.setup_main_category = options['setup_main_category']
        
        if self.dry_run:
            self.stdout.write(
                self.style.WARNING('Running in DRY-RUN mode - no changes will be made')
            )
        
        try:
            with transaction.atomic():
                if self.setup_main_category:
                    self.setup_main_category_filter()
                else:
                    self.run_full_refactor()
                
                if self.dry_run:
                    # Rollback the transaction in dry-run mode
                    transaction.set_rollback(True)
                    self.stdout.write(
                        self.style.WARNING('DRY-RUN: All changes rolled back')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS('Filter system refactoring completed successfully!')
                    )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during refactoring: {str(e)}')
            )
            raise CommandError(f'Refactoring failed: {str(e)}')

    def run_full_refactor(self):
        """Run the complete refactoring process"""
        self.stdout.write('Starting filter system refactoring...')
        
        # 1. Check if new models exist
        self.check_new_models()
        
        # 2. Migrate data
        self.migrate_data()
        
        # 3. Setup main category filter
        self.setup_main_category_filter()
        
        # 4. Verify data integrity
        self.verify_data()
        
        self.stdout.write(self.style.SUCCESS('Refactoring completed!'))

    def check_new_models(self):
        """Check if the new refactored models are available"""
        self.stdout.write('Checking new model availability...')
        
        try:
            from products.models.filter_system import FilterGroup, FilterConfiguration, FilterConfigurationGroup
            self.stdout.write('OK: New filter system models are available')
        except ImportError as e:
            raise CommandError(f'New filter models not available: {e}')

    def migrate_data(self):
        """Migrate data from old system to new system"""
        self.stdout.write('Migrating data from old system to new system...')
        
        from products.models.filter_system import FilterGroup, FilterConfiguration, FilterConfigurationGroup
        from products.models.product_group import ProductGroup
        from products.models.product_group_filter import ProductGroupFilter
        
        # 1. Migrate ProductGroup to FilterGroup
        self.stdout.write('  Migrating product groups to filter groups...')
        migrated_groups = 0
        
        for pg in ProductGroup.objects.all():
            filter_group, created = FilterGroup.objects.get_or_create(
                id=pg.id,
                defaults={
                    'name': pg.name,
                    'parent_id': pg.parent_id,
                    'code': pg.name.lower().replace(' ', '_').replace('-', '_'),
                    'description': f'Migrated from product group: {pg.name}',
                    'is_active': True,
                    'display_order': pg.id,
                }
            )
            if created:
                migrated_groups += 1
        
        self.stdout.write(f'    OK: Migrated {migrated_groups} new groups')
        
        # 2. Create filter configurations based on old ProductGroupFilter
        self.stdout.write('  Creating filter configurations...')
        migrated_configs = 0
        
        # Get superuser for created_by field
        superuser = User.objects.filter(is_superuser=True).first()
        
        for pgf in ProductGroupFilter.objects.all():
            # Map old filter types to new system
            filter_type_mapping = {
                'MAIN_CATEGORY': 'filter_group',
                'DELIVERY_METHOD': 'filter_group',
                'TUTORIAL_FORMAT': 'filter_group',
            }
            
            ui_component_mapping = {
                'MAIN_CATEGORY': 'multi_select',
                'DELIVERY_METHOD': 'multi_select', 
                'TUTORIAL_FORMAT': 'multi_select',
            }
            
            display_order_mapping = {
                'MAIN_CATEGORY': 1,
                'DELIVERY_METHOD': 2,
                'TUTORIAL_FORMAT': 3,
            }
            
            filter_config, created = FilterConfiguration.objects.get_or_create(
                name=pgf.filter_type.lower(),
                defaults={
                    'display_label': pgf.name,
                    'description': f'Filter for {pgf.name} (migrated from old system)',
                    'filter_type': filter_type_mapping.get(pgf.filter_type, 'filter_group'),
                    'filter_key': pgf.filter_type.lower(),
                    'ui_component': ui_component_mapping.get(pgf.filter_type, 'multi_select'),
                    'display_order': display_order_mapping.get(pgf.filter_type, 10),
                    'is_active': True,
                    'is_collapsible': True,
                    'is_expanded_by_default': pgf.filter_type == 'MAIN_CATEGORY',
                    'allow_multiple': True,
                    'ui_config': {
                        'show_count': True,
                        'show_select_all': True,
                        'include_children': pgf.filter_type == 'MAIN_CATEGORY',
                    },
                    'created_by': superuser,
                }
            )
            
            if created:
                migrated_configs += 1
                self.stdout.write(f'    OK: Created filter configuration: {filter_config.display_label}')
        
        # 3. Migrate ProductGroupFilterGroups to FilterConfigurationGroup
        self.stdout.write('  Migrating filter group associations...')
        
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO acted_filter_configuration_group 
                (filter_configuration_id, filter_group_id, is_default, display_order)
                SELECT 
                    fc.id as filter_configuration_id,
                    pgfg.productgroup_id as filter_group_id,
                    true as is_default,
                    pgfg.id as display_order
                FROM acted_product_group_filter_groups pgfg
                JOIN acted_product_group_filter pgf ON pgf.id = pgfg.productgroupfilter_id
                JOIN acted_filter_configuration fc ON fc.filter_key = LOWER(pgf.filter_type)
                WHERE NOT EXISTS (
                    SELECT 1 FROM acted_filter_configuration_group fcg 
                    WHERE fcg.filter_configuration_id = fc.id 
                    AND fcg.filter_group_id = pgfg.productgroup_id
                );
            """)
            
            associations_created = cursor.rowcount
            self.stdout.write(f'    OK: Created {associations_created} filter group associations')

    def setup_main_category_filter(self):
        """Setup the main category filter specifically"""
        self.stdout.write('Setting up main category filter...')
        
        from products.models.filter_system import FilterGroup, FilterConfiguration, FilterConfigurationGroup
        from django.contrib.auth.models import User
        
        # Get superuser for created_by field
        superuser = User.objects.filter(is_superuser=True).first()
        
        # Create or update the main category filter configuration
        filter_config, created = FilterConfiguration.objects.update_or_create(
            name='main_category',
            defaults={
                'display_label': 'Main Category',
                'description': 'Filter by main product categories (Materials, Marking, Tutorial)',
                'filter_type': 'filter_group',
                'filter_key': 'main_category',
                'ui_component': 'multi_select',
                'display_order': 1,
                'is_active': True,
                'is_collapsible': True,
                'is_expanded_by_default': True,
                'allow_multiple': True,
                'ui_config': {
                    'show_count': True,
                    'show_hierarchy': False,
                    'show_select_all': True,
                    'include_children': True,
                },
                'created_by': superuser,
            }
        )
        
        if created:
            self.stdout.write('  OK: Created main category filter configuration')
        else:
            self.stdout.write('  OK: Updated main category filter configuration')
        
        # Link to the main category groups (Material, Marking, Tutorial)
        main_categories = FilterGroup.objects.filter(parent__isnull=True)
        linked_count = 0
        
        for category in main_categories:
            config_group, created = FilterConfigurationGroup.objects.get_or_create(
                filter_configuration=filter_config,
                filter_group=category,
                defaults={'is_default': True, 'display_order': category.display_order}
            )
            if created:
                linked_count += 1
        
        self.stdout.write(f'  OK: Linked {linked_count} main category groups to filter')
        
        return filter_config

    def verify_data(self):
        """Verify the migrated data"""
        self.stdout.write('Verifying migrated data...')
        
        from products.models.filter_system import FilterGroup, FilterConfiguration, FilterConfigurationGroup
        
        # Count records in new tables
        group_count = FilterGroup.objects.count()
        config_count = FilterConfiguration.objects.count()
        association_count = FilterConfigurationGroup.objects.count()
        
        self.stdout.write(f'  OK: Filter Groups: {group_count}')
        self.stdout.write(f'  OK: Filter Configurations: {config_count}')
        self.stdout.write(f'  OK: Filter Associations: {association_count}')
        
        # Test the main category filter
        try:
            main_config = FilterConfiguration.objects.get(name='main_category')
            main_groups = main_config.filter_groups.count()
            self.stdout.write(f'  OK: Main category filter has {main_groups} associated groups')
        except FilterConfiguration.DoesNotExist:
            self.stdout.write(self.style.WARNING('  WARNING: Main category filter not found'))
        
        # Test the filter service
        try:
            from products.services.refactored_filter_service import get_refactored_filter_service
            service = get_refactored_filter_service()
            options = service.get_filter_options(['main_category'])
            main_options = len(options.get('main_category', []))
            self.stdout.write(f'  OK: Main category filter has {main_options} options available')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  WARNING: Filter service test failed: {e}'))

    def show_usage_examples(self):
        """Show usage examples for the new system"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('USAGE EXAMPLES:')
        self.stdout.write('='*60)
        
        self.stdout.write('\n1. Access the admin interface:')
        self.stdout.write('   http://127.0.0.1:8888/admin/')
        self.stdout.write('   Look for "Filter Groups" and "Filter Configurations"')
        
        self.stdout.write('\n2. Test the main category filter in Django shell:')
        self.stdout.write('   python manage.py shell')
        self.stdout.write('   >>> from products.services.refactored_filter_service import get_refactored_filter_service')
        self.stdout.write('   >>> service = get_refactored_filter_service()')
        self.stdout.write('   >>> options = service.get_filter_options([\'main_category\'])')
        self.stdout.write('   >>> print(options)')
        
        self.stdout.write('\n3. Apply filters to products:')
        self.stdout.write('   >>> from exam_sessions_subjects_products.models import ExamSessionSubjectProduct')
        self.stdout.write('   >>> queryset = ExamSessionSubjectProduct.objects.all()')
        self.stdout.write('   >>> filtered = service.apply_filters(queryset, {\'main_category\': [1]})')  # Material
        self.stdout.write('   >>> print(f"Filtered results: {filtered.count()}")')
        
        self.stdout.write('\n4. Create new filter configurations through admin:')
        self.stdout.write('   - Go to admin > Filter Configurations > Add')
        self.stdout.write('   - Set up filter type, UI component, and associated groups')
        self.stdout.write('   - Test the filter using the "Test" button')
        
        self.stdout.write('\n' + '='*60)