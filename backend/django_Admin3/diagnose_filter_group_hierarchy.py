"""Dump the full FilterGroup hierarchy and every distinct ProductVariation.variation_type.

Needed to decide: (a) which DB FilterGroups should back the navbar slots that
currently call themselves 'Core Study Materials', 'Revision Materials',
'Online Classroom Recording', and (b) how to map 157 orphaned PPVs to groups
by variation_type.

Run:
    DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
        python manage.py shell < diagnose_filter_group_hierarchy.py
"""
from collections import Counter, defaultdict

from filtering.models import FilterGroup
from filtering.models.product_product_group import ProductProductGroup
from catalog.products.models.product_product_variation import ProductProductVariation
from catalog.products.models.product_variation import ProductVariation
from store.models import Product as StoreProduct


def banner(msg):
    print("\n" + "=" * 78)
    print(f"  {msg}")
    print("=" * 78)


# ──────────────────────────────────────────────────────────────────────────────
# 1. Full FilterGroup tree
# ──────────────────────────────────────────────────────────────────────────────
banner("1. FULL FILTER GROUP TREE")

def print_tree(node, indent=0):
    n_direct = ProductProductGroup.objects.filter(product_group=node).count()
    marker = "▶" if n_direct > 0 else "·"
    print(f"  {'    ' * indent}{marker} id={node.id:<4} code={(node.code or '—'):<20} "
          f"name={node.name!r:<32} direct_rows={n_direct}")
    for child in FilterGroup.objects.filter(parent=node).order_by("display_order", "name"):
        print_tree(child, indent + 1)

for root in FilterGroup.objects.filter(parent__isnull=True).order_by("display_order", "name"):
    print_tree(root)

# ──────────────────────────────────────────────────────────────────────────────
# 2. Distinct variation_types in PPVs — needed for the variation_type → group mapping
# ──────────────────────────────────────────────────────────────────────────────
banner("2. VARIATION_TYPE DISTRIBUTION (all PPVs)")

variation_types = (
    ProductVariation.objects
    .values_list("variation_type", flat=True)
)
counts = Counter(variation_types)
for vtype, count in counts.most_common():
    print(f"    variation_type={(vtype or '<None>'):<25} pv_count={count}")

# ──────────────────────────────────────────────────────────────────────────────
# 3. For each variation_type: how many PPVs are orphaned vs. have a group?
# ──────────────────────────────────────────────────────────────────────────────
banner("3. ORPHAN BREAKDOWN BY variation_type")

active_ppv_ids = set(
    StoreProduct.objects.filter(is_active=True)
    .values_list("product_product_variation_id", flat=True)
)
ppv_ids_with_groups = set(
    ProductProductGroup.objects
    .filter(product_product_variation_id__in=active_ppv_ids)
    .values_list("product_product_variation_id", flat=True)
)

# Group PPVs by their variation_type
ppvs = (
    ProductProductVariation.objects
    .filter(id__in=active_ppv_ids)
    .select_related("product_variation")
)

by_vtype = defaultdict(lambda: {"total": 0, "orphan": 0, "ppvs": []})
for ppv in ppvs:
    vtype = ppv.product_variation.variation_type if ppv.product_variation else None
    bucket = by_vtype[vtype or "<None>"]
    bucket["total"] += 1
    if ppv.id not in ppv_ids_with_groups:
        bucket["orphan"] += 1
        bucket["ppvs"].append(ppv)

print(f"\n  {'variation_type':<25} {'total':>8} {'orphan':>8} {'pct':>6}")
print(f"  {'-' * 25} {'-' * 8} {'-' * 8} {'-' * 6}")
for vtype, stats in sorted(by_vtype.items(), key=lambda x: -x[1]["orphan"]):
    pct = (stats["orphan"] / stats["total"] * 100) if stats["total"] else 0
    print(f"  {vtype:<25} {stats['total']:>8} {stats['orphan']:>8} {pct:>5.1f}%")

# ──────────────────────────────────────────────────────────────────────────────
# 4. For non-orphaned PPVs, which FilterGroup(s) do they typically map to,
#    grouped by their variation_type? This tells us the "correct" mapping
#    learned from existing good data.
# ──────────────────────────────────────────────────────────────────────────────
banner("4. variation_type → FilterGroup MAPPING (learned from existing rows)")

ppg_rows = (
    ProductProductGroup.objects
    .select_related("product_product_variation__product_variation", "product_group")
)

vtype_to_groups = defaultdict(Counter)
for ppg in ppg_rows:
    pv = ppg.product_product_variation.product_variation
    vtype = pv.variation_type if pv else "<None>"
    vtype_to_groups[vtype][ppg.product_group.name] += 1

print(f"\n  {'variation_type':<25} {'group_name':<40} {'count':>6}")
print(f"  {'-' * 25} {'-' * 40} {'-' * 6}")
for vtype, group_counts in sorted(vtype_to_groups.items()):
    for group_name, count in group_counts.most_common():
        print(f"  {vtype:<25} {group_name!r:<40} {count:>6}")
    print()

# ──────────────────────────────────────────────────────────────────────────────
# 5. Sample of orphans by variation_type — what they look like, to validate
#    the proposed mapping
# ──────────────────────────────────────────────────────────────────────────────
banner("5. SAMPLE ORPHANS BY variation_type")
for vtype, stats in sorted(by_vtype.items(), key=lambda x: -x[1]["orphan"]):
    if stats["orphan"] == 0:
        continue
    print(f"\n  variation_type='{vtype}'  ({stats['orphan']} orphans)")
    for ppv in stats["ppvs"][:5]:
        pname = getattr(ppv.product, "shortname", "?") or getattr(ppv.product, "code", "?")
        pvname = getattr(ppv.product_variation, "code", "?")
        print(f"      ppv_id={ppv.id:<6} product={pname!r:<25} variation_code={pvname!r}")

print("\n" + "=" * 78)
print("  DIAGNOSIS COMPLETE")
print("=" * 78)
