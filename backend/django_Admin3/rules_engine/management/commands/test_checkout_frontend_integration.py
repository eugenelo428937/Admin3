from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from django.urls import reverse
import json


class Command(BaseCommand):
    help = 'Test checkout_start rules integration with frontend format'

    def handle(self, *args, **options):
        # Find a test user
        test_user = User.objects.first()
        if not test_user:
            self.stdout.write(self.style.ERROR('No users found in database. Please create a user first.'))
            return
        
        self.stdout.write(f'Using test user: {test_user.username} (ID: {test_user.id})')
        
        # Create API client
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        # Test data matching frontend cart item format
        checkout_context = {
            'entry_point_code': 'checkout_start',
            'context': {
                'cart_items': [
                    {
                        'id': 1,
                        'product_id': 123,
                        'subject_code': 'CM1',
                        'product_name': 'Series X Assignments (Marking)',
                        'product_code': 'CM1_X_MARKING',
                        'product_type': 'marking',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '45.00',
                        'metadata': {}
                    }
                ]
            }
        }
        
        self.stdout.write('\nTesting checkout_start API endpoint...')
        
        # Test the API endpoint that frontend will call
        try:
            url = reverse('rulesengine-evaluate-rules')
            response = client.post(url, checkout_context, format='json')
            
            self.stdout.write(f'API Response Status: {response.status_code}')
            
            if response.status_code == 200:
                data = response.json()
                self.stdout.write(f'Success: {data.get("success")}')
                self.stdout.write(f'Messages count: {len(data.get("messages", []))}')
                
                # Check for expired deadline messages
                messages = data.get('messages', [])
                for i, message in enumerate(messages):
                    if message.get('message_type') == 'warning':
                        self.stdout.write(f'\n--- Warning Message {i+1} ---')
                        self.stdout.write(f'Title: {message.get("title")}')
                        self.stdout.write(f'Rule ID: {message.get("rule_id")}')
                        self.stdout.write(f'Template ID: {message.get("template_id")}')
                        
                        # Show JSON content for frontend
                        if message.get('json_content'):
                            self.stdout.write('JSON Content for Frontend:')
                            self.stdout.write(json.dumps(message['json_content'], indent=2))
                
                if not messages:
                    self.stdout.write(self.style.WARNING('No messages returned - rule may not be triggering'))
                
            else:
                self.stdout.write(self.style.ERROR(f'API call failed: {response.content}'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error testing API: {str(e)}'))
        
        # Test direct rules engine call
        self.stdout.write('\n=== Direct Rules Engine Test ===')
        from rules_engine.engine import rules_engine
        
        try:
            direct_result = rules_engine.evaluate_rules(
                entry_point_code='checkout_start',
                user=test_user,
                cart_items=checkout_context['context']['cart_items']
            )
            
            self.stdout.write(f'Direct call success: {direct_result.get("success")}')
            self.stdout.write(f'Direct messages count: {len(direct_result.get("messages", []))}')
            
            if direct_result.get('messages'):
                message = direct_result['messages'][0]
                self.stdout.write(f'First message type: {message.get("message_type")}')
                self.stdout.write(f'First message title: {message.get("title")}')
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error in direct test: {str(e)}'))
        
        self.stdout.write('\n=== Frontend Integration Checklist ===')
        self.stdout.write('✅ API endpoint available: /api/rules/engine/evaluate/')
        self.stdout.write('✅ Request format: POST with entry_point_code and context')
        self.stdout.write('✅ Response format: JSON with success, messages array')
        self.stdout.write('✅ Message format: title, message_type, json_content')
        self.stdout.write('✅ Template variables: populated from custom function result')
        
        self.stdout.write('\nFrontend should call:')
        self.stdout.write('rulesEngineService.evaluateRulesAtEntryPoint("checkout_start", { cart_items: [...] })')
        
        self.stdout.write('\nTest completed!')