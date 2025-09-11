import jsonschema
from rest_framework import serializers
from ..models import ActedRulesFields, RuleEntryPoint


class RuleExecuteSerializer(serializers.Serializer):
    entry_point = serializers.CharField(required=True)
    context = serializers.JSONField(required=True)
    
    def validate(self, data):
        """Validate context against rules fields schema"""
        entry_point = data.get('entry_point')
        context = data.get('context')
        
        # Check if entry point exists
        if not RuleEntryPoint.objects.filter(code=entry_point).exists():
            raise serializers.ValidationError(f"Entry point '{entry_point}' does not exist")
        
        # Get schema for validation
        try:
            # For checkout_terms, use the checkout context schema
            if entry_point == 'checkout_terms':
                schema_obj = ActedRulesFields.objects.get(fields_id='checkout_context_v1')
                schema = schema_obj.schema
                
                # Validate context against schema
                try:
                    jsonschema.validate(context, schema)
                except jsonschema.ValidationError as e:
                    raise serializers.ValidationError(f"Context validation failed: {e.message}")
        except ActedRulesFields.DoesNotExist:
            # If no schema found, allow execution but log warning
            pass
        
        return data