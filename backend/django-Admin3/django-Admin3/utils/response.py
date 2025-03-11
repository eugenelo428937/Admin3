# backend/django-Admin3/utils/response.py
from rest_framework.response import Response

class ApiResponse:
    @staticmethod
    def success(data=None, message=None, status=200):
        return Response({
            'status': 'success',
            'data': data,
            'message': message
        }, status=status)

    @staticmethod
    def error(message, status=400, errors=None):
        return Response({
            'status': 'error',
            'message': message,
            'errors': errors
        }, status=status)
