"""Seed the default ActEd closing salutation and assign to all non-master templates."""

from django.db import migrations


def seed_default_salutation(apps, schema_editor):
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')

    salutation, _ = ClosingSalutation.objects.get_or_create(
        name='acted_default',
        defaults={
            'display_name': 'ActEd',
            'sign_off_text': 'Kind Regards',
            'signature_type': 'team',
            'team_signature': 'BPP Actuarial (ActEd)',
            'staff_name_format': 'full_name',
            'is_active': True,
        },
    )

    EmailTemplate.objects.filter(is_master=False).update(
        closing_salutation=salutation,
    )


def remove_default_salutation(apps, schema_editor):
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')

    EmailTemplate.objects.filter(
        closing_salutation__name='acted_default',
    ).update(closing_salutation=None)

    ClosingSalutation.objects.filter(name='acted_default').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0005_closingsalutation_emailtemplate_closing_salutation_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_default_salutation, remove_default_salutation),
    ]
