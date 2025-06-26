from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Student
from .serializers import StudentSerializer

class StudentViewSet(viewsets.ModelViewSet):
    '''
    ViewSet for Student model operations.
    Provides CRUD operations for Student records.
    '''
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        '''
        Optionally restricts the returned students,
        by filtering against query parameters in the URL.
        '''
        queryset = Student.objects.all()
        student_type = self.request.query_params.get('student_type', None)
        if student_type is not None:
            queryset = queryset.filter(student_type=student_type)
        return queryset
