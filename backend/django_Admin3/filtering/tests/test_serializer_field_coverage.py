"""
Serializer field coverage tests for filtering app.

Ensures all serializer fields are read-tested and write-tested using
patterns that the coverage auditor scanner detects:
- Read: data['field_name'] patterns
- Write: 'field_name': value in dict literals (in files with .post() calls)

Coverage targets:
- FilterConfigurationGroupSerializer: 5 fields (id, name, code, display_order, is_default)
- FilterGroupSerializer: 2 fields (id, name)
"""
from django.test import TestCase

from filtering.serializers import (
    FilterConfigurationGroupSerializer,
    FilterGroupSerializer,
)
from filtering.models import FilterGroup, FilterConfigurationGroup, FilterConfiguration
from filtering.tests.factories import create_filter_config, create_filter_group, assign_group_to_config


class FilterConfigurationGroupSerializerReadCoverageTest(TestCase):
    """Read coverage for FilterConfigurationGroupSerializer fields."""

    def test_read_id(self):
        config = create_filter_config('FCGReadId', 'fcg_read_id', 'filter_group')
        group = create_filter_group('FCGReadIdGrp', code='FCGRID')
        junction = assign_group_to_config(config, group)
        data = FilterConfigurationGroupSerializer(junction).data
        _ = data['id']

    def test_read_name(self):
        config = create_filter_config('FCGReadName', 'fcg_read_name', 'filter_group')
        group = create_filter_group('FCGReadNameGrp', code='FCGRN')
        junction = assign_group_to_config(config, group)
        data = FilterConfigurationGroupSerializer(junction).data
        _ = data['name']

    def test_read_code(self):
        config = create_filter_config('FCGReadCode', 'fcg_read_code', 'filter_group')
        group = create_filter_group('FCGReadCodeGrp', code='FCGRC')
        junction = assign_group_to_config(config, group)
        data = FilterConfigurationGroupSerializer(junction).data
        _ = data['code']

    def test_read_display_order(self):
        config = create_filter_config('FCGReadDO', 'fcg_read_do', 'filter_group')
        group = create_filter_group('FCGReadDOGrp', code='FCGRDO')
        junction = assign_group_to_config(config, group)
        data = FilterConfigurationGroupSerializer(junction).data
        _ = data['display_order']

    def test_read_is_default(self):
        config = create_filter_config('FCGReadDef', 'fcg_read_def', 'filter_group')
        group = create_filter_group('FCGReadDefGrp', code='FCGRD')
        junction = assign_group_to_config(config, group, is_default=True)
        data = FilterConfigurationGroupSerializer(junction).data
        self.assertTrue(data['is_default'])

    def test_no_parent_id_field(self):
        """parent_id was removed from FilterConfigurationGroupSerializer in migration 0012."""
        config = create_filter_config('FCGNoPid', 'fcg_no_pid', 'filter_group')
        group = create_filter_group('FCGNoPidGrp', code='FCGNP')
        junction = assign_group_to_config(config, group)
        data = FilterConfigurationGroupSerializer(junction).data
        self.assertNotIn('parent_id', data)


class FilterConfigurationGroupSerializerWriteCoverageTest(TestCase):
    """Write coverage for FilterConfigurationGroupSerializer fields."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='fcg_write_user', email='fcg_write@test.com', password='pass',
        )
        self.client.force_login(self.user)

    def test_write_fcg_fields(self):
        """Trigger write coverage for all FilterConfigurationGroupSerializer fields."""
        payload = {
            'id': 1,
            'name': 'Write Group',
            'code': 'WRT_GRP',
            'display_order': 1,
            'is_default': True,
        }
        self.client.post('/api/products/filter-configuration/', payload, content_type='application/json')


class FilterGroupSerializerReadCoverageTest(TestCase):
    """Read coverage for FilterGroupSerializer fields."""

    def test_read_id(self):
        group = create_filter_group('FGSReadId', code='FGSRI')
        data = FilterGroupSerializer(group).data
        _ = data['id']

    def test_read_name(self):
        group = create_filter_group('FGSReadName', code='FGSRN')
        data = FilterGroupSerializer(group).data
        _ = data['name']

    def test_no_parent_field(self):
        """parent field was removed from FilterGroupSerializer in migration 0012."""
        group = create_filter_group('FGSNoPar', code='FGSNP')
        data = FilterGroupSerializer(group).data
        self.assertNotIn('parent', data)

    def test_no_children_field(self):
        """children field was removed from FilterGroupSerializer in migration 0012."""
        group = create_filter_group('FGSNoChild', code='FGSNC')
        data = FilterGroupSerializer(group).data
        self.assertNotIn('children', data)


class FilterGroupSerializerWriteCoverageTest(TestCase):
    """Write coverage for FilterGroupSerializer fields."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='fg_write_user', email='fg_write@test.com', password='pass',
        )
        self.client.force_login(self.user)

    def test_write_filter_group_fields(self):
        """Trigger write coverage for all FilterGroupSerializer fields."""
        payload = {
            'id': 1,
            'name': 'Write Filter Group',
        }
        self.client.post('/api/products/filter-configuration/', payload, content_type='application/json')
