"""Management command to debug search scoring for a given query.

Shows the top N matching products ranked by score, with full score
calculation breakdown and searchable text for each result.

Usage:
    # Basic usage - top 10 results
    python manage.py debug_search "cs1 course notes"

    # Show top 20 results
    python manage.py debug_search "cs1 additional mock" --top 20

    # Show all results above threshold
    python manage.py debug_search "cb1" --all

    # Custom minimum score
    python manage.py debug_search "course notes" --min-score 30
"""
from django.core.management.base import BaseCommand
from fuzzywuzzy import fuzz

from search.services.search_service import SearchService
from store.models import Product as StoreProduct


class Command(BaseCommand):
    help = 'Show top matching products with score calculation details for a search query'

    def add_arguments(self, parser):
        parser.add_argument(
            'query',
            type=str,
            help='Search query to debug (e.g. "cs1 course notes")',
        )
        parser.add_argument(
            '--top',
            type=int,
            default=10,
            dest='top_n',
            help='Number of top results to show (default: 10)',
        )
        parser.add_argument(
            '--min-score',
            type=int,
            default=None,
            dest='min_score',
            help='Minimum score threshold (default: uses SearchService.min_fuzzy_score)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            dest='show_all',
            help='Show all results above threshold (ignores --top)',
        )

    def handle(self, *args, **options):
        query = options['query'].lower()
        top_n = options['top_n']
        show_all = options['show_all']

        service = SearchService()
        min_score = options['min_score'] if options['min_score'] is not None else service.min_fuzzy_score

        all_products = StoreProduct.objects.filter(
            is_active=True
        ).select_related(
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        )

        scored = []
        for sp in all_products:
            searchable_text = service._build_searchable_text(sp)
            score = service._calculate_fuzzy_score(query, searchable_text, sp)

            if score >= min_score:
                catalog_product = sp.product_product_variation.product
                subject_code = sp.exam_session_subject.subject.code.lower()
                product_name = (catalog_product.shortname or catalog_product.fullname or '').lower()

                # Decompose score components for display
                subject_bonus = 100 if query.startswith(subject_code) else 0
                token_sort = fuzz.token_sort_ratio(query, searchable_text)
                partial_name = fuzz.partial_ratio(query, product_name)
                token_set = fuzz.token_set_ratio(query, searchable_text)

                weighted = (
                    0.15 * subject_bonus
                    + 0.40 * token_sort
                    + 0.25 * partial_name
                    + 0.20 * token_set
                )

                scored.append({
                    'rank': 0,
                    'score': score,
                    'weighted_raw': weighted,
                    'product_code': sp.product_code,
                    'subject': subject_code.upper(),
                    'product_name': product_name,
                    'searchable_text': searchable_text,
                    'subject_bonus': subject_bonus,
                    'token_sort': token_sort,
                    'partial_name': partial_name,
                    'token_set': token_set,
                })

        scored.sort(key=lambda x: x['score'], reverse=True)

        # Assign ranks
        for i, item in enumerate(scored):
            item['rank'] = i + 1

        results = scored if show_all else scored[:top_n]
        total_matched = len(scored)
        total_products = all_products.count()

        # Header
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO(
            f'  Search Debug: "{query}"'
        ))
        self.stdout.write(self.style.HTTP_INFO(
            f'  {total_matched} matches (of {total_products} active products) | '
            f'min_score={min_score} | showing {"all" if show_all else f"top {top_n}"}'
        ))
        self.stdout.write(self.style.HTTP_INFO(
            '  Formula: score = 0.15*subject + 0.40*token_sort + 0.25*partial_name + 0.20*token_set'
        ))
        self.stdout.write('  ' + '-' * 90)

        if not results:
            self.stdout.write(self.style.WARNING('  No results above threshold.'))
            return

        for item in results:
            self.stdout.write('')
            self.stdout.write(
                f'  #{item["rank"]:>3}  '
                f'{self.style.SUCCESS(f"score={item["score"]}")}'
                f'  (raw={item["weighted_raw"]:.1f})'
            )
            self.stdout.write(
                f'       product_code: {item["product_code"]}'
            )
            self.stdout.write(
                f'       subject: {item["subject"]}  |  product_name: {item["product_name"]}'
            )
            self.stdout.write(
                f'       searchable_text: {item["searchable_text"]}'
            )

            # Score breakdown with weighted contribution
            sb = item['subject_bonus']
            ts = item['token_sort']
            pn = item['partial_name']
            tset = item['token_set']
            self.stdout.write(
                f'       breakdown: '
                f'subject={sb}(*0.15={0.15*sb:.1f}) + '
                f'token_sort={ts}(*0.40={0.40*ts:.1f}) + '
                f'partial_name={pn}(*0.25={0.25*pn:.1f}) + '
                f'token_set={tset}(*0.20={0.20*tset:.1f})'
            )

        self.stdout.write('')
        if not show_all and total_matched > top_n:
            self.stdout.write(self.style.WARNING(
                f'  ... {total_matched - top_n} more results not shown. Use --all to see all.'
            ))
        self.stdout.write('')
