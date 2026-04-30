# Generated manually for Task A7: rename submission_date -> graded_date,
# drop hub_download_date, add grade and is_active to MarkingPaperGrading.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marking", "0012_submission_swap_voucher_fk"),
    ]

    operations = [
        migrations.RenameField(
            model_name='markingpapergrading',
            old_name='submission_date',
            new_name='graded_date',
        ),
        migrations.RemoveField(
            model_name='markingpapergrading',
            name='hub_download_date',
        ),
        migrations.AddField(
            model_name='markingpapergrading',
            name='grade',
            field=models.CharField(
                blank=True,
                choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')],
                max_length=1,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='markingpapergrading',
            name='is_active',
            field=models.BooleanField(default=True, db_index=True),
        ),
    ]
