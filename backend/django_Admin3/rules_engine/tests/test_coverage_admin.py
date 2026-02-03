"""
Coverage tests for rules_engine/admin.py

Covers:
- ActedRuleAdmin.invalidate_cache action
- ActedRuleAdmin.get_queryset ordering
- ActedRuleExecutionAdmin.has_add_permission
- ActedRuleExecutionAdmin.has_change_permission
"""

from unittest.mock import patch, MagicMock

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.admin.sites import AdminSite

from rules_engine.models import (
    ActedRule, ActedRuleExecution, RuleEntryPoint,
)
from rules_engine.admin import ActedRuleAdmin, ActedRuleExecutionAdmin

User = get_user_model()


class TestActedRuleAdmin(TestCase):
    """Tests for ActedRuleAdmin."""

    def setUp(self):
        self.site = AdminSite()
        self.admin = ActedRuleAdmin(ActedRule, self.site)
        self.factory = RequestFactory()
        self.user = User.objects.create_superuser(
            username='RE_admin_test',
            email='RE_admin@example.com',
            password='testpass123',
        )
        RuleEntryPoint.objects.get_or_create(
            code='checkout_terms',
            defaults={'name': 'Checkout Terms', 'description': 'T&C'},
        )

    def test_get_queryset_ordering(self):
        """Should order by entry_point, priority, name."""
        ActedRule.objects.create(
            rule_code='RE_admin_b',
            name='B Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[],
            priority=5,
            active=True,
        )
        ActedRule.objects.create(
            rule_code='RE_admin_a',
            name='A Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[],
            priority=10,
            active=True,
        )
        request = self.factory.get('/admin/rules_engine/actedrule/')
        request.user = self.user
        qs = self.admin.get_queryset(request)
        # Should be ordered by entry_point, priority, name
        rules = list(qs.values_list('rule_code', flat=True))
        self.assertIn('RE_admin_a', rules)
        self.assertIn('RE_admin_b', rules)

    @patch('rules_engine.signals.invalidate_rule_cache')
    def test_invalidate_cache_action(self, mock_invalidate):
        """Should invalidate cache for each unique entry point."""
        rule1 = ActedRule.objects.create(
            rule_code='RE_cache_1',
            name='Cache Rule 1',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[],
            priority=10,
            active=True,
        )
        rule2 = ActedRule.objects.create(
            rule_code='RE_cache_2',
            name='Cache Rule 2',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[],
            priority=5,
            active=True,
        )
        rule3 = ActedRule.objects.create(
            rule_code='RE_cache_3',
            name='Cache Rule 3',
            entry_point='home_page_mount',
            condition={'==': [1, 1]},
            actions=[],
            priority=1,
            active=True,
        )

        request = self.factory.post('/admin/rules_engine/actedrule/')
        request.user = self.user

        # Mock messages framework
        from django.contrib.messages.storage.fallback import FallbackStorage
        setattr(request, 'session', 'session')
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)

        queryset = ActedRule.objects.filter(
            rule_code__in=['RE_cache_1', 'RE_cache_2', 'RE_cache_3']
        )

        # Reset mock to ignore signal-triggered calls during .create()
        mock_invalidate.reset_mock()

        self.admin.invalidate_cache(request, queryset)

        # Should have called invalidate for 2 unique entry points
        self.assertEqual(mock_invalidate.call_count, 2)
        called_entry_points = {call.args[0] for call in mock_invalidate.call_args_list}
        self.assertIn('checkout_terms', called_entry_points)
        self.assertIn('home_page_mount', called_entry_points)


class TestActedRuleExecutionAdmin(TestCase):
    """Tests for ActedRuleExecutionAdmin."""

    def setUp(self):
        self.site = AdminSite()
        self.admin = ActedRuleExecutionAdmin(ActedRuleExecution, self.site)
        self.factory = RequestFactory()

    def test_has_add_permission_returns_false(self):
        """Should not allow manual creation of execution logs."""
        request = self.factory.get('/admin/')
        self.assertFalse(self.admin.has_add_permission(request))

    def test_has_change_permission_returns_false(self):
        """Should make executions read-only."""
        request = self.factory.get('/admin/')
        self.assertFalse(self.admin.has_change_permission(request))
        self.assertFalse(self.admin.has_change_permission(request, obj=MagicMock()))
