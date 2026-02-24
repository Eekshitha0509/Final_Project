from django.contrib import admin
from .models import HostelApplication


@admin.register(HostelApplication)
class HostelApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'roll_no', 'branch', 'email', 'created_at']
    list_filter = ['created_at', 'branch', 'class_yr']
    search_fields = ['full_name', 'roll_no', 'email', 'aadhar']
    readonly_fields = ['created_at']
    fields = ['full_name', 'aadhar', 'class_yr', 'branch', 'roll_no', 'dob', 'mobile', 'email', 'address', 'caste', 'catering', 'amount', 'created_at']
