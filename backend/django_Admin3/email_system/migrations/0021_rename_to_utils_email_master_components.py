# Rename email_master_components to utils_email_master_components
# to follow the project's naming convention for email system tables.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("email_system", "0020_move_master_components_to_public_schema"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="emailmastercomponent",
            table="utils_email_master_components",
        ),
    ]
