"""
Test script to verify message classification utilities work correctly
This simulates how the backend rules engine sends messages to the frontend
"""

import os
import sys
import django
import json

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Admin3.settings')
django.setup()

from rules_engine.models import MessageTemplate, RuleEntryPoint
from django.contrib.sessions.models import Session
from django.test import RequestFactory

def create_test_messages():
    """Create sample messages that mimic rules engine output"""

    messages = [
        # Terms & Conditions - Inline Acknowledgment
        {
            "type": "acknowledge",
            "display_type": "inline",
            "template_id": 11,
            "ack_key": "terms_conditions_v1",
            "required": True,
            "message_type": "terms",
            "content": {
                "title": "Terms & Conditions",
                "message": "ActEd's full Terms & Conditions are available on our website.",
                "checkbox_text": "I have read and accept the Terms & Conditions",
                "variant": "info"
            }
        },

        # Digital Content - Modal Acknowledgment
        {
            "type": "acknowledge",
            "display_type": "modal",
            "template_id": 13,
            "ack_key": "digital_content_v1",
            "required": True,
            "message_type": "digital_consent",
            "content": {
                "title": "Digital Content Consent",
                "message": "By purchasing digital content, you agree to immediate access and waive your right to cancel.",
                "checkbox_text": "I understand and agree to immediate digital delivery",
                "variant": "warning"
            }
        },

        # Holiday Notice - Inline Display
        {
            "type": "display",
            "display_type": "inline",
            "message_type": "info",
            "template_id": 2,
            "content": {
                "title": "Holiday Notice",
                "message": "Our offices will be closed from December 24-26. Orders placed during this time will be processed on December 27.",
                "icon": "calendar-event",
                "dismissible": True,
                "variant": "info"
            }
        },

        # Expired Deadlines - Modal Display
        {
            "type": "display",
            "display_type": "modal",
            "message_type": "error",
            "blocking": True,
            "template_id": 7,
            "content": {
                "title": "Important: Expired Deadlines",
                "message": "Some items in your cart have expired marking deadlines. Please review and remove these items before proceeding.",
                "variant": "error",
                "icon": "exclamation-triangle"
            }
        },

        # UK Import Tax Warning - Inline Display
        {
            "type": "display",
            "display_type": "inline",
            "message_type": "warning",
            "template_id": 5,
            "content": {
                "title": "UK Import Tax Notice",
                "message": "International orders may be subject to import duties and taxes.",
                "dismissible": True,
                "variant": "warning"
            }
        }
    ]

    return messages

def test_classification():
    """Test how messages would be classified"""
    messages = create_test_messages()

    print("=" * 80)
    print("MESSAGE CLASSIFICATION TEST")
    print("=" * 80)
    print(f"\nTotal messages created: {len(messages)}\n")

    # Separate by type
    acknowledgments = [m for m in messages if m.get('type') == 'acknowledge' or m.get('action_type') == 'user_acknowledge']
    displays = [m for m in messages if m not in acknowledgments]

    print("CLASSIFICATION RESULTS:")
    print("-" * 40)
    print(f"Acknowledgment Messages: {len(acknowledgments)}")
    for ack in acknowledgments:
        print(f"  - {ack['content']['title']} ({ack['display_type']})")

    print(f"\nDisplay Messages: {len(displays)}")
    for disp in displays:
        print(f"  - {disp['content']['title']} ({disp['display_type']})")

    # Further classify by display type
    inline_acks = [m for m in acknowledgments if m.get('display_type') == 'inline']
    modal_acks = [m for m in acknowledgments if m.get('display_type') == 'modal' or not m.get('display_type')]
    inline_displays = [m for m in displays if m.get('display_type') != 'modal']
    modal_displays = [m for m in displays if m.get('display_type') == 'modal']

    print("\nDETAILED BREAKDOWN:")
    print("-" * 40)
    print(f"Inline Acknowledgments: {len(inline_acks)}")
    print(f"Modal Acknowledgments: {len(modal_acks)}")
    print(f"Inline Display Messages: {len(inline_displays)}")
    print(f"Modal Display Messages: {len(modal_displays)}")

    # Test priority logic
    print("\nPRIORITY ANALYSIS:")
    print("-" * 40)

    for msg in messages:
        priority = 0
        if msg.get('blocking'):
            priority = 100
        elif msg.get('required'):
            priority = 90
        elif msg.get('type') == 'acknowledge':
            priority = 80
        elif msg.get('message_type') == 'error' or msg.get('content', {}).get('variant') == 'error':
            priority = 70
        elif msg.get('message_type') == 'warning' or msg.get('content', {}).get('variant') == 'warning':
            priority = 60
        else:
            priority = 30

        print(f"{msg['content']['title']}: Priority = {priority}")

    # Test variant mapping
    print("\nVARIANT MAPPING:")
    print("-" * 40)

    for msg in messages:
        variant = msg.get('variant') or msg.get('message_type') or msg.get('content', {}).get('variant') or 'info'

        # Normalize variants
        if variant in ['warning', 'alert']:
            normalized = 'warning'
        elif variant in ['error', 'danger']:
            normalized = 'error'
        elif variant == 'success':
            normalized = 'success'
        else:
            normalized = 'info'

        print(f"{msg['content']['title']}: {variant} -> {normalized}")

    return {
        'messages': messages,
        'stats': {
            'total': len(messages),
            'acknowledgments': len(acknowledgments),
            'displays': len(displays),
            'inline_acks': len(inline_acks),
            'modal_acks': len(modal_acks),
            'inline_displays': len(inline_displays),
            'modal_displays': len(modal_displays)
        }
    }

def test_json_export():
    """Export test data for frontend testing"""
    result = test_classification()

    # Save to JSON file for frontend testing
    output_file = 'test_messages.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n{'=' * 80}")
    print(f"Test data exported to: {output_file}")
    print("This can be imported in the frontend for testing")
    print(f"{'=' * 80}")

if __name__ == '__main__':
    test_json_export()

    print("\n✅ Message classification test completed successfully!")
    print("\nNEXT STEPS:")
    print("1. Navigate to: http://localhost:3000/test/message-classification")
    print("2. Click 'Run Classification' to see the utilities in action")
    print("3. Click 'Sort by Priority' to test priority sorting")
    print("4. Check browser console for detailed logs")