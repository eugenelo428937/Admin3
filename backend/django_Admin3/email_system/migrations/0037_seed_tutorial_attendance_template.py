"""Seed the tutorial_attendance_reminder email template."""
from django.db import migrations

TEMPLATE_NAME = 'tutorial_attendance_reminder'

BASIC_MODE_CONTENT = (
    '# Tutorial attendance — {{ session_title }}\n\n'
    'Hello {{ instructor_name }},\n\n'
    'You are scheduled to teach **{{ session_title }}** on '
    '{{ session_date }}{% if venue %} at {{ venue }}{% endif %}.\n\n'
    'Please record attendance using either:\n\n'
    '1. The attached spreadsheet — fill the Attendance column for each student, then upload it via the link below.\n'
    '2. The online attendance page — click the link below and update each student inline.\n\n'
    '**[Enter attendance →]({{ magic_link }})**\n\n'
    'This link is valid for 7 days. If you have any questions, contact the tutorials team.\n'
)


def seed_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplateVersion = apps.get_model('email_system', 'EmailTemplateVersion')

    # Create the template row
    template, created = EmailTemplate.objects.get_or_create(
        name=TEMPLATE_NAME,
        defaults={
            'display_name': 'Tutorial Attendance Reminder',
            'template_type': 'TUTORIALS',
            'is_active': True,
            'enable_queue': True,
            'use_master_template': False,
        },
    )

    # Create the version row if we just created the template
    if created:
        EmailTemplateVersion.objects.create(
            template=template,
            version_number=1,
            subject_template='Attendance for {{ session_title }} on {{ session_date }}',
            basic_mode_content=BASIC_MODE_CONTENT,
            change_note='Initial seeding for tutorial instructor attendance workflow',
        )


def reverse_seed(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplate.objects.filter(name=TEMPLATE_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0036_merge_variable_picker_and_versioning'),
    ]

    operations = [
        migrations.RunPython(seed_template, reverse_seed),
    ]
