from django.core.management.base import BaseCommand
from utils.models import EmailTemplateContentRule


class Command(BaseCommand):
    help = 'Fix whitespace-only content overrides that prevent default templates from being used'

    def handle(self, *args, **options):
        self.stdout.write('=== FIXING CONTENT OVERRIDES ===\n')
        
        # Find all rule associations with content overrides
        problematic_rules = EmailTemplateContentRule.objects.exclude(content_override='').filter(content_override__isnull=False)
        
        self.stdout.write(f'Found {problematic_rules.count()} rule associations with content overrides:')
        
        fixed_count = 0
        for rule_assoc in problematic_rules:
            content = rule_assoc.content_override
            self.stdout.write(f'  {rule_assoc.template.name} - {rule_assoc.content_rule.name}:')
            self.stdout.write(f'    Content: {repr(content)} (len={len(content)})')
            
            # Clear whitespace-only overrides
            if content.strip() == '':
                self.stdout.write(f'    → ✅ Clearing whitespace-only override')
                rule_assoc.content_override = ''
                rule_assoc.save()
                fixed_count += 1
            else:
                self.stdout.write(f'    → ℹ️  Keeping non-whitespace override')
        
        self.stdout.write(f'\n=== FIXED {fixed_count} CONTENT OVERRIDES ===') 