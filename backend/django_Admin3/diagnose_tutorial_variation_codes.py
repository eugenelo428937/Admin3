"""Inspect every distinct variation_code on Tutorial PPVs (orphan + non-orphan)
so the prefix-based mapping rule in the backfill command is comprehensive."""
from collections import Counter

from catalog.products.models.product_product_variation import ProductProductVariation

tutorial_ppvs = (
    ProductProductVariation.objects
    .filter(product_variation__variation_type='Tutorial')
    .select_related('product_variation', 'product')
)

codes = Counter()
sample_by_prefix = {}
for ppv in tutorial_ppvs:
    code = ppv.product_variation.code or '<None>'
    codes[code] += 1
    prefix = code.split('_')[0] if '_' in code else code
    sample_by_prefix.setdefault(prefix, []).append(
        (ppv.id, getattr(ppv.product, 'shortname', '?'), code)
    )

print(f"Total Tutorial PPVs: {tutorial_ppvs.count()}\n")
print(f"{'variation_code':<20} {'count':>8}")
print(f"{'-' * 20} {'-' * 8}")
for code, n in codes.most_common():
    print(f"{code:<20} {n:>8}")

print(f"\nUnique prefixes: {sorted(sample_by_prefix.keys())}")
print("\nSample by prefix:")
for prefix, items in sorted(sample_by_prefix.items()):
    print(f"\n  prefix='{prefix}'  ({len(items)} PPVs)")
    for ppv_id, product, code in items[:3]:
        print(f"    ppv_id={ppv_id:<6}  product={product!r:<20}  code={code!r}")
