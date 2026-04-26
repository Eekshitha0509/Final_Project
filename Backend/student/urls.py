# student/urls.py

from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('admin-login/', views.admin_login, name='admin_login'),
    path('token/refresh/', views.refresh_token, name='token_refresh'),
    path('logout/', views.logout, name='logout'),
    
    # Password Reset
    path('request-otp/', views.RequestOTP.as_view()),
    path('verify-otp/', views.VerifyOTP.as_view()),
    path('reset-password/', views.ResetPassword.as_view()),
    
    # Profile
    path('submit-profile/', views.submit_profile, name='submit_profile'),
    path('get-student-profile/', views.get_student_profile, name='get_student_profile'),
    path('get-my-profile/', views.get_my_profile, name='get_my_profile'),
    path('get-student-hostel/', views.get_student_hostel, name='get_student_hostel'),
    
    # Students
    path('get-all-students/', views.get_all_students, name='get_all_students'),
    path('get-student/', views.get_student, name='get_student'),
    path('registrations-summary/', views.get_registrations_summary, name='registrations_summary'),
    
    # Billing
    path('get-student-billing/', views.get_student_billing, name='get_student_billing'),
    
    # Certificates & Mess
    path('save-certificate/', views.save_certificate_record, name='save_certificate'),
    path('update-months/', views.update_months, name='update_months'),
    path('mess-payment/', views.mess_payment, name='mess_payment'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)