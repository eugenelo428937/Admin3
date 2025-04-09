from rest_framework import serializers
from django.contrib.auth.models import User

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Pop username so it doesn't get passed twice
        username = validated_data.pop('username', validated_data.get('email'))
        
        # Create user with email as username
        user = User.objects.create(
            username=username,
            **validated_data
        )
        user.set_password(password)
        user.save()
        return user
