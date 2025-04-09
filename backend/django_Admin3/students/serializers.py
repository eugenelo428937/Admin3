from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Student

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name')
        write_only_fields = ('password',)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            password = validated_data.pop('password')
            instance.set_password(password)
        return super().update(instance, validated_data)

class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # Make user read-only since it's managed by users app

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

    def update(self, instance, validated_data):
        # Only update student-specific fields
        instance.student_type = validated_data.get('student_type', instance.student_type)
        instance.apprentice_type = validated_data.get('apprentice_type', instance.apprentice_type)
        instance.remarks = validated_data.get('remarks', instance.remarks)
        instance.save()
        return instance
