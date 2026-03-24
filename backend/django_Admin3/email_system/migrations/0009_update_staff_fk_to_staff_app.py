"""
Update ClosingSalutationStaff FK from tutorials.Staff to staff.Staff.

State-only migration - no database changes needed since the underlying
table and column are unchanged.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0008_add_basic_mode_and_mjml_elements'),
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='closingsalutationstaff',
                    name='staff',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='closing_salutations',
                        to='staff.staff',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
