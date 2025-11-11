"""
Test Django email system with SendGrid backend
Run: python test_django_email.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.uat')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print(f"Email Backend: {settings.EMAIL_BACKEND}")
print(f"USE_SENDGRID: {settings.USE_SENDGRID}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

if hasattr(settings, 'ANYMAIL'):
    print(f"ANYMAIL configured: Yes")
    api_key = settings.ANYMAIL.get('SENDGRID_API_KEY', '')
    print(f"API Key present: {bool(api_key)}")
    print(f"API Key (first 10 chars): {api_key[:10]}...")
else:
    print("ANYMAIL not configured")

print("\n" + "="*60)
print("Sending test email...")
print("="*60 + "\n")

try:
    result = send_mail(
        subject='SendGrid Test from Admin3 UAT',
        message='This is a test email sent via Django with SendGrid backend.',
        from_email=settings.DEFAULT_FROM_EMAIL,  # Use configured default
        recipient_list=['eugene.lo1030@gmail.com'],
        fail_silently=False,
    )

    print(f"✅ Email sent successfully!")
    print(f"Number of emails sent: {result}")
    print(f"\nCheck inbox: eugene.lo1030@gmail.com")

    if settings.EMAIL_BCC_MONITORING:
        print(f"Also check BCC recipients: {', '.join(settings.EMAIL_BCC_RECIPIENTS)}")

except Exception as e:
    print(f"❌ Error sending email:")
    print(f"Error type: {type(e).__name__}")
    print(f"Error: {str(e)}")

    # Check for common issues
    if "403" in str(e) or "Forbidden" in str(e):
        print("\n⚠️  Possible causes:")
        print("1. Sender email not verified in SendGrid")
        print("   → Go to SendGrid → Settings → Sender Authentication")
        print(f"   → Verify: {settings.DEFAULT_FROM_EMAIL}")
        print("2. API Key permissions insufficient")
        print("   → Regenerate API key with 'Full Access' or 'Mail Send' permission")
    elif "401" in str(e) or "Unauthorized" in str(e):
        print("\n⚠️  API Key issue:")
        print("   → Check SENDGRID_API_KEY in .env.uat")
        print("   → Regenerate API key in SendGrid dashboard")
