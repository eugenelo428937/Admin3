# backend/django_Admin3/core_auth/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from students.serializers import UserSerializer

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def csrf(self, request):
        """
        Get CSRF token for the current session
        """
        return Response({
            'csrfToken': get_token(request)
        })

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login user and return JWT tokens
        """
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            serializer = UserSerializer(user)
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': serializer.data
            })
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        Register a new user and return JWT tokens
        """
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'status': 'success',
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        """
        Refresh JWT token
        """
        try:
            refresh = RefreshToken(request.data.get('refresh'))
            return Response({
                'token': str(refresh.access_token)
            })
        except Exception as e:
            return Response(
                {'error': 'Invalid refresh token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Logout user and blacklist refresh token
        """
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'status': 'success'})
        except Exception:
            return Response({'status': 'success'})
