"""
Remove Staff model from tutorials app state.

The table stays in the database - staff app now owns it.
TutorialInstructor FK is updated to point to staff.Staff (state-only,
no DB changes needed since the underlying table/column is unchanged).
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0010_move_instructors_to_sessions'),
        ('staff', '0001_initial'),
        ('email_system', '0009_update_staff_fk_to_staff_app'),
    ]

    operations = [
        # 1. State-only: update TutorialInstructor FK to point to staff.Staff
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='tutorialinstructor',
                    name='staff',
                    field=models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to='staff.staff',
                    ),
                ),
            ],
            database_operations=[],
        ),
        # 2. State-only: remove Staff model from tutorials
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name='Staff'),
            ],
            database_operations=[],
        ),
    ]
