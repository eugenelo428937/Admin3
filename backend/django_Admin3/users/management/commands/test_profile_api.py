from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from userprofile.models import UserProfile

class Command(BaseCommand):
    help = 'Test profile API functionality and check user profiles'

    def handle(self, *args, **options):
        self.stdout.write("Testing Profile API functionality...")
        
        # Check how many users exist
        users = User.objects.all()
        self.stdout.write(f"Total users: {users.count()}")
        
        # Check how many profiles exist
        profiles = UserProfile.objects.all()
        self.stdout.write(f"Total profiles: {profiles.count()}")
        
        # Check users without profiles
        users_without_profiles = []
        for user in users:
            try:
                profile = user.userprofile
                self.stdout.write(f"✓ User {user.username} ({user.email}) has profile")
            except UserProfile.DoesNotExist:
                users_without_profiles.append(user)
                self.stdout.write(f"✗ User {user.username} ({user.email}) has NO profile")
        
        # Create missing profiles
        if users_without_profiles:
            self.stdout.write(f"\nCreating {len(users_without_profiles)} missing profiles...")
            for user in users_without_profiles:
                profile = UserProfile.objects.create(user=user)
                self.stdout.write(f"✓ Created profile for {user.username}")
        
        # Test profile data structure for a user
        if users.exists():
            test_user = users.first()
            self.stdout.write(f"\nTesting profile data structure for user: {test_user.username}")
            
            try:
                profile = test_user.userprofile
                
                # Get addresses
                home_address = profile.addresses.filter(address_type='HOME').first()
                work_address = profile.addresses.filter(address_type='WORK').first()
                
                # Get contact numbers
                contact_numbers = {}
                for contact in profile.contact_numbers.all():
                    contact_numbers[contact.contact_type.lower() + '_phone'] = contact.number
                
                # Get emails
                emails = {}
                for email in profile.emails.all():
                    emails[email.email_type.lower() + '_email'] = email.email
                
                profile_data = {
                    'user': {
                        'id': test_user.id,
                        'username': test_user.username,
                        'email': test_user.email,
                        'first_name': test_user.first_name,
                        'last_name': test_user.last_name,
                        'is_active': test_user.is_active,
                    },
                    'profile': {
                        'title': profile.title or '',
                        'send_invoices_to': profile.send_invoices_to,
                        'send_study_material_to': profile.send_study_material_to,
                        'remarks': profile.remarks or '',
                    },
                    'home_address': {
                        'building': home_address.building if home_address else '',
                        'street': home_address.street if home_address else '',
                        'district': home_address.district if home_address else '',
                        'town': home_address.town if home_address else '',
                        'county': home_address.county if home_address else '',
                        'postcode': home_address.postcode if home_address else '',
                        'state': home_address.state if home_address else '',
                        'country': home_address.country if home_address else '',
                    } if home_address else {},
                    'work_address': {
                        'company': work_address.company if work_address else '',
                        'department': work_address.department if work_address else '',
                        'building': work_address.building if work_address else '',
                        'street': work_address.street if work_address else '',
                        'district': work_address.district if work_address else '',
                        'town': work_address.town if work_address else '',
                        'county': work_address.county if work_address else '',
                        'postcode': work_address.postcode if work_address else '',
                        'state': work_address.state if work_address else '',
                        'country': work_address.country if work_address else '',
                    } if work_address else {},
                    'contact_numbers': contact_numbers,
                    'emails': emails
                }
                
                self.stdout.write("✓ Profile data structure test successful")
                self.stdout.write(f"Profile data preview: {profile_data}")
                
            except Exception as e:
                self.stdout.write(f"✗ Error testing profile data: {str(e)}")
        
        self.stdout.write(self.style.SUCCESS("Profile API test completed!")) 