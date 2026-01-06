"""Exam sessions app admin configuration.

Note: ExamSession model has been moved to catalog app and is now registered
in catalog/admin.py. This file is kept for backward compatibility but
no longer registers any models.

DEPRECATED: ExamSession admin is now in catalog.admin.ExamSessionAdmin
"""
from django.contrib import admin

# ExamSession model admin registration moved to catalog/admin.py
# See: catalog.admin.ExamSessionAdmin
