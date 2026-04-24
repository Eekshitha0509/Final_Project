# applications/admin.py - CLEANED VERSION

from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import (
    Block, Floor, Room, Booking, Payment,
    MessPayment, Student, Certificate, StudentRegistration, BillingRate, StudentBilling
)

# ========================
# Core User Admin (Restored to default)
# ========================
# We removed the StudentProfileInline since StudentProfile no longer exists.
admin.site.unregister(User)
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff']

# ========================
# Hostel Architecture Admin
# ========================
@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'display_name', 'total_floors']
    list_filter = ['name']
    search_fields = ['name', 'display_name']

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ['id', 'block', 'floor_number', 'total_rooms']
    list_filter = ['block']
    search_fields = ['block__name']

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'room_number', 'floor', 'room_type', 'capacity', 'current_occupancy']
    list_filter = ['floor__block', 'room_type']
    search_fields = ['room_number']

# ========================
# Booking & Payment Admin
# ========================
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'room', 'booking_date', 'status']
    list_filter = ['status', 'booking_date']
    search_fields = ['student__username', 'room__room_number']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'payment_status', 'payment_date', 'razorpay_order_id']
    list_filter = ['payment_status', 'payment_date']
    search_fields = ['razorpay_order_id', 'razorpay_payment_id', 'booking__student__username']
    readonly_fields = ['payment_date']

# ========================
# Student Data Admin
# ========================
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

# ========================
# Mess & Billing Admin
# ========================
@admin.register(MessPayment)
class MessPaymentAdmin(admin.ModelAdmin):
    list_display = ['receipt_no', 'student_name', 'roll_no', 'amount', 'month', 'date', 'status']
    list_filter = ['status', 'month', 'payment_mode']
    search_fields = ['student_name', 'roll_no', 'receipt_no']

@admin.register(BillingRate)
class BillingRateAdmin(admin.ModelAdmin):
    list_display = ['month', 'days', 'mess_charge', 'net_demand', 'date']
    search_fields = ['month']
    list_filter = ['date']

@admin.register(StudentBilling)
class StudentBillingAdmin(admin.ModelAdmin):
    list_display = ['student', 'month', 'amount_paid', 'payment_status']
    search_fields = ['student__full_name', 'student__admission_no', 'month']
    list_filter = ['payment_status', 'month']

# ========================
# Utility Admin
# ========================
@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'admission_no', 'certificate_type', 'generated_at']
    list_filter = ['certificate_type', 'generated_at']
    search_fields = ['student_name', 'admission_no', 'reg_no']
    readonly_fields = ['generated_at']