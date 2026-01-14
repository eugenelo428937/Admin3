from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ExamSessionSubject
from .serializers import ExamSessionSubjectSerializer
from exam_sessions.models import ExamSession
from subjects.models import Subject

class ExamSessionSubjectViewSet(viewsets.ModelViewSet):
    queryset = ExamSessionSubject.objects.all()
    serializer_class = ExamSessionSubjectSerializer

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        data = request.data.get('exam_session_subjects', [])
        created = []
        errors = []

        for item in data:
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'data': item,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST if errors else status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='insert-subjects')
    def insert_subjects_by_session(self, request):
        """
        Insert subjects for a specific exam session using session_code.
        
        Expected request data format:
        {
            "session_code": "SESSION001",
            "subject_codes": ["SUB1", "SUB2", "SUB3"]
        }
        """
        session_code = request.data.get('session_code')        

        if not session_code:
            return Response({
                'error': 'Both session_code and subject_codes are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get the exam session
            exam_session = get_object_or_404(ExamSession, session_code=session_code)
            
            created = []
            errors = []

            subject_codes = Subject.objects.all().values_list('code', flat=True)
            # Process each subject
            for subject_code in subject_codes:
                try:
                    subject = Subject.objects.get(code=subject_code)
                    
                    # Create exam session subject if it doesn't exist
                    exam_session_subject, created_status = ExamSessionSubject.objects.get_or_create(
                        exam_session=exam_session,
                        subject=subject
                    )
                    
                    if created_status:
                        created.append({
                            'session_code': session_code,
                            'subject_code': subject_code,
                            'status': 'created'
                        })
                    else:
                        created.append({
                            'session_code': session_code,
                            'subject_code': subject_code,
                            'status': 'already exists'
                        })
                        
                except Subject.DoesNotExist:
                    errors.append({
                        'subject_code': subject_code,
                        'error': 'Subject not found'
                    })
                except Exception as e:
                    errors.append({
                        'subject_code': subject_code,
                        'error': str(e)
                    })

            return Response({
                'message': f'Processed {len(created)} subjects for session {session_code}',
                'created': created,
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST if errors and not created else status.HTTP_201_CREATED)

        except ExamSession.DoesNotExist:
            return Response({
                'error': f'Exam session with code {session_code} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
