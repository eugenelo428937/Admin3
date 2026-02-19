import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import Instructor
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import (
    SyncStats, report_discrepancies, prompt_create_unmatched,
)
from tutorials.models import TutorialInstructor

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
            query = load_graphql_query('get_all_instructors')

            self.stdout.write('Fetching instructors...')

            has_next_page = True
            offset = 0
            all_instructors = []

            while has_next_page:
                try:
                    variables = {"first": page_size, "offset": offset}
                    result = api_service.execute_query(query, variables)

                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING('Invalid response format from API')
                        )
                        return

                    page_info = result['data']['contacts']['pageInfo']
                    instructors = result['data']['contacts']['edges']
                    all_instructors.extend(instructors)

                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size

                    self.stdout.write(
                        f'Fetched {len(instructors)} instructors. '
                        f'Total so far: {len(all_instructors)}'
                    )

                    if not instructors:
                        break

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing instructors: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return

            if all_instructors:
                stats = self._sync_instructors(all_instructors, debug, no_prompt)
                self.stdout.write(
                    self.style.SUCCESS(f'Sync completed: {stats.summary_line()}')
                )

        except AdministrateAPIError as e:
            self.stdout.write(self.style.ERROR(f'API Error: {str(e)}'))
            if debug:
                logger.exception(e)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        return (
            isinstance(result, dict) and
            'data' in result and
            'contacts' in result['data'] and
            'edges' in result['data']['contacts'] and
            isinstance(result['data']['contacts']['edges'], list) and
            'pageInfo' in result['data']['contacts']
        )

    def _sync_instructors(self, api_instructors, debug=False, no_prompt=False):
        stats = SyncStats()

        existing_instructors = {
            instr.external_id: instr for instr in Instructor.objects.all()
        }

        # Load tutorial instructors keyed by (lowercase first_name, lowercase last_name)
        tutorial_instructors = {}
        for ti in TutorialInstructor.objects.filter(
            is_active=True
        ).select_related('staff__user'):
            if ti.staff and ti.staff.user:
                key = (
                    ti.staff.user.first_name.lower(),
                    ti.staff.user.last_name.lower(),
                )
                tutorial_instructors[key] = ti

        processed_ids = set()
        unmatched_api = []

        for edge in api_instructors:
            instructor = edge.get('node', {})
            external_id = instructor.get('id')

            if not external_id:
                continue

            try:
                with transaction.atomic():
                    first_name = instructor.get('firstName', '')
                    last_name = instructor.get('lastName', '')

                    # Match by (first_name, last_name) case-insensitive
                    name_key = (first_name.lower(), last_name.lower())
                    tutorial_instr = tutorial_instructors.get(name_key)

                    if not tutorial_instr:
                        unmatched_api.append(instructor)

                    instructor_data = {
                        'legacy_id': instructor.get('legacyId'),
                        'is_active': True,
                        'last_synced': timezone.now(),
                        'tutorial_instructor': tutorial_instr,
                    }

                    if debug:
                        logger.debug(
                            f"Processing instructor: {external_id} "
                            f"({first_name} {last_name}, "
                            f"matched: {tutorial_instr is not None})"
                        )

                    processed_ids.add(external_id)

                    if external_id in existing_instructors:
                        instructor_obj = existing_instructors[external_id]
                        has_changed = False

                        for key, value in instructor_data.items():
                            if key == 'tutorial_instructor':
                                current_id = instructor_obj.tutorial_instructor_id
                                new_id = value.pk if value else None
                                if current_id != new_id:
                                    setattr(instructor_obj, key, value)
                                    has_changed = True
                            elif key == 'last_synced':
                                setattr(instructor_obj, key, value)
                                has_changed = True
                            else:
                                current_value = getattr(instructor_obj, key)
                                if current_value != value:
                                    setattr(instructor_obj, key, value)
                                    has_changed = True

                        if has_changed:
                            instructor_obj.save()
                            stats.updated += 1
                            self.stdout.write(f'Updated instructor: {external_id}')
                        else:
                            stats.unchanged += 1
                    else:
                        Instructor.objects.create(
                            external_id=external_id,
                            **instructor_data
                        )
                        stats.created += 1
                        self.stdout.write(f'Created instructor: {external_id}')

            except Exception as e:
                stats.errors += 1
                self.stdout.write(
                    self.style.ERROR(f"Error processing instructor {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)

        # Handle deletions
        for external_id, instructor_obj in existing_instructors.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        instructor_obj.delete()
                        stats.deleted += 1
                        self.stdout.write(f'Deleted instructor: {external_id}')
                except Exception as e:
                    stats.errors += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error deleting instructor {external_id}: {str(e)}")
                    )
                    if debug:
                        logger.exception(e)

        # Collect unmatched tutorial instructors
        matched_tutorial_ids = {
            i.tutorial_instructor_id
            for i in Instructor.objects.all()
            if i.tutorial_instructor_id
        }
        unmatched_tutorial = list(
            TutorialInstructor.objects.filter(
                is_active=True
            ).exclude(pk__in=matched_tutorial_ids)
        )

        stats.unmatched_tutorial = unmatched_tutorial
        stats.unmatched_api = unmatched_api

        report_discrepancies(
            self.stdout, self.style,
            unmatched_tutorial, unmatched_api, 'instructor'
        )
        prompt_create_unmatched(
            self.stdout, self.style,
            unmatched_tutorial, 'instructor', no_prompt
        )

        return stats
