# applications/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import HostelApplication, StudentProfile, Block, Floor, Room, Booking, Profile
from .models import Payment 

class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False

class CustomUserAdmin(UserAdmin):
    inlines = [StudentProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff']

# Unregister default User admin and register custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'admission', 'year', 'branch', 'created_at']
    list_filter = ['year', 'branch']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'admission']

@admin.register(HostelApplication)
class HostelApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'roll_no', 'email', 'mobile', 'class_yr', 'branch', 'created_at']
    list_filter = ['class_yr', 'branch']
    search_fields = ['full_name', 'roll_no', 'email']

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
    list_display = ['id', 'room_number', 'floor', 'room_type', 'capacity', 'current_occupancy', 'is_available']
    list_filter = ['floor__block', 'room_type', 'is_available']
    search_fields = ['room_number']

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'room', 'booking_date', 'status']
    list_filter = ['status', 'booking_date']
    search_fields = ['student__username', 'room__room_number']

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'phone_number', 'emergency_contact', 'created_at']
    search_fields = ['student__user__username']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'payment_status', 'payment_date', 'razorpay_order_id']
    list_filter = ['payment_status', 'payment_date']
    search_fields = ['razorpay_order_id', 'razorpay_payment_id', 'booking__student__username']
    readonly_fields = ['payment_date']