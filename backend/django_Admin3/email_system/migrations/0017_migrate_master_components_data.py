# Data migration: copy 6 is_master=True rows from EmailTemplate to EmailMasterComponent,
# then remove the is_master field and delete the old rows.

from django.db import migrations


# Map template names to component_type values
COMPONENT_TYPE_MAP = {
    'master_template': 'master_template',
    'banner': 'banner',
    'footer': 'footer',
    'styles': 'styles',
    'closing': 'closing',
    'dev_mode_banner': 'dev_mode_banner',
}


def copy_master_components(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailMasterComponent = apps.get_model('email_system', 'EmailMasterComponent')

    for template in EmailTemplate.objects.filter(is_master=True):
        component_type = COMPONENT_TYPE_MAP.get(template.name, template.name)
        EmailMasterComponent.objects.get_or_create(
            name=template.name,
            defaults={
                'component_type': component_type,
                'display_name': template.display_name,
                'description': template.description,
                'mjml_content': template.mjml_content,
                'is_active': template.is_active,
                'created_by': template.created_by,
            },
        )

    # Delete the master rows from EmailTemplate
    EmailTemplate.objects.filter(is_master=True).delete()


def reverse_copy(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailMasterComponent = apps.get_model('email_system', 'EmailMasterComponent')

    for component in EmailMasterComponent.objects.all():
        EmailTemplate.objects.get_or_create(
            name=component.name,
            defaults={
                'display_name': component.display_name,
                'description': component.description,
                'mjml_content': component.mjml_content,
                'is_active': component.is_active,
                'is_master': True,
                'use_master_template': False,
                'template_type': 'custom',
                'subject_template': '',
                'created_by': component.created_by,
            },
        )

    EmailMasterComponent.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("email_system", "0016_create_email_master_component"),
    ]

    operations = [
        migrations.RunPython(copy_master_components, reverse_copy),
    ]
