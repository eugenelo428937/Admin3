# students/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Student

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email',
                  'password', 'first_name', 'last_name')
        read_only_fields = ('id',)
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False}
        }

class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Student
        fields = ('student_ref', 'user', 'student_type', 'apprentice_type', 
                 'create_date', 'modified_date', 'remarks')
        read_only_fields = ('student_ref', 'create_date', 'modified_date')
        extra_kwargs = {
            'student_type': {'required': False},
            'apprentice_type': {'required': False},
            'remarks': {'required': False}
        }

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = user_data.pop('password')
        # Create user first
        user = User.objects.create(
            username=user_data['email'],
            email=user_data['email'],
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', '')
        )
        user.set_password(password)
        user.save()

        # Create student
        student = Student.objects.create(
            user=user
        )
        return student

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user_serializer = UserSerializer(instance.user, data=user_data, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
        return super().update(instance, validated_data)
