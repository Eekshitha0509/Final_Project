# applications/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('profile/', views.get_profile, name='profile'),
    path('profile/update/', views.submit_profile, name='submit-profile'),
    
    # Blocks
    path('blocks/', views.get_all_blocks, name='all-blocks'),
    path('my-block/', views.get_block_for_year, name='my-block'),
    
    # Floors and Rooms
    path('block/<int:block_id>/floors/', views.get_floors_with_rooms, name='block-floors'),
    path('block/<str:block_name>/floor/<int:floor_number>/rooms/', 
         views.get_rooms_for_floor, 
         name='floor-rooms'),
    
    # Bookings
    path('book-room/', views.book_room, name='book-room'),
    path('my-booking/', views.get_student_booking, name='my-booking'),
    path('cancel-booking/<int:booking_id>/', views.cancel_booking, name='cancel-booking'),
    
    # Razorpay Payment URLs
    path('payments/create-order/', views.create_razorpay_order, name='create-razorpay-order'),
    path('payments/verify/', views.verify_razorpay_payment, name='verify-razorpay-payment'),
    path('payments/status/<int:booking_id>/', views.get_payment_status, name='payment-status'),
    path('payments/<int:payment_id>/', views.get_payment_details, name='payment-details'),
    path('payments/webhook/', views.razorpay_webhook, name='razorpay-webhook'),
]