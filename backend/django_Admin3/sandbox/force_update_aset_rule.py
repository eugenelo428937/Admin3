#!/usr/bin/env python3
"""
Force update ASET warning rule to use new generic template processor
"""

import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRule

def force_update_aset_rule():
    print("=== FORCE UPDATING ASET WARNING RULE ===\n")

    try:
        rule = ActedRule.objects.get(rule_id="rule_aset_warning_v1")

        print(f"Found rule: {rule.name}")

        # Show current context_mapping
        current_actions = rule.actions
        current_context_mapping = current_actions[0].get('context_mapping', {})

        print(f"\nCURRENT context_mapping:")
        print(json.dumps(current_context_mapping, indent=2))

        # Create new generic context_mapping using filter type
        new_context_mapping = {
            "subject_code": {
                "type": "filter",
                "source": "cart.items",
                "condition": {
                    "product_id": {"in": [72, 73]}
                },
                "extract": "subject_code"
            }
        }

        print(f"\nNEW context_mapping:")
        print(json.dumps(new_context_mapping, indent=2))

        # Update the rule's context_mapping directly
        updated_actions = rule.actions.copy()
        updated_actions[0]["context_mapping"] = new_context_mapping

        # Update metadata
        metadata = rule.metadata.copy()
        metadata["updated_to_generic"] = True
        metadata["updated_by"] = "generic_template_processor"
        metadata["update_date"] = "2025-09-15"

        # Save both fields
        ActedRule.objects.filter(rule_id="rule_aset_warning_v1").update(
            actions=updated_actions,
            metadata=metadata
        )

        print(f"\n[SUCCESS] ASET warning rule updated in database!")

        # Verify the update
        rule.refresh_from_db()
        verification_context_mapping = rule.actions[0].get('context_mapping', {})

        print(f"\nVERIFICATION - Updated context_mapping:")
        print(json.dumps(verification_context_mapping, indent=2))

        if 'type' in verification_context_mapping.get('subject_code', {}):
            print(f"[OK] Update confirmed - rule now uses generic filter mechanism")
            return True
        else:
            print(f"[ERROR] Update not confirmed - rule still has old format")
            return False

    except ActedRule.DoesNotExist:
        print("[ERROR] ASET warning rule not found!")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = force_update_aset_rule()
    if success:
        print("\n[COMPLETED] ASET rule successfully updated to use generic template processor")
    else:
        print("\n[FAILED] Could not update ASET rule")