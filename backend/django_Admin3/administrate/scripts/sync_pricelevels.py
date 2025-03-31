#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add Django project to path
base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings")
django.setup()

# Call the management command
from django.core.management import call_command

if __name__ == "__main__":
    # Pass any arguments to the command
    call_command('sync_price_levels', *sys.argv[1:])
    print("Price levels synchronization complete!")
