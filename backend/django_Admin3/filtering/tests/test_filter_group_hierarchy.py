"""Smoke tests for FilterGroup.get_descendants() hierarchy resolution.

Verifies the existing get_descendants() method works correctly at all
depth levels, which is critical for US3 (Hierarchical Filter Resolution).
"""
from django.test import TestCase

from filtering.tests.factories import create_filter_group


class TestFilterGroupGetDescendants(TestCase):
    """Test FilterGroup.get_descendants() returns correct hierarchy."""

    def setUp(self):
        """Create a 3-level hierarchy: Material > Core/Revision > Sub-items."""
        self.material = create_filter_group('Material', code='MATERIAL')
        self.core = create_filter_group(
            'Core Study Materials', parent=self.material, code='CORE'
        )
        self.revision = create_filter_group(
            'Revision Materials', parent=self.material, code='REVISION'
        )
        self.core_text = create_filter_group(
            'Study Text', parent=self.core, code='STUDY_TEXT'
        )
        self.core_kit = create_filter_group(
            'Course Kit', parent=self.core, code='COURSE_KIT'
        )
        # Standalone group (no parent, no children)
        self.standalone = create_filter_group('Standalone', code='STANDALONE')

    def test_root_get_descendants_includes_self(self):
        """Root.get_descendants(include_self=True) returns root + all children."""
        descendants = self.material.get_descendants(include_self=True)
        ids = {g.id for g in descendants}
        self.assertEqual(ids, {
            self.material.id,
            self.core.id,
            self.revision.id,
            self.core_text.id,
            self.core_kit.id,
        })

    def test_root_get_descendants_excludes_self(self):
        """Root.get_descendants(include_self=False) returns only children."""
        descendants = self.material.get_descendants(include_self=False)
        ids = {g.id for g in descendants}
        self.assertEqual(ids, {
            self.core.id,
            self.revision.id,
            self.core_text.id,
            self.core_kit.id,
        })
        self.assertNotIn(self.material.id, ids)

    def test_mid_level_get_descendants(self):
        """Mid-level group returns itself + its children."""
        descendants = self.core.get_descendants(include_self=True)
        ids = {g.id for g in descendants}
        self.assertEqual(ids, {
            self.core.id,
            self.core_text.id,
            self.core_kit.id,
        })

    def test_leaf_get_descendants(self):
        """Leaf group returns only itself."""
        descendants = self.core_text.get_descendants(include_self=True)
        self.assertEqual(len(descendants), 1)
        self.assertEqual(descendants[0].id, self.core_text.id)

    def test_leaf_get_descendants_excludes_self(self):
        """Leaf group with include_self=False returns empty list."""
        descendants = self.core_text.get_descendants(include_self=False)
        self.assertEqual(len(descendants), 0)

    def test_standalone_group(self):
        """Group with no parent or children returns only itself."""
        descendants = self.standalone.get_descendants(include_self=True)
        self.assertEqual(len(descendants), 1)
        self.assertEqual(descendants[0].id, self.standalone.id)

    def test_revision_has_no_children(self):
        """Revision group (no children) returns only itself."""
        descendants = self.revision.get_descendants(include_self=True)
        self.assertEqual(len(descendants), 1)
        self.assertEqual(descendants[0].id, self.revision.id)

    def test_descendants_count(self):
        """Material has exactly 4 descendants (excluding self)."""
        descendants = self.material.get_descendants(include_self=False)
        self.assertEqual(len(descendants), 4)
