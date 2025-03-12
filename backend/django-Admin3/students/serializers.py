from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Student

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('id', 'username', 'email')  # Make these read-only since user management is moved

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
