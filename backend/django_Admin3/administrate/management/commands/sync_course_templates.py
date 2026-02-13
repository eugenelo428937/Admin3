import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from administrate.models import CourseTemplate, CustomField
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import (
    SyncStats, match_records, report_discrepancies,
    prompt_create_unmatched, validate_dependencies,
)
from tutorials.models import TutorialCourseTemplate

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

        # Validate dependencies
        if not validate_dependencies(self.stdout, self.style, {
            'CustomField (Event)': lambda: CustomField.objects.filter(
                entity_type='Event'
            ).exists(),
        }):
            return

        try:
            api_service = AdministrateAPIService()
            query = load_graphql_query('get_all_course_templates')

            self.stdout.write('Fetching course templates...')

            has_next_page = True
            offset = 0
            all_templates = []

            while has_next_page:
                try:
                    variables = {"first": page_size, "offset": offset}
                    result = api_service.execute_query(query, variables)

                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING('Invalid response format from API')
                        )
                        return

                    page_info = result['data']['courseTemplates']['pageInfo']
                    course_templates = result['data']['courseTemplates']['edges']
                    all_templates.extend(course_templates)

                    has_next_page = page_info.get('hasNextPage', False)
                    offset += page_size

                    self.stdout.write(
                        f'Fetched {len(course_templates)} course templates. '
                        f'Total so far: {len(all_templates)}'
                    )

                    if not course_templates:
                        break

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing course templates: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    return

            if all_templates:
                self.stdout.write(f'Syncing {len(all_templates)} course templates...')
                stats = self._sync_course_templates(all_templates, debug, no_prompt)

                self.stdout.write(
                    self.style.SUCCESS(f'Sync completed: {stats.summary_line()}')
                )
            else:
                self.stdout.write(self.style.WARNING('No course templates found to sync'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        return (
            isinstance(result, dict) and
            'data' in result and
            'courseTemplates' in result['data'] and
            'edges' in result['data']['courseTemplates'] and
            isinstance(result['data']['courseTemplates']['edges'], list) and
            'pageInfo' in result['data']['courseTemplates']
        )

    def _sync_course_templates(self, api_course_templates, debug=False, no_prompt=False):
        stats = SyncStats()

        existing_templates = {
            ct.external_id: ct for ct in CourseTemplate.objects.all()
        }

        # Load tutorial records keyed by lowercase code for matching
        tutorial_templates = {
            t.code.lower(): t
            for t in TutorialCourseTemplate.objects.filter(is_active=True)
        }

        # Match API records against tutorial records
        matched, unmatched_tutorial, unmatched_api = match_records(
            tutorial_templates, api_course_templates, 'code'
        )

        processed_ids = set()

        for edge in api_course_templates:
            template = edge.get('node', {})
            external_id = template.get('id')

            if not external_id:
                continue

            try:
                with transaction.atomic():
                    code = template.get('code', '')

                    # Resolve tutorial FK via match
                    tutorial_ct = None
                    if code and code.lower() in tutorial_templates:
                        tutorial_ct = tutorial_templates[code.lower()]

                    template_data = {
                        'event_learning_mode': template.get('eventLearningMode', ''),
                        'custom_fields': {
                            cf.get('definition', {}).get('key', ''): cf.get('value')
                            for cf in template.get('customFieldValues', [])
                        },
                        'tutorial_course_template': tutorial_ct,
                    }

                    if debug:
                        logger.debug(f"Processing template: {external_id} (code: {code})")

                    processed_ids.add(external_id)

                    if external_id in existing_templates:
                        course_template = existing_templates[external_id]
                        has_changed = False

                        for key, value in template_data.items():
                            if key == 'tutorial_course_template':
                                current_id = course_template.tutorial_course_template_id
                                new_id = value.pk if value else None
                                if current_id != new_id:
                                    setattr(course_template, key, value)
                                    has_changed = True
                            else:
                                current_value = getattr(course_template, key)
                                if current_value != value:
                                    setattr(course_template, key, value)
                                    has_changed = True

                        if has_changed:
                            course_template.save()
                            stats.updated += 1
                            self.stdout.write(f'Updated course template: {external_id}')
                        else:
                            stats.unchanged += 1
                    else:
                        CourseTemplate.objects.create(
                            external_id=external_id,
                            **template_data
                        )
                        stats.created += 1
                        self.stdout.write(f'Created course template: {external_id}')

            except Exception as e:
                stats.errors += 1
                self.stdout.write(
                    self.style.ERROR(f"Error processing template {external_id}: {str(e)}")
                )
                if debug:
                    logger.exception(e)

        # Handle deletions
        for external_id, course_template in existing_templates.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        course_template.delete()
                        stats.deleted += 1
                        self.stdout.write(f'Deleted course template: {external_id}')
                except Exception as e:
                    stats.errors += 1
                    self.stdout.write(
                        self.style.ERROR(f"Error deleting template {external_id}: {str(e)}")
                    )
                    if debug:
                        logger.exception(e)

        # Report discrepancies
        stats.unmatched_tutorial = unmatched_tutorial
        stats.unmatched_api = unmatched_api

        report_discrepancies(
            self.stdout, self.style,
            unmatched_tutorial, unmatched_api, 'course template'
        )
        prompt_create_unmatched(
            self.stdout, self.style,
            unmatched_tutorial, 'course template', no_prompt
        )

        return stats
