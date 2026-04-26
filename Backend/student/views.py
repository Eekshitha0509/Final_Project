# student/views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password

import traceback
import random

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    try:
        data = request.data
        admission_no = data.get("admission_no", "").strip()
        reg_no = data.get("reg_no", "").strip()
        full_name = data.get("full_name", "").strip()
        phone = data.get("phone", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not admission_no or not password:
            return Response({"error": "Admission number and password are required"}, status=400)

        from .models import StudentRegistration, Student
        
        with transaction.atomic():
            if StudentRegistration.objects.filter(admission_no=admission_no).exists():
                return Response({"error": "Admission number already registered"}, status=400)

            StudentRegistration.objects.create(
                admission_no=admission_no,
                reg_no=reg_no if reg_no else admission_no,
                full_name=full_name,
                phone=phone,
                email=email,
                password=make_password(password)
            )
            
            user, _ = User.objects.get_or_create(username=admission_no, defaults={'email': email})
            user.set_password(password)
            user.first_name = full_name.split()[0] if full_name else ''
            user.save()
            
            Student.objects.get_or_create(
                admission_no=admission_no,
                defaults={
                    'reg_no': reg_no if reg_no else admission_no,
                    'full_name': full_name,
                    'email': email,
                    'mobile': phone
                }
            )

            refresh = RefreshToken.for_user(user)

            return Response({
                "success": True,
                "message": "Registration successful",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "username": user.username,
                    "admission_number": admission_no,
                    "full_name": full_name
                }
            }, status=201)

    except Exception as e:
        print("Registration error:", str(e))
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    try:
        login_id = request.data.get("login_id") or request.data.get("admission_number")
        password = request.data.get("password")

        if not login_id or not password:
            return Response({"error": "Please provide ID and password"}, status=400)

        login_id = login_id.strip()

        from .models import StudentRegistration
        student_reg = StudentRegistration.objects.filter(admission_no=login_id).first()
        if not student_reg:
            student_reg = StudentRegistration.objects.filter(reg_no=login_id).first()

        if student_reg and check_password(password, student_reg.password):
            user, _ = User.objects.get_or_create(username=student_reg.admission_no, defaults={'email': student_reg.email})
            user.set_password(password)
            user.save()
            
            refresh = RefreshToken.for_user(user)
            
            from .models import Student
            student_profile = Student.objects.filter(admission_no=student_reg.admission_no).first()
            
            full_profile = None
            if student_profile:
                full_profile = {
                    'full_name': student_profile.full_name,
                    'admission_no': student_profile.admission_no,
                    'reg_no': student_profile.reg_no,
                    'aadhar': student_profile.aadhar,
                    'degree': getattr(student_profile, 'degree', ''),
                    'class_yr': student_profile.class_yr,
                    'branch': student_profile.branch,
                    'roll_no': student_profile.roll_no,
                    'mobile': student_profile.mobile,
                    'email': student_profile.email,
                    'block': student_profile.block or "Not Allotted",
                    'room_no': student_profile.room_no or "Not Allotted",
                    'father_name': student_profile.father_name,
                    'father_phone': student_profile.father_phone,
                    'mother_name': student_profile.mother_name,
                    'mother_phone': student_profile.mother_phone,
                }
            
            return Response({
                "success": True,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "message": "Login successful",
                "user": {
                    "username": user.username,
                    "admission_number": student_reg.admission_no,
                    "reg_no": student_reg.reg_no,
                    "full_name": student_reg.full_name,
                    "year": student_profile.class_yr if student_profile else "",
                    "branch": student_profile.branch if student_profile else "",
                    "email": student_reg.email
                },
                "profile": full_profile
            })
            
        return Response({"error": "Invalid credentials"}, status=401)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token required'}, status=400)
    try:
        refresh = RefreshToken(refresh_token)
        return Response({'access': str(refresh.access_token)})
    except Exception:
        return Response({'error': 'Invalid refresh token'}, status=401)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'success': True, 'message': 'Logged out successfully'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    try:
        username = request.data.get("username") or request.data.get("admin_id") or request.POST.get("username") or request.POST.get("admin_id")
        password = request.data.get("password") or request.POST.get("password")
        
        if not username or not password:
            return Response({"error": "Both username and password are required"}, status=400)
        
        from .models import AdminWardenUser
        admin = AdminWardenUser.objects.filter(username=username).first()
        
        if not admin:
            return Response({"error": "Invalid credentials"}, status=401)
        
        if check_password(password, admin.password):
            return Response({
                "status": "success",
                "message": "Admin login successful",
                "admin": {
                    "username": admin.username,
                    "email": admin.email,
                    "role": admin.role
                }
            })
        
        return Response({"error": "Invalid credentials"}, status=401)
        
    except Exception as e:
        return Response({"error": f"Server error: {str(e)}"}, status=500)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def submit_profile(request):
    try:
        data = request.data
        admission_no = request.user.username 
        
        from .models import Student
        student, created = Student.objects.get_or_create(admission_no=admission_no)
        
        student.full_name = data.get("full_name", student.full_name)
        student.aadhar = data.get("aadhar_no", student.aadhar)
        student.reg_no = data.get("reg_no", student.reg_no)
        student.class_yr = data.get("year", student.class_yr)
        student.degree = data.get("degree", getattr(student, 'degree', ''))
        student.branch = data.get("branch", student.branch)
        student.roll_no = data.get("roll_no", student.roll_no)
        student.mobile = data.get("mobile", student.mobile)
        student.email = data.get("email", student.email)
        student.address = data.get("address", student.address)
        student.caste = data.get("caste", student.caste)
        student.amount = data.get("amount", student.amount)
        
        if data.get("dob"):
            student.dob = data.get("dob")
            
        student.father_name = data.get("father_name", student.father_name)
        student.father_phone = data.get("father_phone", student.father_phone)
        student.mother_name = data.get("mother_name", student.mother_name)
        student.mother_phone = data.get("mother_phone", student.mother_phone)
        
        if request.FILES.get("student_photo"): 
            student.student_photo = request.FILES.get("student_photo")
        if request.FILES.get("father_photo"): 
            student.father_photo = request.FILES.get("father_photo")
        if request.FILES.get("mother_photo"): 
            student.mother_photo = request.FILES.get("mother_photo")
        
        student.save()
        
        return Response({
            "status": "success",
            "message": "Profile saved successfully"
        }, status=200)
        
    except Exception as e:
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_profile(request):
    try:
        admission_no = request.GET.get('admission_no')
        reg_no = request.GET.get('reg_no')
        email = request.GET.get('email')
        roll_no = request.GET.get('roll_no')
        
        from .models import Student
        student = None
        
        # Try admission_no first
        if admission_no and admission_no.strip():
            search_val = admission_no.strip()
            student = Student.objects.filter(admission_no__iexact=search_val).first()
            if not student:
                student = Student.objects.filter(admission_no=search_val).first()
        
        # Try reg_no
        if not student and reg_no and reg_no.strip():
            search_val = reg_no.strip()
            student = Student.objects.filter(reg_no__iexact=search_val).first()
            if not student:
                student = Student.objects.filter(reg_no=search_val).first()
            if not student:
                student = Student.objects.filter(admission_no__iexact=search_val).first()
        
        # Try email
        if not student and email and email.strip():
            student = Student.objects.filter(email__iexact=email.strip()).first()
        
        # Try roll_no
        if not student and roll_no and roll_no.strip():
            student = Student.objects.filter(roll_no__iexact=roll_no.strip()).first()
        
        if not student:
            return Response({"error": "Student not found"}, status=404)

        def get_file_url(field):
            try:
                if field and field.name:
                    return field.url
            except:
                pass
            return None
        
        # Safely get attributes with hasattr
        def safe_getattr(obj, attr, default=None):
            return getattr(obj, attr, default) if hasattr(obj, attr) else default
        
        return Response({
            'full_name': student.full_name,
            'aadhar': student.aadhar,
            'admission_no': student.admission_no,
            'reg_no': student.reg_no,
            'degree': safe_getattr(student, 'degree', ''),
            'class_yr': student.class_yr,
            'branch': student.branch,
            'roll_no': student.roll_no,
            'dob': student.dob.strftime('%Y-%m-%d') if student.dob else '',
            'mobile': student.mobile,
            'email': student.email,
            'address': student.address,
            'caste': student.caste,
            'amount': student.amount,
            'block': student.block or "Not Allotted",
            'room_no': student.room_no or "Not Allotted",
            'father_name': student.father_name,
            'father_phone': student.father_phone,
            'mother_name': student.mother_name,
            'mother_phone': student.mother_phone,
            'student_photo': get_file_url(student.student_photo),
            'father_photo': get_file_url(student.father_photo),
            'mother_photo': get_file_url(student.mother_photo),
            'aadhar_pdf': get_file_url(student.aadhar_pdf),
            'father_aadhar': get_file_url(safe_getattr(student, 'father_aadhar')),
            'mother_aadhar': get_file_url(safe_getattr(student, 'mother_aadhar')),
        })

    except Exception as e:
        print("Error fetching profile:", str(e))
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_profile(request):
    """Get profile of currently logged-in user from JWT token"""
    try:
        from .models import Student
        student = Student.objects.filter(admission_no=request.user.username).first()
        
        if not student:
            return Response({
                "exists": False,
                "message": "Profile not found. Please submit your profile.",
                "admission_no": request.user.username
            })
        
        def get_file_url(field):
            try:
                if field and field.name:
                    return field.url
            except:
                pass
            return None
        
        def safe_getattr(obj, attr, default=None):
            return getattr(obj, attr, default) if hasattr(obj, attr) else default
        
        return Response({
            "exists": True,
            "full_name": student.full_name,
            "aadhar": student.aadhar,
            "admission_no": student.admission_no,
            "reg_no": student.reg_no,
            "degree": safe_getattr(student, 'degree', ''),
            "class_yr": student.class_yr,
            "branch": student.branch,
            "roll_no": student.roll_no,
            "dob": student.dob.strftime('%Y-%m-%d') if student.dob else '',
            "mobile": student.mobile,
            "email": student.email,
            "address": student.address,
            "caste": student.caste,
            "amount": student.amount,
            "block": student.block or "Not Allotted",
            "room_no": student.room_no or "Not Allotted",
            "father_name": student.father_name,
            "father_phone": student.father_phone,
            "mother_name": student.mother_name,
            "mother_phone": student.mother_phone,
            "student_photo": get_file_url(student.student_photo),
            "father_photo": get_file_url(student.father_photo),
            "mother_photo": get_file_url(student.mother_photo),
            "aadhar_pdf": get_file_url(student.aadhar_pdf),
            "father_aadhar": get_file_url(safe_getattr(student, 'father_aadhar')),
            "mother_aadhar": get_file_url(safe_getattr(student, 'mother_aadhar')),
        })
        
    except Exception as e:
        print("Error fetching my profile:", str(e))
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_hostel(request):
    reg_no = request.GET.get('reg_no')
    admission_no = request.GET.get('admission_no')
    
    if not reg_no and not admission_no:
        return JsonResponse({'error': 'Registration or admission number required'}, status=400)
    
    try:
        from .models import Student
        search_value = reg_no or admission_no
        student = Student.objects.filter(admission_no__iexact=search_value).first()
        if not student:
            student = Student.objects.filter(reg_no__iexact=search_value).first()
        
        if not student:
            return JsonResponse({'success': False, 'message': 'Student not found'}, status=404)
        
        if student.block and student.block != "Not Allotted":
            return JsonResponse({
                'success': True,
                'block_name': student.block,
                'block': student.block.lower().replace(' ', '-'),
                'room_number': student.room_no or "Not Allotted",
            })
            
        return JsonResponse({'success': False, 'message': 'No active hostel allocation'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_certificate_record(request):
    data = request.data
    try:
        from .models import Certificate
        Certificate.objects.create(
            admission_no=data.get('admission_no'),
            reg_no=data.get('reg_no'),
            student_name=data.get('student_name'),
            certificate_type=data.get('certificate_type')
        )
        return Response({"status": "success", "message": "Record stored."})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_months(request):
    try:
        import json
        data = json.loads(request.body) if request.body else {}
        months = data.get('months')
        
        if months is None:
            return Response({
                'success': False,
                'error': 'Months value is required'
            }, status=400)
        
        request.session['no_dues_months'] = months
        
        return Response({
            'success': True,
            'message': f'Successfully updated to {months} months'
        }, status=200)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def mess_payment(request):
    data = request.data
    try:
        from .models import MessPayment, BillingRate
        amount_value = int(data.get("amount", 0)) 
        month_value = data.get("month")
        roll_no_value = data.get("roll_no")
        
        billing_rate = None
        days_count = 0
        if month_value:
            billing_rate = BillingRate.objects.filter(month=month_value).first()
            if billing_rate:
                days_count = billing_rate.days
        
        payment = MessPayment.objects.create(
            student_name=data.get("student_name"),
            roll_no=roll_no_value,
            room_no=data.get("room_no"),
            class_yr=data.get("class_yr"),
            date=data.get("date"),
            month=month_value,
            amount=amount_value,
            payment_mode=data.get("payment_mode"),
            purpose=data.get("purpose"),
            billing_rate=billing_rate,
            days_count=days_count
        )
        return Response({
            "message": "Payment data stored", 
            "receipt_id": payment.receipt_no,
            "id": payment.receipt_no,
            "payment_time": payment.created_at.strftime('%Y-%m-%d %H:%M:%S') if payment.created_at else None,
            "payment_status": payment.status
        })
    except ValueError:
        return Response({"error": "Invalid amount format"}, status=400)
    except Exception as e:
        print(f"Database Error: {e}")
        return Response({"error": "Internal Server Error"}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_billing(request):
    from .models import StudentBillingRecord, Student
    
    roll_no = request.GET.get('reg_no') or request.GET.get('admission_no')
    if not roll_no:
        return Response({"error": "reg_no or admission_no required"}, status=400)
    
    student = Student.objects.filter(reg_no=roll_no).first()
    if not student:
        student = Student.objects.filter(admission_no=roll_no).first()
    if not student:
        return Response({"error": "Student not found"}, status=404)
    
    billing_records = StudentBillingRecord.objects.filter(roll_no=student.reg_no)
    
    if not billing_records.exists():
        return Response({
            "student": {
                "reg_no": student.reg_no,
                "full_name": student.full_name,
                "roll_no": student.roll_no,
                "room_no": student.room_no,
                "block": student.block
            },
            "billing_data": [],
            "total_credit": 0
        })
    
    all_data = []
    total_credit = 0
    for record in billing_records:
        total_credit += float(record.credit) if record.credit else 0
        all_data.append({
            "year": record.year,
            "credit": float(record.credit) if record.credit else 0,
            "months": {
                "Jul-24": record.july_data,
                "Aug-24": record.august_data,
                "Sep-24": record.september_data,
                "Oct-24": record.october_data,
                "Nov-24": record.november_data,
                "Dec-24": record.december_data,
                "Jan-25": record.january_data,
                "Feb-25": record.february_data,
                "Mar-25": record.march_data,
                "Apr-25": record.april_data,
                "May-25": record.may_data,
            }
        })
    
    return Response({
        "student": {
            "reg_no": student.reg_no,
            "full_name": student.full_name,
            "roll_no": student.roll_no,
            "room_no": student.room_no,
            "block": student.block
        },
        "billing_data": all_data,
        "total_credit": total_credit
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students(request):
    from .models import Student
    students = Student.objects.all()
    from .serializers import StudentSerializer
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_student(request):
    """Get single student by admission_no or reg_no"""
    from .models import Student
    
    admission_no = request.query_params.get('admission_no')
    reg_no = request.query_params.get('reg_no')
    
    if admission_no:
        try:
            student = Student.objects.get(admission_no=admission_no)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
    elif reg_no:
        try:
            student = Student.objects.get(reg_no=reg_no)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
    else:
        return Response({'error': 'Please provide admission_no or reg_no'}, status=400)
    
    from .serializers import StudentSerializer
    serializer = StudentSerializer(student)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_registrations_summary(request):
    """Get all registrations with year-wise count"""
    from .models import Student
    
    # Get all students
    all_students = Student.objects.all()
    
    # Count by year
    year_counts = {}
    for s in all_students:
        if s.class_yr:
            year = s.class_yr.split('/')[0].strip()
            year_counts[year] = year_counts.get(year, 0) + 1
    
    # Get all registrations with details
    registrations = []
    for s in all_students:
        registrations.append({
            'id': s.id,
            'admission_no': s.admission_no,
            'full_name': s.full_name,
            'reg_no': s.reg_no,
            'class_yr': s.class_yr,
            'degree': s.degree,
            'branch': s.branch,
            'mobile': s.mobile,
            'email': s.email,
            'block': s.block,
            'room_no': s.room_no
        })
    
    return Response({
        'total_students': all_students.count(),
        'year_counts': year_counts,
        'registrations': registrations
    })


# ==================== OTP & PASSWORD RESET VIEWS ====================

class RequestOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response({"error": "Email is required"}, status=400)

        from .models import StudentRegistration, AdminWardenUser, PasswordResetOTP
        student = StudentRegistration.objects.filter(email=email).first()
        admin = AdminWardenUser.objects.filter(email=email).first()

        if not student and not admin:
            return Response({"error": "Email not registered"}, status=400)

        otp = str(random.randint(100000, 999999))

        if student:
            PasswordResetOTP.objects.filter(user=student).delete()
            new_record = PasswordResetOTP.objects.create(
                user=student,
                otp=otp
            )

        if admin:
            PasswordResetOTP.objects.filter(email=email, user__isnull=True).delete()
            new_record = PasswordResetOTP.objects.create(
                user=None,
                email=email,
                otp=otp
            )
        
        # Try to send email, but don't fail if email is down
        try:
            send_mail(
                "Password Reset OTP",
                f"Your OTP is {otp}",
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=True
            )
        except Exception as e:
            print(f"Email send failed: {e}")

        return Response({
            "status": "success",
            "message": "OTP sent successfully"
        })


class VerifyOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = str(request.data.get("otp")).strip()

        from .models import StudentRegistration, AdminWardenUser, PasswordResetOTP
        student = StudentRegistration.objects.filter(email=email).first()
        admin = AdminWardenUser.objects.filter(email=email).first()

        if student:
            record = PasswordResetOTP.objects.filter(user=student).order_by('-created_at').first()

            if record and record.otp == otp:
                if not record.is_valid():
                    return Response({"error": "OTP has expired. Please request a new one."}, status=400)
                
                return Response({
                    "status": "success",
                    "reset_token": str(record.reset_token),
                    "user_type": "student"
                })

        if admin:
            record = PasswordResetOTP.objects.filter(email=email, user__isnull=True).order_by('-created_at').first()

            if not record:
                return Response({"error": "No OTP found. Please request a new one."}, status=400)

            if record.otp != otp:
                return Response({"error": "Invalid OTP. Please check and try again."}, status=400)

            if not record.is_valid():
                return Response({"error": "OTP has expired. Please request a new one."}, status=400)

            return Response({
                "status": "success",
                "reset_token": str(record.reset_token),
                "user_type": "admin"
            })

        return Response({"error": "Email not registered. Please check your email address."}, status=400)


class ResetPassword(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("reset_token")
        new_password = request.data.get("new_password")

        if not token or not new_password:
            return Response({"error": "Token and new password required"}, status=400)

        from .models import PasswordResetOTP, StudentRegistration, AdminWardenUser
        from django.contrib.auth.models import User
        from django.contrib.auth.hashers import make_password
        
        record = PasswordResetOTP.objects.filter(reset_token=token).last()

        if record and record.is_valid():
            if record.user:
                # Handle student - update both Django User AND StudentRegistration
                student_reg = record.user
                
                # Update Django User
                user = User.objects.filter(username=student_reg.admission_no).first()
                if user:
                    user.set_password(new_password)
                    user.save()
                
                # Update StudentRegistration (this is what login checks!)
                student_reg.password = make_password(new_password)
                student_reg.save()
                
                PasswordResetOTP.objects.filter(user=student_reg).delete()
                
                return Response({
                    "status": "success",
                    "message": "Password reset successful"
                })
            elif record.email:
                # Handle admin/warden - update AdminWardenUser password
                admin = AdminWardenUser.objects.filter(email=record.email).first()
                
                if admin:
                    admin.password = make_password(new_password)
                    admin.save()
                    PasswordResetOTP.objects.filter(email=record.email, user__isnull=True).delete()

                    return Response({
                        "status": "success",
                        "message": "Password reset successful"
                    })

        return Response({"error": "Invalid or expired token"}, status=400)