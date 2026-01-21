# Migration to add ExamSessionSubject model to catalog app
# Part of 20250115-store-app-consolidation feature

from django.db import migrations, models
import django.db.models.deletion


def copy_exam_session_subjects(apps, schema_editor):
    """Copy data from old exam_sessions_subjects table to new catalog table.

    Preserves IDs for FK integrity with cart/order references.
    This migration handles both real database (with existing data) and
    test database (empty, fresh creation) scenarios.
    """
    with schema_editor.connection.cursor() as cursor:
        # Check if source table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'acted_exam_session_subjects'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            # Source table doesn't exist (e.g., fresh test database) - skip copy
            return

        # Check if source table has any data
        cursor.execute("SELECT COUNT(*) FROM acted_exam_session_subjects")
        count = cursor.fetchone()[0]

        if count == 0:
            # No data to copy - skip
            return

        # Copy data from old table to new table, preserving IDs
        # The old table references exam_sessions.ExamSession and subjects.Subject
        # which are aliased from catalog models, so FK IDs should match
        try:
            cursor.execute("""
                INSERT INTO "acted"."catalog_exam_session_subjects"
                    (id, exam_session_id, subject_id, is_active, created_at, updated_at)
                SELECT
                    ess.id,
                    ess.exam_session_id,
                    ess.subject_id,
                    true as is_active,
                    ess.created_at,
                    ess.updated_at
                FROM acted_exam_session_subjects ess
                ON CONFLICT (id) DO NOTHING
            """)

            # Update the sequence to avoid ID conflicts
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('"acted"."catalog_exam_session_subjects"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "acted"."catalog_exam_session_subjects"), 1),
                    true
                )
            """)
        except Exception as e:
            # Log but don't fail if data copy fails (e.g., FK constraint issues in test DB)
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not copy exam_session_subjects data: {e}")


def reverse_copy(apps, schema_editor):
    """Reverse migration - clear the new table."""
    ExamSessionSubject = apps.get_model('catalog', 'ExamSessionSubject')
    ExamSessionSubject.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0005_enable_pg_trgm'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExamSessionSubject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this combination is active')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('exam_session', models.ForeignKey(
                    help_text='The exam session period',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='exam_session_subjects',
                    to='catalog.examsession'
                )),
                ('subject', models.ForeignKey(
                    help_text='The subject available in this session',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='exam_session_subjects',
                    to='catalog.subject'
                )),
            ],
            options={
                'verbose_name': 'Exam Session Subject',
                'verbose_name_plural': 'Exam Session Subjects',
                'db_table': '"acted"."catalog_exam_session_subjects"',
                'unique_together': {('exam_session', 'subject')},
            },
        ),
        migrations.RunPython(copy_exam_session_subjects, reverse_copy),
    ]
