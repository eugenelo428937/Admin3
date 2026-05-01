from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0014_feedback_field_changes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='markingpapergrading',
            name='grade',
            field=models.CharField(
                blank=True,
                choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D'), ('E', 'E')],
                max_length=1,
                null=True,
            ),
        ),
    ]
