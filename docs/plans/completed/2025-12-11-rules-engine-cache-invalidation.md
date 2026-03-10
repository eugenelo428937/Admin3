# Rules Engine Cache Invalidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically invalidate the rules engine cache when rules are created, updated, or deleted via Django admin, ensuring rule changes are immediately reflected.

**Architecture:** Django signals on the `ActedRule` model trigger cache invalidation via the existing `RuleRepository.invalidate_cache()` method. Additionally, a Django admin action and management command provide manual cache clearing options.

**Tech Stack:** Django signals, Django cache framework, Django admin actions, Django management commands

---

## Background

The rules engine caches active rules per entry point for 5 minutes (300 seconds). The `RuleRepository.invalidate_cache()` method exists but is never called, causing rule updates to not reflect until cache expires.

**Current Behavior:** Rules cached for 5 minutes regardless of updates
**Desired Behavior:** Cache invalidated immediately when any rule is modified

---

## Task 1: Create Signal Handler for Cache Invalidation

**Files:**
- Create: `backend/django_Admin3/rules_engine/signals.py`
- Test: `backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py`

**Step 1: Write the failing test**

Create the test file:

```python
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation -v 2
```

Expected: FAIL - tests will fail because signals.py doesn't exist and signals aren't connected

**Step 3: Write the signal handler**

Create `backend/django_Admin3/rules_engine/signals.py`:

```python
"""
Django signals for rules engine cache invalidation.

When ActedRule models are created, updated, or deleted, the corresponding
cache entry is invalidated to ensure rule changes are immediately reflected.
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

logger = logging.getLogger(__name__)


def invalidate_rule_cache(entry_point: str) -> None:
    """
    Invalidate cache for the given entry point.

    Args:
        entry_point: The entry point code (e.g., 'home_page_mount')
    """
    # Normalize cache key: replace spaces with underscores, lowercase
    safe_entry_point = entry_point.replace(' ', '_').lower()
    cache_key = f"rules:{safe_entry_point}"

    cache.delete(cache_key)
    logger.info(f"Invalidated rules cache for entry point: {entry_point} (key: {cache_key})")


@receiver(post_save, sender='rules_engine.ActedRule')
def invalidate_cache_on_rule_save(sender, instance, created, **kwargs):
    """
    Invalidate cache when a rule is created or updated.

    Args:
        sender: The model class (ActedRule)
        instance: The actual instance being saved
        created: Boolean; True if a new record was created
        **kwargs: Additional keyword arguments
    """
    action = "created" if created else "updated"
    logger.debug(f"Rule {instance.rule_code} {action}, invalidating cache for {instance.entry_point}")
    invalidate_rule_cache(instance.entry_point)


@receiver(post_delete, sender='rules_engine.ActedRule')
def invalidate_cache_on_rule_delete(sender, instance, **kwargs):
    """
    Invalidate cache when a rule is deleted.

    Args:
        sender: The model class (ActedRule)
        instance: The actual instance being deleted
        **kwargs: Additional keyword arguments
    """
    logger.debug(f"Rule {instance.rule_code} deleted, invalidating cache for {instance.entry_point}")
    invalidate_rule_cache(instance.entry_point)
```

**Step 4: Run test to verify it still fails (signals not connected)**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation -v 2
```

Expected: FAIL - signals exist but aren't connected yet

**Step 5: Connect signals in apps.py**

Modify `backend/django_Admin3/rules_engine/apps.py`:

```python
from django.apps import AppConfig


class RulesEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rules_engine'

    def ready(self):
        """Import signals when app is ready to connect them"""
        import rules_engine.signals  # noqa: F401
```

**Step 6: Run test to verify it passes**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation -v 2
```

Expected: PASS - all 4 tests should pass

**Step 7: Commit**

```bash
git add backend/django_Admin3/rules_engine/signals.py backend/django_Admin3/rules_engine/apps.py backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py
git commit -m "feat(rules-engine): add automatic cache invalidation on rule changes

Implement Django signals to invalidate rules cache when ActedRule
models are created, updated, or deleted. This ensures rule changes
are immediately reflected without waiting for cache expiry.

- Add signals.py with post_save and post_delete handlers
- Connect signals in apps.py ready() method
- Add comprehensive test coverage for cache invalidation"
```

---

## Task 2: Add Django Admin Action for Manual Cache Invalidation

**Files:**
- Modify: `backend/django_Admin3/rules_engine/admin.py:77-111`
- Test: `backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py` (append)

**Step 1: Write the failing test**

Append to `backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py`:

```python
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
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

        # Create request
        request = self.factory.post('/admin/')
        request.user = self.user

        # Select both rules
        queryset = ActedRule.objects.filter(pk__in=[rule1.pk, rule2.pk])

        # Execute admin action
        self.admin.invalidate_cache(request, queryset)

        # Caches for selected rules should be invalidated
        self.assertIsNone(cache.get("rules:home_page_mount"))
        self.assertIsNone(cache.get("rules:checkout_terms"))

        # Cache for unselected entry point should remain
        self.assertIsNotNone(cache.get("rules:cart_calculate_vat"))
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation.AdminCacheInvalidationTest -v 2
```

Expected: FAIL - `invalidate_cache` action doesn't exist

**Step 3: Add admin action to ActedRuleAdmin**

Modify `backend/django_Admin3/rules_engine/admin.py`. Replace the `ActedRuleAdmin` class (lines 77-111) with:

```python
@admin.register(ActedRule)
class ActedRuleAdmin(admin.ModelAdmin):
    list_display = ['rule_code', 'name', 'entry_point', 'priority', 'active', 'version', 'created_at']
    list_filter = ['entry_point', 'active', 'priority', 'version', 'created_at']
    search_fields = ['rule_code', 'name', 'description', 'entry_point__code']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['invalidate_cache']

    fieldsets = [
        ('Rule Identification', {
            'fields': ['rule_code', 'name', 'description', 'version']
        }),
        ('Execution Settings', {
            'fields': ['entry_point', 'priority', 'active', 'stop_processing']
        }),
        ('Rule Definition', {
            'fields': ['rules_fields_code', 'condition', 'actions'],
            'classes': ['wide']
        }),
        ('Schedule', {
            'fields': ['active_from', 'active_until'],
            'classes': ['collapse']
        }),
        ('Metadata', {
            'fields': ['metadata'],
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]

    def get_queryset(self, request):
        return super().get_queryset(request).order_by('entry_point', 'priority', 'name')

    @admin.action(description="Invalidate cache for selected rules")
    def invalidate_cache(self, request, queryset):
        """
        Admin action to manually invalidate cache for selected rules.

        Invalidates the cache for each unique entry point in the selected rules.
        """
        from django.contrib import messages
        from .signals import invalidate_rule_cache

        # Get unique entry points from selected rules
        entry_points = set(queryset.values_list('entry_point', flat=True))

        # Invalidate cache for each entry point
        for entry_point in entry_points:
            invalidate_rule_cache(entry_point)

        # Show success message
        count = len(entry_points)
        self.message_user(
            request,
            f"Successfully invalidated cache for {count} entry point(s): {', '.join(entry_points)}",
            messages.SUCCESS
        )
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation.AdminCacheInvalidationTest -v 2
```

Expected: PASS

**Step 5: Run all cache invalidation tests**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation -v 2
```

Expected: PASS - all tests should pass

**Step 6: Commit**

```bash
git add backend/django_Admin3/rules_engine/admin.py backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py
git commit -m "feat(rules-engine): add admin action to manually invalidate cache

Add 'Invalidate cache for selected rules' action to ActedRuleAdmin.
This allows staff to manually clear cache for specific entry points
when needed, complementing the automatic signal-based invalidation."
```

---

## Task 3: Add Management Command for Cache Clearing

**Files:**
- Create: `backend/django_Admin3/rules_engine/management/commands/clear_rules_cache.py`
- Test: `backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py` (append)

**Step 1: Write the failing test**

Append to `backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py`:

```python
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

        # Unrelated cache should remain (if cache backend supports pattern delete)
        # Note: Django's default cache doesn't support pattern delete,
        # so this may or may not remain depending on implementation

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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation.ManagementCommandCacheTest -v 2
```

Expected: FAIL - management command doesn't exist

**Step 3: Create the management command**

Create `backend/django_Admin3/rules_engine/management/commands/clear_rules_cache.py`:

```python
"""
Management command to clear rules engine cache.

Usage:
    # Clear all rules cache (based on entry points in database)
    python manage.py clear_rules_cache

    # Clear cache for specific entry point
    python manage.py clear_rules_cache --entry-point=home_page_mount

    # Clear cache for multiple entry points
    python manage.py clear_rules_cache --entry-point=home_page_mount --entry-point=checkout_terms
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache

from rules_engine.models import ActedRule, RuleEntryPoint


class Command(BaseCommand):
    help = 'Clear rules engine cache for specified or all entry points'

    def add_arguments(self, parser):
        parser.add_argument(
            '--entry-point',
            action='append',
            dest='entry_points',
            help='Specific entry point(s) to clear cache for. Can be specified multiple times.',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            dest='clear_all',
            help='Clear cache for ALL entry points (based on database records)',
        )

    def handle(self, *args, **options):
        entry_points = options.get('entry_points')
        clear_all = options.get('clear_all')

        if entry_points:
            # Clear specific entry points
            for entry_point in entry_points:
                self._invalidate_cache(entry_point)
                self.stdout.write(
                    self.style.SUCCESS(f"Cache invalidated for entry point: {entry_point}")
                )
        elif clear_all or not entry_points:
            # Clear all entry points found in database
            # Get unique entry points from both RuleEntryPoint and ActedRule
            db_entry_points = set()

            # From RuleEntryPoint model
            db_entry_points.update(
                RuleEntryPoint.objects.filter(is_active=True).values_list('code', flat=True)
            )

            # From ActedRule model (in case there are rules with entry points not in RuleEntryPoint)
            db_entry_points.update(
                ActedRule.objects.values_list('entry_point', flat=True).distinct()
            )

            if not db_entry_points:
                self.stdout.write(
                    self.style.WARNING("No entry points found in database")
                )
                return

            for entry_point in db_entry_points:
                self._invalidate_cache(entry_point)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Cache invalidated for {len(db_entry_points)} entry point(s): "
                    f"{', '.join(sorted(db_entry_points))}"
                )
            )

    def _invalidate_cache(self, entry_point: str) -> None:
        """Invalidate cache for the given entry point."""
        # Normalize cache key: replace spaces with underscores, lowercase
        safe_entry_point = entry_point.replace(' ', '_').lower()
        cache_key = f"rules:{safe_entry_point}"
        cache.delete(cache_key)
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation.ManagementCommandCacheTest -v 2
```

Expected: PASS

**Step 5: Run ALL cache invalidation tests**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation -v 2
```

Expected: PASS - all tests should pass

**Step 6: Commit**

```bash
git add backend/django_Admin3/rules_engine/management/commands/clear_rules_cache.py backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py
git commit -m "feat(rules-engine): add management command to clear rules cache

Add clear_rules_cache management command for manual cache clearing:
- Clear all entry point caches: python manage.py clear_rules_cache
- Clear specific: python manage.py clear_rules_cache --entry-point=home_page_mount

Useful for deployment scripts and troubleshooting."
```

---

## Task 4: Run Full Test Suite and Verify No Regressions

**Files:**
- No new files

**Step 1: Run all rules_engine tests**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine -v 2
```

Expected: PASS - all existing tests should still pass

**Step 2: Run specific cache invalidation tests**

Run:
```bash
cd backend/django_Admin3 && python manage.py test rules_engine.tests.test_cache_invalidation -v 2
```

Expected: PASS - all 9 new tests should pass

**Step 3: Verify cache invalidation works manually**

Run Django shell:
```bash
cd backend/django_Admin3 && python manage.py shell
```

Execute in shell:
```python
from django.core.cache import cache
from rules_engine.models import ActedRule

# Check current cache
print("Before:", cache.get("rules:home_page_mount"))

# Pre-populate cache
cache.set("rules:home_page_mount", ["test_data"], timeout=300)
print("After set:", cache.get("rules:home_page_mount"))

# Create a rule (should trigger signal)
rule = ActedRule.objects.create(
    rule_code="manual_test_rule",
    name="Manual Test",
    entry_point="home_page_mount",
    priority=999,
    active=False,
    condition={"always": True},
    actions=[{"type": "display_message", "content": "Test"}]
)
print("After create:", cache.get("rules:home_page_mount"))  # Should be None

# Cleanup
rule.delete()
```

Expected: Cache should be None after rule creation

**Step 4: Commit final verification**

```bash
git add -A
git commit -m "test(rules-engine): verify cache invalidation implementation

All rules_engine tests passing including:
- 4 signal-based cache invalidation tests
- 3 admin action tests
- 2 management command tests

Cache invalidation now works automatically on rule save/delete."
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Signal handler for automatic invalidation | 4 tests |
| 2 | Admin action for manual invalidation | 3 tests |
| 3 | Management command for cache clearing | 2 tests |
| 4 | Full test suite verification | Regression check |

**Total new tests:** 9

**Files created:**
- `backend/django_Admin3/rules_engine/signals.py`
- `backend/django_Admin3/rules_engine/tests/test_cache_invalidation.py`
- `backend/django_Admin3/rules_engine/management/commands/clear_rules_cache.py`

**Files modified:**
- `backend/django_Admin3/rules_engine/apps.py`
- `backend/django_Admin3/rules_engine/admin.py`
