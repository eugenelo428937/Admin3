from django.core.management.base import BaseCommand
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Test account activation functionality'

    def handle(self, *args, **options):
        """Test account activation token generation and verification"""
        
        self.stdout.write("=== Account Activation Test ===")
        
        # Create a test user (inactive)
        test_email = "test_activation@example.com"
        
        # Check if user already exists and delete if necessary
        try:
            existing_user = User.objects.get(email=test_email)
            existing_user.delete()
            self.stdout.write(f"Deleted existing test user: {test_email}")
        except User.DoesNotExist:
            pass
        
        # Create new inactive user
        user = User.objects.create(
            username=test_email,
            email=test_email,
            first_name="Test",
            last_name="User",
            is_active=False  # Important: User starts inactive
        )
        user.set_password("testpassword123")
        user.save()
        
        self.stdout.write(
            self.style.SUCCESS(f"✓ Created inactive user: {user.email} (ID: {user.id}, is_active: {user.is_active})")
        )
        
        # Generate activation token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        self.stdout.write(self.style.SUCCESS(f"✓ Generated activation token: {token}"))
        self.stdout.write(self.style.SUCCESS(f"✓ Generated UID: {uid}"))
        
        # Create activation URL (like in the email)
        activation_url = f"http://127.0.0.1:3000/auth/activate?uid={uid}&token={token}"
        self.stdout.write(self.style.SUCCESS(f"✓ Activation URL: {activation_url}"))
        
        # Test token verification (simulates what happens when user clicks link)
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            retrieved_user = User.objects.get(pk=user_id)
            
            self.stdout.write(self.style.SUCCESS(f"✓ Successfully decoded UID to user ID: {user_id}"))
            self.stdout.write(self.style.SUCCESS(f"✓ Retrieved user: {retrieved_user.email}"))
            
            # Verify token
            if default_token_generator.check_token(retrieved_user, token):
                self.stdout.write(self.style.SUCCESS("✓ Token verification: VALID"))
                
                # Simulate activation
                if not retrieved_user.is_active:
                    retrieved_user.is_active = True
                    retrieved_user.save()
                    self.stdout.write(self.style.SUCCESS("✓ Account activated successfully!"))
                    self.stdout.write(self.style.SUCCESS(f"✓ User is_active status: {retrieved_user.is_active}"))
                else:
                    self.stdout.write("ℹ Account was already active")
                    
            else:
                self.stdout.write(self.style.ERROR("✗ Token verification: INVALID"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Token verification failed: {str(e)}"))
        
        # Test API endpoint format
        self.stdout.write("\n=== API Test Data ===")
        self.stdout.write("POST /api/auth/activate/")
        self.stdout.write("Request body:")
        self.stdout.write(f"{{")
        self.stdout.write(f'  "uid": "{uid}",')
        self.stdout.write(f'  "token": "{token}"')
        self.stdout.write(f"}}")
        
        # Clean up
        user.delete()
        self.stdout.write(self.style.SUCCESS(f"\n✓ Cleaned up test user: {test_email}"))
        
        self.stdout.write("\n=== Test Complete ===")
        
        # Additional test: Test with actual API call simulation
        self.stdout.write("\n=== API Simulation Test ===")
        
        # Create another test user
        user2 = User.objects.create(
            username="test_api@example.com",
            email="test_api@example.com",
            first_name="API",
            last_name="Test",
            is_active=False
        )
        user2.set_password("testpassword123")
        user2.save()
        
        token2 = default_token_generator.make_token(user2)
        uid2 = urlsafe_base64_encode(force_bytes(user2.pk))
        
        # Simulate the API endpoint logic
        try:
            from core_auth.views import AuthViewSet
            from rest_framework.test import APIRequestFactory
            from django.http import JsonResponse
            
            # Simulate request data
            request_data = {
                'uid': uid2,
                'token': token2
            }
            
            self.stdout.write(f"✓ Created second test user for API simulation: {user2.email}")
            self.stdout.write(f"✓ API request data: {request_data}")
            
            # Test the logic manually (without actual HTTP request)
            user_id = force_str(urlsafe_base64_decode(uid2))
            retrieved_user = User.objects.get(pk=user_id)
            
            if default_token_generator.check_token(retrieved_user, token2):
                if not retrieved_user.is_active:
                    retrieved_user.is_active = True
                    retrieved_user.save()
                    self.stdout.write(self.style.SUCCESS("✓ API simulation: Account activation would succeed"))
                else:
                    self.stdout.write("ℹ API simulation: Account already active")
            else:
                self.stdout.write(self.style.ERROR("✗ API simulation: Token invalid"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ API simulation failed: {str(e)}"))
        finally:
            # Clean up second user
            user2.delete()
            self.stdout.write(self.style.SUCCESS("✓ Cleaned up API test user"))
        
        self.stdout.write(self.style.SUCCESS("\n=== All Tests Complete ===")) 