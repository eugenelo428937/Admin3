"""
Tests for rules engine cache invalidation
"""
from django.test import TestCase
from django.core.cache import cache
from rules_engine.models import ActedRule


class CacheInvalidationSignalTest(TestCase):
    """Test that cache is invalidated when rules are modified"""

    def setUp(self):
        """Clear cache before each test"""
        cache.clear()

    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()

    def test_cache_invalidated_on_rule_create(self):
        """Cache should be invalidated when a new rule is created"""
        # Pre-populate cache
        cache_key = "rules:home_page_mount"
        cache.set(cache_key, ["old_cached_data"], timeout=300)

        # Verify cache is set
        self.assertIsNotNone(cache.get(cache_key))

        # Create a new rule
        ActedRule.objects.create(
            rule_code="test_rule_create",
            name="Test Rule Create",
            entry_point="home_page_mount",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )

        # Cache should be invalidated
        self.assertIsNone(cache.get(cache_key))

    def test_cache_invalidated_on_rule_update(self):
        """Cache should be invalidated when a rule is updated"""
        # Create a rule first
        rule = ActedRule.objects.create(
            rule_code="test_rule_update",
            name="Test Rule Update",
            entry_point="checkout_terms",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )

        # Pre-populate cache
        cache_key = "rules:checkout_terms"
        cache.set(cache_key, ["old_cached_data"], timeout=300)

        # Verify cache is set
        self.assertIsNotNone(cache.get(cache_key))

        # Update the rule
        rule.name = "Updated Rule Name"
        rule.save()

        # Cache should be invalidated
        self.assertIsNone(cache.get(cache_key))

    def test_cache_invalidated_on_rule_delete(self):
        """Cache should be invalidated when a rule is deleted"""
        # Create a rule first
        rule = ActedRule.objects.create(
            rule_code="test_rule_delete",
            name="Test Rule Delete",
            entry_point="cart_calculate_vat",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )

        # Pre-populate cache
        cache_key = "rules:cart_calculate_vat"
        cache.set(cache_key, ["old_cached_data"], timeout=300)

        # Verify cache is set
        self.assertIsNotNone(cache.get(cache_key))

        # Delete the rule
        rule.delete()

        # Cache should be invalidated
        self.assertIsNone(cache.get(cache_key))

    def test_cache_key_handles_spaces(self):
        """Cache key should handle entry points with spaces"""
        # Create a rule with spaces in entry point
        ActedRule.objects.create(
            rule_code="test_rule_spaces",
            name="Test Rule Spaces",
            entry_point="home page mount",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )

        # Pre-populate cache with normalized key
        cache_key = "rules:home_page_mount"  # Spaces replaced with underscores
        cache.set(cache_key, ["old_cached_data"], timeout=300)

        # Create another rule to trigger invalidation
        rule = ActedRule.objects.create(
            rule_code="test_rule_spaces_2",
            name="Test Rule Spaces 2",
            entry_point="home page mount",
            priority=101,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test 2"}]
        )

        # Cache should be invalidated (key normalized)
        self.assertIsNone(cache.get(cache_key))


from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory
from rules_engine.admin import ActedRuleAdmin


class AdminCacheInvalidationTest(TestCase):
    """Test admin action for cache invalidation"""

    def setUp(self):
        """Set up test fixtures"""
        cache.clear()
        self.site = AdminSite()
        self.admin = ActedRuleAdmin(ActedRule, self.site)
        self.factory = RequestFactory()

        # Create a superuser for admin requests
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )

    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()

    def _get_request_with_messages(self):
        """Create a request with session and messages support"""
        request = self.factory.post('/admin/')
        request.user = self.user

        # Add session support
        middleware = SessionMiddleware(lambda req: None)
        middleware.process_request(request)
        request.session.save()

        # Add messages support
        request._messages = FallbackStorage(request)
        return request

    def test_admin_has_invalidate_cache_action(self):
        """Admin should have an invalidate_cache action"""
        self.assertIn('invalidate_cache', self.admin.actions)

    def test_admin_action_invalidates_selected_rules_cache(self):
        """Admin action should invalidate cache for selected rules"""
        # Create rules with different entry points
        rule1 = ActedRule.objects.create(
            rule_code="admin_test_rule_1",
            name="Admin Test Rule 1",
            entry_point="home_page_mount",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )
        rule2 = ActedRule.objects.create(
            rule_code="admin_test_rule_2",
            name="Admin Test Rule 2",
            entry_point="checkout_terms",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )

        # Pre-populate caches
        cache.set("rules:home_page_mount", ["cached_data_1"], timeout=300)
        cache.set("rules:checkout_terms", ["cached_data_2"], timeout=300)
        cache.set("rules:cart_calculate_vat", ["cached_data_3"], timeout=300)

        # Create request with messages support
        request = self._get_request_with_messages()

        # Select both rules
        queryset = ActedRule.objects.filter(pk__in=[rule1.pk, rule2.pk])

        # Execute admin action
        self.admin.invalidate_cache(request, queryset)

        # Caches for selected rules should be invalidated
        self.assertIsNone(cache.get("rules:home_page_mount"))
        self.assertIsNone(cache.get("rules:checkout_terms"))

        # Cache for unselected entry point should remain
        self.assertIsNotNone(cache.get("rules:cart_calculate_vat"))


from django.core.management import call_command
from io import StringIO


class ManagementCommandCacheTest(TestCase):
    """Test management command for cache clearing"""

    def setUp(self):
        """Clear cache before each test"""
        cache.clear()

    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()

    def test_clear_all_rules_cache(self):
        """Management command should clear all rules cache"""
        # Create some rules so the command has entry points to find
        ActedRule.objects.create(
            rule_code="cmd_test_rule_1",
            name="Cmd Test Rule 1",
            entry_point="home_page_mount",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )
        ActedRule.objects.create(
            rule_code="cmd_test_rule_2",
            name="Cmd Test Rule 2",
            entry_point="checkout_terms",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )
        ActedRule.objects.create(
            rule_code="cmd_test_rule_3",
            name="Cmd Test Rule 3",
            entry_point="cart_calculate_vat",
            priority=100,
            active=True,
            condition={"always": True},
            actions=[{"type": "display_message", "content": "Test"}]
        )

        # Pre-populate caches
        cache.set("rules:home_page_mount", ["cached_data_1"], timeout=300)
        cache.set("rules:checkout_terms", ["cached_data_2"], timeout=300)
        cache.set("rules:cart_calculate_vat", ["cached_data_3"], timeout=300)
        cache.set("other:unrelated_key", ["should_remain"], timeout=300)

        # Run command
        out = StringIO()
        call_command('clear_rules_cache', stdout=out)

        # All rules caches should be cleared
        self.assertIsNone(cache.get("rules:home_page_mount"))
        self.assertIsNone(cache.get("rules:checkout_terms"))
        self.assertIsNone(cache.get("rules:cart_calculate_vat"))

    def test_clear_specific_entry_point_cache(self):
        """Management command should clear cache for specific entry point"""
        # Pre-populate caches
        cache.set("rules:home_page_mount", ["cached_data_1"], timeout=300)
        cache.set("rules:checkout_terms", ["cached_data_2"], timeout=300)

        # Run command with specific entry point
        out = StringIO()
        call_command('clear_rules_cache', '--entry-point=home_page_mount', stdout=out)

        # Only specified cache should be cleared
        self.assertIsNone(cache.get("rules:home_page_mount"))
        self.assertIsNotNone(cache.get("rules:checkout_terms"))

    def test_command_output_message(self):
        """Management command should output success message"""
        out = StringIO()
        call_command('clear_rules_cache', '--entry-point=home_page_mount', stdout=out)

        output = out.getvalue()
        self.assertIn("home_page_mount", output)
        self.assertIn("invalidated", output.lower())
