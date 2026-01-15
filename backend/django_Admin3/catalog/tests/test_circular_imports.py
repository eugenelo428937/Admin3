"""Tests for circular import prevention.

Verifies that the catalog consolidation doesn't introduce circular imports
between catalog, subjects, filtering, and products apps.

SC-005: Circular Import Testing
"""
import importlib
import sys
from django.test import TestCase


class TestCircularImportPrevention(TestCase):
    """Test that no circular imports exist between consolidated apps."""

    def _force_reimport(self, module_name):
        """Force a fresh import by clearing the module from sys.modules."""
        # Remove module and its submodules from cache
        modules_to_remove = [key for key in sys.modules if key.startswith(module_name)]
        for module in modules_to_remove:
            del sys.modules[module]

    def test_catalog_import_clean(self):
        """Test catalog.models can be imported without errors."""
        # Import should succeed without ImportError
        from catalog import models
        self.assertIsNotNone(models.Subject)
        self.assertIsNotNone(models.Product)

    def test_subjects_import_after_catalog(self):
        """Test subjects.models can be imported after catalog.models."""
        from catalog import models as catalog_models
        from subjects import models as subjects_models

        # Both should reference the same Subject class
        self.assertIs(subjects_models.Subject, catalog_models.Subject)

    def test_filtering_import_after_catalog(self):
        """Test filtering.models can be imported after catalog.models."""
        from catalog import models as catalog_models
        from filtering import models as filtering_models

        # FilterGroup should be in filtering app
        self.assertIsNotNone(filtering_models.FilterGroup)
        self.assertEqual(filtering_models.FilterGroup._meta.app_label, 'filtering')

    def test_cross_app_import_chain(self):
        """Test importing all apps in sequence doesn't cause errors."""
        # This simulates a Django app loading sequence
        from catalog import models as catalog_models
        from subjects import models as subjects_models
        from filtering import models as filtering_models

        # Verify all imports succeeded
        self.assertIsNotNone(catalog_models.Subject)
        self.assertIsNotNone(subjects_models.Subject)
        self.assertIsNotNone(catalog_models.ExamSession)
        self.assertIsNotNone(catalog_models.Product)
        self.assertIsNotNone(filtering_models.FilterGroup)

    def test_catalog_product_references_filter_group(self):
        """Test catalog.Product can reference filtering.FilterGroup."""
        from catalog.models import ProductProductGroup

        # ProductProductGroup should reference FilterGroup in filtering app
        fk_field = ProductProductGroup._meta.get_field('product_group')
        self.assertEqual(fk_field.related_model._meta.app_label, 'filtering')

    def test_catalog_product_bundle_references_subject(self):
        """Test catalog.ProductBundle can reference catalog.Subject."""
        from catalog.models import ProductBundle

        # ProductBundle has FK to Subject
        bundle_subject_field = ProductBundle._meta.get_field('subject')
        self.assertIsNotNone(bundle_subject_field)
        self.assertEqual(bundle_subject_field.related_model._meta.app_label, 'catalog')
