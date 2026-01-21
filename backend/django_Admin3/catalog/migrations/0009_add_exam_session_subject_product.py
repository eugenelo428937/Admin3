"""
Migration to add ExamSessionSubjectProduct model to catalog app.

Part of T087 legacy app cleanup.

This migration registers the existing acted_exam_session_subject_products table
with the catalog app. The table already exists and contains data - this migration
only creates the model definition in Django, not the database table.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_update_filter_group_references'),
    ]

    operations = [
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
            # No database operations - table already exists
            database_operations=[],
        ),
    ]
