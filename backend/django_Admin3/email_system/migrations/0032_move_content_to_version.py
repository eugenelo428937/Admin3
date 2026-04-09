"""Move versioned content fields from EmailTemplate to EmailTemplateVersion.

Adds closing_salutation FK and payload_schema onto EmailTemplateVersion, snapshots
every existing template's current content into a fresh version row (preserving
any prior versions), then drops the now-obsolete columns from EmailTemplate.
"""

import django.db.models.deletion
from django.db import migrations, models


def snapshot_templates_to_versions(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplateVersion = apps.get_model('email_system', 'EmailTemplateVersion')

    for template in EmailTemplate.objects.all():
        latest = (
            EmailTemplateVersion.objects
            .filter(template=template)
            .order_by('-version_number')
            .first()
        )
        next_number = (latest.version_number if latest else 0) + 1

        EmailTemplateVersion.objects.create(
            template=template,
            version_number=next_number,
            subject_template=template.subject_template or '',
            mjml_content=template.mjml_content or '',
            basic_mode_content=template.basic_mode_content or '',
            closing_salutation=template.closing_salutation,
            payload_schema=template.payload_schema or {},
            closing_sign_off=(
                template.closing_salutation.sign_off_text
                if template.closing_salutation_id else ''
            ),
            closing_display_name=(
                template.closing_salutation.display_name
                if template.closing_salutation_id else ''
            ),
            closing_job_title=(
                template.closing_salutation.job_title
                if template.closing_salutation_id else ''
            ),
            change_note='Snapshot from pre-refactor template content',
        )


def reverse_noop(apps, schema_editor):
    # Columns are dropped forward; reversing the data is not attempted.
    pass


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ('email_system', '0031_merge_20260407_1012'),
    ]

    operations = [
        migrations.AddField(
            model_name='emailtemplateversion',
            name='closing_salutation',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='template_versions',
                to='email_system.closingsalutation',
                help_text='Closing salutation block snapshot for this version',
            ),
        ),
        migrations.AddField(
            model_name='emailtemplateversion',
            name='payload_schema',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Auto-generated schema from template variables at the time of this version',
            ),
        ),
        migrations.AlterField(
            model_name='emailtemplateversion',
            name='subject_template',
            field=models.CharField(blank=True, default='', max_length=300),
        ),
        migrations.RunPython(snapshot_templates_to_versions, reverse_noop),
        migrations.RemoveField(model_name='emailtemplate', name='subject_template'),
        migrations.RemoveField(model_name='emailtemplate', name='mjml_content'),
        migrations.RemoveField(model_name='emailtemplate', name='basic_mode_content'),
        migrations.RemoveField(model_name='emailtemplate', name='closing_salutation'),
        migrations.RemoveField(model_name='emailtemplate', name='payload_schema'),
    ]
