"""Backfill ancestor ``object`` container rows for every existing EmailVariable.

Strict mode: every non-leaf path segment must exist as an explicit row so the
variable picker tree can render container nodes without synthesising them at
read time. This migration is a no-op on re-run.

Depends on the current head migration (``0031_merge_20260407_1012``). If a
parallel branch lands additional ``email_system`` migrations between 0031 and
this one, generate a merge migration at integration time.
"""
from django.db import migrations, models


def _title_case_segment(segment: str) -> str:
    base = segment[:-2] if segment.endswith('[]') else segment
    return base.replace('_', ' ').strip().title()


def _ancestor_paths(path: str):
    segments = path.split('.')
    for i in range(1, len(segments)):
        yield '.'.join(segments[:i]), segments[i - 1]


def backfill(apps, schema_editor):
    EmailVariable = apps.get_model('email_system', 'EmailVariable')
    # Snapshot existing paths — we only walk ancestors of rows that existed
    # before this migration started. Newly-created container rows don't need
    # further walking.
    existing_paths = list(EmailVariable.objects.values_list('variable_path', flat=True))
    for path in existing_paths:
        if not path:
            continue
        for anc_path, segment in _ancestor_paths(path):
            if segment.endswith('[]'):
                # Array-element ancestor — must be registered explicitly.
                continue
            if EmailVariable.objects.filter(variable_path=anc_path).exists():
                continue
            EmailVariable.objects.create(
                variable_path=anc_path,
                display_name=_title_case_segment(segment),
                data_type='object',
                default_value='',
                description='',
                is_active=True,
            )


def noop_reverse(apps, schema_editor):
    # Safe to leave backfilled rows in place on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0031_merge_20260407_1012'),
    ]

    operations = [
        migrations.AlterField(
            model_name='emailvariable',
            name='data_type',
            field=models.CharField(
                choices=[
                    ('string', 'String'),
                    ('int', 'Integer'),
                    ('float', 'Float'),
                    ('bool', 'Boolean'),
                    ('object', 'Object'),
                    ('array', 'Array'),
                ],
                default='string',
                help_text='Expected data type for payload validation',
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill, noop_reverse),
    ]
