#!/usr/bin/env python
"""
Django manage.py wrapper with environment file support.

Usage:
    python manage_env.py --env=uat.local shell
    python manage_env.py --env=uat shell
    python manage_env.py --env=development runserver

This loads the corresponding .env.{env} file before running Django commands.
"""
import os
import sys
from pathlib import Path


def load_env_file(env_file_path):
    """Load environment variables from a file."""
    if not os.path.exists(env_file_path):
        print(f"Warning: {env_file_path} not found!")
        return False

    print(f"Loading environment from: {env_file_path}")
    with open(env_file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ[key] = value
    return True


def main():
    """Run administrative tasks with custom environment support."""
    base_dir = Path(__file__).resolve().parent

    # Parse --env argument
    env_name = None
    filtered_args = ['manage_env.py']

    for arg in sys.argv[1:]:
        if arg.startswith('--env='):
            env_name = arg.split('=', 1)[1]
        elif arg == '--env':
            # Handle --env value format (next arg is the value)
            continue
        else:
            # Check if previous arg was --env
            if len(sys.argv) > 1 and sys.argv[sys.argv.index(arg) - 1] == '--env':
                env_name = arg
            else:
                filtered_args.append(arg)

    # Load environment file if specified
    if env_name:
        env_file = base_dir / f'.env.{env_name}'
        if load_env_file(env_file):
            # Map env name to settings module
            settings_map = {
                'development': 'django_Admin3.settings.development',
                'uat': 'django_Admin3.settings.uat',
                'uat.local': 'django_Admin3.settings.uat',
                'production': 'django_Admin3.settings.production',
            }
            settings_module = settings_map.get(env_name, f'django_Admin3.settings.{env_name.split(".")[0]}')
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)
            print(f"Using settings: {settings_module}")
    else:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')

    # Update sys.argv for Django
    sys.argv = filtered_args

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
