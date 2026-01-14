"""
Management Command: Analyze Query Performance
Phase 3: Database Performance Optimization

Analyzes database query performance for filtering operations and provides optimization recommendations.
"""

import time
from django.core.management.base import BaseCommand
from django.db import connection
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects_products.serializers import ProductListSerializer
from products.services.filter_service import get_filter_service


class Command(BaseCommand):
    help = 'Analyze query performance for filtering operations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-filters',
            action='store_true',
            help='Run performance tests on common filter combinations',
        )
        parser.add_argument(
            '--test-indexes',
            action='store_true',
            help='Test if database indexes are being used effectively',
        )
        parser.add_argument(
            '--benchmark',
            action='store_true',
            help='Run comprehensive benchmarking suite',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed query information',
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        self.stdout.write(
            self.style.SUCCESS('=== Database Query Performance Analysis ===\n')
        )

        if options['test_filters']:
            self.test_common_filter_combinations()

        if options['test_indexes']:
            self.test_index_usage()

        if options['benchmark']:
            self.run_benchmark_suite()

        if not any([options['test_filters'], options['test_indexes'], options['benchmark']]):
            self.stdout.write(
                self.style.WARNING(
                    'No specific test selected. Use --help to see available options.\n'
                    'Running basic performance check...\n'
                )
            )
            self.basic_performance_check()

    def basic_performance_check(self):
        """Run a basic performance check on the database."""
        self.stdout.write('Running basic performance check...\n')
        
        # Test basic product listing
        start_time = time.time()
        with connection.cursor() as cursor:
            initial_queries = len(connection.queries)
            
            # Simple query
            queryset = ExamSessionSubjectProduct.objects.select_related(
                'exam_session_subject__subject',
                'product'
            )[:50]
            
            # Force evaluation
            list(queryset)
            
            duration = time.time() - start_time
            query_count = len(connection.queries) - initial_queries
            
            self.stdout.write(
                f"Basic product listing (50 items): {duration:.3f}s, {query_count} queries"
            )
            
            if duration > 0.5:
                self.stdout.write(
                    self.style.WARNING(
                        f"WARNING: Basic query took {duration:.3f}s (target: <0.5s)"
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Basic query performance acceptable: {duration:.3f}s"
                    )
                )

    def test_common_filter_combinations(self):
        """Test performance of common filter combinations."""
        self.stdout.write('Testing common filter combinations...\n')
        
        filter_service = get_filter_service()
        base_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'variations__product_product_variation__product_variation',
            'variations__prices'
        )

        test_cases = [
            {
                'name': 'Subject Filter Only',
                'filters': {'SUBJECT_FILTER': ['CM2']}
            },
            {
                'name': 'Subject + Category Filter',
                'filters': {'SUBJECT_FILTER': ['CM2'], 'category': ['Materials']}
            },
            {
                'name': 'Multiple Subjects',
                'filters': {'SUBJECT_FILTER': ['CM2', 'SA1', 'CA1']}
            },
            {
                'name': 'Subject + Product Type',
                'filters': {'SUBJECT_FILTER': ['CM2'], 'product_type': ['Core Study Material']}
            },
            {
                'name': 'Complex Multi-Filter',
                'filters': {
                    'SUBJECT_FILTER': ['CM2', 'SA1'],
                    'category': ['Materials', 'Tutorial'],
                    'product_type': ['Core Study Material']
                }
            }
        ]

        results = []
        for test_case in test_cases:
            result = self._benchmark_filter_combination(
                base_queryset, 
                filter_service, 
                test_case['filters'], 
                test_case['name']
            )
            results.append(result)

        # Summary
        self.stdout.write('\n=== Filter Performance Summary ===')
        for result in results:
            status_color = self.style.SUCCESS if result['duration'] < 0.2 else (
                self.style.WARNING if result['duration'] < 0.5 else self.style.ERROR
            )
            self.stdout.write(
                status_color(
                    f"{result['name']:25} {result['duration']:6.3f}s "
                    f"({result['queries']:2d} queries, {result['count']:4d} results)"
                )
            )

    def test_index_usage(self):
        """Test if database indexes are being used effectively."""
        self.stdout.write('Testing database index usage...\n')
        
        with connection.cursor() as cursor:
            # Test if our custom indexes exist
            cursor.execute("""
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE tablename LIKE '%exam_session_subject_products%'
                ORDER BY tablename, indexname
            """)
            
            indexes = cursor.fetchall()
            
            self.stdout.write('Found indexes on exam_session_subject_products:')
            for index_name, table_name in indexes:
                self.stdout.write(f"  - {index_name} on {table_name}")
            
            # Test index usage with EXPLAIN ANALYZE
            test_queries = [
                {
                    'name': 'Subject lookup',
                    'sql': """
                        SELECT COUNT(*) FROM acted_exam_session_subject_products essp
                        JOIN acted_exam_session_subjects ess ON essp.exam_session_subject_id = ess.id
                        JOIN acted_subjects s ON ess.subject_id = s.id
                        WHERE s.code = 'CM2'
                    """
                },
                {
                    'name': 'Product + Subject lookup',
                    'sql': """
                        SELECT COUNT(*) FROM acted_exam_session_subject_products essp
                        JOIN acted_exam_session_subjects ess ON essp.exam_session_subject_id = ess.id
                        JOIN acted_subjects s ON ess.subject_id = s.id
                        JOIN acted_products p ON essp.product_id = p.id
                        WHERE s.code = 'CM2' AND p.fullname ILIKE '%material%'
                    """
                }
            ]
            
            for query_test in test_queries:
                self.stdout.write(f"\nAnalyzing: {query_test['name']}")
                cursor.execute(f"EXPLAIN ANALYZE {query_test['sql']}")
                
                if self.verbose:
                    self.stdout.write("Query execution plan:")
                    for row in cursor.fetchall():
                        self.stdout.write(f"  {row[0]}")
                else:
                    # Just show if index scan is used
                    plan = cursor.fetchall()
                    plan_text = ' '.join([row[0] for row in plan])
                    
                    if 'Index Scan' in plan_text:
                        self.stdout.write(self.style.SUCCESS("  ✓ Using index scan"))
                    elif 'Seq Scan' in plan_text:
                        self.stdout.write(self.style.WARNING("  ⚠ Using sequential scan"))
                    else:
                        self.stdout.write("  ? Unknown scan type")

    def run_benchmark_suite(self):
        """Run comprehensive benchmarking suite."""
        self.stdout.write('Running comprehensive benchmark suite...\n')
        
        benchmarks = [
            ('Basic product list', self._benchmark_basic_list),
            ('Subject filtering', self._benchmark_subject_filtering),
            ('Complex filtering', self._benchmark_complex_filtering),
            ('Serialization performance', self._benchmark_serialization),
        ]
        
        results = []
        for name, benchmark_func in benchmarks:
            self.stdout.write(f'Running: {name}...')
            result = benchmark_func()
            results.append((name, result))
            
            status_color = self.style.SUCCESS if result < 0.2 else (
                self.style.WARNING if result < 0.5 else self.style.ERROR
            )
            self.stdout.write(status_color(f'  Result: {result:.3f}s'))
        
        # Overall summary
        self.stdout.write('\n=== Benchmark Summary ===')
        total_time = sum(result for _, result in results)
        avg_time = total_time / len(results)
        
        self.stdout.write(f'Total benchmark time: {total_time:.3f}s')
        self.stdout.write(f'Average operation time: {avg_time:.3f}s')
        
        if avg_time < 0.2:
            self.stdout.write(self.style.SUCCESS('✓ Overall performance: EXCELLENT'))
        elif avg_time < 0.5:
            self.stdout.write(self.style.WARNING('△ Overall performance: GOOD'))
        else:
            self.stdout.write(self.style.ERROR('✗ Overall performance: NEEDS IMPROVEMENT'))

    def _benchmark_filter_combination(self, base_queryset, filter_service, filters, name):
        """Benchmark a specific filter combination."""
        start_time = time.time()
        initial_queries = len(connection.queries)
        
        try:
            filtered_queryset = filter_service.apply_filters(base_queryset, filters)
            count = filtered_queryset.count()
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error in {name}: {str(e)}")
            )
            return {
                'name': name,
                'duration': 999.999,
                'queries': 0,
                'count': 0,
                'error': str(e)
            }
        
        duration = time.time() - start_time
        query_count = len(connection.queries) - initial_queries
        
        return {
            'name': name,
            'duration': duration,
            'queries': query_count,
            'count': count
        }

    def _benchmark_basic_list(self):
        """Benchmark basic product listing."""
        start_time = time.time()
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )[:100]
        list(queryset)  # Force evaluation
        return time.time() - start_time

    def _benchmark_subject_filtering(self):
        """Benchmark subject-based filtering."""
        start_time = time.time()
        filter_service = get_filter_service()
        base_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )
        filtered = filter_service.apply_filters(base_queryset, {'SUBJECT_FILTER': ['CM2']})
        filtered.count()
        return time.time() - start_time

    def _benchmark_complex_filtering(self):
        """Benchmark complex multi-filter operations."""
        start_time = time.time()
        filter_service = get_filter_service()
        base_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )
        filters = {
            'SUBJECT_FILTER': ['CM2', 'SA1'],
            'category': ['Materials']
        }
        filtered = filter_service.apply_filters(base_queryset, filters)
        filtered.count()
        return time.time() - start_time

    def _benchmark_serialization(self):
        """Benchmark serialization performance."""
        start_time = time.time()
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'variations__product_product_variation__product_variation',
            'variations__prices'
        )[:50]
        
        serializer = ProductListSerializer(queryset, many=True)
        serializer.data  # Force serialization
        return time.time() - start_time