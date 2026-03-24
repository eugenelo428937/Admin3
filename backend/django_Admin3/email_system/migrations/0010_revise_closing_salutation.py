"""
Revise ClosingSalutation: add Team FK, migrate team_signature data,
remove team_signature and staff_name_format fields, allow blank sign_off_text.
"""
from django.db import migrations, models
import django.db.models.deletion


def migrate_team_signatures_to_team_model(apps, schema_editor):
    """Create Team records from existing team_signature values and link salutations."""
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    Team = apps.get_model('staff', 'Team')

    for sal in ClosingSalutation.objects.filter(signature_type='team').exclude(team_signature=''):
        team, _ = Team.objects.get_or_create(
            display_name=sal.team_signature,
            defaults={
                'name': sal.name + '_team',
                'default_sign_off_text': sal.sign_off_text or 'Kind Regards',
                'is_active': True,
            },
        )
        sal.team_id = team.id
        sal.save(update_fields=['team_id'])


def reverse_migrate(apps, schema_editor):
    """Reverse: copy Team display_name back to team_signature."""
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    for sal in ClosingSalutation.objects.filter(team__isnull=False).select_related('team'):
        sal.team_signature = sal.team.display_name
        sal.save(update_fields=['team_signature'])


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0009_update_staff_fk_to_staff_app'),
        ('staff', '0002_create_team_and_team_staff'),
    ]

    operations = [
        # 1. Add team FK (nullable)
        migrations.AddField(
            model_name='closingsalutation',
            name='team',
            field=models.ForeignKey(
                blank=True, null=True,
                help_text="Team used when signature_type is 'team'",
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='closing_salutations',
                to='staff.team',
            ),
        ),
        # 2. Data migration: create Teams from team_signature, link salutations
        migrations.RunPython(migrate_team_signatures_to_team_model, reverse_migrate),
        # 3. Remove old fields
        migrations.RemoveField(model_name='closingsalutation', name='team_signature'),
        migrations.RemoveField(model_name='closingsalutation', name='staff_name_format'),
        # 4. Allow sign_off_text to be blank (falls back to team default)
        migrations.AlterField(
            model_name='closingsalutation',
            name='sign_off_text',
            field=models.CharField(
                blank=True, default='',
                help_text="Sign-off line. Falls back to team's default_sign_off_text if blank.",
                max_length=200,
            ),
        ),
    ]
