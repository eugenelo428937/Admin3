"""
Diagnostic script for nav-bar Product Group dropdown → empty product list bug.

Investigates the asymmetric pipeline:
  Pipeline A (label rendering): navigation_data view → frontend dropdown labels  ✓ works (labels appear)
  Pipeline B (filter resolution): frontend dispatch → filter_service              ✗ broken (empty list)

Run with:
    DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
        python manage.py shell < diagnose_filter_group_pipeline.py
"""
from collections import Counter

from django.db import connection
from django.db.models import Count, Q

from filtering.models import FilterGroup
from filtering.models.product_product_group import ProductProductGroup
from filtering.services.filter_service import ProductFilterService
from store.models import Product as StoreProduct
from catalog.products.models.product_product_variation import ProductProductVariation


def banner(msg):
    print("\n" + "=" * 78)
    print(f"  {msg}")
    print("=" * 78)


# ──────────────────────────────────────────────────────────────────────────────
# 1. Raw row counts
# ──────────────────────────────────────────────────────────────────────────────
banner("1. RAW TABLE COUNTS")
print(f"  filter_groups                    : {FilterGroup.objects.count():>6}")
print(f"  filter_groups (is_active=True)   : {FilterGroup.objects.filter(is_active=True).count():>6}")
print(f"  filter_product_product_groups    : {ProductProductGroup.objects.count():>6}")
print(f"  catalog_product_product_variations: {ProductProductVariation.objects.count():>6}")
print(f"  store products (is_active=True)   : {StoreProduct.objects.filter(is_active=True).count():>6}")
print(f"  store products (all)              : {StoreProduct.objects.count():>6}")

# ──────────────────────────────────────────────────────────────────────────────
# 2. What does navigation-data actually return for navbar dropdown?
#    This is Pipeline A — proves the labels exist
# ──────────────────────────────────────────────────────────────────────────────
banner("2. NAVIGATION-DATA DROPDOWN (what frontend renders)")
# These are the groups the navbar dropdown shows. They are identified
# by being roots (parent IS NULL) OR by appearing in the nav config.
# Check both interpretations:
roots = FilterGroup.objects.filter(parent__isnull=True, is_active=True).order_by("display_order", "name")
print(f"\n  Root FilterGroups (parent IS NULL, active): {roots.count()}")
for g in roots[:25]:
    n_ppg = ProductProductGroup.objects.filter(product_group=g).count()
    n_desc = len(g.get_descendants(include_self=True)) if hasattr(g, "get_descendants") else 0
    print(f"    id={g.id:>4}  code={(g.code or '—'):<20}  name={g.name!r:<28}  "
          f"direct_ppg_rows={n_ppg:<5}  descendants={n_desc}")

# Show all distinct group names that actually have any PPG rows
banner("3. FilterGroups that ACTUALLY have rows in filter_product_product_groups")
groups_with_rows = (
    FilterGroup.objects
    .annotate(n=Count("product_product_groups"))
    .filter(n__gt=0)
    .order_by("-n")
)
print(f"\n  Total groups with ≥1 row: {groups_with_rows.count()}")
for g in groups_with_rows[:30]:
    print(f"    id={g.id:>4}  code={(g.code or '—'):<20}  name={g.name!r:<32}  rows={g.n}")

# ──────────────────────────────────────────────────────────────────────────────
# 4. Reverse: what's the frontend dispatching, and does filter_service resolve it?
#    This is Pipeline B — simulate the exact call the navbar makes
# ──────────────────────────────────────────────────────────────────────────────
banner("4. SIMULATE FILTER RESOLUTION (Pipeline B)")
# The nav bar dispatches navSelectProductGroup(group.name). The backend
# then receives filters['product_types'] = [name] and runs it through
# ProductFilterService.apply_store_product_filters().
#
# Try the most likely dispatched values, based on what the dropdown shows.

candidate_dispatches = [
    "Tutorial", "Tutorials",
    "Exam Papers", "Exam Paper",
    "Material", "Materials",
    "Marking",
    "Online Classroom",
    "Bundle", "Bundles",
    "Core Study Material",
    "Revision Material",
]

svc = ProductFilterService()
base_qs = StoreProduct.objects.filter(is_active=True)
print(f"\n  Base queryset (active store products): {base_qs.count()}\n")
print(f"  {'dispatched value':<28} {'resolved IDs':<24} {'qs after filter':>16}")
print(f"  {'-' * 28} {'-' * 24} {'-' * 16}")

for value in candidate_dispatches:
    # Mimic exactly what the API view does
    filters = {"product_types": [value]}
    try:
        # Direct: ask the internal hierarchy resolver what IDs it found
        # The method is private but we need to see the resolution
        ids = svc._resolve_group_ids_with_hierarchy([value]) if hasattr(svc, "_resolve_group_ids_with_hierarchy") else "<no resolver>"
        # Then run the full filter
        result_qs = svc.apply_filters(base_qs, filters)
        n_result = result_qs.count()
    except Exception as e:
        ids = f"ERROR: {e}"
        n_result = -1
    print(f"  {value!r:<28} {str(ids):<24} {n_result:>16}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. Orphan check: PPVs that are referenced by active store products
#    but have ZERO rows in filter_product_product_groups
# ──────────────────────────────────────────────────────────────────────────────
banner("5. ORPHANED PRODUCT-VARIATIONS (active products with no filter group)")
active_ppv_ids = set(
    StoreProduct.objects.filter(is_active=True)
    .values_list("product_product_variation_id", flat=True)
)
ppv_ids_with_groups = set(
    ProductProductGroup.objects
    .filter(product_product_variation_id__in=active_ppv_ids)
    .values_list("product_product_variation_id", flat=True)
)
orphaned = active_ppv_ids - ppv_ids_with_groups
print(f"\n  Active store products' PPVs        : {len(active_ppv_ids)}")
print(f"  PPVs with ≥1 filter group row      : {len(ppv_ids_with_groups)}")
print(f"  ORPHANED PPVs (no group row)       : {len(orphaned)}")
if orphaned:
    sample = ProductProductVariation.objects.filter(id__in=list(orphaned)[:10]).select_related("product", "product_variation")
    print("\n  Sample orphaned PPVs:")
    for ppv in sample:
        prod_name = getattr(ppv.product, "shortname", None) or getattr(ppv.product, "code", "?")
        var_name = getattr(ppv.product_variation, "code", None) or getattr(ppv.product_variation, "name", "?")
        print(f"    ppv_id={ppv.id:<6} product={prod_name!r:<20} variation={var_name!r}")

# ──────────────────────────────────────────────────────────────────────────────
# 6. What's actually in the navbar dropdown? Hit the actual cache-bypassing
#    code path used by the navigation view
# ──────────────────────────────────────────────────────────────────────────────
banner("6. WHAT NAVIGATION-DATA WOULD RETURN AS DROPDOWN ITEMS")
# Bypass the cache, read the actual view logic directly
try:
    from django.core.cache import cache
    cached = cache.get("navigation_data_v3")
    if cached:
        print("  Cache HIT (navigation_data_v3 in cache)")
        navbar_groups = cached.get("navbar_product_groups", {}).get("results", [])
        print(f"  navbar_product_groups.results count: {len(navbar_groups)}")
        for g in navbar_groups[:15]:
            print(f"    name={g.get('name')!r:<28} id={g.get('id')!r:<6} num_products={len(g.get('products', []))}")
    else:
        print("  Cache MISS — would need to invoke the view to compute fresh")
except Exception as e:
    print(f"  Could not read cache: {e}")

# ──────────────────────────────────────────────────────────────────────────────
# 7. Recent migrations on filter_product_product_groups
# ──────────────────────────────────────────────────────────────────────────────
banner("7. RECENT MIGRATIONS APPLIED")
with connection.cursor() as cur:
    cur.execute(
        "SELECT app, name, applied FROM django_migrations "
        "WHERE app='filtering' ORDER BY applied DESC LIMIT 10"
    )
    for row in cur.fetchall():
        print(f"  {row[2]}  {row[0]}.{row[1]}")

print("\n" + "=" * 78)
print("  DIAGNOSIS COMPLETE")
print("=" * 78)
