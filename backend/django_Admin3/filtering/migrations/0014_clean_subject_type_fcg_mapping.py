from django.db import migrations


def cleanup_subject_type_mapping(apps, schema_editor):
    """Remove the leftover FilterConfigurationGroup row mapping subject_type
    to the 'South Africa' FilterGroup. subject_type enumerates UK/SA/CAA/PMS
    from Subject.SubjectType, not from filter_groups."""
    FCG = apps.get_model('filtering', 'FilterConfigurationGroup')
    FCG.objects.filter(
        filter_configuration__filter_key='subject_type'
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0013_filter_configuration_cleanup'),
    ]

    operations = [
        migrations.RunPython(
            cleanup_subject_type_mapping,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
