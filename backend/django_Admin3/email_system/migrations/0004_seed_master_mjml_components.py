"""Seed the four shared MJML components as EmailTemplate rows with is_master=True."""

import os
from django.db import migrations
from django.conf import settings


# Map: (name, display_name, description)
MASTER_COMPONENTS = [
    (
        'master_template',
        'Master Template',
        'Top-level MJML wrapper that includes banner, content placeholder, and footer.',
    ),
    (
        'banner',
        'Banner',
        'BPP/ActEd brand banner displayed at the top of every email.',
    ),
    (
        'styles',
        'Styles',
        'Global MJML/CSS styles shared across all email templates.',
    ),
    (
        'footer',
        'Footer',
        'Company footer with address, links, safeguarding, and legal text.',
    ),
]


def seed_master_components(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    mjml_dir = os.path.join(
        settings.BASE_DIR, 'utils', 'templates', 'emails', 'mjml',
    )

    for name, display_name, description in MASTER_COMPONENTS:
        # Skip if already exists
        if EmailTemplate.objects.filter(name=name).exists():
            continue

        mjml_path = os.path.join(mjml_dir, f'{name}.mjml')
        mjml_content = ''
        if os.path.isfile(mjml_path):
            with open(mjml_path, 'r', encoding='utf-8') as f:
                mjml_content = f.read()

        EmailTemplate.objects.create(
            name=name,
            display_name=display_name,
            template_type='custom',
            description=description,
            subject_template='',
            use_master_template=False,
            default_priority='normal',
            is_master=True,
            mjml_content=mjml_content,
            is_active=True,
        )


def remove_master_components(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    names = [c[0] for c in MASTER_COMPONENTS]
    EmailTemplate.objects.filter(name__in=names, is_master=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0003_add_is_master_to_emailtemplate'),
    ]

    operations = [
        migrations.RunPython(seed_master_components, remove_master_components),
    ]
