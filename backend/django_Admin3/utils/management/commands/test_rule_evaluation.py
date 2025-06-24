from django.core.management.base import BaseCommand
from utils.models import EmailContentRule, EmailTemplateContentRule
from utils.services.content_insertion_service import content_insertion_service


class Command(BaseCommand):
    help = 'Test rule evaluation with different order contexts'

    def handle(self, *args, **options):
        self.stdout.write('=== TESTING RULE EVALUATION ===')
        
        # Test context 1: Digital order (should only show DIGITAL_CONTENT and BANK_PAYMENT)
        digital_context = {
            'is_digital': True,
            'is_invoice': False,
            'is_tutorial': False,
            'employer_code': None,
            'items': [
                {
                    'name': 'eBook',
                    'is_digital': True
                }
            ],
            'user': {
                'country': 'United Kingdom'
            }
        }
        
        self.test_context("Digital Order (is_digital=True, is_invoice=False)", digital_context)
        
        # Test context 2: Invoice order (should only show INVOICE_PAYMENT)
        invoice_context = {
            'is_digital': False,
            'is_invoice': True,
            'is_tutorial': False,
            'employer_code': None,
            'items': [
                {
                    'name': 'Physical book',
                    'is_digital': False
                }
            ],
            'user': {
                'country': 'United Kingdom'
            }
        }
        
        self.test_context("Invoice Order (is_digital=False, is_invoice=True)", invoice_context)
        
        # Test context 3: Employer order (should show EMPLOYER_REVIEW and BANK_PAYMENT)
        employer_context = {
            'is_digital': False,
            'is_invoice': False,
            'is_tutorial': False,
            'employer_code': 'EMP001',
            'items': [
                {
                    'name': 'Study material',
                    'is_digital': False
                }
            ],
            'user': {
                'country': 'United Kingdom'
            }
        }
        
        self.test_context("Employer Order (employer_code=EMP001, is_invoice=False)", employer_context)
        
        # Test context 4: Tutorial order (should show TUTORIAL_CONTENT and BANK_PAYMENT)
        tutorial_context = {
            'is_digital': False,
            'is_invoice': False,
            'is_tutorial': True,
            'employer_code': None,
            'items': [
                {
                    'name': 'Tutorial session',
                    'is_digital': False
                }
            ],
            'user': {
                'country': 'United Kingdom'
            }
        }
        
        self.test_context("Tutorial Order (is_tutorial=True, is_invoice=False)", tutorial_context)
        
        # Debug BANK_PAYMENT specifically
        self.debug_bank_payment_rule(digital_context)
    
    def test_context(self, description, context):
        self.stdout.write(f'\n🧪 Test: {description}')
        self.stdout.write(f'Context: {context}')
        
        # Generate content preview
        preview = content_insertion_service.preview_dynamic_content('order_confirmation', context)
        
        self.stdout.write('  📝 Results:')
        
        for placeholder_name, result in preview['placeholders'].items():
            if result['has_content']:
                content_preview = result['generated_content'][:100] + "..." if len(result['generated_content']) > 100 else result['generated_content']
                rules_matched = [rule['rule_name'] for rule in result['matched_rules']]
                self.stdout.write(f'    ✅ {placeholder_name}: HAS CONTENT')
                self.stdout.write(f'       Matched rules: {rules_matched}')
                self.stdout.write(f'       Content: {content_preview}')
            else:
                rules_matched = [rule['rule_name'] for rule in result['matched_rules']]
                if rules_matched:
                    self.stdout.write(f'    ❌ {placeholder_name}: NO CONTENT')
                    self.stdout.write(f'       Matched rules: {rules_matched} (but no content generated)')
                else:
                    self.stdout.write(f'    ❌ {placeholder_name}: NO CONTENT')
    
    def debug_bank_payment_rule(self, context):
        self.stdout.write('\n🔍 DEBUGGING BANK_PAYMENT RULE:')
        
        from utils.models import EmailContentPlaceholder, EmailContentRule
        
        try:
            # Get the placeholder
            placeholder = EmailContentPlaceholder.objects.get(name='BANK_PAYMENT')
            self.stdout.write(f'  Placeholder exists: {placeholder.name}')
            self.stdout.write(f'  Has default template: {bool(placeholder.default_content_template)}')
            self.stdout.write(f'  Template length: {len(placeholder.default_content_template)}')
            self.stdout.write(f'  Content variables: {placeholder.content_variables}')
            self.stdout.write(f'  Content variables type: {type(placeholder.content_variables)}')
            
            # Get the rule
            rule = EmailContentRule.objects.get(name='Bank Payment')
            self.stdout.write(f'  Rule exists: {rule.name}')
            self.stdout.write(f'  Rule condition: {rule.condition_field} {rule.condition_operator} {rule.condition_value}')
            self.stdout.write(f'  Rule evaluates to: {rule.evaluate_condition(context)}')
            
            # Test template rendering directly
            try:
                rendered = content_insertion_service._render_content_template(
                    placeholder.default_content_template, 
                    context, 
                    placeholder.content_variables
                )
                self.stdout.write(f'  Direct template render result: {rendered}')
                self.stdout.write(f'  Rendered content length: {len(rendered)}')
                self.stdout.write(f'  Content is truthy: {bool(rendered)}')
            except Exception as e:
                self.stdout.write(f'  ❌ Template rendering error: {str(e)}')
            
            # Now debug the _generate_dynamic_content method step by step
            self.stdout.write('\n  🔬 Step-by-step _generate_dynamic_content debugging:')
            
            # Get template rules
            rules = content_insertion_service._get_template_content_rules('order_confirmation')
            self.stdout.write(f'  Total rules found: {len(rules)}')
            
            # Filter applicable rules for BANK_PAYMENT
            applicable_rules = [
                rule_association for rule_association in rules
                if rule_association.content_rule.placeholder.name == 'BANK_PAYMENT' and 
                   rule_association.content_rule.is_active and 
                   rule_association.is_enabled
            ]
            self.stdout.write(f'  Applicable rules for BANK_PAYMENT: {len(applicable_rules)}')
            
            contents = []
            for rule_association in applicable_rules:
                rule = rule_association.content_rule
                self.stdout.write(f'    Testing rule: {rule.name}')
                
                # Evaluate rule condition
                condition_result = rule.evaluate_condition(context)
                self.stdout.write(f'    Rule evaluates to: {condition_result}')
                
                if condition_result:
                    # Use override content template if available
                    content_template = rule_association.get_content_template()
                    self.stdout.write(f'    Content template length: {len(content_template) if content_template else 0}')
                    
                    # Get variables from the placeholder
                    variables = placeholder.content_variables
                    self.stdout.write(f'    Variables: {variables}')
                    
                    # Render content
                    rendered_content = content_insertion_service._render_content_template(
                        content_template, context, variables
                    )
                    self.stdout.write(f'    Rendered content: {repr(rendered_content)}')
                    self.stdout.write(f'    Rendered content truthy: {bool(rendered_content)}')
                    
                    if rendered_content:
                        contents.append(rendered_content)
                        self.stdout.write(f'    ✅ Content added to list')
                    else:
                        self.stdout.write(f'    ❌ Content was falsy, not added')
            
            self.stdout.write(f'  Final contents list length: {len(contents)}')
            self.stdout.write(f'  Contents: {contents}')
            
            # Final combination logic
            if contents:
                separator = placeholder.content_separator if placeholder else '\n'
                if placeholder and not placeholder.allow_multiple_rules and len(contents) > 1:
                    final_result = contents[0]
                else:
                    final_result = separator.join(contents)
                self.stdout.write(f'  ✅ Final result: {repr(final_result)}')
            else:
                self.stdout.write(f'  ❌ No contents to combine')
            
        except Exception as e:
            self.stdout.write(f'  ❌ Debug error: {str(e)}')
            import traceback
            self.stdout.write(f'  Traceback: {traceback.format_exc()}') 