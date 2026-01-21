# Generated migration to enable pg_trgm extension for fuzzy search

from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0004_alter_examsession_end_date_and_more'),
    ]

    operations = [
        TrigramExtension(),
    ]
