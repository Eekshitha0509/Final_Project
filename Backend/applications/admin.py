# applications/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import Block, Floor, Room, Booking, Payment

admin.site.unregister(User)
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff']

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

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'room', 'booking_date', 'status']
    list_filter = ['status', 'booking_date']
    search_fields = ['student__username', 'room__room_number']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'payment_status', 'payment_date']
    list_filter = ['payment_status', 'payment_date']
    search_fields = ['razorpay_order_id', 'razorpay_payment_id', 'booking__student__username']
    readonly_fields = ['payment_date']