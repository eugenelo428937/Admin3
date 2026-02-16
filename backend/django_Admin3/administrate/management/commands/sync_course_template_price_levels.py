import logging
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import CourseTemplate, PriceLevel, CourseTemplatePriceLevel
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import validate_dependencies

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize course template price levels from Administrate API to local database'

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
        parser.add_argument(
            '--no-prompt',
            action='store_true',
            help='Skip interactive prompts; unmatched records are logged only'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        page_size = options['page_size']

        if debug:
            logger.setLevel(logging.DEBUG)

        # Validate dependencies
        if not validate_dependencies(self.stdout, self.style, {
            'CourseTemplate': CourseTemplate.objects.exists,
            'PriceLevel': PriceLevel.objects.exists,
        }):
            return

        try:
            api_service = AdministrateAPIService()
            
            # GraphQL query for course template price levels
            query = load_graphql_query('get_course_template_price_levels')
            
            self.stdout.write('Fetching course template price levels...')
            
            has_next_page = True
            offset = 0
            all_price_levels = []

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
                    
                    # Extract price level data from each course template
                    for ct_edge in course_templates:
                        ct_node = ct_edge.get('node', {})
                        ct_external_id = ct_node.get('id')
                        ct_title = ct_node.get('title')
                        
                        public_prices = ct_node.get('publicPrices', {}).get('edges', [])
                        
                        for price_edge in public_prices:
                            price_node = price_edge.get('node', {})
                            price_data = {
                                'course_template_external_id': ct_external_id,
                                'course_template_title': ct_title,
                                'price_external_id': price_node.get('id'),
                                'amount': price_node.get('amount'),
                                'price_level_external_id': price_node.get('priceLevel', {}).get('id'),
                                'price_level_name': price_node.get('priceLevel', {}).get('name')
                            }
                            all_price_levels.append(price_data)
                    
                    # Update pagination info
                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size
                    
                    self.stdout.write(
                        f'Fetched {len(course_templates)} course templates. '
                        f'Total price levels so far: {len(all_price_levels)}'
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

            # After fetching all data, synchronize with the database
            if all_price_levels:
                self._sync_price_levels(all_price_levels, debug)

        except AdministrateAPIError as e:
            self.stdout.write(self.style.ERROR(f'API Error: {str(e)}'))
            if debug:
                logger.exception(e)
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

    def _sync_price_levels(self, api_price_levels, debug=False):
        """Synchronize course template price levels with database"""
        
        # Build lookups for course templates and price levels
        course_templates = {
            ct.external_id: ct for ct in CourseTemplate.objects.all()
        }
        
        price_levels = {
            pl.external_id: pl for pl in PriceLevel.objects.all()
        }
        
        # Get existing price level mappings
        existing_price_levels = {
            ctpl.external_id: ctpl 
            for ctpl in CourseTemplatePriceLevel.objects.select_related(
                'course_template', 'price_level'
            ).all()
        }
        
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deleted_count = 0
        error_count = 0
        skipped_count = 0
        
        for price_data in api_price_levels:
            ct_external_id = price_data.get('course_template_external_id')
            pl_external_id = price_data.get('price_level_external_id')
            price_external_id = price_data.get('price_external_id')
            amount_str = price_data.get('amount')
            
            if not all([ct_external_id, pl_external_id, price_external_id, amount_str]):
                skipped_count += 1
                if debug:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping incomplete price level data: {price_data}'
                        )
                    )
                continue
            
            # Check if we have the course template and price level in our database
            if ct_external_id not in course_templates:
                skipped_count += 1
                if debug:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Course template {ct_external_id} not found in database'
                        )
                    )
                continue
            
            if pl_external_id not in price_levels:
                skipped_count += 1
                if debug:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Price level {pl_external_id} not found in database'
                        )
                    )
                continue
            
            try:
                with transaction.atomic():
                    course_template = course_templates[ct_external_id]
                    price_level = price_levels[pl_external_id]
                    amount = Decimal(amount_str)
                    
                    price_level_data = {
                        'course_template': course_template,
                        'price_level': price_level,
                        'amount': amount,
                        'last_synced': timezone.now()
                    }
                    
                    logger.debug(f"Processing price level: {price_external_id}")
                    if debug:
                        logger.debug(f"Price level data: {price_level_data}")

                    processed_ids.add(price_external_id)

                    if price_external_id in existing_price_levels:
                        price_level_obj = existing_price_levels[price_external_id]
                        has_changed = False

                        # Check if any values have changed
                        if price_level_obj.course_template_id != course_template.id:
                            price_level_obj.course_template = course_template
                            has_changed = True
                            
                        if price_level_obj.price_level_id != price_level.id:
                            price_level_obj.price_level = price_level
                            has_changed = True
                            
                        if price_level_obj.amount != amount:
                            logger.debug(
                                f"Updating amount: {price_level_obj.amount} -> {amount}"
                            )
                            price_level_obj.amount = amount
                            has_changed = True

                        ct_label = (
                            course_template.tutorial_course_template.code
                            if course_template.tutorial_course_template
                            else course_template.external_id
                        )

                        if has_changed:
                            price_level_obj.save()
                            updated_count += 1
                            self.stdout.write(
                                f'Updated Price Level: {ct_label} - '
                                f'{price_level.name}: £{amount}'
                            )
                        else:
                            unchanged_count += 1
                    else:
                        # Create new price level
                        price_level_obj = CourseTemplatePriceLevel.objects.create(
                            external_id=price_external_id,
                            **price_level_data
                        )
                        ct_label = (
                            course_template.tutorial_course_template.code
                            if course_template.tutorial_course_template
                            else course_template.external_id
                        )
                        created_count += 1
                        self.stdout.write(
                            f'Created Price Level: {ct_label} - '
                            f'{price_level.name}: £{amount}'
                        )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"Error processing price level {price_external_id}: {str(e)}"
                    )
                )
                if debug:
                    logger.exception(e)

        # Handle deletions in separate transactions
        for external_id, price_level_obj in existing_price_levels.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        ct = price_level_obj.course_template
                        ct_label = (
                            ct.tutorial_course_template.code
                            if ct.tutorial_course_template
                            else ct.external_id
                        )
                        price_info = (
                            f'{ct_label} - '
                            f'{price_level_obj.price_level.name}'
                        )
                        price_level_obj.delete()
                        deleted_count += 1
                        self.stdout.write(
                            f'Deleted Price Level: {price_info}'
                        )
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error deleting price level {external_id}: {str(e)}"
                        )
                    )
                    if debug:
                        logger.exception(e)

        self.stdout.write(
            self.style.SUCCESS(
                f'Synchronization completed: {created_count} created, '
                f'{updated_count} updated, {unchanged_count} unchanged, '
                f'{deleted_count} deleted, {skipped_count} skipped, '
                f'{error_count} errors'
            )
        )