"""
Migration to add ExamSessionSubjectProduct model to catalog app.

Part of T087 legacy app cleanup.

This migration handles both:
1. Existing databases: Registers the existing acted_exam_session_subject_products table
2. Fresh databases (e.g., test DBs): Creates the table
"""
from django.db import migrations, models
import django.db.models.deletion


def create_table_if_not_exists(apps, schema_editor):
    """Create the table if it doesn't exist (for fresh databases)."""
    with schema_editor.connection.cursor() as cursor:
        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'acted_exam_session_subject_products'
            )
        """)
        if cursor.fetchone()[0]:
            return  # Table already exists

        # Create the table for fresh database
        cursor.execute("""
            CREATE TABLE acted_exam_session_subject_products (
                id BIGSERIAL PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                exam_session_subject_id BIGINT NOT NULL
                    REFERENCES acted.catalog_exam_session_subjects(id) ON DELETE CASCADE,
                product_id BIGINT NOT NULL
                    REFERENCES acted.catalog_products(id) ON DELETE CASCADE,
                UNIQUE (exam_session_subject_id, product_id)
            )
        """)


def drop_table(apps, schema_editor):
    """Drop the table (reverse migration)."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS acted_exam_session_subject_products")


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_update_filter_group_references'),
    ]

    operations = [
        # Step 1: Create table if it doesn't exist (for fresh DBs)
        migrations.RunPython(create_table_if_not_exists, drop_table),

        # Step 2: Register model state
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='ExamSessionSubjectProduct',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('exam_session_subject', models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='exam_session_subject_products',
                            to='catalog.examsessionsubject'
                        )),
                        ('product', models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='exam_session_subject_products',
                            to='catalog.product'
                        )),
                    ],
                    options={
                        'verbose_name': 'Exam Session Subject Product',
                        'verbose_name_plural': 'Exam Session Subject Products',
                        'db_table': 'acted_exam_session_subject_products',
                        'unique_together': {('exam_session_subject', 'product')},
                    },
                ),
            ],
            database_operations=[],
        ),
    ]
