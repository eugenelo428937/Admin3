"""
Generate JSON and human-readable reports from endpoint and serializer audit results.
"""
import json
from datetime import datetime


class ReportGenerator:
    """Generate audit reports in multiple formats."""

    def generate(self, endpoint_report, serializer_report, format='both', output_path=None):
        """Generate the combined report.

        Args:
            endpoint_report: Result from EndpointAuditor.audit()
            serializer_report: Result from SerializerAuditor.audit()
            format: 'json', 'text', or 'both'
            output_path: Optional file path to write the report

        Returns:
            dict with 'json' and/or 'text' keys
        """
        result = {}
        timestamp = datetime.now().isoformat()

        if format in ('json', 'both'):
            json_report = self._generate_json(endpoint_report, serializer_report, timestamp)
            result['json'] = json_report

            if output_path:
                json_path = output_path if output_path.endswith('.json') else output_path + '.json'
                with open(json_path, 'w') as f:
                    json.dump(json_report, f, indent=2, default=str)

        if format in ('text', 'both'):
            text_report = self._generate_text(endpoint_report, serializer_report, timestamp)
            result['text'] = text_report

            if output_path:
                text_path = output_path if output_path.endswith('.txt') else output_path + '.txt'
                with open(text_path, 'w') as f:
                    f.write(text_report)

        return result

    def _generate_json(self, endpoint_report, serializer_report, timestamp):
        """Generate JSON report."""
        ep_summary = endpoint_report.get('summary', {})
        ser_summary = serializer_report.get('summary', {})

        return {
            'generated_at': timestamp,
            'summary': {
                'total_endpoints': ep_summary.get('total', 0),
                'tested_endpoints': ep_summary.get('tested_count', 0),
                'untested_endpoints': ep_summary.get('untested_count', 0),
                'endpoint_coverage_pct': ep_summary.get('coverage_pct', 0),
                'total_serializer_fields': ser_summary.get('total_fields', 0),
                'total_readable_fields': ser_summary.get('total_readable_fields', 0),
                'total_writable_fields': ser_summary.get('total_writable_fields', 0),
                'read_tested_fields': ser_summary.get('read_tested_count', 0),
                'write_tested_fields': ser_summary.get('write_tested_count', 0),
                'untested_fields': ser_summary.get('untested_count', 0),
                'field_read_coverage_pct': ser_summary.get('read_coverage_pct', 0),
                'field_write_coverage_pct': ser_summary.get('write_coverage_pct', 0),
            },
            'endpoint_coverage_by_app': ep_summary.get('by_app', {}),
            'untested_endpoints': [
                {
                    'path': ep['path'],
                    'methods': ep['methods'],
                    'view': ep['view'],
                    'app': ep['app'],
                    'name': ep.get('name', ''),
                }
                for ep in endpoint_report.get('untested', [])
            ],
            'serializer_coverage': {
                key: {
                    'total_fields': info['total_fields'],
                    'read_tested': info['read_tested'],
                    'write_tested': info['write_tested'],
                    'untested': info['untested'],
                }
                for key, info in serializer_report.get('serializers', {}).items()
            }
        }

    def _generate_text(self, endpoint_report, serializer_report, timestamp):
        """Generate human-readable text report."""
        lines = []
        lines.append('=' * 60)
        lines.append('Test Coverage Audit Report - Admin3')
        lines.append(f'Generated: {timestamp}')
        lines.append('=' * 60)
        lines.append('')

        # Endpoint coverage section
        ep_summary = endpoint_report.get('summary', {})
        lines.append('ENDPOINT COVERAGE')
        lines.append('-' * 40)
        total = ep_summary.get('total', 0)
        tested = ep_summary.get('tested_count', 0)
        untested = ep_summary.get('untested_count', 0)
        pct = ep_summary.get('coverage_pct', 0)
        lines.append(f'  Total endpoints:   {total}')
        lines.append(f'  Tested:            {tested} ({pct}%)')
        lines.append(f'  Untested:          {untested} ({round(100 - pct, 1)}%)')
        lines.append('')

        # Untested endpoints by app
        by_app = ep_summary.get('by_app', {})
        if by_app:
            lines.append('UNTESTED ENDPOINTS BY APP:')
            for app_name, app_data in sorted(by_app.items(), key=lambda x: -x[1]['untested']):
                if app_data['untested'] > 0:
                    lines.append(f'  {app_name} ({app_data["untested"]} untested of {app_data["total"]}):')
                    for ep in endpoint_report.get('untested', []):
                        if ep['app'] == app_name:
                            methods_str = ','.join(ep['methods'])
                            lines.append(f'    [{methods_str:6s}]  {ep["path"]}')
            lines.append('')

        # Serializer coverage section
        ser_summary = serializer_report.get('summary', {})
        lines.append('SERIALIZER FIELD COVERAGE')
        lines.append('-' * 40)
        total_fields = ser_summary.get('total_fields', 0)
        total_readable = ser_summary.get('total_readable_fields', 0)
        total_writable = ser_summary.get('total_writable_fields', 0)
        read_tested = ser_summary.get('read_tested_count', 0)
        write_tested = ser_summary.get('write_tested_count', 0)
        untested_fields = ser_summary.get('untested_count', 0)
        read_pct = ser_summary.get('read_coverage_pct', 0)
        write_pct = ser_summary.get('write_coverage_pct', 0)
        lines.append(f'  Total fields:      {total_fields}')
        lines.append(f'  Readable fields:   {total_readable} (excludes write-only)')
        lines.append(f'  Writable fields:   {total_writable} (excludes read-only)')
        lines.append(f'  Read-tested:       {read_tested}/{total_readable} ({read_pct}%)')
        lines.append(f'  Write-tested:      {write_tested}/{total_writable} ({write_pct}%)')
        lines.append(f'  Untested:          {untested_fields} ({ser_summary.get("untested_pct", 0)}%)')
        lines.append('')

        # Top gaps
        serializer_data = serializer_report.get('serializers', {})
        if serializer_data:
            # Sort by number of untested fields (descending)
            sorted_sers = sorted(
                serializer_data.items(),
                key=lambda x: len(x[1].get('untested', [])),
                reverse=True,
            )
            lines.append('TOP SERIALIZER GAPS:')
            for ser_key, ser_info in sorted_sers[:10]:  # Top 10
                untested = ser_info.get('untested', [])
                if untested:
                    lines.append(f'  {ser_key} - {len(untested)} untested field(s):')
                    for field in untested[:5]:  # Show first 5
                        lines.append(f'    - {field}')
                    if len(untested) > 5:
                        lines.append(f'    ... and {len(untested) - 5} more')
            lines.append('')

        lines.append('=' * 60)
        return '\n'.join(lines)
