"""Consolidate array rows under the Model-B convention.

Prior to this migration the schema stored two rows per array: one at the bare
path ``foo`` with ``data_type='array'`` (the array definition) and a second at
``foo[]`` with ``data_type='object'`` (the element-shape container the picker
drilled into). That split produced sibling duplicate nodes in the variable
picker tree.

After this migration, the array row lives at ``foo[]`` with ``data_type='array'``
and serves both roles. Descendants already use the ``foo[].child`` prefix, so
only the array row itself needs to move.

For each ``array`` row whose ``variable_path`` does not end in ``[]``:
    1. If a sibling row exists at ``path + '[]'`` (the old object container),
       delete it (preserving its description on the array row if the array row
       had none).
    2. Rename the array row's ``variable_path`` to ``path + '[]'``.

Idempotent: array rows already living at ``foo[]`` are skipped.
"""
from django.db import migrations


def consolidate_array_rows(apps, schema_editor):
    EmailVariable = apps.get_model('email_system', 'EmailVariable')

    bare_arrays = list(
        EmailVariable.objects.filter(data_type='array').exclude(
            variable_path__endswith='[]'
        )
    )

    for arr in bare_arrays:
        new_path = arr.variable_path + '[]'

        sibling = EmailVariable.objects.filter(variable_path=new_path).first()
        if sibling is not None:
            if not arr.description and sibling.description:
                arr.description = sibling.description
            sibling.delete()

        arr.variable_path = new_path
        arr.save()


def noop_reverse(apps, schema_editor):
    """Reverse is a no-op — the original bare-path rows cannot be recovered
    unambiguously, and the new model is intended to replace the old one
    permanently."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0032_email_variable_backfill_containers'),
    ]

    operations = [
        migrations.RunPython(consolidate_array_rows, noop_reverse),
    ]
