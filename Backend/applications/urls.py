# applications/urls.py - COMPLETE CLEANED VERSION

from django.urls import path
from django.conf import settings              # <-- ADDED THIS
from django.conf.urls.static import static    # <-- ADDED THIS
from . import views
from .views import RequestOTP, VerifyOTP, ResetPassword

urlpatterns = [
    # ========================
    # AUTHENTICATION ENDPOINTS
    # ========================
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('admin-login/', views.admin_login, name='admin_login'),
    path('token/refresh/', views.refresh_token, name='token_refresh'),
    path('logout/', views.logout, name='logout'),
    
    # ========================
    # PASSWORD RESET ENDPOINTS
    # ========================
    path('request-otp/', RequestOTP.as_view()),
    path('verify-otp/', VerifyOTP.as_view()),
    path('reset-password/', ResetPassword.as_view()),
    # ========================
    # PROFILE ENDPOINTS
    # ========================
    path('submit-profile/', views.submit_profile, name='submit_profile'),
    path('get-student-profile/', views.get_student_profile, name='get_student_profile'),
    path('get-student-hostel/', views.get_student_hostel, name='get_student_hostel'),
    
    # ========================
    # BLOCK, FLOOR, AND ROOM ENDPOINTS
    # ========================
    path('blocks/', views.get_all_blocks, name='get_all_blocks'),
    path('my-block/', views.get_block_for_year, name='get_block_for_year'),
    path('blocks/<int:block_id>/floors/', views.get_floors_with_rooms, name='get_floors_with_rooms'),
    path('blocks/<str:block_name>/floors/<int:floor_number>/rooms/', views.get_rooms_for_floor, name='get_rooms_for_floor'),
    path('room-availability/<int:room_id>/', views.get_room_availability, name='room_availability'),
    
    # ========================
    # BOOKING ENDPOINTS
    # ========================
    path('book-room/', views.book_room, name='book_room'),
    path('my-booking/', views.get_student_booking, name='get_student_booking'),
    path('cancel-booking/<int:booking_id>/', views.cancel_booking, name='cancel_booking'),
    
    # ========================
    # ROOM PAYMENT ENDPOINTS (RAZORPAY)
    # ========================
    path('create-razorpay-order/', views.create_razorpay_order, name='create_razorpay_order'),
    path('verify-razorpay-payment/', views.verify_razorpay_payment, name='verify_razorpay_payment'),
    path('payment-status/<int:booking_id>/', views.get_payment_status, name='get_payment_status'),
    path('payment-details/<int:payment_id>/', views.get_payment_details, name='get_payment_details'),
    path('razorpay-webhook/', views.razorpay_webhook, name='razorpay_webhook'),
    
    # ========================
    # MESS PAYMENT ENDPOINTS
    # ========================
    path('create-order/', views.create_order, name='create_order'),
    path('verify-payment/', views.verify_payment, name='verify_payment'),
    path('mess-payment/', views.mess_payment, name='mess_payment'),
    path('receipt/<str:receipt_id>/', views.download_mess_receipt, name='download_receipt'),
    path('get-all-billing-rates/', views.get_all_billing_rates, name='get_all_billing_rates'),
    path('check-month-paid/', views.check_month_paid, name='check_month_paid'),
    
# ========================
    # CERTIFICATES & DUES ENDPOINTS
    # ========================
    path('save-certificate/', views.save_certificate_record, name='save_certificate'),
    path('update-months/', views.update_months, name='update_months'),
    path('check-no-dues/', views.check_no_dues, name='check_no_dues'),
    
    # ========================
    # EXCEL UPLOADS - Single Auto-Detect Upload
    # ========================
    # Auto-detects: Student Details vs Billing Data based on columns
    path('upload-excel/', views.upload_excel_unified, name='upload_excel'),
    
    # For Backward Compatibility - both point to unified
    path('upload-meta-hostel-excel/', views.upload_excel_unified, name='upload_meta_hostel_excel'),

    # ========================
    # BILLING & PAYMENT APIs  
    # ========================
    path('get-student-billing/', views.get_student_billing, name='get_student_billing'),
    path('get-billing-by-regno/', views.get_dynamic_billing_by_regno, name='get_dynamic_billing_by_regno'),
    path('get-available-billing-years/', views.get_available_billing_years, name='get_available_billing_years'),
    path('debug-billing-list/', views.debug_billing_list, name='debug_billing_list'),
    path('get-all-students-billing-table/', views.get_all_students_billing_table, name='get_all_students_billing_table'),
    
    # ========================
    # UTILITY ENDPOINTS
    # ========================
    path('test/', views.test_endpoint, name='test'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)