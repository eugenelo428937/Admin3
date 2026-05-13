"""Clear the navigation_data_v3 cache so the dropdowns rebuild with the
fresh ProductProductGroup rows from the backfill."""
from django.core.cache import cache

deleted = cache.delete('navigation_data_v3')
print(f"navigation_data_v3 cache cleared: deleted={deleted}")
