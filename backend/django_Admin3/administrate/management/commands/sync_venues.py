import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from administrate.models import Location
from administrate.models.venues import Venue
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import (
    SyncStats, match_records, report_discrepancies,
    prompt_create_unmatched, validate_dependencies,
)
from tutorials.models import TutorialVenue

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

        # Validate dependencies: locations must be synced first
        if not validate_dependencies(self.stdout, self.style, {
            'Location': Location.objects.exists,
        }):
            return

        try:
            api_service = AdministrateAPIService()
            query = load_graphql_query('get_all_venues')

            self.stdout.write('Fetching venues...')

            has_next_page = True
            offset = 0
            all_venues = []

            while has_next_page:
                try:
                    variables = {"first": page_size, "offset": offset}
                    result = api_service.execute_query(query, variables)

                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING('Invalid response format from API')
                        )
                        return

                    page_info = result['data']['venues']['pageInfo']
                    venues = result['data']['venues']['edges']
                    all_venues.extend(venues)

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

            if all_venues:
                self.stdout.write(f'Syncing {len(all_venues)} venues...')
                stats = self._sync_venues(all_venues, debug, no_prompt)
                self.stdout.write(
                    self.style.SUCCESS(f'Sync completed: {stats.summary_line()}')
                )
            else:
                self.stdout.write(self.style.WARNING('No venues found to sync'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        return (
            isinstance(result, dict) and
            'data' in result and
            'venues' in result['data'] and
            'edges' in result['data']['venues'] and
            isinstance(result['data']['venues']['edges'], list) and
            'pageInfo' in result['data']['venues']
        )

    def _resolve_tutorial_venue(self, api_venue, adm_locations_by_ext_id):
        """
        Resolve tutorial venue through the location bridge chain:
        API location.id → adm.locations.external_id → adm.locations.tutorial_location → TutorialVenue.location
        """
        venue_name = api_venue.get('name', '')
        api_location_id = None
        if api_venue.get('location') and api_venue['location'].get('id'):
            api_location_id = api_venue['location']['id']

        if not venue_name or not api_location_id:
            return None

        # Find adm location with matching external_id
        adm_location = adm_locations_by_ext_id.get(api_location_id)
        if not adm_location or not adm_location.tutorial_location_id:
            return None

        # Find tutorial venue by name + tutorial location
        try:
            return TutorialVenue.objects.get(
                name__iexact=venue_name,
                location_id=adm_location.tutorial_location_id,
            )
        except (TutorialVenue.DoesNotExist, TutorialVenue.MultipleObjectsReturned):
            return None

    def _sync_venues(self, api_venues, debug=False, no_prompt=False):
        stats = SyncStats()

        existing_venues = {
            venue.external_id: venue for venue in Venue.objects.all()
        }

        # Build adm location lookup for venue resolution chain
        adm_locations_by_ext_id = {
            loc.external_id: loc
            for loc in Location.objects.select_related('tutorial_location').all()
        }

        processed_ids = set()
        unmatched_tutorial_venues = []
        unmatched_api_venues = []

        for edge in api_venues:
            venue = edge.get('node', {})
            external_id = venue.get('id')

            if not external_id:
                continue

            try:
                with transaction.atomic():
                    location_id = None
                    if venue.get('location') and venue['location'].get('id'):
                        location_id = venue['location']['id']

                    # Resolve tutorial venue through bridge chain
                    tutorial_venue = self._resolve_tutorial_venue(venue, adm_locations_by_ext_id)

                    if not tutorial_venue and venue.get('name'):
                        unmatched_api_venues.append(venue)

                    venue_data = {
                        'location_id': location_id,
                        'tutorial_venue': tutorial_venue,
                    }

                    if debug:
                        logger.debug(
                            f"Processing venue: {external_id} "
                            f"(matched tutorial: {tutorial_venue is not None})"
                        )

                    processed_ids.add(external_id)

                    if external_id in existing_venues:
                        venue_obj = existing_venues[external_id]
                        has_changed = False

                        for key, value in venue_data.items():
                            if key == 'tutorial_venue':
                                current_id = venue_obj.tutorial_venue_id
                                new_id = value.pk if value else None
                                if current_id != new_id:
                                    setattr(venue_obj, key, value)
                                    has_changed = True
                            else:
                                current_value = getattr(venue_obj, key)
                                if current_value != value:
                                    setattr(venue_obj, key, value)
                                    has_changed = True

                        if has_changed:
                            venue_obj.save()
                            stats.updated += 1
                            self.stdout.write(f'Updated venue: {external_id}')
                        else:
                            stats.unchanged += 1
                    else:
                        Venue.objects.create(
                            external_id=external_id,
                            **venue_data
                        )
                        stats.created += 1
                        self.stdout.write(f'Created venue: {external_id}')

            except Exception as e:
                stats.errors += 1
                self.stdout.write(
                    self.style.ERROR(f"Error processing venue {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)

        # Handle deletions
        for external_id, venue_obj in existing_venues.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        venue_obj.delete()
                        stats.deleted += 1
                        self.stdout.write(f'Deleted venue: {external_id}')
                except Exception as e:
                    stats.errors += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error deleting venue {external_id}: {str(e)}")
                    )
                    if debug:
                        logger.exception(e)

        # Collect unmatched tutorial venues
        matched_tutorial_venue_ids = {
            v.tutorial_venue_id for v in Venue.objects.all() if v.tutorial_venue_id
        }
        unmatched_tutorial_venues = list(
            TutorialVenue.objects.exclude(pk__in=matched_tutorial_venue_ids)
        )

        stats.unmatched_tutorial = unmatched_tutorial_venues
        stats.unmatched_api = unmatched_api_venues

        report_discrepancies(
            self.stdout, self.style,
            unmatched_tutorial_venues, unmatched_api_venues, 'venue'
        )
        prompt_create_unmatched(
            self.stdout, self.style,
            unmatched_tutorial_venues, 'venue', no_prompt
        )

        return stats
