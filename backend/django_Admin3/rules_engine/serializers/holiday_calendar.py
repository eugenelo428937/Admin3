from rest_framework import serializers
from ..models import HolidayCalendar


class HolidayCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = HolidayCalendar
        fields = '__all__'