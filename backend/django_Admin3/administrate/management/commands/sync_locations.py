import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from administrate.models import Location
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import (
    SyncStats, match_records, report_discrepancies,
    prompt_create_unmatched,
)
from tutorials.models import TutorialLocation

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
        parser.add_argument(
            '--no-prompt',
            action='store_true',
            help='Skip interactive prompts; unmatched records are logged only'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        page_size = options['page_size']
        no_prompt = options['no_prompt']

        if debug:
            logger.setLevel(logging.DEBUG)

        try:
            api_service = AdministrateAPIService()
            query = load_graphql_query('get_all_locations')

            self.stdout.write('Fetching locations...')

            has_next_page = True
            offset = 0
            all_locations = []

            while has_next_page:
                try:
                    variables = {"first": page_size, "offset": offset}
                    result = api_service.execute_query(query, variables)

                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING('Invalid response format from API')
                        )
                        return

                    page_info = result['data']['locations']['pageInfo']
                    locations = result['data']['locations']['edges']
                    all_locations.extend(locations)

                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size

                    self.stdout.write(
                        f'Fetched {len(locations)} locations. '
                        f'Total so far: {len(all_locations)}'
                    )

                    if not locations:
                        break

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing locations: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return

            if all_locations:
                self.stdout.write(f'Syncing {len(all_locations)} locations...')
                stats = self._sync_locations(all_locations, debug, no_prompt)
                self.stdout.write(
                    self.style.SUCCESS(f'Sync completed: {stats.summary_line()}')
                )
            else:
                self.stdout.write(self.style.WARNING('No locations found to sync'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        return (
            isinstance(result, dict) and
            'data' in result and
            'locations' in result['data'] and
            'edges' in result['data']['locations'] and
            isinstance(result['data']['locations']['edges'], list) and
            'pageInfo' in result['data']['locations']
        )

    def _sync_locations(self, api_locations, debug=False, no_prompt=False):
        stats = SyncStats()

        existing_locations = {
            loc.external_id: loc for loc in Location.objects.all()
        }

        # Load tutorial locations keyed by lowercase name
        tutorial_locations = {
            l.name.lower(): l
            for l in TutorialLocation.objects.filter(is_active=True)
        }

        # Match API records against tutorial records
        matched, unmatched_tutorial, unmatched_api = match_records(
            tutorial_locations, api_locations, 'name'
        )

        processed_ids = set()

        for edge in api_locations:
            location = edge.get('node', {})
            external_id = location.get('id')

            if not external_id:
                continue

            try:
                with transaction.atomic():
                    name = location.get('name', '')

                    # Resolve tutorial FK via match
                    tutorial_loc = None
                    if name and name.lower() in tutorial_locations:
                        tutorial_loc = tutorial_locations[name.lower()]

                    location_data = {
                        'legacy_id': location.get('legacyId'),
                        'tutorial_location': tutorial_loc,
                    }

                    if debug:
                        logger.debug(f"Processing location: {external_id} (name: {name})")

                    processed_ids.add(external_id)

                    if external_id in existing_locations:
                        location_obj = existing_locations[external_id]
                        has_changed = False

                        for key, value in location_data.items():
                            if key == 'tutorial_location':
                                current_id = location_obj.tutorial_location_id
                                new_id = value.pk if value else None
                                if current_id != new_id:
                                    setattr(location_obj, key, value)
                                    has_changed = True
                            else:
                                current_value = getattr(location_obj, key)
                                if current_value != value:
                                    setattr(location_obj, key, value)
                                    has_changed = True

                        if has_changed:
                            location_obj.save()
                            stats.updated += 1
                            self.stdout.write(f'Updated location: {external_id}')
                        else:
                            stats.unchanged += 1
                    else:
                        Location.objects.create(
                            external_id=external_id,
                            **location_data
                        )
                        stats.created += 1
                        self.stdout.write(f'Created location: {external_id}')

            except Exception as e:
                stats.errors += 1
                self.stdout.write(
                    self.style.ERROR(f"Error processing location {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)

        # Handle deletions
        for external_id, location_obj in existing_locations.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        location_obj.delete()
                        stats.deleted += 1
                        self.stdout.write(f'Deleted location: {external_id}')
                except Exception as e:
                    stats.errors += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error deleting location {external_id}: {str(e)}")
                    )
                    if debug:
                        logger.exception(e)

        # Report discrepancies
        stats.unmatched_tutorial = unmatched_tutorial
        stats.unmatched_api = unmatched_api

        report_discrepancies(
            self.stdout, self.style,
            unmatched_tutorial, unmatched_api, 'location'
        )
        prompt_create_unmatched(
            self.stdout, self.style,
            unmatched_tutorial, 'location', no_prompt
        )

        return stats
