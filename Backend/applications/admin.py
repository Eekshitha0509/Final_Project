# applications/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import (
    HostelApplication, StudentProfile, Block, Floor, Room, Booking, Profile, Payment,
    MessPayment, Student, Certificate, StudentRegistration
)

# ========================
# StudentProfile Inline Configuration
# ========================

class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False

class CustomUserAdmin(UserAdmin):
    inlines = [StudentProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff']

# Unregister default User admin and register custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# ========================
# Student Profile Admin
# ========================

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'admission', 'year', 'branch', 'created_at']
    list_filter = ['year', 'branch']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'admission']

# ========================
# Hostel Application Admin
# ========================

@admin.register(HostelApplication)
class HostelApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'roll_no', 'email', 'mobile', 'class_yr', 'branch', 'created_at']
    list_filter = ['class_yr', 'branch']
    search_fields = ['full_name', 'roll_no', 'email']

# ========================
# Block Admin
# ========================

@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'display_name', 'total_floors']
    list_filter = ['name']
    search_fields = ['name', 'display_name']

# ========================
# Floor Admin
# ========================

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ['id', 'block', 'floor_number', 'total_rooms']
    list_filter = ['block']
    search_fields = ['block__name']

# ========================
# Room Admin
# ========================

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'room_number', 'floor', 'room_type', 'capacity', 'current_occupancy', 'is_available']
    list_filter = ['floor__block', 'room_type', 'is_available']
    search_fields = ['room_number']

# ========================
# Booking Admin
# ========================

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'room', 'booking_date', 'status']
    list_filter = ['status', 'booking_date']
    search_fields = ['student__username', 'room__room_number']

# ========================
# Profile Admin
# ========================

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'phone_number', 'emergency_contact', 'created_at']
    search_fields = ['student__user__username']

# ========================
# Payment Admin
# ========================

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'payment_status', 'payment_date', 'razorpay_order_id']
    list_filter = ['payment_status', 'payment_date']
    search_fields = ['razorpay_order_id', 'razorpay_payment_id', 'booking__student__username']
    readonly_fields = ['payment_date']

# ========================
# Student Admin (from second config)
# ========================

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'admission_no', 'reg_no', 'mobile', 'email', 'created_at']
    list_filter = ['class_yr', 'branch', 'created_at']
    search_fields = ['full_name', 'admission_no', 'reg_no', 'email', 'mobile']

# ========================
# Mess Payment Admin (FIXED)
# ========================

@admin.register(MessPayment)
class MessPaymentAdmin(admin.ModelAdmin):
    list_display = ['receipt_no', 'student_name', 'roll_no', 'amount', 'month', 'date', 'status']
    list_filter = ['status', 'month', 'payment_mode']
    search_fields = ['student_name', 'roll_no', 'receipt_no']
    readonly_fields = []  # Removed payment_date since it doesn't exist

# ========================
# Student Registration Admin (FIXED)
# ========================

@admin.register(StudentRegistration)
class StudentRegistrationAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'admission_no', 'reg_no', 'email', 'phone', 'created_at']
    list_filter = ['created_at']
    search_fields = ['full_name', 'admission_no', 'reg_no', 'email', 'phone']

# ========================
# Certificate Admin (FIXED)
# ========================

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'admission_no', 'certificate_type', 'generated_at']
    list_filter = ['certificate_type', 'generated_at']
    search_fields = ['student_name', 'admission_no', 'reg_no']
    readonly_fields = ['generated_at']