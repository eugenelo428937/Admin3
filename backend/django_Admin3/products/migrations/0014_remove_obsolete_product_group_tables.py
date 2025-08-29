"""
Remove obsolete product group tables that have been replaced by the new filter system.

The following tables are being removed:
- acted_product_group (replaced by acted_filter_group)
- acted_product_group_filter_groups (empty and unused)

These tables were part of the old filtering system and have been migrated to the new
FilterConfiguration system using acted_filter_group and acted_filter_configuration_group.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0013_update_product_group_references'),
    ]

    operations = [
        migrations.RunSQL(
            """
            -- Drop the obsolete tables that are no longer used
            DROP TABLE IF EXISTS acted_product_group_filter_groups CASCADE;
            DROP TABLE IF EXISTS acted_product_group CASCADE;
            """,
            reverse_sql="""
            -- Recreate tables if rollback is needed (data will be lost)
            CREATE TABLE acted_product_group (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                parent_id INTEGER REFERENCES acted_product_group(id),
                code VARCHAR(100) UNIQUE,
                description TEXT DEFAULT '',
                is_active BOOLEAN DEFAULT TRUE,
                display_order INTEGER DEFAULT 0
            );
            
            CREATE TABLE acted_product_group_filter_groups (
                id SERIAL PRIMARY KEY
                -- Note: This table was empty, exact schema unknown
            );
            """,
        ),
    ]