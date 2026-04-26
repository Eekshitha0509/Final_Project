# applications/urls.py

from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

# Import standard views for this app
from . import views

# 🔥 FIXED: Import the OTP views from the 'student' app
from student import views as student_views

urlpatterns = [
    # Block, Floor, Room
    path('blocks/', views.get_all_blocks, name='get_all_blocks'),
    path('my-block/', views.get_block_for_year, name='get_block_for_year'),
    path('blocks/<int:block_id>/floors/', views.get_floors_with_rooms, name='get_floors_with_rooms'),
    path('blocks/<str:block_name>/floors/<int:floor_number>/rooms/', views.get_rooms_for_floor, name='get_rooms_for_floor'),
    path('room-availability/<int:room_id>/', views.get_room_availability, name='room_availability'),
    
    # Booking
    path('book-room/', views.book_room, name='book_room'),
    path('my-booking/', views.get_student_booking, name='get_student_booking'),
    path('cancel-booking/<int:booking_id>/', views.cancel_booking, name='cancel_booking'),
    
    # Payments
    path('create-razorpay-order/', views.create_razorpay_order, name='create_razorpay_order'),
    path('verify-razorpay-payment/', views.verify_razorpay_payment, name='verify_razorpay_payment'),
    path('payment-status/<int:booking_id>/', views.get_payment_status, name='get_payment_status'),
    path('payment-details/<int:payment_id>/', views.get_payment_details, name='get_payment_details'),
    path('razorpay-webhook/', views.razorpay_webhook, name='razorpay_webhook'),
    
    # Mess Payments
    path('create-order/', views.create_order, name='create_order'),
    path('verify-payment/', views.verify_payment, name='verify_payment'),
    path('upload-excel/', views.upload_excel, name='upload_excel'),
    path('upload-billing-excel/', views.upload_billing_excel, name='upload_billing_excel'),
    
    # Billing
    path('get-student-billing/', views.get_student_billing, name='get_student_billing'),
    path('fetch-student-billing/', views.fetch_student_billing, name='fetch_student_billing'),
    path('get-all-billing-rates/', views.get_all_billing_rates, name='get_all_billing_rates'),
    path('check-no-dues/', views.check_no_dues, name='check_no_dues'),
    
    # ==========================================
    # 🔥 FIXED: Using student_views here so Django finds them!
    # ==========================================
    path('request-otp/', student_views.RequestOTP.as_view(), name='request_otp'),
    path('verify-otp/', student_views.VerifyOTP.as_view(), name='verify_otp'),
    path('reset-password/', student_views.ResetPassword.as_view(), name='reset_password'),
    
    # Utility
    path('test/', views.test_endpoint, name='test'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)