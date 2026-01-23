from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('utils', '0007_remove_emailtemplateattachment_attachment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='utilscountrys',
            name='phone_code',
            field=models.CharField(blank=True, default='', help_text='International dialling code (e.g., +44)', max_length=10),
        ),
    ]
