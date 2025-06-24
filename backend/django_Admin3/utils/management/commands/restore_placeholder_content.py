from django.core.management.base import BaseCommand
from utils.models import EmailContentPlaceholder


class Command(BaseCommand):
    help = 'Restore default content templates for placeholders'

    def handle(self, *args, **options):
        self.stdout.write('=== RESTORING PLACEHOLDER CONTENT TEMPLATES ===\n')
        
        content_mapping = {
            'DIGITAL_CONTENT': '''<mj-text align="left" css-class="content-text">
    <p>
        <strong>DIGITAL CONTENT</strong>
    </p>
    <span>
        You can now access your materials by registering at www.acted.co.uk/student portal. All digital purchases will be available to access via the portal within 24 hours of purchase (Monday to Friday 9am to 5pm).
    </span>
</mj-text>''',
            
            'BANK_PAYMENT': '''<mj-text align="left" css-class="content-text">
    <span>Thank you for your debit/credit card payment.</span>
</mj-text>''',
            
            'EMPLOYER_REVIEW': '''<mj-text align="left" css-class="content-text">
    <div style="font-family: helvetica; font-size: 16px; text-align: left; color: rgb(44, 62, 80);">
        <strong>EMPLOYER SPONSORSHIP</strong>
    </div>
    <span>
        Your order will be sent to {{ employer_code }} for review and approval. 
        If approved, your materials will be dispatched accordingly.
    </span>
</mj-text>''',
            
            'TUTORIAL_CONTENT': '''<mj-text align="left" css-class="content-text">
    <span>
        <strong>FACE-TO-FACE or LIVE ONLINE TUTORIALS</strong>
    </span>
    <br/>
    <span>
        You will receive further information from us about your tutorials.
    </span>
</mj-text>''',
            
            'INVOICE_PAYMENT': '''<mj-text align="left" css-class="content-text">
    <span>An invoice will be emailed to you once your order has been processed.</span>
</mj-text>'''
        }
        
        for name, content in content_mapping.items():
            try:
                placeholder = EmailContentPlaceholder.objects.get(name=name)
                placeholder.default_content_template = content
                placeholder.save()
                self.stdout.write(f'✅ Restored content template for {name}')
            except EmailContentPlaceholder.DoesNotExist:
                self.stdout.write(f'❌ {name} does not exist')
        
        self.stdout.write('\n=== CONTENT RESTORATION COMPLETE ===') 