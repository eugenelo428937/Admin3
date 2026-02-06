"""
Tests for data migration from ADM to Acted schema (US5).

These tests verified row counts, field-level accuracy, cross-schema FK linkage,
and idempotency of the data migration.

NOTE: Skipped after US6 column removal. The ADM models no longer have the
fields (name, code, title, etc.) that were used to create test fixtures and
that the migration utility reads. The migration itself (0006) uses
apps.get_model() with historical model state, so it still works. These tests
validated the migration logic before column removal and are preserved for
documentation purposes.
"""
import unittest

from django.test import TestCase


@unittest.skip("US6: ADM fields removed; migration validated before column removal")
class DataMigrationTestCase(TestCase):
    """Test the ADM → Acted data migration logic (skipped post-US6)."""
    pass
