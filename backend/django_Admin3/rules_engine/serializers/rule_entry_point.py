from rest_framework import serializers
from ..models import RuleEntryPoint


class RuleEntryPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleEntryPoint
        fields = '__all__'