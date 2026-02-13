"""
One-off management command to populate acted.tutorial_course_templates
from Administrate API course templates.

Usage:
    python manage.py populate_tutorial_course_templates --debug
    python manage.py populate_tutorial_course_templates --dry-run --debug
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import load_graphql_query
from tutorials.models import TutorialCourseTemplate

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'One-off: populate acted.tutorial_course_templates from '
        'Administrate API course templates'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--debug', action='store_true',
            help='Enable debug logging',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Validate and report only — no records created or updated',
        )
        parser.add_argument(
            '--page-size', type=int, default=100,
            help='Number of records per API page (default 100)',
        )

    def handle(self, *args, **options):
        debug = options['debug']
        dry_run = options['dry_run']
        page_size = options['page_size']

        if debug:
            logger.setLevel(logging.DEBUG)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be made'))

        # ── Fetch all course templates from Administrate API ──
        api_service = AdministrateAPIService()
        query = load_graphql_query('get_all_course_templates')

        self.stdout.write('Fetching course templates from Administrate API...')

        all_templates = []
        offset = 0
        has_next_page = True

        while has_next_page:
            variables = {'first': page_size, 'offset': offset}
            result = api_service.execute_query(query, variables)

            ct_data = result.get('data', {}).get('courseTemplates', {})
            edges = ct_data.get('edges', [])
            page_info = ct_data.get('pageInfo', {})

            if not edges:
                break

            all_templates.extend(edges)
            has_next_page = page_info.get('hasNextPage', False)
            offset += page_size

            self.stdout.write(
                f'  Fetched {len(edges)} records (total so far: {len(all_templates)})'
            )

        if not all_templates:
            self.stdout.write(self.style.WARNING('No course templates returned by API'))
            return

        self.stdout.write(f'Total API course templates: {len(all_templates)}')

        # ── Upsert into acted.tutorial_course_templates ──
        created = 0
        updated = 0
        unchanged = 0
        skipped = 0

        for edge in all_templates:
            node = edge.get('node', {})
            code = (node.get('code') or '').strip()
            title = (node.get('title') or '').strip()

            if not code:
                skipped += 1
                if debug:
                    logger.debug(f"Skipping template with no code: id={node.get('id')}")
                continue

            if dry_run:
                existing = TutorialCourseTemplate.objects.filter(code=code).first()
                if existing:
                    if existing.title != title:
                        updated += 1
                        self.stdout.write(f'  [DRY] Would update: {code} — title: "{existing.title}" → "{title}"')
                    else:
                        unchanged += 1
                else:
                    created += 1
                    self.stdout.write(f'  [DRY] Would create: {code} — "{title}"')
                continue

            try:
                with transaction.atomic():
                    obj, was_created = TutorialCourseTemplate.objects.update_or_create(
                        code=code,
                        defaults={
                            'title': title,
                            'is_active': True,
                        },
                    )
                    if was_created:
                        created += 1
                        self.stdout.write(f'  Created: {code} — "{title}"')
                    else:
                        if obj.title != title:
                            updated += 1
                            self.stdout.write(f'  Updated: {code} — "{title}"')
                        else:
                            unchanged += 1
                            if debug:
                                logger.debug(f'  Unchanged: {code}')
            except Exception as e:
                skipped += 1
                self.stdout.write(
                    self.style.ERROR(f'  Error on {code}: {e}')
                )
                if debug:
                    logger.exception(e)

        # ── Summary ──
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Done — created: {created}, updated: {updated}, '
            f'unchanged: {unchanged}, skipped: {skipped}'
        ))
