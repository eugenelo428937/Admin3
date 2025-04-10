# exam_sessions/views.py
from rest_framework import viewsets
from .models import ExamSession
from .serializers import ExamSessionSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class ExamSessionViewSet(viewsets.ModelViewSet):
    queryset = ExamSession.objects.all()
    serializer_class = ExamSessionSerializer    

    



