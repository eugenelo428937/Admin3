# core_auth/views.py
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
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

    @require_GET
    def get_csrf_token(request):
        return JsonResponse({'csrfToken': get_token(request)})
