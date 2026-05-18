"""Phase 3 of the session+learner webhook expansion (2026-05-18).

Add two new thin-bridge tables in the `adm` schema:

  - `adm.contacts`  — external_id + Student OneToOne
  - `adm.learners`  — external_id (indexed, NOT unique alone)
                       + TutorialRegistration FK
                       + composite unique
                       (external_id, tutorial_registration)

Both use SET_NULL on delete to keep the bridge row alive when the
master is removed (preserves webhook receipt history).

Note: an earlier draft also added `adm.learner_attendance` to mirror
state for the `Learner Attended Session` webhook flow. That flow was
removed before this migration shipped — attendance writes through the
existing CSV import / public-attendance views path, no bridge needed.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('administrate', '0014_session_thin_bridge_refactor'),
        # TutorialRegistration + TutorialAttendance both exist on tutorials
        # by migration 0023 (link_access); pin to a known-existing migration
        # rather than 'tutorials.__latest__' so this migration stays
        # reproducible.
        ('tutorials', '0028_tutorial_sessions_webhook_prep'),
        # Student is in the students app; pin to a recent migration that
        # established the schema-qualified table.
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Contact',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True,
                        serialize=False, verbose_name='ID',
                    ),
                ),
                (
                    'external_id',
                    models.CharField(
                        blank=True, max_length=50, null=True, unique=True,
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'student',
                    models.OneToOneField(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='adm_contact',
                        to='students.student',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Administrate Contact Bridge',
                'verbose_name_plural': 'Administrate Contact Bridges',
                'db_table': '"adm"."contacts"',
                'ordering': ['external_id'],
            },
        ),
        migrations.CreateModel(
            name='Learner',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True,
                        serialize=False, verbose_name='ID',
                    ),
                ),
                (
                    'external_id',
                    models.CharField(db_index=True, max_length=50),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'tutorial_registration',
                    models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='adm_learners',
                        to='tutorials.tutorialregistration',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Administrate Learner Bridge',
                'verbose_name_plural': 'Administrate Learner Bridges',
                'db_table': '"adm"."learners"',
                'ordering': ['external_id'],
            },
        ),
        migrations.AddConstraint(
            model_name='learner',
            constraint=models.UniqueConstraint(
                fields=('external_id', 'tutorial_registration'),
                name='uniq_learner_per_registration',
            ),
        ),
    ]
