"""
Management command to add 'Marking' to the VAT context schema product_type enum.
This is a one-time fix for schemas that don't include Marking products.

Usage: python manage.py update_vat_schema_marking
"""
from django.core.management.base import BaseCommand
from rules_engine.models import ActedRulesFields


class Command(BaseCommand):
    help = "Add 'Marking' to the VAT context schema product_type enum"

    def handle(self, *args, **options):
        schema_code = 'cart_vat_context_schema'

        try:
            schema = ActedRulesFields.objects.get(fields_code=schema_code)
            self.stdout.write(f"Found schema: {schema.name} (v{schema.version})")

            # Get the current schema
            current_schema = schema.schema

            # Find the product_type enum - structure uses cart_item not item
            product_type_enum = current_schema.get('properties', {}).get('cart_item', {}).get('properties', {}).get('product_type', {}).get('enum', [])

            self.stdout.write(f"Current product_type enum: {product_type_enum}")

            if 'Marking' not in product_type_enum:
                # Add 'Marking' to the enum
                if 'properties' in current_schema and 'cart_item' in current_schema['properties']:
                    if 'properties' in current_schema['properties']['cart_item'] and 'product_type' in current_schema['properties']['cart_item']['properties']:
                        current_schema['properties']['cart_item']['properties']['product_type']['enum'].append('Marking')

                        # Update and save
                        schema.schema = current_schema
                        schema.version += 1
                        schema.save()

                        self.stdout.write(self.style.SUCCESS(
                            f"✅ Updated schema to include 'Marking'. New version: {schema.version}"
                        ))
                        self.stdout.write(f"New product_type enum: {current_schema['properties']['cart_item']['properties']['product_type']['enum']}")
                    else:
                        self.stdout.write(self.style.ERROR("❌ Could not find product_type in cart_item.properties"))
                else:
                    self.stdout.write(self.style.ERROR("❌ Could not find cart_item.properties in schema structure"))
            else:
                self.stdout.write(self.style.SUCCESS("✅ 'Marking' is already in the product_type enum"))

        except ActedRulesFields.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Schema '{schema_code}' not found in database"))
            self.stdout.write("Available schemas:")
            for s in ActedRulesFields.objects.all():
                self.stdout.write(f"  - {s.fields_code}: {s.name}")
