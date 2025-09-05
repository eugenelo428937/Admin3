import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import CourseTemplate
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize course templates from Administrate API to local database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug logging'
        )
        parser.add_argument(
            '--page-size',
            type=int,
            default=100,
            help='Number of records per page'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        page_size = options['page_size']
        
        if debug:
            logger.setLevel(logging.DEBUG)

        try:
            api_service = AdministrateAPIService()
                        
            query = load_graphql_query('get_all_course_templates')
            
            self.stdout.write('Fetching course templates...')
            
            has_next_page = True
            offset = 0
            all_templates = []

            while has_next_page:
                try:
                    # Add pagination variables to the query
                    variables = {
                        "first": page_size,
                        "offset": offset
                    }

                    result = api_service.execute_query(query, variables)
                    
                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING('Invalid response format from API')
                        )
                        return
                    
                    page_info = result['data']['courseTemplates']['pageInfo']
                    course_templates = result['data']['courseTemplates']['edges']
                    
                    all_templates.extend(course_templates)
                    
                    # Update pagination info
                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size
                    
                    self.stdout.write(
                        f'Fetched {len(course_templates)} course templates. '
                        f'Total so far: {len(all_templates)}'
                    )
                    
                    if not course_templates:
                        self.stdout.write(self.style.WARNING('No more course templates found'))
                        break
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing course templates: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return

            # After fetching all templates, synchronize them with the database
            if all_templates:
                self.stdout.write(f'Syncing {len(all_templates)} course templates...')
                self._sync_course_templates(all_templates, debug)
            else:
                self.stdout.write(self.style.WARNING('No course templates found to sync'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        """Validate the API response format"""
        return (
            isinstance(result, dict) and
            'data' in result and
            'courseTemplates' in result['data'] and
            'edges' in result['data']['courseTemplates'] and
            isinstance(result['data']['courseTemplates']['edges'], list) and
            'pageInfo' in result['data']['courseTemplates']
        )

    def _get_custom_field_value(self, custom_fields, key):
        """Helper to get custom field value by key"""
        for field in custom_fields:
            if field['definition']['key'] == key:
                return field['value']
        return None

    def _get_learning_categories(self, template):
        """Extract learning categories from template"""
        categories = []
        if template.get('learningCategories', {}).get('edges'):
            for edge in template['learningCategories']['edges']:
                if edge.get('node', {}).get('name'):
                    categories.append(edge['node']['name'])
        return ', '.join(categories)

    def _sync_course_templates(self, api_course_templates, debug=False):
        """Synchronize course templates with database"""
        existing_templates = {
            ct.external_id: ct for ct in CourseTemplate.objects.all()
        }
        
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deleted_count = 0
        error_count = 0
        
        for edge in api_course_templates:
            template = edge.get('node', {})
            external_id = template.get('id')
            
            if not external_id:
                continue
            
            try:
                with transaction.atomic():
                    # Get categories from learningCategories
                    categories = self._get_learning_categories(template)
                    
                    # Get custom field values
                    custom_fields = template.get('customFieldValues', [])
                    
                    template_data = {
                        'code': template.get('code', ''),
                        'title': template.get('title', ''),
                        'categories': categories,
                        'event_learning_mode': template.get('eventLearningMode', ''),
                        'active': True
                    }
                    
                    logger.debug(f"Processing template: {external_id}")
                    if debug:
                        logger.debug(f"Template data: {template_data}")
                    
                    processed_ids.add(external_id)
                    
                    if external_id in existing_templates:
                        course_template = existing_templates[external_id]
                        has_changed = False
                        
                        for key, value in template_data.items():
                            current_value = getattr(course_template, key)
                            if current_value != value:
                                logger.debug(f"Updating {key}: {current_value} -> {value}")
                                setattr(course_template, key, value)
                                has_changed = True
                        
                        if has_changed:
                            course_template.save()
                            updated_count += 1
                            self.stdout.write(f'Updated course template: {course_template.code}')
                        else:
                            unchanged_count += 1
                    else:
                        course_template = CourseTemplate.objects.create(
                            external_id=external_id,
                            **template_data
                        )
                        created_count += 1
                        self.stdout.write(f'Created course template: {course_template.code}')
            
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f"Error processing template {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)
        
        # Handle deletions in separate transactions
        for external_id, course_template in existing_templates.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        template_code = course_template.code
                        course_template.delete()
                        deleted_count += 1
                        self.stdout.write(f'Deleted course template: {template_code}')
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error deleting template {external_id}: {str(e)}")
                    )
                    if debug:
                        logger.exception(e)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Synchronization completed: {created_count} created, '
                f'{updated_count} updated, {unchanged_count} unchanged, '
                f'{deleted_count} deleted, {error_count} errors'
            )
        )
