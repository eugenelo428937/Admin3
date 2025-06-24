from django.core.management.base import BaseCommand
from utils.models import EmailContentPlaceholder


class Command(BaseCommand):
    help = 'Fix all placeholders that have content_variables as list instead of dict'

    def handle(self, *args, **options):
        self.stdout.write('=== FIXING PLACEHOLDER CONTENT_VARIABLES ===\n')
        
        # Find all placeholders with list content_variables
        placeholders = EmailContentPlaceholder.objects.all()
        fixed_count = 0
        
        for placeholder in placeholders:
            if isinstance(placeholder.content_variables, list):
                self.stdout.write(f'❌ Found placeholder "{placeholder.name}" with list content_variables: {placeholder.content_variables}')
                
                # Convert to dict
                placeholder.content_variables = {}
                placeholder.save()
                
                self.stdout.write(f'✅ Fixed placeholder "{placeholder.name}" - content_variables is now: {placeholder.content_variables}')
                fixed_count += 1
            else:
                self.stdout.write(f'✅ Placeholder "{placeholder.name}" already has dict content_variables: {placeholder.content_variables}')
        
        if fixed_count > 0:
            self.stdout.write(f'\n🔧 Fixed {fixed_count} placeholders')
        else:
            self.stdout.write(f'\n✅ No placeholders needed fixing')
            
        self.stdout.write('\n=== DONE ===') 