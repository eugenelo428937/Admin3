from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Student
from userprofile.models.email import UserProfileEmail
from userprofile.models.contact_number import UserProfileContactNumber
from userprofile.models.address import UserProfileAddress


class StudentAdminListSerializer(serializers.ModelSerializer):
    """Flat serializer for the student admin list table."""

    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            'student_ref',
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'student_type',
        )

    def get_email(self, obj):
        """Return primary email from user_profile_email, fall back to auth_user."""
        profile = getattr(obj.user, 'userprofile', None)
        if profile:
            email_obj = profile.emails.first()
            if email_obj:
                return email_obj.email
        return obj.user.email

    def get_phone(self, obj):
        """Return first contact number."""
        profile = getattr(obj.user, 'userprofile', None)
        if profile:
            contact = profile.contact_numbers.first()
            if contact:
                return contact.number
        return ''

    def get_address(self, obj):
        """Return formatted address from first address record."""
        profile = getattr(obj.user, 'userprofile', None)
        if profile:
            addr = profile.addresses.first()
            if addr:
                return addr.get_formatted_address()
        return ''
