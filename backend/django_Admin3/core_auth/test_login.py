import os
import sys
import django
import argparse
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

def test_login(username, password):
    try:
        # First try to find user by email (username)
        try:
            user = User.objects.get(email=username)
            print(f"Found user: {user.username}")
        except User.DoesNotExist:
            print(f"No user found with email: {username}")
            return

        # Then authenticate with their username and password
        auth_user = authenticate(username=user.username, password=password)
        if auth_user:
            # Generate tokens
            refresh = RefreshToken.for_user(auth_user)
            print("\nLogin successful!")
            print(f"User: {auth_user.get_full_name() or auth_user.username}")
            print(f"Email: {auth_user.email}")
            print("\nAccess token:")
            print(str(refresh.access_token))
            print("\nRefresh token:")
            print(str(refresh))
        else:
            print("Authentication failed: Invalid credentials")

    except Exception as e:
        print(f"Error during login: {str(e)}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Test login functionality')
    parser.add_argument('username', help='Username/email to test')
    parser.add_argument('password', help='Password to test')
    
    args = parser.parse_args()
    test_login(args.username, args.password)