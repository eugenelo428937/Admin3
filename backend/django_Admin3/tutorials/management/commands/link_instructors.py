"""
Link ADM instructors to the acted tutorial system.

Parses the SQL data dump of adm.instructors (which contained first_name/last_name
before US6 column removal) and creates the full chain:

    auth_user → user_profile → staff → tutorial_instructor ← adm.instructors

Usage:
    python manage.py link_instructors path/to/dump.sql
    python manage.py link_instructors path/to/dump.sql --dry-run
    python manage.py link_instructors path/to/dump.sql --force   # overwrite existing links
"""

import re

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from administrate.models import Instructor
from tutorials.models import Staff, TutorialInstructor
from userprofile.models import UserProfile


class Command(BaseCommand):
    help = 'Create auth users, profiles, staff, and tutorial instructors from ADM instructor SQL dump'

    def add_arguments(self, parser):
        parser.add_argument(
            'sql_file',
            help='Path to the adm.instructors SQL dump file',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without writing to the database',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing tutorial_instructor links',
        )

    def handle(self, *args, **options):
        sql_file = options['sql_file']
        dry_run = options['dry_run']
        force = options['force']

        rows = self._parse_sql_dump(sql_file)
        if not rows:
            self.stdout.write(self.style.WARNING('No instructor rows found in dump.'))
            return

        self.stdout.write(f'Parsed {len(rows)} instructor rows from dump.')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be written.\n'))

        created = 0
        skipped = 0
        errors = 0

        for row in rows:
            external_id = row['external_id']
            first_name = row['first_name']
            last_name = row['last_name']
            is_active = row['is_active']

            email = self._build_email(first_name, last_name)
            username = email.split('@')[0]

            if dry_run:
                self.stdout.write(
                    f'  Would create: {first_name} {last_name} '
                    f'<{email}> → external_id={external_id}'
                )
                created += 1
                continue

            try:
                adm_instructor = Instructor.objects.filter(
                    external_id=external_id
                ).first()
                if not adm_instructor:
                    self.stdout.write(self.style.WARNING(
                        f'  SKIP: No adm.instructor with external_id={external_id} '
                        f'({first_name} {last_name})'
                    ))
                    skipped += 1
                    continue

                if adm_instructor.tutorial_instructor_id is not None and not force:
                    self.stdout.write(
                        f'  SKIP: {first_name} {last_name} already linked '
                        f'(tutorial_instructor_id={adm_instructor.tutorial_instructor_id}). '
                        f'Use --force to overwrite.'
                    )
                    skipped += 1
                    continue

                with transaction.atomic():
                    user, user_created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            'first_name': first_name,
                            'last_name': last_name,
                            'email': email,
                            'is_staff': True,
                            'is_active': is_active,
                        },
                    )
                    if user_created:
                        user.set_unusable_password()
                        user.save(update_fields=['password'])

                    UserProfile.objects.get_or_create(user=user)

                    staff, _ = Staff.objects.get_or_create(user=user)

                    tutorial_instructor, _ = TutorialInstructor.objects.get_or_create(
                        staff=staff,
                        defaults={'is_active': is_active},
                    )

                    adm_instructor.tutorial_instructor = tutorial_instructor
                    adm_instructor.save(update_fields=['tutorial_instructor'])

                action = 'Created' if user_created else 'Linked existing'
                self.stdout.write(self.style.SUCCESS(
                    f'  {action}: {first_name} {last_name} <{email}> '
                    f'→ tutorial_instructor_id={tutorial_instructor.id}'
                ))
                created += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'  ERROR: {first_name} {last_name} ({external_id}): {e}'
                ))
                errors += 1

        self.stdout.write(
            f'\nDone: {created} created/linked, {skipped} skipped, {errors} errors'
        )

    def _parse_sql_dump(self, path):
        """Parse COPY … FROM stdin format into list of dicts."""
        rows = []
        in_data = False

        with open(path, 'r') as f:
            for line in f:
                line = line.rstrip('\n')

                if line.startswith('COPY '):
                    in_data = True
                    continue

                if line == '\\.' or not line:
                    in_data = False
                    continue

                if not in_data:
                    continue

                parts = line.split('\t')
                if len(parts) < 7:
                    continue

                rows.append({
                    'id': int(parts[0]),
                    'external_id': parts[1],
                    'first_name': parts[2],
                    'last_name': parts[3],
                    'email': parts[4] if parts[4] else '',
                    'legacy_id': parts[5],
                    'is_active': parts[6] == 't',
                })

        return rows

    @staticmethod
    def _build_email(first_name, last_name):
        """Build email: {firstname}{lastname}@bpp.com, lowercase, no spaces."""
        clean = re.sub(r'\s+', '', f'{first_name}{last_name}')
        return f'{clean.lower()}@bpp.com'
