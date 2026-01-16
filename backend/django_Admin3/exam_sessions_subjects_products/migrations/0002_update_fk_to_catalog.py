# Migration 0002 is now a no-op
# FK references to catalog were moved directly into 0001_initial.py
# since the system is not live and backward compatibility isn't needed.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("exam_sessions_subjects_products", "0001_initial"),
    ]

    # All FK updates are now in 0001_initial directly
    operations = []
