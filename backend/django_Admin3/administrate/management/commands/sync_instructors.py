import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import Instructor
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize instructors from Administrate API to local database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug logging'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        if debug:
            logger.setLevel(logging.DEBUG)

        try:
            api_service = AdministrateAPIService()
            
            # Base GraphQL query with pagination
            query_template = load_graphql_query('get_all_insturctors')

            self.stdout.write('Fetching instructors...')
            
            try:
                all_instructors = []
                has_next_page = True
                after_cursor = None
                page_count = 0

                # Fetch all pages
                while has_next_page:
                    page_count += 1
                    self.stdout.write(f'Fetching page {page_count}...')

                    # Prepare variables for pagination
                    variables = {"after": after_cursor} if after_cursor else {}
                    
                    # Execute query with pagination
                    result = api_service.execute_query(query_template, variables)
                    
                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING(f'Invalid response format from API on page {page_count}')
                        )
                        break

                    # Extract page info and edges
                    page_info = result['data']['contacts']['pageInfo']
                    current_edges = result['data']['contacts']['edges']
                    
                    # Filter instructors
                    instructor_edges = [
                        edge for edge in current_edges 
                        if edge.get('node', {}).get('isInstructor', False)
                    ]
                    
                    all_instructors.extend(instructor_edges)
                    
                    # Update pagination info
                    has_next_page = page_info['hasNextPage']
                    after_cursor = page_info['endCursor'] if has_next_page else None
                    
                    self.stdout.write(f'Retrieved {len(instructor_edges)} instructors from page {page_count}')

                if all_instructors:
                    self.stdout.write(f'Syncing {len(all_instructors)} total instructors...')
                    self._sync_instructors(all_instructors, debug)
                else:
                    self.stdout.write(self.style.WARNING('No instructors found to sync'))
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing instructors: {str(e)}')
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
            'contacts' in result['data'] and
            'edges' in result['data']['contacts'] and
            'pageInfo' in result['data']['contacts'] and
            isinstance(result['data']['contacts']['edges'], list)
        )

    def _sync_instructors(self, api_instructors, debug=False):
        """Synchronize instructors with database"""
        existing_instructors = {
            inst.external_id: inst for inst in Instructor.objects.all()
        }
        
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deleted_count = 0
        error_count = 0
        
        for edge in api_instructors:
            instructor = edge.get('node', {})
            external_id = instructor.get('id')
            
            if not external_id:
                continue
            
            try:
                with transaction.atomic():
                    instructor_data = {
                        'legacy_id': instructor.get('legacyId'),
                        'first_name': instructor.get('firstName', ''),
                        'last_name': instructor.get('lastName', ''),
                        'is_active': True
                    }
                    
                    logger.debug(f"Processing instructor: {external_id}")
                    if debug:
                        logger.debug(f"Instructor
