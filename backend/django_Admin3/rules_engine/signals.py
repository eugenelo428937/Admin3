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
