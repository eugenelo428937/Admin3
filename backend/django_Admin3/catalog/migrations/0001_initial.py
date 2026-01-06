"""Initial migration to create the 'acted' PostgreSQL schema.

This migration creates the acted schema that will hold all catalog tables.
Must run before any model migrations.
"""
from django.db import migrations


class Migration(migrations.Migration):
    """Create the acted PostgreSQL schema."""

    initial = True

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE SCHEMA IF NOT EXISTS acted;",
            reverse_sql="DROP SCHEMA IF EXISTS acted CASCADE;",
        ),
    ]
