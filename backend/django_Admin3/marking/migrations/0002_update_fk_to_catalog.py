"""
Migration to update MarkingPaper FK from exam_sessions_subjects_products to catalog.

Part of T087 legacy app cleanup.

This migration changes the FK target from exam_sessions_subjects_products.ExamSessionSubjectProduct
to catalog.ExamSessionSubjectProduct. Since both point to the same table, no data changes are needed.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0001_initial'),
        ('catalog', '0009_add_exam_session_subject_product'),  # catalog.ESSP must exist
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='markingpaper',
                    name='exam_session_subject_product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='marking_papers',
                        to='catalog.examsessionsubjectproduct',
                    ),
                ),
            ],
            # No database operations - FK column stays the same, just changing Django's model reference
            database_operations=[],
        ),
    ]
