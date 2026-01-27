"""
Management command to audit test coverage for API endpoints and serializer fields.

Introspects Django URL patterns and DRF serializers, cross-references with
test files, and reports coverage gaps.

Usage:
    python manage.py test_coverage_audit                    # Full report (text + JSON)
    python manage.py test_coverage_audit --app=store        # Single app
    python manage.py test_coverage_audit --format=json      # JSON only
    python manage.py test_coverage_audit --endpoints-only   # Skip serializer audit
    python manage.py test_coverage_audit --serializers-only # Skip endpoint audit
    python manage.py test_coverage_audit --output=report    # Save to report.json + report.txt
"""
from django.core.management.base import BaseCommand

from utils.audit.endpoint_auditor import EndpointAuditor
from utils.audit.serializer_auditor import SerializerAuditor
from utils.audit.report_generator import ReportGenerator


class Command(BaseCommand):
    help = 'Audit test coverage for API endpoints and serializer fields'

    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            choices=['json', 'text', 'both'],
            default='both',
            help='Output format (default: both)',
        )
        parser.add_argument(
            '--output',
            type=str,
            default=None,
            help='Output file path (without extension). Generates .json and/or .txt',
        )
        parser.add_argument(
            '--app',
            type=str,
            default=None,
            help='Audit a specific app only (e.g., store, cart, catalog)',
        )
        parser.add_argument(
            '--endpoints-only',
            action='store_true',
            help='Only audit endpoint coverage (skip serializers)',
        )
        parser.add_argument(
            '--serializers-only',
            action='store_true',
            help='Only audit serializer field coverage (skip endpoints)',
        )

    def handle(self, *args, **options):
        app_filter = options['app']
        fmt = options['format']
        output_path = options['output']
        endpoints_only = options['endpoints_only']
        serializers_only = options['serializers_only']

        endpoint_report = {'endpoints': [], 'tested': [], 'untested': [], 'summary': {
            'total': 0, 'tested_count': 0, 'untested_count': 0, 'coverage_pct': 0, 'by_app': {},
        }}
        serializer_report = {'serializers': {}, 'summary': {
            'total_serializers': 0, 'total_fields': 0, 'read_tested_count': 0,
            'write_tested_count': 0, 'untested_count': 0, 'read_coverage_pct': 0,
            'write_coverage_pct': 0, 'untested_pct': 0,
        }}

        if not serializers_only:
            self.stdout.write('Auditing endpoint coverage...')
            auditor = EndpointAuditor()
            endpoint_report = auditor.audit(app_filter=app_filter)
            ep_summary = endpoint_report['summary']
            self.stdout.write(
                f'  Found {ep_summary["total"]} endpoints, '
                f'{ep_summary["tested_count"]} tested, '
                f'{ep_summary["untested_count"]} untested'
            )

        if not endpoints_only:
            self.stdout.write('Auditing serializer field coverage...')
            auditor = SerializerAuditor()
            serializer_report = auditor.audit(app_filter=app_filter)
            ser_summary = serializer_report['summary']
            self.stdout.write(
                f'  Found {ser_summary["total_fields"]} fields across '
                f'{ser_summary["total_serializers"]} serializers, '
                f'{ser_summary["untested_count"]} untested'
            )

        self.stdout.write('')

        # Generate report
        generator = ReportGenerator()
        report = generator.generate(
            endpoint_report,
            serializer_report,
            format=fmt,
            output_path=output_path,
        )

        # Print text report to stdout
        if 'text' in report:
            self.stdout.write(report['text'])

        if output_path:
            self.stdout.write(self.style.SUCCESS(f'\nReport saved to {output_path}'))
