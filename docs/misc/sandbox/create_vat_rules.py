#!/usr/bin/env python3
"""
Script to create VAT calculation rules for the rules engine
Run this in Django shell: python manage.py shell < create_vat_rules.py
"""

from rules_engine.models import Rule, RuleAction, RuleCondition
from django.utils import timezone
import json

def create_vat_rules():
    print("Creating VAT calculation rules...")
    
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
        print(f"✓ Created rule: {standard_vat_rule.name} (ID: {standard_vat_rule.id})")
        
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
            condition_type='field_comparison',
            field_name='user.country',
            operator='equals',
            expected_value='GB',
            condition_group='default'
        )
        print(f"  ✓ Added VAT calculation action and UK condition")
    else:
        print(f"  ⚠ Rule already exists: {standard_vat_rule.name}")
    
    
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
        print(f"✓ Created rule: {eu_vat_rule.name} (ID: {eu_vat_rule.id})")
        
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
            condition_type='field_comparison',
            field_name='user.country',
            operator='in',
            expected_value=','.join(eu_countries),
            condition_group='default'
        )
        
        RuleCondition.objects.create(
            rule=eu_vat_rule,
            condition_type='field_comparison',
            field_name='user.country',
            operator='not_equals',
            expected_value='GB',
            condition_group='default'
        )
        print(f"  ✓ Added EU VAT calculation action and conditions")
    else:
        print(f"  ⚠ Rule already exists: {eu_vat_rule.name}")
    
    
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
        print(f"✓ Created rule: {business_vat_rule.name} (ID: {business_vat_rule.id}) - DISABLED")
        
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
        print(f"  ✓ Added business VAT calculation action")
    else:
        print(f"  ⚠ Rule already exists: {business_vat_rule.name}")
    
    print("\n🎉 VAT rules creation completed!")
    print("\nCreated rules:")
    print(f"  1. {standard_vat_rule.name} (ID: {standard_vat_rule.id}) - Active: {standard_vat_rule.is_active}")
    print(f"  2. {eu_vat_rule.name} (ID: {eu_vat_rule.id}) - Active: {eu_vat_rule.is_active}")
    print(f"  3. {business_vat_rule.name} (ID: {business_vat_rule.id}) - Active: {business_vat_rule.is_active}")
    
    return {
        'standard_vat_rule_id': standard_vat_rule.id,
        'eu_vat_rule_id': eu_vat_rule.id,
        'business_vat_rule_id': business_vat_rule.id
    }

if __name__ == '__main__':
    result = create_vat_rules()
    print(f"\nRule IDs: {result}") 