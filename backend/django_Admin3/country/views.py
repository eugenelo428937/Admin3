from django.shortcuts import render
from rest_framework import viewsets
from .models import Country
from .serializers import CountrySerializer
from rest_framework.permissions import AllowAny

# Create your views here.

class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Disable pagination for full country list
    filterset_fields = ['name', 'iso_code', 'have_postcode']
    search_fields = ['name', 'iso_code', 'phone_code']
