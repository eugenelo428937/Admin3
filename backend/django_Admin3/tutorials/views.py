from django.shortcuts import render
from rest_framework import viewsets, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import TutorialEvent
from .serializers import TutorialEventSerializer

# Create your views here.

class TutorialEventViewSet(viewsets.ModelViewSet):
    queryset = TutorialEvent.objects.all()
    serializer_class = TutorialEventSerializer
    permission_classes = [AllowAny]

class TutorialEventListView(generics.ListAPIView):
    serializer_class = TutorialEventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return TutorialEvent.objects.filter(is_soldout=False)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
