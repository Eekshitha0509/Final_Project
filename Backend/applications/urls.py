# applications/urls.py - COMPLETE WORKING VERSION

from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views
from .views import (
    RequestOTP, VerifyOTP, ResetPassword, 
    get_student_hostel
)

urlpatterns = [
    # ========================
    # JWT AUTHENTICATION ENDPOINTS
    # ========================
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('token/refresh/', views.refresh_token, name='token_refresh'),
    path('logout/', views.logout, name='logout'),
    
    # ========================
    # LEGACY AUTHENTICATION ENDPOINTS
    # ========================
    path('register-student/', views.register_student, name='register_student'),
    path('student-login/', views.student_login, name='student_login'),
    path('admin-login/', views.admin_login, name='admin_login'),
    
    # ========================
    # PASSWORD RESET ENDPOINTS
    # ========================
    path('request-otp/', RequestOTP.as_view(), name='request_otp'),
    path('verify-otp/', VerifyOTP.as_view(), name='verify_otp'),
    path('reset-password/', ResetPassword.as_view(), name='reset_password'),
    
    # ========================
    # PROFILE ENDPOINTS
    # ========================
    path('submit-profile/', views.submit_profile_second, name='submit_profile'),
    path('get-student-profile/', views.get_student_profile, name='get_student_profile'),
    path('profile/', views.get_profile, name='profile'),
    path('profile/update/', views.submit_profile, name='submit-profile'),
    
    # ========================
    # BLOCKS ENDPOINTS
    # ========================
    path('blocks/', views.get_all_blocks, name='all-blocks'),
    path('my-block/', views.get_block_for_year, name='my-block'),
    path('block/<int:block_id>/floors/', views.get_floors_with_rooms, name='block-floors'),
    path('block/<str:block_name>/floor/<int:floor_number>/rooms/', 
         views.get_rooms_for_floor, 
         name='floor-rooms'),
    
    # ========================
    # BOOKINGS ENDPOINTS
    # ========================
    path('book-room/', views.book_room, name='book-room'),
    path('my-booking/', views.get_student_booking, name='my-booking'),
    path('cancel-booking/<int:booking_id>/', views.cancel_booking, name='cancel-booking'),
    
    # ========================
    # ROOM BOOKING PAYMENTS
    # ========================
    path('payments/create-order/', views.create_razorpay_order, name='create-razorpay-order'),
    path('payments/verify/', views.verify_razorpay_payment, name='verify-razorpay-payment'),
    path('payments/status/<int:booking_id>/', views.get_payment_status, name='payment-status'),
    path('payments/<int:payment_id>/', views.get_payment_details, name='payment-details'),
    path('payments/webhook/', views.razorpay_webhook, name='razorpay-webhook'),
    
    # ========================
    # MESS PAYMENT ENDPOINTS
    # ========================
    path('mess-payment/', views.mess_payment, name='mess_payment'),
    path('create-order/', views.create_order, name='create_order'),
    path('verify-payment/', views.verify_payment, name='verify_payment'),
    
    # ========================
    # CERTIFICATE ENDPOINTS
    # ========================
    path('save-certificate-record/', views.save_certificate_record, name='save_certificate'),
    
    # ========================
    # STUDENT ENDPOINTS
    # ========================
    path('students/', views.get_all_students, name='get_all_students'),

    # ========================
    # TEST ENDPOINT
    # ========================
    path('test/', views.test_endpoint, name='test'),
    path('room-availability/<int:room_id>/', views.get_room_availability, name='room_availability'),
    
    # ========================
    # HOSTEL INFO ENDPOINT
    # ========================
    path('get-student-hostel/', get_student_hostel, name='get_student_hostel'),
    path('receipt/<str:receipt_id>/', views.download_mess_receipt, name='download_receipt'),
    path('update-months/', views.update_months, name='update-months'),
    path('check-no-dues/', views.check_no_dues, name='check_no_dues'),
    path('upload-excel/', views.upload_excel),
    
    # ========================
    # BILLING ENDPOINTS (ADD THESE)
    # ========================
    path('upload-billing-excel/', views.upload_billing_excel, name='upload_billing_excel'),
    path('get-student-billing/', views.get_student_billing, name='get_student_billing'),
    path('get-billing-rate-by-month/', views.get_billing_rate_by_month, name='get_billing_rate_by_month'),
    path('check-month-paid/', views.check_month_paid, name='check_month_paid'),
    path('get-all-billing-rates/', views.get_all_billing_rates, name='get_all_billing_rates'),  # ✅ This line
    
    # ========================
    # EXCEL UPLOAD ENDPOINT
    # ========================
    path('upload-meta-excel/', views.upload_meta_hostel_excel, name='upload_meta_excel'),
   
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)