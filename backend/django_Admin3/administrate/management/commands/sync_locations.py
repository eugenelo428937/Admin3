import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import Location
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize locations from Administrate API to local database'

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
            
            # GraphQL query for locations
            query = load_graphql_query('get_all_locations')
            
            self.stdout.write('Fetching locations...')
            
            has_next_page = True
            cursor = None
            all_locations = []
            while has_next_page:
                try:
                    # Add pagination variables to the query
                    variables = {
                        "first": page_size,
                        "after": cursor
                    }

                    result = api_service.execute_query(query, variables)
                    
                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING('Invalid response format from API')
                        )
                        return
                    
                    page_info = result['data']['locations']['pageInfo']
                    locations = result['data']['locations']['edges']

                    all_locations.extend(locations)

                    # Update pagination info
                    has_next_page = page_info.get('hasNextPage', False)
                    cursor = page_info.get('endCursor')

                    self.stdout.write(
                        f'Fetched {len(locations)} locations. '
                        f'Total so far: {len(all_locations)}'
                    )(self.style.WARNING('No locations found to sync'))
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing locations: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        """Validate the API response format"""
        return (
            isinstance(result, dict) and
            'data' in result and
            'locations' in result['data'] and
            'edges' in result['data']['locations'] and
            isinstance(result['data']['locations']['edges'], list) and
            'pageInfo' in result['data']['locations']
        )

    def _sync_locations(self, api_locations, debug=False):
        """Synchronize locations with database"""
        existing_locations = {
            loc.external_id: loc for loc in Location.objects.all()
        }
        
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deleted_count = 0
        error_count = 0
        
        for edge in api_locations:
            location = edge.get('node', {})
            external_id = location.get('id')
            
            if not external_id:
                continue
            
            try:
                with transaction.atomic():
                    location_data = {
                        'name': location.get('name', ''),
                        'code': location.get('code', ''),
                        'legacy_id': location.get('legacyId'),
                        'active': True
                    }
                    
                    logger.debug(f"Processing location: {external_id}")
                    if debug:
                        logger.debug(f"Location data: {location_data}")
                    
                    processed_ids.add(external_id)
                    
                    if external_id in existing_locations:
                        location_obj = existing_locations[external_id]
                        has_changed = False
                        
                        for key, value in location_data.items():
                            current_value = getattr(location_obj, key)
                            if current_value != value:
                                logger.debug(f"Updating {key}: {current_value} -> {value}")
                                setattr(location_obj, key, value)
                                has_changed = True
                        
                        if has_changed:
                            location_obj.save()
                            updated_count += 1
                            self.stdout.write(f'Updated location: {location_obj.name}')
                        else:
                            unchanged_count += 1
                    else:
                        location_obj = Location.objects.create(
                            external_id=external_id,
                            **location_data
                        )
                        created_count += 1
                        self.stdout.write(f'Created location: {location_obj.name}')
            
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f"Error processing location {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)
        
        # Handle deletions in separate transactions
        for external_id, location_obj in existing_locations.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        location_name = location_obj.name
                        location_obj.delete()
                        deleted_count += 1
                        self.stdout.write(f'Deleted location: {location_name}')
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error deleting location {external_id}: {str(e)}")
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
