from django.shortcuts import render
from rest_framework import viewsets, generics
from rest_framework.response import Response
from .models import Event, Session
from .serializers import EventSerializer, SessionSerializer

# Create your views here.

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer

class TutorialEventListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(lifecycle_state='PUBLISHED', cancelled=False, web_sale=True)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
