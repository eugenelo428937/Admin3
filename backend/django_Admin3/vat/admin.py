from django.contrib import admin
from django.utils.html import format_html
import json

from .models import VATAudit


@admin.register(VATAudit)
class VATAuditAdmin(admin.ModelAdmin):
    """
    Admin interface for VAT Audit Trail.

    Read-only view of all VAT calculations for accounting and compliance.
    """

    list_display = [
        'id',
        'cart',
        'rule_id',
        'created_at',
        'duration_ms',
        'vat_total'
    ]
    list_filter = ['rule_id', 'created_at']
    search_fields = ['cart__id', 'rule_id']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    readonly_fields = [
        'cart',
        'order',
        'rule_id',
        'input_context_formatted',
        'output_data_formatted',
        'duration_ms',
        'created_at'
    ]

    fieldsets = (
        ('Audit Information', {
            'fields': ('id', 'cart', 'order', 'rule_id', 'created_at')
        }),
        ('Input Context', {
            'fields': ('input_context_formatted',),
            'classes': ('collapse',)
        }),
        ('Output Data', {
            'fields': ('output_data_formatted',)
        }),
        ('Performance', {
            'fields': ('duration_ms',)
        }),
    )

    def has_add_permission(self, request):
        """Disable add (audit log is read-only)."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable delete (audit log is permanent)."""
        return False

    def vat_total(self, obj):
        """Get VAT total from output_data."""
        try:
            vat_amount = obj.output_data.get('totals', {}).get('vat', 0)
            return f"£{float(vat_amount):.2f}"
        except (AttributeError, ValueError, TypeError):
            return "N/A"

    vat_total.short_description = 'VAT Total'

    def input_context_formatted(self, obj):
        """Format input_context as pretty JSON."""
        try:
            formatted = json.dumps(obj.input_context, indent=2)
            return format_html('<pre>{}</pre>', formatted)
        except (AttributeError, TypeError):
            return "N/A"

    input_context_formatted.short_description = 'Input Context (JSON)'

    def output_data_formatted(self, obj):
        """Format output_data as pretty JSON with syntax highlighting."""
        try:
            formatted = json.dumps(obj.output_data, indent=2)
            return format_html(
                '<pre style="background-color: #f5f5f5; padding: 10px; '
                'border-radius: 5px; max-height: 500px; overflow-y: auto;">{}</pre>',
                formatted
            )
        except (AttributeError, TypeError):
            return "N/A"

    output_data_formatted.short_description = 'Output Data (JSON)'

    def get_queryset(self, request):
        """Optimize queryset."""
        qs = super().get_queryset(request)
        return qs.select_related('cart', 'order')

    def get_readonly_fields(self, request, obj=None):
        """Return all fields as readonly for audit log."""
        if obj:
            return [
                'cart',
                'order',
                'rule_id',
                'input_context_formatted',
                'output_data_formatted',
                'duration_ms',
                'created_at'
            ]
        return self.readonly_fields

    actions = ['export_audit_records']

    def export_audit_records(self, request, queryset):
        """Export audit records as JSON for accounting."""
        from django.http import HttpResponse

        data = []
        for audit in queryset:
            data.append({
                'id': audit.id,
                'cart_id': audit.cart_id,
                'order_id': audit.order_id,
                'rule_id': audit.rule_id,
                'created_at': audit.created_at.isoformat(),
                'input_context': audit.input_context,
                'output_data': audit.output_data,
                'duration_ms': audit.duration_ms
            })

        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename="vat_audit_export.json"'

        return response

    export_audit_records.short_description = 'Export selected audit records as JSON'
