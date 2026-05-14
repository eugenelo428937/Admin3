"""Legacy URL alias middleware — 30-day deprecation shim.

Rewrites old filter-param shapes to canonical form before the React app
sees them. Scheduled for removal 30 days after the filter redesign deploy
(see docs/superpowers/specs/2026-05-13-filter-system-redesign-design.md).

Recognized rewrites:
- subject_code, subject_1, subject_2, ...  →  subjects=A,B,C
- category_code, category_1, ...           →  categories=A,B,C
- group=A,B                                →  product_types=A,B
- mode_of_delivery=A,B                     →  modes_of_delivery=A,B

Unknown params are preserved verbatim. Requests with canonical params
already in place pass through without redirect. Requests to paths other
than /products are not touched.
"""
from urllib.parse import urlencode
from django.http import HttpResponseRedirect, QueryDict


class LegacyFilterURLAliasMiddleware:
    """Rewrites legacy filter params on /products to canonical form."""

    # Direct param renames: old key → canonical filter_key
    ALIAS_MAP = {
        'group': 'product_types',
        'mode_of_delivery': 'modes_of_delivery',
    }

    # Indexed-format mergers: base param prefix → canonical filter_key
    INDEXED_PREFIXES = {
        'subject_code': ('subject', 'subjects'),
        'category_code': ('category', 'categories'),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != '/products' or not request.GET:
            return self.get_response(request)

        canonical = self._canonicalize(request.GET)
        original = {k: v for k, v in request.GET.lists()}
        if canonical == original:
            return self.get_response(request)

        query = urlencode(canonical, doseq=True)
        return HttpResponseRedirect(f"/products?{query}", status=301)

    def _canonicalize(self, qs: QueryDict) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        consumed = set()

        # Pass 1: indexed prefixes
        for base_key, (prefix, target) in self.INDEXED_PREFIXES.items():
            values: list[str] = []
            # Base value first (e.g. subject_code=A)
            if base_key in qs:
                values.extend(qs.getlist(base_key))
                consumed.add(base_key)
            # Numbered siblings (subject_1=B, subject_2=C) sorted by index
            indexed_keys = [
                k for k in qs.keys()
                if k.startswith(prefix + '_') and k.rsplit('_', 1)[1].isdigit()
            ]
            indexed_keys.sort(key=lambda k: int(k.rsplit('_', 1)[1]))
            for k in indexed_keys:
                values.extend(qs.getlist(k))
                consumed.add(k)
            if values:
                out.setdefault(target, []).append(','.join(values))

        # Pass 2: direct alias renames + passthrough
        for key, values in qs.lists():
            if key in consumed:
                continue
            canonical_key = self.ALIAS_MAP.get(key, key)
            out.setdefault(canonical_key, []).extend(values)

        return out
