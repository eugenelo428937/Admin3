# Eager DB queries at module import time

## Symptom

Running `python manage.py migrate` against a **fresh, empty** PostgreSQL
database fails before any migration is applied, with a stack trace like:

```
django.db.utils.ProgrammingError: relation "acted.filter_configurations" does not exist
  ...
  File "search/services/search_service.py", line 749, in <module>
      search_service = SearchService()
  File "search/services/search_service.py", line 41, in __init__
      self.filter_service = ProductFilterService()
  File "filtering/services/filter_service.py", line 128, in __init__
      self._load_filter_configurations()
  File "filtering/services/filter_service.py", line 136, in _load_filter_configurations
      for config in configs:          # queryset hits acted.filter_configurations
```

The workaround is `python manage.py migrate --skip-checks`, which
bypasses Django's system checks so the migrations can run and create
the tables those checks would otherwise try to query.

## Root cause

Two service singletons are instantiated at module-import time and each
`__init__` issues a Django ORM query:

| File | Line (approx) | Offending statement |
|---|---|---|
| `search/services/search_service.py` | 749 | `search_service = SearchService()` |
| `filtering/services/filter_service.py` | 128 | `ProductFilterService.__init__` -> `_load_filter_configurations()` -> `FilterConfiguration.objects.all()` |

When Django imports `django_Admin3.urls` during `check` (which `migrate`
runs before applying migrations, unless `--skip-checks` is passed), it
transitively imports `search.urls` -> `search.views` -> `search.services`
-> executes the `search_service = SearchService()` line, which triggers
the ORM call. On a fresh DB the table doesn't exist yet; on a populated
DB the query succeeds but is wasted work every time any management
command is run.

## Impact

1. **Fresh-DB bootstrap is broken without a workaround.** Any developer
   dropping and recreating `ACTEDDBDEV01` (or CI building a new test DB
   via a non-standard path) has to know the `--skip-checks` incantation.
   New joiners hit this on day one.
2. **Every management command pays a query tax.** `manage.py shell`,
   `makemigrations`, `collectstatic`, custom commands — all of them
   import the URL tree (because `check` is part of the default flow),
   which eagerly constructs `SearchService` and runs its filter-config
   query even when the command has nothing to do with search. Small
   individually, compounds in CI.
3. **Testing side-effects.** Pytest/Django test collection also imports
   URL conf; the singleton is created against whatever DB alias is
   current. This is why some test files accidentally depend on the
   `filter_configurations` fixture being present even when the test
   itself doesn't use it.
4. **Singleton lifetime is wrong.** A process-scoped singleton that
   caches `FilterConfiguration` rows in memory never reloads when an
   admin updates the config. You have to restart the process to see
   new values — which is exactly backwards of what "live config"
   should mean.

## Recommended fix

Replace module-level singletons with lazy accessors. Two options:

**Option A — factory function + `functools.lru_cache`**

```python
# search/services/search_service.py
from functools import lru_cache

class SearchService:
    ...

@lru_cache(maxsize=1)
def get_search_service() -> SearchService:
    return SearchService()
```

Call sites change `from .search_service import search_service` ->
`from .search_service import get_search_service` and use
`get_search_service()`. `lru_cache` makes it a lazy singleton; you can
invalidate via `get_search_service.cache_clear()` when admin updates
the filter config.

**Option B — class-level cached_property on a request-scoped holder**

If the service is only needed inside view code, move construction into
a DRF view mixin or a small `get_or_create` helper that lives on
`request`. This also makes it easier to swap out in tests.

Either option should:
- remove the module-level instantiation line,
- let `_load_filter_configurations` run only when someone asks for
  the service,
- make the import of `search.urls` a pure metadata step that runs no
  SQL.

## Scope

Not just `search/services/search_service.py` — do a project-wide sweep
for the same pattern. A quick grep for lines matching
`^\w+ = \w+Service\(\)` at module scope in `services/` directories will
surface any others. Fix them uniformly.

## Priority

Medium. `--skip-checks` is a one-word workaround so this isn't blocking
anyone, but it's a sharp edge for newcomers and it silently wastes work
on every management command invocation. Good candidate for a small
focused cleanup PR.
