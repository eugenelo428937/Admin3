"""
Staff model - re-exported from staff app for backward compatibility.

The Staff model has been moved to the staff app.
This module re-exports it so existing imports continue to work.
"""
from staff.models import Staff  # noqa: F401

__all__ = ['Staff']
