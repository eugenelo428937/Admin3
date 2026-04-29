# Generated manually for Task A8: rename grade -> rating, submission_date -> feedback_date,
# drop hub_download_date, add is_active to MarkingPaperFeedback.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marking", "0013_grading_field_changes"),
    ]

    operations = [
        migrations.RenameField(
            model_name='markingpaperfeedback',
            old_name='grade',
            new_name='rating',
        ),
        migrations.RenameField(
            model_name='markingpaperfeedback',
            old_name='submission_date',
            new_name='feedback_date',
        ),
        migrations.RemoveField(
            model_name='markingpaperfeedback',
            name='hub_download_date',
        ),
        migrations.AddField(
            model_name='markingpaperfeedback',
            name='is_active',
            field=models.BooleanField(default=True, db_index=True),
        ),
        migrations.AlterField(
            model_name='markingpaperfeedback',
            name='rating',
            field=models.CharField(
                blank=True,
                choices=[('E', 'Excellent'), ('G', 'Good'), ('A', 'Average'), ('P', 'Poor')],
                max_length=1,
                null=True,
            ),
        ),
    ]
