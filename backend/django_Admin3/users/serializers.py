from rest_framework import serializers
from django.contrib.auth.models import User
from userprofile.models import UserProfile, ActedUserProfileAddress, ActedUserProfileContactNumber, ActedUserProfileEmail

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
            **validated_data
        )
        user.set_password(password)
        user.save()

        # Only create UserProfile if it doesn't exist
        if not UserProfile.objects.filter(user=user).exists():
            user_profile = UserProfile.objects.create(
                user=user,
                title=profile_data.get('title', ''),
                send_invoices_to=profile_data.get('send_invoices_to', 'HOME'),
                send_study_material_to=profile_data.get('send_study_material_to', 'HOME'),
            )
            # Addresses
            home_addr = profile_data.get('home_address', {})
            if home_addr:
                ActedUserProfileAddress.objects.create(
                    user_profile=user_profile,
                    address_type='HOME',
                    building=home_addr.get('building', ''),
                    street=home_addr.get('street', ''),
                    district=home_addr.get('district', ''),
                    town=home_addr.get('town', ''),
                    county=home_addr.get('county', ''),
                    postcode=home_addr.get('postcode', ''),
                    state=home_addr.get('state', ''),
                    country=home_addr.get('country', ''),
                )
            work_addr = profile_data.get('work_address', {})
            if work_addr:
                ActedUserProfileAddress.objects.create(
                    user_profile=user_profile,
                    address_type='WORK',
                    building=work_addr.get('building', ''),
                    street=work_addr.get('street', ''),
                    district=work_addr.get('district', ''),
                    town=work_addr.get('town', ''),
                    county=work_addr.get('county', ''),
                    postcode=work_addr.get('postcode', ''),
                    state=work_addr.get('state', ''),
                    country=work_addr.get('country', ''),
                    company=work_addr.get('company', ''),
                    department=work_addr.get('department', ''),
                )
            # Contact Numbers
            if profile_data.get('home_phone'):
                ActedUserProfileContactNumber.objects.create(user_profile=user_profile, contact_type='HOME', number=profile_data['home_phone'])
            if profile_data.get('work_phone'):
                ActedUserProfileContactNumber.objects.create(user_profile=user_profile, contact_type='WORK', number=profile_data['work_phone'])
            if profile_data.get('mobile_phone'):
                ActedUserProfileContactNumber.objects.create(user_profile=user_profile, contact_type='MOBILE', number=profile_data['mobile_phone'])
            # Emails
            if profile_data.get('email1'):
                ActedUserProfileEmail.objects.create(user_profile=user_profile, email_type='PERSONAL', email=profile_data['email1'])
            if profile_data.get('email2'):
                ActedUserProfileEmail.objects.create(user_profile=user_profile, email_type='WORK', email=profile_data['email2'])
        else:
            user_profile = UserProfile.objects.get(user=user)
        return user
