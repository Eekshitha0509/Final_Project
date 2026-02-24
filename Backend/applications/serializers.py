from rest_framework import serializers
from .models import HostelApplication


class HostelApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelApplication

        fields = [
            'id',
            'full_name',
            'aadhar',
            'class_yr',
            'branch',
            'roll_no',
            'dob',
            'mobile',
            'email',
            'address',
            'caste',
            'catering',
            'amount',
            'created_at'
        ]

        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        return data