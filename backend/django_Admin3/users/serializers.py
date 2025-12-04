from rest_framework import serializers
from django.contrib.auth.models import User
from userprofile.models import UserProfile, UserProfileAddress, UserProfileContactNumber, UserProfileEmail

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    profile = serializers.DictField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'profile')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password')
        username = validated_data.pop('username', validated_data.get('email'))

        # Check for existing user
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError("A user with this email/username already exists.")

        user = User.objects.create(
            username=username,
            is_active=False,  # Require email activation
            **validated_data
        )
        user.set_password(password)
        user.save()

        # Get the UserProfile created by the signal
        user_profile = user.userprofile
        user_profile.title = profile_data.get('title', '')
        user_profile.send_invoices_to = profile_data.get('send_invoices_to', 'HOME')
        user_profile.send_study_material_to = profile_data.get('send_study_material_to', 'HOME')
        user_profile.save()

        # Addresses - Now using JSON format
        home_addr = profile_data.get('home_address', {})
        if home_addr and self._has_valid_address_data(home_addr):
            # Store address as JSON format, filtering out empty fields
            address_data = self._clean_address_data(home_addr)
            UserProfileAddress.objects.create(
                user_profile=user_profile,
                address_type='HOME',
                address_data=address_data,
                country=home_addr.get('country', ''),
            )
        
        work_addr = profile_data.get('work_address', {})
        if work_addr and self._has_valid_address_data(work_addr):
            # Store address as JSON format, filtering out empty fields
            address_data = self._clean_address_data(work_addr)
            UserProfileAddress.objects.create(
                user_profile=user_profile,
                address_type='WORK',
                address_data=address_data,
                country=work_addr.get('country', ''),
                company=work_addr.get('company', ''),
                department=work_addr.get('department', ''),
            )
        # Contact Numbers
        if profile_data.get('home_phone'):
            UserProfileContactNumber.objects.create(user_profile=user_profile, contact_type='HOME', number=profile_data['home_phone'])
        if profile_data.get('work_phone'):
            UserProfileContactNumber.objects.create(user_profile=user_profile, contact_type='WORK', number=profile_data['work_phone'])
        if profile_data.get('mobile_phone'):
            UserProfileContactNumber.objects.create(user_profile=user_profile, contact_type='MOBILE', number=profile_data['mobile_phone'])
        # Emails
        if validated_data.get('email'):
            UserProfileEmail.objects.create(user_profile=user_profile, email_type='PERSONAL', email=validated_data['email'])
        return user
    
    def _has_valid_address_data(self, address_dict):
        """Check if address dictionary contains any meaningful data.

        Does not hardcode specific field names since different countries have
        different address formats (per Google libaddressinput). Accepts any
        non-empty value as valid address data, including country-only addresses.
        """
        return any(
            value and str(value).strip()
            for value in address_dict.values()
        )
    
    def _clean_address_data(self, address_dict):
        """Clean and format address data for JSON storage"""
        # Remove empty values and None values
        cleaned_data = {}
        for key, value in address_dict.items():
            if value and str(value).strip():
                cleaned_data[key] = str(value).strip()
        
        # Map old field names to standardized names if needed
        if 'street' in cleaned_data and 'address' not in cleaned_data:
            cleaned_data['address'] = cleaned_data['street']
        if 'town' in cleaned_data and 'city' not in cleaned_data:
            cleaned_data['city'] = cleaned_data['town']
        if 'postcode' in cleaned_data and 'postal_code' not in cleaned_data:
            cleaned_data['postal_code'] = cleaned_data['postcode']
        
        return cleaned_data
