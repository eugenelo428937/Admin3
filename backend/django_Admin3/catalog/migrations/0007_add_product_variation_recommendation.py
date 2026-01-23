"""Migration to move ProductVariationRecommendation to catalog app.

This migration handles both:
1. Existing databases: Renames table from acted_product_productvariation_recommendations to product_productvariation_recommendations
2. Fresh databases (e.g., test DBs): Creates table directly in acted schema
"""
from django.db import migrations, models
import django.db.models.deletion


def migrate_or_create_table(apps, schema_editor):
    """Migrate existing table OR create new one for fresh database."""
    with schema_editor.connection.cursor() as cursor:
        # Check if table already exists in acted schema
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'acted'
                AND table_name = 'product_productvariation_recommendations'
            )
        """)
        if cursor.fetchone()[0]:
            return  # Table already exists, nothing to do

        # Check if table exists in public schema with old name
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'acted_product_productvariation_recommendations'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if table_exists:
            # Rename the table
            cursor.execute("""
                ALTER TABLE public.acted_product_productvariation_recommendations
                RENAME TO product_productvariation_recommendations
            """)
            # Move to acted schema
            cursor.execute("""
                ALTER TABLE public.product_productvariation_recommendations
                SET SCHEMA acted
            """)
        else:
            # Fresh database - create the table
            cursor.execute("""
                CREATE TABLE acted.product_productvariation_recommendations (
                    id BIGSERIAL PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    product_product_variation_id BIGINT NOT NULL UNIQUE
                        REFERENCES acted.catalog_product_product_variations(id) ON DELETE CASCADE,
                    recommended_product_product_variation_id BIGINT NOT NULL
                        REFERENCES acted.catalog_product_product_variations(id) ON DELETE CASCADE
                )
            """)


def reverse_migrate(apps, schema_editor):
    """Reverse: drop or move table back to public schema."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'acted'
                AND table_name = 'product_productvariation_recommendations'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if table_exists:
            cursor.execute("""
                ALTER TABLE acted.product_productvariation_recommendations
                SET SCHEMA public
            """)
            cursor.execute("""
                ALTER TABLE public.product_productvariation_recommendations
                RENAME TO acted_product_productvariation_recommendations
            """)


class Migration(migrations.Migration):
    """Move ProductVariationRecommendation to catalog app with acted schema."""

    dependencies = [
        ("catalog", "0006_add_exam_session_subject"),
        # Note: products app dependency removed - app has been decommissioned
    ]

    operations = [
        # Step 1: Migrate existing table or create new for fresh DB
        migrations.RunPython(migrate_or_create_table, reverse_migrate),

        # Step 2: Create model state in catalog (table already exists)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='ProductVariationRecommendation',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('product_product_variation', models.OneToOneField(
                            help_text='Source product-variation combination that makes the recommendation',
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='recommendation',
                            to='catalog.productproductvariation',
                        )),
                        ('recommended_product_product_variation', models.ForeignKey(
                            help_text='Recommended complementary product-variation combination',
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='recommended_by',
                            to='catalog.productproductvariation',
                        )),
                    ],
                    options={
                        'verbose_name': 'Product Variation Recommendation',
                        'verbose_name_plural': 'Product Variation Recommendations',
                        'db_table': '"acted"."product_productvariation_recommendations"',
                    },
                ),
            ],
            database_operations=[],
        ),

        # Step 3: Add indexes (if they don't exist)
        migrations.AddIndex(
            model_name='productvariationrecommendation',
            index=models.Index(fields=['product_product_variation'], name='cat_pvr_ppv_idx'),
        ),
        migrations.AddIndex(
            model_name='productvariationrecommendation',
            index=models.Index(fields=['recommended_product_product_variation'], name='cat_pvr_rec_ppv_idx'),
        ),
    ]
