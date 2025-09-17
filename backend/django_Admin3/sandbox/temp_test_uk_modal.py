#!/usr/bin/env python
"""
Temporary script to modify UK import tax rule for testing modal with UK users
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule

def modify_uk_rule_for_testing():
    """Temporarily modify UK rule to trigger for UK users (for testing only)"""
    
    rule = ActedRule.objects.get(rule_id='rule_uk_import_tax_warning_v1')
    
    print("Current condition (NON-UK users only):")
    print(rule.condition)
    
    # Temporary condition for testing - triggers for ALL authenticated users
    test_condition = {
        "==": [{"var": "user.is_authenticated"}, True]
    }
    
    print("\nChanging to test condition (ALL authenticated users):")
    print(test_condition)
    
    rule.condition = test_condition
    rule.save()
    
    print("✅ Rule modified for testing. UK users will now see the import tax modal.")
    print("⚠️  Remember to change it back after testing!")

def restore_uk_rule():
    """Restore original UK rule condition"""
    
    rule = ActedRule.objects.get(rule_id='rule_uk_import_tax_warning_v1')
    
    # Original condition (NON-UK users only)
    original_condition = {
        "and": [
            {"==": [{"var": "user.is_authenticated"}, True]},
            {"or": [
                {"and": [
                    {"!=": [{"var": "user.home_country"}, None]},
                    {"!=": [{"var": "user.home_country"}, "United Kingdom"]},
                    {"!=": [{"var": "user.home_country"}, "UK"]}
                ]},
                {"and": [
                    {"!=": [{"var": "user.work_country"}, None]},
                    {"!=": [{"var": "user.work_country"}, "United Kingdom"]},
                    {"!=": [{"var": "user.work_country"}, "UK"]}
                ]}
            ]}
        ]
    }
    
    rule.condition = original_condition
    rule.save()
    
    print("✅ Rule restored to original condition (NON-UK users only).")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'restore':
        restore_uk_rule()
    else:
        modify_uk_rule_for_testing()
        print("\nTo restore original condition, run: python temp_test_uk_modal.py restore")