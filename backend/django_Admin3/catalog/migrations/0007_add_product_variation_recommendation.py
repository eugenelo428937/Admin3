"""Migration to move ProductVariationRecommendation to catalog app.

This migration:
1. Renames table from acted_product_productvariation_recommendations to product_productvariation_recommendations
2. Moves table to acted schema
3. Registers model state in catalog app
"""
from django.db import migrations, models
import django.db.models.deletion


def rename_and_move_table(apps, schema_editor):
    """Rename and move the recommendations table to acted schema."""
    with schema_editor.connection.cursor() as cursor:
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


def reverse_rename(apps, schema_editor):
    """Reverse: move table back to public schema with old name."""
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
        # Step 1: Rename and move the database table
        migrations.RunPython(rename_and_move_table, reverse_rename),

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
