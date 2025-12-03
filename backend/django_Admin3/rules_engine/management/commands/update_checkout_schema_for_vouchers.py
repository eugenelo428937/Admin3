"""
Management command to update the checkout context schema to support marking vouchers.

Marking vouchers don't have subject_code, exam_session_code, or current_product fields.
This command updates the schema to allow null values for these fields.
"""
from django.core.management.base import BaseCommand
from rules_engine.models import ActedRulesFields


class Command(BaseCommand):
    help = 'Update checkout context schema to support marking vouchers (allow null for subject_code, etc.)'

    def handle(self, *args, **options):
        self.stdout.write('Updating checkout context schemas for marking voucher support...')

        # Find all schemas that might have cart item definitions
        schemas = ActedRulesFields.objects.filter(is_active=True)
        updated_count = 0

        for schema_obj in schemas:
            schema = schema_obj.schema
            updated = False

            # Check if this schema has cart.items definition
            if isinstance(schema, dict):
                cart_props = schema.get('properties', {}).get('cart', {}).get('properties', {})
                items_def = cart_props.get('items', {})

                # Handle both 'item' (singular) and 'items' (standard JSON schema)
                item_schema = items_def.get('item', items_def.get('items', {}))

                if isinstance(item_schema, dict):
                    item_props = item_schema.get('properties', {})

                    # Update fields to allow null values for marking vouchers
                    fields_to_allow_null = [
                        'subject_code',
                        'exam_session_code',
                        'current_product',
                        'product_id',
                        'product_name',
                        'product_code',
                    ]

                    for field in fields_to_allow_null:
                        if field in item_props:
                            current_type = item_props[field].get('type')
                            # If it's a simple type, convert to array with null
                            if isinstance(current_type, str) and current_type != 'null':
                                item_props[field]['type'] = [current_type, 'null']
                                updated = True
                                self.stdout.write(f'  - Updated {field} to allow null in schema "{schema_obj.name}"')

                    # Update required fields - remove fields that marking vouchers don't have
                    required_fields = item_schema.get('required', [])
                    fields_to_remove_from_required = ['current_product', 'metadata']

                    original_required = list(required_fields)
                    for field in fields_to_remove_from_required:
                        if field in required_fields:
                            required_fields.remove(field)
                            updated = True
                            self.stdout.write(f'  - Removed {field} from required fields in schema "{schema_obj.name}"')

                    if original_required != required_fields:
                        item_schema['required'] = required_fields

                    # Also update metadata to not be required and allow it to be an empty object
                    if 'metadata' in item_props:
                        metadata_def = item_props['metadata']
                        if 'required' in metadata_def:
                            del metadata_def['required']
                            updated = True
                            self.stdout.write(f'  - Removed required constraint from metadata in schema "{schema_obj.name}"')

            if updated:
                schema_obj.schema = schema
                schema_obj.version += 1
                schema_obj.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'Updated schema: {schema_obj.name} (v{schema_obj.version})'))

        if updated_count > 0:
            self.stdout.write(self.style.SUCCESS(f'\nSuccessfully updated {updated_count} schema(s)'))
        else:
            self.stdout.write(self.style.WARNING('\nNo schemas needed updating'))
