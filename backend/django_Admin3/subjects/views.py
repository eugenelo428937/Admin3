from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import Subject
from .serializers import SubjectSerializer
    
class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'], url_path='bulk-import')    
    def bulk_import_subjects(self,request):
        try:
            subjects_data = request.data.get('subjects', [])
            created_subjects = []
            errors = []

            for subject_data in subjects_data:
                serializer = SubjectSerializer(data=subject_data)
                if serializer.is_valid():
                    serializer.save()
                    created_subjects.append(serializer.data)
                else:
                    errors.append({
                        'code': subject_data.get('code'),
                        'errors': serializer.errors
                    })

            return Response({
                'message': f'Successfully imported {len(created_subjects)} subjects',
                'created': created_subjects,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created_subjects else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
