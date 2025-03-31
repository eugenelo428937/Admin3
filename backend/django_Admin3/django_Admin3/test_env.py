#!/usr/bin/env python
"""
Test script to verify if values from .env.development can be read properly.
"""
import os
import sys
from pathlib import Path
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environ
env = environ.Env()

# Read .env.development file specifically (not .env)
environ.Env.read_env(os.path.join(BASE_DIR, '.env.development'))

# Print out all environment variables to verify they're being read
print("=== Environment Variables from .env.development ===")
print(f"DATABASE_URL: {env('DATABASE_URL', default='Not set')}")
print(f"DB_NAME: {env('DB_NAME', default='Not set')}")
print(f"DB_USER: {env('DB_USER', default='Not set')}")
print(f"DB_PASSWORD: {env('DB_PASSWORD', default='Not set')}")
print(f"DB_HOST: {env('DB_HOST', default='Not set')}")
print(f"DB_PORT: {env('DB_PORT', default='Not set')}")
print(f"SECRET_KEY: {env('SECRET_KEY', default='Not set')}")
print(f"DEBUG: {env('DEBUG', default=False)}")
print(f"DJANGO_ENVIRONMENT: {env('DJANGO_ENVIRONMENT', default='Not set')}")
print(f"ALLOWED_HOSTS: {env('ALLOWED_HOSTS', default='Not set')}")
print(f"ADMINISTRATE_API_URL: {env('ADMINISTRATE_API_URL', default='Not set')}")
print(f"ADMINISTRATE_API_KEY: {env('ADMINISTRATE_API_KEY', default='Not set')}")

# Test a specific value that should be in .env.development
try:
    # Try to get a required value to confirm proper loading
    db_name = env('DB_NAME')
    print(f"\n✅ SUCCESS: Successfully read DB_NAME: {db_name} from .env.development")
except Exception as e:
    print(f"\n❌ ERROR: Failed to read required environment variable: {str(e)}")
    print("Make sure .env.development exists in the project root and contains the necessary variables.")
