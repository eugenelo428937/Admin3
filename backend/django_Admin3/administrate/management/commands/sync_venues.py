import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import Location
from administrate.models.venues import Venue
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize venues from Administrate API to local database'

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
            
            # GraphQL query for venues
            query = load_graphql_query('get_all_venues')
            
            self.stdout.write('Fetching venues...')
            
            has_next_page = True
            offset = 0
            all_venues = []

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
                    
                    page_info = result['data']['venues']['pageInfo']
                    venues = result['data']['venues']['edges']
                    all_venues.extend(venues)
                    
                    # Update pagination info
                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size
                    
                    self.stdout.write(
                        f'Fetched {len(venues)} venues. '
                        f'Total so far: {len(all_venues)}'
                    )
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing venues: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return
            
            if not all_venues:
                self.stdout.write(self.style.WARNING('No venues found to sync'))
            else:
                self._sync_venues(all_venues, debug)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        """Validate the API response format"""
        return (
            isinstance(result, dict) and
            'data' in result and
            'venues' in result['data'] and
            'edges' in result['data']['venues'] and
            isinstance(result['data']['venues']['edges'], list) and
            'pageInfo' in result['data']['venues']
        )


    def _sync_venues(self, api_venues, debug=False):
        """Synchronize venues with database"""
        existing_venues = {
            venue.external_id: venue for venue in Venue.objects.all()
        }

        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deleted_count = 0
        error_count = 0

        for edge in api_venues:
            venue = edge.get('node', {})
            external_id = venue.get('id')

            if not external_id:
                continue

            try:
                with transaction.atomic():
                    # Extract location ID from the nested object
                    location_id = None
                    if venue.get('location') and venue['location'].get('id'):
                        location_id = venue['location']['id']

                    venue_data = {
                        'name': venue.get('name', ''),
                        'description': venue.get('description', ''),
                        'location_id': location_id
                    }

                    processed_ids.add(external_id)

                    if external_id in existing_venues:
                        venue_obj = existing_venues[external_id]
                        has_changed = False

                        for key, value in venue_data.items():
                            current_value = getattr(venue_obj, key)
                            if current_value != value:
                                setattr(venue_obj, key, value)
                                has_changed = True

                        if has_changed:
                            venue_obj.save()
                            updated_count += 1
                            self.stdout.write(f'Updated venue: {venue_obj.name}')
                        else:
                            unchanged_count += 1
                    else:
                        venue_obj = Venue.objects.create(
                            external_id=external_id,
                            **venue_data
                        )
                        created_count += 1
                        self.stdout.write(f'Created venue: {venue_obj.name}')

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"Error processing venue {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)

        # Handle deletions in separate transactions
        for external_id, venue_obj in existing_venues.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        venue_name = venue_obj.name
                        venue_obj.delete()
                        deleted_count += 1
                        self.stdout.write(f'Deleted venue: {venue_name}')
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error deleting venue {external_id}: {str(e)}")
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
