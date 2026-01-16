"""
Migration to update TutorialEvent FK from ExamSessionSubjectProductVariation to store.Product.

Part of T087 legacy app cleanup.

This migration changes the FK target from exam_sessions_subjects_products.ExamSessionSubjectProductVariation
to store.Product. Since IDs were preserved during the store migration, no data changes are needed.

The db_column is kept as 'exam_session_subject_product_variation_id' to preserve existing data.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0001_initial'),
        ('store', '0001_initial'),  # store.Product must exist
    ]

    operations = [
        # Remove old FK and add new one pointing to store.Product
        migrations.AlterField(
            model_name='tutorialevent',
            name='exam_session_subject_product_variation',
            field=models.ForeignKey(
                db_column='exam_session_subject_product_variation_id',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='tutorial_events',
                to='store.product',
            ),
        ),
        # Rename the field from exam_session_subject_product_variation to store_product
        migrations.RenameField(
            model_name='tutorialevent',
            old_name='exam_session_subject_product_variation',
            new_name='store_product',
        ),
    ]
