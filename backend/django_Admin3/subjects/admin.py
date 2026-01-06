"""Subjects app admin configuration.

Note: Subject model has been moved to catalog app and is now registered
in catalog/admin.py. This file is kept for backward compatibility but
no longer registers any models.

DEPRECATED: Subject admin is now in catalog.admin.SubjectAdmin
"""
from django.contrib import admin

# Subject model admin registration moved to catalog/admin.py
# See: catalog.admin.SubjectAdmin
