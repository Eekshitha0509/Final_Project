# student/serializers.py
from rest_framework import serializers
from .models import (
    Student, StudentRegistration, Certificate, 
    PasswordResetOTP, AdminWardenUser, BillingRate, 
    MessPayment, StudentBilling
)


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = "__all__"


class StudentRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentRegistration
        fields = "__all__"


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = "__all__"


class PasswordResetOTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetOTP
        fields = "__all__"


class AdminWardenUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminWardenUser
        fields = "__all__"


class BillingRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingRate
        fields = "__all__"


class MessPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessPayment
        fields = "__all__"


class StudentBillingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentBilling
        fields = "__all__"