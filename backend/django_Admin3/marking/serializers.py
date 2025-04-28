from rest_framework import serializers
from marking.models import MarkingPaper

class MarkingPaperSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarkingPaper
        fields = ['id', 'name', 'deadline', 'recommended_submit_date']
