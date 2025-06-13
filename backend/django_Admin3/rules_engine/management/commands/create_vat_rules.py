from django.core.management.base import BaseCommand
from rules_engine.models import Rule, RuleAction, RuleCondition
from django.utils import timezone

class Command(BaseCommand):
    help = 'Create VAT calculation rules for the rules engine'

    def handle(self, *args, **options):
        self.stdout.write("Creating VAT calculation rules...")
        
        # 1. Standard VAT Calculation Rule for UK customers
        standard_vat_rule, created = Rule.objects.get_or_create(
            name='Standard VAT Calculation',
            defaults={
                'description': 'Calculate 20% VAT for UK customers on all taxable products',
                'trigger_type': 'checkout_start',
                'priority': 10,
                'is_active': True,
                'is_blocking': False,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created rule: {standard_vat_rule.name} (ID: {standard_vat_rule.id})"))
            
            # Create VAT calculation action
            RuleAction.objects.create(
                rule=standard_vat_rule,
                action_type='calculate_vat',
                parameters={
                    'function': 'calculate_vat_standard',
                    'vat_rate': 0.20,
                    'exempt_product_types': ['book', 'educational_material'],
                    'threshold_amount': 0,
                    'description': 'Standard UK VAT at 20%'
                },
                execution_order=1
            )
            
            # Add condition for UK customers
            RuleCondition.objects.create(
                rule=standard_vat_rule,
                condition_type='custom_field',
                field_name='user.country',
                operator='equals',
                value='GB'
            )
            self.stdout.write("  ✓ Added VAT calculation action and UK condition")
        else:
            self.stdout.write(self.style.WARNING(f"  ⚠ Rule already exists: {standard_vat_rule.name}"))
        
        
        # 2. EU Location Based VAT Rule  
        eu_vat_rule, created = Rule.objects.get_or_create(
            name='EU Location Based VAT',
            defaults={
                'description': 'Calculate VAT based on customer location within EU',
                'trigger_type': 'checkout_start',
                'priority': 15,
                'is_active': True,
                'is_blocking': False,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created rule: {eu_vat_rule.name} (ID: {eu_vat_rule.id})"))
            
            # Create EU VAT calculation action
            RuleAction.objects.create(
                rule=eu_vat_rule,
                action_type='calculate_vat',
                parameters={
                    'function': 'calculate_vat_by_location',
                    'country_rates': {
                        'GB': 0.20,
                        'DE': 0.19,
                        'FR': 0.20,
                        'IT': 0.22,
                        'ES': 0.21,
                        'NL': 0.21,
                        'IE': 0.23,
                        'US': 0.00,
                        'CA': 0.05
                    },
                    'user_country': 'GB',
                    'default_rate': 0.20,
                    'exempt_product_types': ['book', 'educational_material'],
                    'threshold_amount': 0,
                    'description': 'Location-based VAT calculation'
                },
                execution_order=1
            )
            
            # Add conditions for EU countries (excluding GB which is handled by standard rule)
            eu_countries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']
            
            RuleCondition.objects.create(
                rule=eu_vat_rule,
                condition_type='custom_field',
                field_name='user.country',
                operator='in_list',
                value=eu_countries
            )
            
            RuleCondition.objects.create(
                rule=eu_vat_rule,
                condition_type='custom_field',
                field_name='user.country',
                operator='not_equals',
                value='GB'
            )
            self.stdout.write("  ✓ Added EU VAT calculation action and conditions")
        else:
            self.stdout.write(self.style.WARNING(f"  ⚠ Rule already exists: {eu_vat_rule.name}"))
        
        
        # 3. Business Customer VAT Rule (disabled by default)
        business_vat_rule, created = Rule.objects.get_or_create(
            name='Business Customer VAT',
            defaults={
                'description': 'Handle VAT for business customers including reverse charge scenarios',
                'trigger_type': 'checkout_start',
                'priority': 20,
                'is_active': False,  # Disabled until business customer fields are added
                'is_blocking': False,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created rule: {business_vat_rule.name} (ID: {business_vat_rule.id}) - DISABLED"))
            
            # Create business VAT calculation action
            RuleAction.objects.create(
                rule=business_vat_rule,
                action_type='calculate_vat',
                parameters={
                    'function': 'calculate_business_vat',
                    'supplier_country': 'GB',
                    'vat_rate': 0.20,
                    'exempt_product_types': ['book', 'educational_material'],
                    'threshold_amount': 0,
                    'description': 'Business customer VAT with reverse charge support'
                },
                execution_order=1
            )
            self.stdout.write("  ✓ Added business VAT calculation action")
        else:
            self.stdout.write(self.style.WARNING(f"  ⚠ Rule already exists: {business_vat_rule.name}"))
        
        self.stdout.write(self.style.SUCCESS("\n🎉 VAT rules creation completed!"))
        self.stdout.write("\nCreated rules:")
        self.stdout.write(f"  1. {standard_vat_rule.name} (ID: {standard_vat_rule.id}) - Active: {standard_vat_rule.is_active}")
        self.stdout.write(f"  2. {eu_vat_rule.name} (ID: {eu_vat_rule.id}) - Active: {eu_vat_rule.is_active}")
        self.stdout.write(f"  3. {business_vat_rule.name} (ID: {business_vat_rule.id}) - Active: {business_vat_rule.is_active}")
        
        rule_ids = {
            'standard_vat_rule_id': standard_vat_rule.id,
            'eu_vat_rule_id': eu_vat_rule.id,
            'business_vat_rule_id': business_vat_rule.id
        }
        self.stdout.write(f"\nRule IDs: {rule_ids}") 