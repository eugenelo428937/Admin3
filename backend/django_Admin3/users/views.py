from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import transaction
from .serializers import UserRegistrationSerializer
from students.models import Student

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    try:
        with transaction.atomic():
            serializer = UserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.save()
                
                # Create associated student
                student = Student.objects.create(
                    user=user,
                    student_type='S',
                    apprentice_type='none'
                )
                
                return Response({
                    'status': 'success',
                    'message': 'Registration successful',
                    'user': serializer.data,
                    'student_ref': student.student_ref
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
