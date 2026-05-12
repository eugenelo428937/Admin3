"""Populate mjml_content for tutorial_attendance_reminder + seed EmailVariable rows.

Background
----------
Migration 0037 seeded the template with ``basic_mode_content`` only —
``mjml_content`` was left empty so deliveries fell back to rendering
the markdown source. This migration:

1. Bumps the template to a fresh ``EmailTemplateVersion`` whose
   ``mjml_content`` is real MJML markup. The magic link surfaces as
   both an ``mj-button`` (primary CTA) and a fallback ``<a>`` link
   below, mirroring the ``email_verification`` template style for
   email-client compatibility.
2. Registers the five context variables the cron passes
   (``magic_link``, ``instructor_name``, ``session_title``,
   ``session_date``, ``venue``) in ``utils_email_variables`` so the
   admin template editor's variable picker can offer them.

Both halves are reversible: the new version is removed and reverts to
the previous current_version; the EmailVariable rows are deleted.
"""
from __future__ import annotations

from django.db import migrations


TEMPLATE_NAME = 'tutorial_attendance_reminder'


MJML_CONTENT = """\
<mj-text
    padding-top="32px"
    padding-bottom="16px"
    align="center"
    css-class="email-title"
    font-size="21px">
    <span
        style="
            color: #2c3e50;
            margin: 0;
            font-size: 21px;
            font-weight: 600;
        ">
        Tutorial attendance — {{ session_title }}
    </span>
</mj-text>

<mj-text css-class="content-text" align="left">
    Hello {{ instructor_name }},
</mj-text>

<mj-text css-class="content-text" align="left">
    You are scheduled to teach <strong>{{ session_title }}</strong> on
    {{ session_date }}{% if venue %} at <strong>{{ venue }}</strong>{% endif %}.
</mj-text>

<mj-text css-class="content-text" align="left">
    Please record attendance using either of the methods below:
</mj-text>

<mj-text css-class="content-text" align="left">
    <strong>1. Attached spreadsheet</strong> &mdash; fill the Attendance
    column for each student, then upload the file via the link below.
</mj-text>

<mj-text css-class="content-text" align="left">
    <strong>2. Online attendance page</strong> &mdash; click the button
    and update each student inline.
</mj-text>

<mj-button
    background-color="#007bff"
    color="#ffffff"
    font-size="16px"
    font-weight="600"
    border-radius="4px"
    padding="12px 32px 28px 32px"
    href="{{ magic_link }}"
    align="center">
    Enter attendance
</mj-button>

<mj-text css-class="content-text" align="left">
    If the button above doesn't work, copy and paste the following link
    into your browser:
</mj-text>

<mj-text css-class="content-text" align="left">
    <a href="{{ magic_link }}" style="color: #007bff; word-break: break-all;">{{ magic_link }}</a>
</mj-text>

<mj-text css-class="content-text" align="left">
    <strong>Important:</strong> This link is valid for 7 days. If you
    have any questions, please contact the tutorials team.
</mj-text>
"""


VARIABLES = [
    # (variable_path, display_name, data_type, default_value, description)
    ('magic_link', 'Magic Link', 'string', '',
     'Signed URL the tutor opens to record attendance. 7-day expiry.'),
    ('instructor_name', 'Instructor Name', 'string', '',
     'Display name of the tutor receiving the email.'),
    ('session_title', 'Session Title', 'string', '',
     'Tutorial session title (matches TutorialSessions.title).'),
    ('session_date', 'Session Date', 'string', '',
     'Start date/time of the tutorial session.'),
    ('venue', 'Venue', 'string', '',
     'Venue name where the session is held. May be empty for online sessions.'),
]


def seed_mjml_and_variables(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplateVersion = apps.get_model('email_system', 'EmailTemplateVersion')
    EmailVariable = apps.get_model('email_system', 'EmailVariable')

    # --- 1. Seed EmailVariable rows -----------------------------------
    for path, display_name, data_type, default_value, description in VARIABLES:
        EmailVariable.objects.update_or_create(
            variable_path=path,
            defaults={
                'display_name': display_name,
                'data_type': data_type,
                'default_value': default_value,
                'description': description,
                'is_active': True,
            },
        )

    # --- 2. Add a new template version with mjml_content --------------
    template = EmailTemplate.objects.filter(name=TEMPLATE_NAME).first()
    if template is None:
        # Migration 0037 should have created this; bail out cleanly if not.
        return

    latest = template.versions.order_by('-version_number').first()
    next_version = (latest.version_number + 1) if latest else 1

    # Preserve subject + basic_mode_content from the prior version so the
    # template editor still has the legacy markdown available alongside MJML.
    subject = latest.subject_template if latest else (
        'Attendance for {{ session_title }} on {{ session_date }}'
    )
    basic = latest.basic_mode_content if latest else ''

    EmailTemplateVersion.objects.create(
        template=template,
        version_number=next_version,
        subject_template=subject,
        basic_mode_content=basic,
        mjml_content=MJML_CONTENT,
        change_note='Populate mjml_content with magic-link button + fallback link',
    )


def reverse_seed(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplateVersion = apps.get_model('email_system', 'EmailTemplateVersion')
    EmailVariable = apps.get_model('email_system', 'EmailVariable')

    # Remove the highest-version template version (the one we just added).
    template = EmailTemplate.objects.filter(name=TEMPLATE_NAME).first()
    if template is not None:
        latest = template.versions.order_by('-version_number').first()
        if latest is not None and latest.mjml_content == MJML_CONTENT:
            latest.delete()

    EmailVariable.objects.filter(
        variable_path__in=[v[0] for v in VARIABLES],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0038_emailqueueattachment'),
    ]

    operations = [
        migrations.RunPython(seed_mjml_and_variables, reverse_seed),
    ]
