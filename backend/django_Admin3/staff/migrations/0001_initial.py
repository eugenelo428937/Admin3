"""
Move Staff model from tutorials to staff app + add new fields.

The acted.staff table already exists (created by tutorials/0004).
We use SeparateDatabaseAndState to:
- State: create the Staff model in the staff app (with new fields)
- Database: only add the 3 new columns (table already exists)
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tutorials', '0010_move_instructors_to_sessions'),
    ]

    operations = [
        # 1. State-only: register Staff model in staff app
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Staff',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('user', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                        ('job_title', models.CharField(blank=True, default='', help_text="e.g. 'Senior Tutor'", max_length=200)),
                        ('name_format', models.CharField(choices=[('full_name', 'Full Name'), ('first_name', 'First Name Only')], default='full_name', help_text="How this staff member's name appears in salutations", max_length=20)),
                        ('show_job_title', models.BooleanField(default=False, help_text='Whether to display job title in email salutations')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                    ],
                    options={
                        'verbose_name': 'Staff',
                        'verbose_name_plural': 'Staff',
                        'db_table': '"acted"."staff"',
                    },
                ),
            ],
            database_operations=[],
        ),
        # 2. Database-only: add the 3 new columns
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."staff" ADD COLUMN IF NOT EXISTS "job_title" varchar(200) NOT NULL DEFAULT \'\';',
                    reverse_sql='ALTER TABLE "acted"."staff" DROP COLUMN IF EXISTS "job_title";',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."staff" ADD COLUMN IF NOT EXISTS "name_format" varchar(20) NOT NULL DEFAULT \'full_name\';',
                    reverse_sql='ALTER TABLE "acted"."staff" DROP COLUMN IF EXISTS "name_format";',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."staff" ADD COLUMN IF NOT EXISTS "show_job_title" boolean NOT NULL DEFAULT false;',
                    reverse_sql='ALTER TABLE "acted"."staff" DROP COLUMN IF EXISTS "show_job_title";',
                ),
            ],
        ),
    ]
