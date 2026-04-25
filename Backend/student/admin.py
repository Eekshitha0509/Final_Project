# student/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import (
    Student, StudentRegistration, Certificate, 
    PasswordResetOTP, AdminWardenUser, BillingRate, 
    MessPayment, StudentBilling
)

admin.site.unregister(User)
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff']

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'admission_no', 'reg_no', 'mobile', 'email']
    list_filter = ['class_yr', 'branch']
    search_fields = ['full_name', 'admission_no', 'reg_no', 'email', 'mobile']

@admin.register(StudentRegistration)
class StudentRegistrationAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'admission_no', 'reg_no', 'email', 'phone', 'created_at']
    list_filter = ['created_at']
    search_fields = ['full_name', 'admission_no', 'reg_no', 'email', 'phone']

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'admission_no', 'certificate_type', 'generated_at']
    list_filter = ['certificate_type', 'generated_at']
    search_fields = ['student_name', 'admission_no', 'reg_no']
    readonly_fields = ['generated_at']

@admin.register(AdminWardenUser)
class AdminWardenUserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'role']
    list_filter = ['role']
    search_fields = ['username', 'email']

@admin.register(BillingRate)
class BillingRateAdmin(admin.ModelAdmin):
    list_display = ['id', 'month', 'days', 'mess_charge', 'net_demand', 'date']
    list_filter = ['month']
    search_fields = ['month']

@admin.register(MessPayment)
class MessPaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'receipt_no', 'student_name', 'roll_no', 'month', 'amount', 'status', 'date']
    list_filter = ['status', 'month']
    search_fields = ['student_name', 'roll_no', 'receipt_no']

@admin.register(StudentBilling)
class StudentBillingAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'month', 'amount_paid', 'payment_status', 'created_at']
    list_filter = ['payment_status', 'month']
    search_fields = ['student__full_name', 'student__admission_no']