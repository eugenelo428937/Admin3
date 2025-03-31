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
            
            # GraphQL query for instructors
            query = load_graphql_query('get_all_instructors')
            
            self.stdout.write('Fetching instructors...')
            
            has_next_page = True
            offset = 0
            all_instructors = []

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
                    
                    page_info = result['data']['contacts']['pageInfo']
                    instructors = result['data']['contacts']['edges']
                    
                    all_instructors.extend(instructors)
                    
                    # Update pagination info
                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size
                    
                    self.stdout.write(
                        f'Fetched {len(instructors)} instructors. '
                        f'Total so far: {len(all_instructors)}'
                    )
                    
                    if not instructors:
                        self.stdout.write(self.style.WARNING('No instructors found to sync'))
                        break
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing instructors: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return

            # After fetching all instructors, synchronize them with the database
            if all_instructors:
                self._sync_instructors(all_instructors, debug)

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
            'contacts' in result['data'] and
            'edges' in result['data']['contacts'] and
            isinstance(result['data']['contacts']['edges'], list) and
            'pageInfo' in result['data']['contacts']
        )

    def _sync_instructors(self, api_instructors, debug=False):
        """Synchronize instructors with database"""
        existing_instructors = {
            instr.external_id: instr for instr in Instructor.objects.all()
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
                        'first_name': instructor.get('firstName', ''),
                        'last_name': instructor.get('lastName', ''),
                        'email': instructor.get('email', ''),
                        'legacy_id': instructor.get('legacyId'),
                        'is_active': True,
                        'last_synced': timezone.now()
                    }
                    
                    logger.debug(f"Processing instructor: {external_id}")
                    if debug:
                        logger.debug(f"instructor data: {external_id}")

                    processed_ids.add(external_id)

                    if external_id in existing_instructors:
                        instructor_obj = existing_instructors[external_id]
                        has_changed = False

                        for key, value in instructor_data.items():
                            current_value = getattr(instructor_obj, key)
                            if current_value != value:
                                logger.debug(
                                    f"Updating {key}: {current_value} -> {value}")
                                setattr(instructor_obj, key, value)
                                has_changed = True

                        if has_changed:
                            instructor_obj.save()
                            updated_count += 1
                            self.stdout.write(
                                f'Updated Instructor: {instructor_obj.name}')
                        else:
                            unchanged_count += 1
                    else:
                        instructor_obj = Instructor.objects.create(
                            external_id=external_id,
                            **instructor_data
                        )
                        created_count += 1
                        self.stdout.write(
                            f'Created Instructor: {instructor_obj.name}')

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"Error processing Instructor {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)

        # Handle deletions in separate transactions
        for external_id, instructor_obj in existing_instructors.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        instuctor_name = instructor_obj.name
                        instructor_obj.delete()
                        deleted_count += 1
                        self.stdout.write(
                            f'Deleted Instructor: {instuctor_name}')
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error deleting Instructor {external_id}: {str(e)}")
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
