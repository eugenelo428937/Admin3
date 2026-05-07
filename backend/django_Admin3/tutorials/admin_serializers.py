"""Serializers for the tutorials admin panel.

Convention: API field names mirror raw Django model fields. The only
synthesised value is ``instructor.name`` (composed from staff.user).
"""
from rest_framework import serializers

from tutorials.models import TutorialEvents


class AdminTutorialEventListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialEvents
        fields = ['id', 'code', 'start_date', 'end_date', 'finalisation_date']
