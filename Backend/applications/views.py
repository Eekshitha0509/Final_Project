# applications/views.py - COMPLETE FIXED VERSION

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from django.contrib.auth import authenticate, get_user_model
from django.db import models, transaction
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# Make sure StudentProfile is NOT imported here
from .models import Block, Floor, Room, Booking, Payment
from .models import PasswordResetOTP, StudentRegistration, Certificate, Student, MessPayment, BillingRate
from .serializers import *
from .pdf_generator import send_room_allotment_email

import traceback
import razorpay
import json
import random
from datetime import datetime
import pandas as pd

razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register student credentials in StudentRegistration and initialize empty Student profile"""
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

        with transaction.atomic():
            # 1. Create secure auth record
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
            
            # 2. Create Django user for JWT generation (Username = Admission No)
            user, _ = User.objects.get_or_create(username=admission_no, defaults={'email': email})
            user.set_password(password)
            user.first_name = full_name.split()[0] if full_name else ''
            user.save()
            
            # 3. Create initial empty Student profile
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
    """Login against StudentRegistration and return JWT"""
    try:
        login_id = request.data.get("login_id") or request.data.get("admission_number")
        password = request.data.get("password")

        if not login_id or not password:
            return Response({"error": "Please provide ID and password"}, status=400)

        login_id = login_id.strip()

        # 1. Validate against StudentRegistration
        student_reg = StudentRegistration.objects.filter(admission_no=login_id).first()
        if not student_reg:
            student_reg = StudentRegistration.objects.filter(reg_no=login_id).first()

        if student_reg and check_password(password, student_reg.password):
            # 2. Sync with Django User for JWT
            user, _ = User.objects.get_or_create(username=student_reg.admission_no, defaults={'email': student_reg.email})
            user.set_password(password)
            user.save()
            
            refresh = RefreshToken.for_user(user)
            
            # 3. Fetch detailed profile info
            student_profile = Student.objects.filter(admission_no=student_reg.admission_no).first()
            year = student_profile.class_yr if student_profile else ""
            branch = student_profile.branch if student_profile else ""

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
                    "year": year,
                    "branch": branch,
                    "email": student_reg.email
                }
            })
            
        return Response({"error": "Invalid credentials"}, status=401)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh JWT token"""
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
    """Logout user"""
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
    """Admin login with username/password from AdminWardenUser model"""
    try:
        username = request.data.get("username") or request.data.get("admin_id") or request.POST.get("username") or request.POST.get("admin_id")
        password = request.data.get("password") or request.POST.get("password")
        
        if not username or not password:
            return Response({"error": "Both username and password are required"}, status=400)
        
        from .models import AdminWardenUser
        from django.contrib.auth.hashers import check_password
        
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

# ==================== PROFILE UPDATE VIEW ====================

# ==================== PROFILE UPDATE VIEW ====================

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def submit_profile(request):
    """Submit or update data strictly in the Student model"""
    try:
        data = request.data
        admission_no = request.user.username 
        
        student, created = Student.objects.get_or_create(admission_no=admission_no)
        
        # Update text fields
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
            
        # 🔥 Fixed: Added parents' aadhar numbers to be saved
        student.father_name = data.get("father_name", student.father_name)
        student.father_phone = data.get("father_phone", student.father_phone)
        student.father_aadhar_no = data.get("father_aadhar_no", getattr(student, 'father_aadhar_no', ''))
        
        student.mother_name = data.get("mother_name", student.mother_name)
        student.mother_phone = data.get("mother_phone", student.mother_phone)
        student.mother_aadhar_no = data.get("mother_aadhar_no", getattr(student, 'mother_aadhar_no', ''))
        
        student.guardian_name = data.get("guardian_name", getattr(student, 'guardian_name', ''))
        student.guardian_phone = data.get("guardian_phone", getattr(student, 'guardian_phone', ''))
        
        # Update File fields
        if request.FILES.get("student_photo"): 
            student.student_photo = request.FILES.get("student_photo")
        if request.FILES.get("father_photo"): 
            student.father_photo = request.FILES.get("father_photo")
        if request.FILES.get("mother_photo"): 
            student.mother_photo = request.FILES.get("mother_photo")
        if request.FILES.get("aadhar_pdf"): 
            student.aadhar_pdf = request.FILES.get("aadhar_pdf")
        if request.FILES.get("father_aadhar_pdf"): 
            student.father_aadhar = request.FILES.get("father_aadhar_pdf")
        if request.FILES.get("mother_aadhar_pdf"): 
            student.mother_aadhar = request.FILES.get("mother_aadhar_pdf")
        
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
    """Get complete student profile by admission or registration number"""
    try:
        admission_no = request.GET.get('admission_no')
        reg_no = request.GET.get('reg_no')
        
        student = None
        
        # Search by admission number first
        if admission_no and admission_no.strip():
            search_val = admission_no.strip()
            student = Student.objects.filter(admission_no__iexact=search_val).first()
            if not student:
                student = Student.objects.filter(admission_no=search_val).first()
        
        # If not found, search by registration number
        if not student and reg_no and reg_no.strip():
            search_val = reg_no.strip()
            student = Student.objects.filter(reg_no__iexact=search_val).first()
            if not student:
                student = Student.objects.filter(reg_no=search_val).first()
            if not student:
                student = Student.objects.filter(admission_no__iexact=search_val).first()
            if not student:
                student = Student.objects.filter(admission_no=search_val).first()
        
        if not student:
            return Response({"error": "Student not found"}, status=404)

        print(f"Found student: {student.full_name}, admission_no={student.admission_no}, reg_no={student.reg_no}")

        # Get booking info - try both admission_no and reg_no to find user
        user = User.objects.filter(username=student.admission_no).first()
        if not user and student.reg_no and student.reg_no.strip():
            user = User.objects.filter(username=student.reg_no.strip()).first()
        booking = Booking.objects.filter(student=user, status='confirmed').first() if user else None
        
        print(f"Booking search: admission_no={student.admission_no}, reg_no={student.reg_no}, user_found={bool(user)}, booking={bool(booking)}")
        
        room_details = None
        if booking:
            room = booking.room
            room_details = {
                'room_number': room.room_number,
                'block_name': room.floor.block.display_name,
                'floor': room.floor.floor_number,
                'room_type': room.get_room_type_display(),
                'sharing_type': f"{room.capacity} Sharing",
                'allotted_date': booking.booking_date.strftime('%Y-%m-%d')
            }
        elif student.block and student.block != "Not Allotted":
            room_details = {
                'room_number': student.room_no or "Not Allotted",
                'block_name': student.block,
                'floor': "N/A",
                'room_type': "N/A",
                'sharing_type': "N/A",
                'allotted_date': "N/A"
            }
        
        def get_file_url(field):
            if field and hasattr(field, 'url'):
                return field.url
            return None
        
        return Response({
            'full_name': student.full_name,
            'aadhar': student.aadhar,
            'admission_no': student.admission_no,
            'reg_no': student.reg_no,
            'degree': getattr(student, 'degree', ''),
            'class_yr': student.class_yr,
            'branch': student.branch,
            'roll_no': student.roll_no,
            'dob': student.dob.strftime('%Y-%m-%d') if student.dob else '',
            'mobile': student.mobile,
            'email': student.email,
            'address': student.address,
            'caste': student.caste,
            'amount': student.amount,
            'catering': student.catering,
            'block': room_details['block_name'] if room_details else student.block or "Not Allotted",
            'room_no': room_details['room_number'] if room_details else student.room_no or student.room or "Not Allotted",
            
            # Parents Info
            'father_name': student.father_name,
            'father_phone': student.father_phone,
            'mother_name': student.mother_name,
            'mother_phone': student.mother_phone,
            'guardian_name': student.guardian_name,
            'guardian_phone': student.guardian_phone,
            
            # FILES
            'student_photo': get_file_url(student.student_photo),
            'father_photo': get_file_url(student.father_photo),
            'mother_photo': get_file_url(student.mother_photo),
            'father_aadhar': get_file_url(student.father_aadhar),
            'mother_aadhar': get_file_url(student.mother_aadhar),
            'guardian_aadhar': get_file_url(student.guardian_aadhar),
            
            # Room Details (nested)
            'room_details': room_details,
            'hostel_name': student.hostel_name or "N/A",
            'has_booking': bool(booking)
        })

    except Exception as e:
        print("Error fetching profile:", str(e))
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_hostel(request):
    """Get concise hostel allocation for a student"""
    reg_no = request.GET.get('reg_no')
    admission_no = request.GET.get('admission_no')
    
    if not reg_no and not admission_no:
        return JsonResponse({'error': 'Registration or admission number required'}, status=400)
    
    try:
        # Search for student using both admission and reg numbers
        search_value = reg_no or admission_no
        student = Student.objects.filter(admission_no__iexact=search_value).first()
        if not student:
            student = Student.objects.filter(reg_no__iexact=search_value).first()
        if not student:
            student = Student.objects.filter(admission_no=search_value).first()
        if not student:
            student = Student.objects.filter(reg_no=search_value).first()
        
        if not student:
            return JsonResponse({'success': False, 'message': 'Student not found'}, status=404)
        
        # Try finding user by admission_no first, then reg_no
        user = User.objects.filter(username=student.admission_no).first()
        if not user and student.reg_no:
            user = User.objects.filter(username=student.reg_no).first()
        booking = Booking.objects.filter(student=user, status='confirmed').first() if user else None
        
        if booking and booking.room:
            return JsonResponse({
                'success': True,
                'block_name': booking.room.floor.block.display_name,
                'block': booking.room.floor.block.name,
                'room_number': booking.room.room_number,
                'booking_id': booking.id,
                'room_id': booking.room.id
            })
        
        # Return student block/room from their profile if no active booking
        if student.block and student.block != "Not Allotted":
            return JsonResponse({
                'success': True,
                'block_name': student.block,
                'block': student.block.lower().replace(' ', '-'),
                'room_number': student.room_no or "Not Allotted",
                'booking_id': None,
                'room_id': None,
                'note': 'Historical record (not currently booked)'
            })
            
        return JsonResponse({'success': False, 'message': 'No active hostel allocation'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# ==================== BLOCK VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_blocks(request):
    try:
        blocks = Block.objects.all()
        return Response(BlockSerializer(blocks, many=True).data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_block_for_year(request):
    """Get the appropriate block and floors based on student's year"""
    try:
        student = Student.objects.get(admission_no=request.user.username)
        
        # Extract numeric year from class_yr (e.g. "1st Year" -> 1)
        year_str = str(student.class_yr or "1")
        year = int(''.join(filter(str.isdigit, year_str))) if any(c.isdigit() for c in year_str) else 1
        
        # Define block and floor mapping based on year
        # 1st, 3rd, 4th Year: Orange (Floors 1, 2, 3)
        # 2nd Year: Meta (Floors Ground(0), 1, 2)
        # 3rd Year: Alumini (Floors 1, 2, 3)
        
        if year == 1:
            block_name = 'orange'
            allowed_floors = [1, 2, 3]
            message = 'Orange Hostel (Floors 1-3) for 1st Year'
        elif year == 2:
            block_name = 'meta'
            allowed_floors = [0, 1, 2]
            message = 'Meta H Hostel (Ground, 1st, 2nd floors) for 2nd Year'
        elif year == 3:
            block_name = 'alumini'
            allowed_floors = [0, 1, 2]
            message = 'Alumini Hostel (Ground, 1st, 2nd floors) for 3rd Year'
        elif year == 4:
            block_name = 'orange'
            allowed_floors = [4, 5]
            message = 'Orange Hostel (Floors 4-5) for 4th Year'
        else:
            block_name = 'orange'
            allowed_floors = [1, 2, 3]
            message = f'Orange Hostel (Floors 1-3) for {year}th Year'
        
        # Get block details
        block = Block.objects.filter(name=block_name).first()
        if not block:
            return Response({'error': f'Block {block_name} not found'}, status=404)
        
        # Get floors that match the allowed floor numbers
        floors = Floor.objects.filter(block=block, floor_number__in=allowed_floors).order_by('floor_number')
        
        floor_data = []
        for floor in floors:
            rooms = Room.objects.filter(floor=floor, room_type='regular').order_by('room_number')
            available_rooms = [r for r in rooms if r.current_occupancy < r.capacity]
            floor_data.append({
                'floor_id': floor.id,
                'floor_number': floor.floor_number,
                'floor_name': f'Floor {floor.floor_number}' if floor.floor_number > 0 else 'Ground Floor',
                'total_rooms': floor.total_rooms,
                'available_beds': sum(r.capacity - r.current_occupancy for r in rooms),
                'rooms': [{
                    'id': r.id,
                    'room_number': r.room_number,
                    'capacity': r.capacity,
                    'available': r.capacity - r.current_occupancy
                } for r in rooms]
            })
        
        return Response({
            'block': {
                'id': block.id,
                'name': block.name,
                'display_name': block.display_name,
                'total_floors': block.total_floors
            },
            'allowed_floors': allowed_floors,
            'floors': floor_data,
            'message': message,
            'student_year': year
        })
    except Student.DoesNotExist:
        return Response({'error': 'Student Profile not found. Complete your profile first.'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ==================== FLOOR & ROOM VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_floors_with_rooms(request, block_id):
    """Get all floors with their rooms for a specific block"""
    try:
        block = Block.objects.get(id=block_id)
        floors = Floor.objects.filter(block=block).prefetch_related('rooms')
        
        floor_data = []
        for floor in floors:
            rooms = Room.objects.filter(floor=floor).order_by('room_number')
            floor_data.append({
                'floor_id': floor.id,
                'floor_number': floor.floor_number,
                'total_rooms': floor.total_rooms,
                'rooms': RoomSerializer(rooms, many=True).data
            })
        
        return Response({
            'block_id': block.id,
            'block_name': block.display_name,
            'floors': floor_data
        })
    except Block.DoesNotExist:
        return Response({'error': 'Block not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rooms_for_floor(request, block_name, floor_number):
    """Get all rooms for a specific block and floor"""
    try:
        block = Block.objects.get(name=block_name)
        floor = Floor.objects.get(block=block, floor_number=floor_number)
        rooms = Room.objects.filter(floor=floor).order_by('room_number')
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)
    except Block.DoesNotExist:
        return Response({'error': 'Block not found'}, status=404)
    except Floor.DoesNotExist:
        return Response({'error': 'Floor not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ==================== BOOKING VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_room(request):
    """Book a room for the student"""
    user = request.user
    room_id = request.data.get('room_id')
    
    if not room_id:
        return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if student already has an active booking
    if Booking.objects.filter(student=user, status='confirmed').exists():
        return Response({
            'error': 'You already have an active booking. Please cancel it before booking a new room.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get student profile first
        try:
            student = Student.objects.get(admission_no=user.username)
            year_str = str(student.class_yr or "1")
            student_year = int(''.join(filter(str.isdigit, year_str))) if any(c.isdigit() for c in year_str) else 1
        except Student.DoesNotExist:
            return Response({
                'error': 'Student profile not found. Please complete your profile first.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
            # Use atomic transaction with select_for_update from the start
            with transaction.atomic():
                # Fetch room with lock - only fetch once
                room = Room.objects.select_for_update().get(id=room_id)
                
                # Check if room is available (using the @property)
                if not room.is_available:
                    return Response({
                        'error': f'Room {room.room_number} is not available. Available beds: {room.available_beds}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check year/block/floor restriction
                block_name = room.floor.block.name
                floor_num = room.floor.floor_number
                
                if student_year == 1:
                    # 1st Year: Orange Hostel, Floors 1, 2, 3
                    if block_name != 'orange' or floor_num not in [1, 2, 3]:
                        return Response({'error': '1st year students can only book Orange Hostel (Floors 1-3)'}, status=status.HTTP_400_BAD_REQUEST)
                elif student_year == 2:
                    # 2nd Year: Meta Hostel, Floors 0 (Ground), 1, 2
                    if block_name != 'meta' or floor_num not in [0, 1, 2]:
                        return Response({'error': '2nd year students can only book Meta H Hostel (Ground, 1st, 2nd floors)'}, status=status.HTTP_400_BAD_REQUEST)
                elif student_year == 3:
                    # 3rd Year: Alumini Hostel, Floors 0, 1, 2
                    if block_name != 'alumini' or floor_num not in [0, 1, 2]:
                        return Response({'error': '3rd year students can only book Alumini Hostel (Floors 1-3)'}, status=status.HTTP_400_BAD_REQUEST)
                elif student_year == 4:
                    # 4th Year: Orange Hostel, Floors 4, 5
                    if block_name != 'orange' or floor_num not in [4, 5]:
                        return Response({'error': '4th year students can only book Orange Hostel (Floors 4-5)'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({'error': f'Invalid year: {student_year}'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Double-check occupancy (redundant but safe)
            if room.current_occupancy >= room.capacity:
                return Response({
                    'error': 'Room became full. Please try another room.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Increase occupancy by 1
            room.current_occupancy += 1
            room.save()
            
            # Create booking
            booking = Booking.objects.create(
                student=user,
                room=room,
                status='confirmed'
            )
        
        serializer = BookingSerializer(booking)
        return Response({
            'message': 'Room booked successfully!',
            'booking': serializer.data,
            'room_occupancy': room.current_occupancy,
            'available_beds': room.available_beds,
            'room_number': room.room_number
        }, status=status.HTTP_201_CREATED)
        
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Booking error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_booking(request):
    """Get current student's active booking"""
    user = request.user
    try:
        booking = Booking.objects.get(student=user, status='confirmed')
        serializer = BookingSerializer(booking)
        return Response(serializer.data)
    except Booking.DoesNotExist:
        return Response({'message': 'No active booking'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    """Cancel a booking and update room occupancy"""
    try:
        booking = Booking.objects.get(id=booking_id, student=request.user, status='confirmed')
        
        with transaction.atomic():
            # Re-fetch room with lock
            room = Room.objects.select_for_update().get(id=booking.room.id)
            
            # Decrease occupancy
            room.current_occupancy -= 1
            if room.current_occupancy < 0:
                room.current_occupancy = 0
            room.save()
            
            # Delete the booking
            booking.delete()
        
        return Response({
            'message': 'Booking cancelled successfully',
            'room_available_beds': room.capacity - room.current_occupancy,
            'room_current_occupancy': room.current_occupancy
        }, status=status.HTTP_200_OK)
        
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

# ==================== RAZORPAY PAYMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    """Create Razorpay order for booking payment"""
    try:
        booking_id = request.data.get('booking_id')
        
        if not booking_id:
            return Response({
                'success': False,
                'error': 'Booking ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the booking
        try:
            booking = Booking.objects.get(
                id=booking_id, 
                student=request.user,
                status='confirmed'
            )
        except Booking.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Booking not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if payment already exists and is completed
        if Payment.objects.filter(booking=booking, payment_status='completed').exists():
            return Response({
                'success': False,
                'error': 'Payment already completed for this booking'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get student profile for contact details
        student = Student.objects.filter(admission_no=request.user.username).first()
        student_phone = student.mobile if student else ''
        
        # Create new Razorpay order
        order_amount = int(booking.room.price_per_semester * 100)
        order_currency = 'INR'
        
        order_data = {
            'amount': order_amount,
            'currency': order_currency,
            'receipt': f'booking_{booking.id}',
            'payment_capture': 1,
            'notes': {
                'booking_id': str(booking.id),
                'student_id': str(request.user.id),
                'student_name': request.user.get_full_name(),
                'room_number': booking.room.room_number
            }
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Create payment record
        payment = Payment.objects.create(
            booking=booking,
            amount=booking.room.price_per_semester,
            razorpay_order_id=razorpay_order['id'],
            payment_status='pending'
        )
        
        return Response({
            'success': True,
            'order_id': razorpay_order['id'],
            'amount': razorpay_order['amount'],
            'currency': razorpay_order['currency'],
            'key_id': settings.RAZORPAY_KEY_ID,
            'payment_id': payment.id,
            'booking_id': booking.id,
            'student_name': request.user.get_full_name(),
            'student_email': request.user.email,
            'student_phone': student_phone
        })
        
    except Exception as e:
        print("Error creating order:", str(e))
        print(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_razorpay_payment(request):
    """Verify Razorpay payment"""
    try:
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        # Verify signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        try:
            razorpay_client.utility.verify_payment_signature(params_dict)
        except razorpay.errors.SignatureVerificationError:
            return Response({
                'success': False,
                'error': 'Invalid payment signature'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get payment record
        try:
            payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
        except Payment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Payment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update payment
        with transaction.atomic():
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature = razorpay_signature
            payment.payment_status = 'completed'
            payment.transaction_id = razorpay_payment_id
            payment.save()
            
            booking = payment.booking
        
        # Send email with PDF attachment
        try:
            student_data = Student.objects.filter(admission_no=booking.student.username).first()
            send_room_allotment_email(
                booking=booking,
                student_data=student_data,
                payment=payment,
                user_email=booking.student.email,
                student_name=booking.student.get_full_name()
            )
            print(f"✅ Room allotment PDF sent to {booking.student.email}")
        except Exception as email_error:
            print(f"❌ Failed to send email: {email_error}")
        
        return Response({
            'success': True,
            'message': 'Payment verified successfully',
            'booking_id': booking.id,
            'payment_id': payment.id
        })
        
    except Exception as e:
        print("Error verifying payment:", str(e))
        print(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_status(request, booking_id):
    """Get payment status for a booking"""
    try:
        payment = Payment.objects.filter(
            booking_id=booking_id,
            booking__student=request.user
        ).first()
        
        if payment:
            return Response({
                'success': True,
                'payment_status': payment.payment_status,
                'payment_id': payment.id,
                'amount': str(payment.amount),
                'payment_date': payment.payment_date,
                'razorpay_order_id': payment.razorpay_order_id,
                'razorpay_payment_id': payment.razorpay_payment_id
            })
        else:
            return Response({
                'success': True,
                'payment_status': 'no_payment',
                'message': 'No payment found for this booking'
            })
            
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
def razorpay_webhook(request):
    """Handle Razorpay webhook events"""
    if request.method == 'POST':
        try:
            payload = request.body
            data = json.loads(payload)
            event = data.get('event')
            
            print(f"Webhook event received: {event}")
            
            if event == 'payment.captured':
                payment_data = data.get('payload', {}).get('payment', {}).get('entity', {})
                order_id = payment_data.get('order_id')
                payment_id = payment_data.get('id')
                
                try:
                    payment = Payment.objects.get(razorpay_order_id=order_id)
                    if payment.payment_status != 'completed':
                        payment.payment_status = 'completed'
                        payment.razorpay_payment_id = payment_id
                        payment.transaction_id = payment_id
                        payment.save()
                        print(f"Payment updated via webhook: {payment_id}")
                except Payment.DoesNotExist:
                    print(f"Payment not found for order: {order_id}")
                    
            elif event == 'payment.failed':
                payment_data = data.get('payload', {}).get('payment', {}).get('entity', {})
                order_id = payment_data.get('order_id')
                
                try:
                    payment = Payment.objects.get(razorpay_order_id=order_id)
                    payment.payment_status = 'failed'
                    payment.save()
                    print(f"Payment marked as failed: {order_id}")
                except Payment.DoesNotExist:
                    print(f"Payment not found for order: {order_id}")
            
            return JsonResponse({'status': 'success'}, status=200)
            
        except Exception as e:
            print(f"Webhook error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_details(request, payment_id):
    """Get payment details by ID"""
    try:
        payment = Payment.objects.get(
            id=payment_id,
            booking__student=request.user
        )
        return Response({
            'success': True,
            'payment_id': payment.id,
            'amount': str(payment.amount),
            'payment_status': payment.payment_status,
            'payment_date': payment.payment_date,
            'transaction_id': payment.transaction_id,
            'razorpay_order_id': payment.razorpay_order_id,
            'razorpay_payment_id': payment.razorpay_payment_id
        })
    except Payment.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Payment not found'
        }, status=status.HTTP_404_NOT_FOUND)

# ==================== MESS PAYMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    try:
        amount_inr = int(request.data.get('amount', 3000))
        
        data = {
            "amount": amount_inr * 100, 
            "currency": "INR",
            "payment_capture": 1
        }
        
        order = client.order.create(data=data)
        return Response(order)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_payment(request):
    data = request.data
    order_id = data.get('razorpay_order_id')
    payment_id = data.get('razorpay_payment_id')
    signature = data.get('razorpay_signature')
    roll_no = data.get('roll_no')
    month = data.get('month')

    params_dict = {
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    }

    try:
        client.utility.verify_payment_signature(params_dict)
        
        # Find the payment record by roll_no and month (most recent one that is not yet successful)
        payment_record = MessPayment.objects.filter(
            roll_no=roll_no,
            month=month,
            status='Pending'
        ).order_by('-created_at').first()
        
        if payment_record:
            payment_record.payment_mode = "Online"
            payment_record.razorpay_order_id = order_id
            payment_record.razorpay_payment_id = payment_id
            payment_record.status = "Success"
            payment_record.save()
            
            return Response({
                "status": "success",
                "message": "Payment verified",
                "receipt_id": str(payment_record.receipt_no),
                "payment_time": payment_record.created_at.strftime('%Y-%m-%d %H:%M:%S') if payment_record.created_at else None,
                "days": payment_record.days_count
            })
        else:
            # If no pending payment record found, check if there's already a successful one for this month
            existing = MessPayment.objects.filter(
                roll_no=roll_no,
                month=month,
                status='Success'
            ).first()
            
            if existing:
                return Response({
                    "status": "success",
                    "message": "Payment already verified",
                    "receipt_id": str(existing.receipt_no),
                    "payment_time": existing.created_at.strftime('%Y-%m-%d %H:%M:%S') if existing.created_at else None,
                    "days": existing.days_count
                })
            
            # Fallback: create new record (shouldn't normally reach here)
            billing_rate = None
            days_count = 0
            if month:
                billing_rate = BillingRate.objects.filter(month=month).first()
                if billing_rate:
                    days_count = billing_rate.days
                    
            payment_record = MessPayment.objects.create(
                student_name=data.get('student_name', 'Unknown'),
                roll_no=roll_no,
                room_no=data.get('room_no', ''),
                class_yr=data.get('class_yr', ''),
                date=datetime.now().date(),
                month=month or datetime.now().strftime("%B %Y"),
                amount=int(data.get('amount', 3000)),
                payment_mode="Online",
                purpose="Mess Fee",
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
                status="Success",
                billing_rate=billing_rate,
                days_count=days_count
            )
            
            return Response({
                "status": "success",
                "message": "Payment verified and recorded",
                "receipt_id": str(payment_record.receipt_no),
                "payment_time": payment_record.created_at.strftime('%Y-%m-%d %H:%M:%S') if payment_record.created_at else None,
                "days": days_count
            })

    except razorpay.errors.SignatureVerificationError:
        return Response({"status": "error", "message": "Invalid Signature"}, status=400)
    except Exception as e:
        print(f"Verification error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def mess_payment(request):
    data = request.data
    try:
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
def check_month_paid(request):
    """Check if a student has already paid for a specific month"""
    roll_no = request.GET.get('roll_no')
    month = request.GET.get('month')
    
    if not roll_no or not month:
        return Response({
            "paid": False,
            "error": "roll_no and month are required"
        }, status=400)
    
    try:
        existing_payment = MessPayment.objects.filter(
            roll_no=roll_no,
            month=month,
            status='Success'
        ).first()
        
        if existing_payment:
            return Response({
                "paid": True,
                "receipt_no": existing_payment.receipt_no,
                "payment_time": existing_payment.created_at.strftime('%Y-%m-%d %H:%M:%S') if existing_payment.created_at else None,
                "amount": existing_payment.amount,
                "days": existing_payment.days_count
            })
        
        return Response({
            "paid": False
        })
    except Exception as e:
        print(f"Error checking month payment: {e}")
        return Response({
            "paid": False,
            "error": str(e)
        }, status=500)

# ==================== CERTIFICATE VIEW ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def save_certificate_record(request):
    data = request.data
    try:
        Certificate.objects.create(
            admission_no=data.get('admission_no'),
            reg_no=data.get('reg_no'),
            student_name=data.get('student_name'),
            certificate_type=data.get('certificate_type')
        )
        return Response({"status": "success", "message": "Record stored."})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=400)

# ==================== NO DUES / MONTHS UPDATE ENDPOINT ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_months(request):
    """
    Update months for No Dues Certificate
    Expected JSON payload: {"months": 6}
    """
    try:
        import json
        data = json.loads(request.body) if request.body else {}
        months = data.get('months')
        
        print(f"📅 Update months request - User: {request.user.username}, Months: {months}")
        
        if months is None:
            return Response({
                'success': False,
                'error': 'Months value is required'
            }, status=400)
        
        # Get student
        try:
            student = Student.objects.get(admission_no=request.user.username)
        except Student.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Student data not found'
            }, status=404)
        
        # Store months in session
        request.session['no_dues_months'] = months
        
        return Response({
            'success': True,
            'message': f'Successfully updated to {months} months',
            'data': {
                'months': months,
                'student': student.admission_no,
                'student_name': request.user.get_full_name()
            }
        }, status=200)
        
    except Exception as e:
        print(f"Error in update_months: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def check_no_dues(request):
    """
    Check if a student has any pending dues
    Query params: reg_no (registration number)
    """
    try:
        reg_no = request.GET.get('reg_no')
        
        if not reg_no:
            return Response({
                'success': False,
                'error': 'Registration number is required'
            }, status=400)
        
        # Find the student
        student = Student.objects.filter(reg_no=reg_no).first()
        
        if not student:
            return Response({
                'success': False,
                'error': 'Student not found'
            }, status=404)
        
        # Calculate dues
        mess_payments = MessPayment.objects.filter(
            roll_no=reg_no,
            status='Success'
        )
        
        total_paid = sum(payment.amount for payment in mess_payments)
        
        # Required amount (example: 3000 per month * months)
        months = request.session.get('no_dues_months', 6)
        required_amount = 3000 * months  # Adjust based on your fee structure
        
        # Check if student has active booking payment
        try:
            user = User.objects.filter(username=student.admission_no).first()
            if user:
                booking = Booking.objects.filter(
                    student=user,
                    status='confirmed'
                ).first()
                
                if booking:
                    payment = Payment.objects.filter(
                        booking=booking,
                        payment_status='completed'
                    ).first()
                    
                    if payment:
                        total_paid += payment.amount
                        required_amount += 13000  # Room booking fee
        except:
            pass
        
        is_no_dues = total_paid >= required_amount
        
        return Response({
            'success': True,
            'is_no_dues': is_no_dues,
            'total_paid': total_paid,
            'required_amount': required_amount,
            'pending_amount': max(0, required_amount - total_paid),
            'student_name': student.full_name,
            'reg_no': reg_no
        })
        
    except Exception as e:
        print(f"Error in check_no_dues: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== STUDENT VIEW ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_students(request):
    students = Student.objects.all()
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)

# ==================== OTP & PASSWORD RESET VIEWS ====================



from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.hashers import make_password
from django.conf import settings
from django.core.mail import send_mail
import random

from .models import StudentRegistration, AdminWardenUser, PasswordResetOTP


# =========================
# STEP 1: REQUEST OTP
# =========================
class RequestOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response({"error": "Email is required"}, status=400)

        student = StudentRegistration.objects.filter(email=email).first()
        admin = AdminWardenUser.objects.filter(email=email).first()

        if not student and not admin:
            return Response({"error": "Email not registered"}, status=400)

        otp = str(random.randint(100000, 999999))

        # ===== STUDENT =====
        if student:
            PasswordResetOTP.objects.filter(user=student).delete()
            
            new_record = PasswordResetOTP.objects.create(
                user=student,
                otp=otp
            )
            print(f"OTP created for student {email}: {otp}")
            print(f"Record ID: {new_record.id}, Reset Token: {new_record.reset_token}")

        # ===== ADMIN =====
        if admin:
            PasswordResetOTP.objects.filter(email=email, user__isnull=True).delete()
            
            new_record = PasswordResetOTP.objects.create(
                user=None,
                email=email,
                otp=otp
            )
            print(f"OTP created for admin {email}: {otp}")
            print(f"Record ID: {new_record.id}, Reset Token: {new_record.reset_token}")
        
        # ===== SEND EMAIL =====
        send_mail(
            "Password Reset OTP",
            f"Your OTP is {otp}",
            settings.EMAIL_HOST_USER,
            [email],
            fail_silently=False
        )

        return Response({
            "status": "success",
            "message": "OTP sent successfully"
        })


# =========================
# STEP 2: VERIFY OTP
# =========================
class VerifyOTP(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = str(request.data.get("otp")).strip()

        print("\n====== VERIFY DEBUG ======")
        print("EMAIL:", email)
        print("ENTERED OTP:", otp)

        student = StudentRegistration.objects.filter(email=email).first()
        admin = AdminWardenUser.objects.filter(email=email).first()
        
        print("STUDENT FOUND:", student)
        print("ADMIN FOUND:", admin)

        # STUDENT VERIFICATION (OTP stored in database)
        if student:
            all_otps = PasswordResetOTP.objects.filter(user=student)
            print("ALL OTP RECORDS:", list(all_otps.values()))

            record = all_otps.order_by('-created_at').first()

            if record:
                print("LATEST DB OTP:", record.otp)
                print("ENTERED OTP:", otp)
                print("OTP MATCH:", record.otp == otp)
                print("IS VALID:", record.is_valid())
                print("CREATED AT:", record.created_at)
            else:
                print("NO OTP RECORD FOUND")

            if record and record.otp == otp:
                if not record.is_valid():
                    print("OTP EXPIRED")
                    return Response({"error": "OTP has expired. Please request a new one."}, status=400)
                    
                print("OTP MATCH SUCCESS")
                return Response({
                    "status": "success",
                    "reset_token": str(record.reset_token),
                    "user_type": "student"
                })
            else:
                print("OTP MISMATCH - STUDENT OTP CHECK FAILED")
        else:
            print("NO STUDENT FOUND FOR THIS EMAIL")

        # ADMIN VERIFICATION (OTP stored in database)
        if admin:
            all_otps = PasswordResetOTP.objects.filter(email=email, user__isnull=True)
            print("ADMIN OTP RECORDS:", list(all_otps.values()))

            record = all_otps.order_by('-created_at').first()

            if record:
                print("LATEST DB OTP:", record.otp)
                print("ENTERED OTP:", otp)
                print("OTP MATCH:", record.otp == otp)
                print("IS VALID:", record.is_valid())
                print("CREATED AT:", record.created_at)

            if not record:
                print("NO ADMIN OTP RECORD FOUND")
                return Response({"error": "No OTP found. Please request a new one."}, status=400)

            if record.otp != otp:
                print("OTP MISMATCH")
                return Response({"error": "Invalid OTP. Please check and try again."}, status=400)

            if not record.is_valid():
                print("OTP EXPIRED")
                return Response({"error": "OTP has expired. Please request a new one."}, status=400)

            print("ADMIN OTP SUCCESS")
            return Response({
                "status": "success",
                "reset_token": str(record.reset_token),
                "user_type": "admin"
            })

        print("OTP FAILED - NO USER FOUND")
        return Response({"error": "Email not registered. Please check your email address."}, status=400)
# =========================
# STEP 3: RESET PASSWORD
# =========================
class ResetPassword(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("reset_token")
        new_password = request.data.get("new_password")

        if not token or not new_password:
            return Response({"error": "Token and new password required"}, status=400)

        record = PasswordResetOTP.objects.filter(reset_token=token).last()

        if record and record.is_valid():
            if record.user:
                user = record.user
                user.password = make_password(new_password)
                user.save()
                
                PasswordResetOTP.objects.filter(user=user).delete()

                return Response({
                    "status": "success",
                    "message": "Password reset successful"
                })
            elif record.email:
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

# ==================== TEST ENDPOINT ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def test_endpoint(request):
    """Simple test endpoint"""
    return Response({
        "message": "Backend connection successful!",
        "authenticated": request.user.is_authenticated,
        "user": str(request.user) if request.user.is_authenticated else "Anonymous"
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_room_availability(request, room_id):
    """Get current availability of a specific room"""
    try:
        room = Room.objects.get(id=room_id)
        return Response({
            'room_id': room.id,
            'room_number': room.room_number,
            'capacity': room.capacity,
            'current_occupancy': room.current_occupancy,
            'available_beds': room.available_beds,
            'is_available': room.is_available,
            'is_full': room.is_full
        })
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=404)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def download_mess_receipt(request, receipt_id):
    """Generate and download PDF receipt for mess payment"""
    try:
        print(f"📄 Downloading receipt for ID: {receipt_id}")
        
        # Find the payment
        payment = None
        if receipt_id.isdigit():
            try:
                payment = MessPayment.objects.get(receipt_no=int(receipt_id))
                print(f"✅ Found by receipt_no: {payment.receipt_no}")
            except MessPayment.DoesNotExist:
                pass
        
        if not payment:
            try:
                payment = MessPayment.objects.get(razorpay_payment_id=receipt_id)
                print(f"✅ Found by razorpay_payment_id")
            except MessPayment.DoesNotExist:
                pass
        
        if not payment:
            payment = MessPayment.objects.filter(roll_no=receipt_id).last()
            if payment:
                print(f"✅ Found by roll_no")
        
        if not payment:
            return Response(
                {"error": f"Receipt not found for ID: {receipt_id}"},
                status=404
            )
        
        # Create PDF using reportlab
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import inch
        
        # Create HTTP response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="AU_Mess_Receipt_{payment.receipt_no}.pdf"'
        
        # Create PDF
        p = canvas.Canvas(response, pagesize=A4)
        width, height = A4
        
        # Starting Y position
        y = height - 1*inch
        
        # Title
        p.setFont("Helvetica-Bold", 18)
        p.drawString(1*inch, y, "ANDHRA UNIVERSITY")
        y -= 0.4*inch
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, y, "A.U. College of Engineering (A), Visakhapatnam")
        y -= 0.3*inch
        p.drawString(1*inch, y, "SELF-SUPPORT HOSTELS")
        y -= 0.5*inch
        
        # Receipt Title
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, y, "MESS FEE PAYMENT RECEIPT")
        y -= 0.6*inch
        
        # Draw line
        p.line(1*inch, y, width - 1*inch, y)
        y -= 0.3*inch
        
        # Receipt Details
        p.setFont("Helvetica-Bold", 11)
        p.drawString(1*inch, y, "RECEIPT INFORMATION")
        y -= 0.3*inch
        
        p.setFont("Helvetica", 10)
        p.drawString(1.2*inch, y, f"Receipt No: {payment.receipt_no}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Transaction ID: {payment.razorpay_payment_id or 'N/A'}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Date: {payment.date.strftime('%d-%m-%Y') if payment.date else 'N/A'}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Month: {payment.month}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Status: ✅ SUCCESS")
        y -= 0.4*inch
        
        # Student Details
        p.setFont("Helvetica-Bold", 11)
        p.drawString(1*inch, y, "STUDENT DETAILS")
        y -= 0.3*inch
        
        p.setFont("Helvetica", 10)
        p.drawString(1.2*inch, y, f"Student Name: {payment.student_name}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Roll Number: {payment.roll_no}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Room Number: {payment.room_no or 'N/A'}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Class/Year: {payment.class_yr or 'N/A'}")
        y -= 0.4*inch
        
        # Payment Details
        p.setFont("Helvetica-Bold", 11)
        p.drawString(1*inch, y, "PAYMENT DETAILS")
        y -= 0.3*inch
        
        p.setFont("Helvetica", 10)
        p.drawString(1.2*inch, y, f"Purpose: {payment.purpose or 'Mess Fee'}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Amount Paid: ₹ {int(payment.amount):,}/-")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Payment Mode: {payment.payment_mode or 'Online'}")
        y -= 0.25*inch
        p.drawString(1.2*inch, y, f"Payment Status: COMPLETED ✓")
        y -= 0.4*inch
        
        # Footer
        p.setFont("Helvetica", 9)
        p.drawString(1*inch, 1*inch, "This is a computer-generated receipt. No signature required.")
        p.drawString(1*inch, 0.7*inch, "For any queries, please contact Hostel Administration Office.")
        p.drawString(1*inch, 0.4*inch, "Thank you for your payment!")
        
        # Save PDF
        p.showPage()
        p.save()
        
        print(f"✅ Receipt generated successfully for: {payment.student_name}")
        return response
        
    except Exception as e:
        print(f"❌ Error generating receipt: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e), "traceback": traceback.format_exc()},
            status=500
        )

def get_amount_in_words(amount):
    """Convert amount to words (optional helper function)"""
    if amount <= 0:
        return None
    
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    
    def convert_hundreds(num):
        if num == 0:
            return ""
        elif num < 10:
            return ones[num]
        elif num < 20:
            return teens[num - 10]
        elif num < 100:
            return tens[num // 10] + (" " + ones[num % 10] if num % 10 != 0 else "")
        else:
            return ones[num // 100] + " Hundred" + (" " + convert_hundreds(num % 100) if num % 100 != 0 else "")
    
    if amount >= 100000:
        lakhs = amount // 100000
        remainder = amount % 100000
        return (convert_hundreds(lakhs) + " Lakh" + (" " + convert_hundreds(remainder) if remainder > 0 else ""))
    elif amount >= 1000:
        thousands = amount // 1000
        remainder = amount % 1000
        return (convert_hundreds(thousands) + " Thousand" + (" " + convert_hundreds(remainder) if remainder > 0 else ""))
    else:
        return convert_hundreds(amount)

@csrf_exempt 
def upload_excel(request):
    """
    Bulk upload students from Excel file with monthly billing data
    Handles the complex META Hostel Excel format
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        excel_file = request.FILES['file']
        
        if not excel_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({'error': 'Invalid file format. Please upload .xlsx or .xls file'}, status=400)
        
        # Read Excel file
        df = pd.read_excel(excel_file, header=None)
        
        # Find the header row (where "S.no" is located)
        header_row = None
        for idx, row in df.iterrows():
            if row.astype(str).str.contains('S.no').any():
                header_row = idx
                break
        
        if header_row is None:
            return JsonResponse({'error': 'Could not find header row in Excel'}, status=400)
        
        # Get the actual data rows
        data_df = df.iloc[header_row + 1:].reset_index(drop=True)
        
        # Define month columns mapping (based on your Excel structure)
        # Columns: July 2024, Aug 2024, Sep 2024, Oct 2024, Nov 2024, Dec 2024, 
        # Jan 2025, Feb 2025, Mar 2025, Apr 2025, May 2025
        month_columns = [
            {'name': 'July 2024', 'days_col': 4, 'mess_charge_col': 6, 'date_col': 10},
            {'name': 'August 2024', 'days_col': 13, 'mess_charge_col': 15, 'date_col': 19},
            {'name': 'September 2024', 'days_col': 22, 'mess_charge_col': 24, 'date_col': 28},
            {'name': 'October 2024', 'days_col': 31, 'mess_charge_col': 33, 'date_col': 37},
            {'name': 'November 2024', 'days_col': 40, 'mess_charge_col': 42, 'date_col': 46},
            {'name': 'December 2024', 'days_col': 49, 'mess_charge_col': 51, 'date_col': 55},
            {'name': 'January 2025', 'days_col': 58, 'mess_charge_col': 60, 'date_col': 64},
            {'name': 'February 2025', 'days_col': 67, 'mess_charge_col': 69, 'date_col': 73},
            {'name': 'March 2025', 'days_col': 76, 'mess_charge_col': 78, 'date_col': 82},
            {'name': 'April 2025', 'days_col': 85, 'mess_charge_col': 87, 'date_col': 91},
            {'name': 'May 2025', 'days_col': 94, 'mess_charge_col': 96, 'date_col': 100},
        ]
        
        success_count = 0
        error_count = 0
        errors = []
        students_created = 0
        payments_created = 0
        
        for index, row in data_df.iterrows():
            try:
                # Extract student data
                s_no = row.iloc[0] if len(row) > 0 else None
                student_name = str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else ''
                registration_no = str(row.iloc[2]) if len(row) > 2 and pd.notna(row.iloc[2]) else ''
                
                # Skip empty rows or total rows
                if not student_name or student_name == 'nan' or 'Total' in str(student_name):
                    continue
                
                # Generate admission number from registration or create one
                admission_no = registration_no if registration_no and registration_no != 'nan' else f"META{int(s_no) if s_no else index:04d}"
                reg_no = registration_no if registration_no and registration_no != 'nan' else admission_no
                
                # Check if student already exists
                existing_student = Student.objects.filter(admission_no=admission_no).first()
                
                if existing_student:
                    print(f"Student {student_name} already exists, updating...")
                    student = existing_student
                else:
                    # Create new student
                    student = Student.objects.create(
                        full_name=student_name,
                        admission_no=admission_no,
                        reg_no=reg_no,
                        class_yr="2nd Year" if "META" in str(excel_file.name) else "1st Year",
                        branch="CSE",
                        mobile="",
                        email=f"{reg_no}@au.edu.in",
                        password=make_password(reg_no),
                        amount="13250" if "META" in str(excel_file.name) else "10000"
                    )
                    students_created += 1
                    print(f"Created new student: {student_name}")
                
                # Process monthly payments
                for month_info in month_columns:
                    try:
                        days = row.iloc[month_info['days_col']] if len(row) > month_info['days_col'] else None
                        mess_charge = row.iloc[month_info['mess_charge_col']] if len(row) > month_info['mess_charge_col'] else None
                        payment_date = row.iloc[month_info['date_col']] if len(row) > month_info['date_col'] else None
                        
                        # Check if there's a payment (non-zero and not empty)
                        if (mess_charge and pd.notna(mess_charge) and 
                            isinstance(mess_charge, (int, float)) and 
                            mess_charge > 0):
                            
                            # Check if payment already exists
                            existing_payment = MessPayment.objects.filter(
                                roll_no=reg_no,
                                month=month_info['name'],
                                status='Success'
                            ).first()
                            
                            if not existing_payment:
                                # Parse payment date
                                payment_date_obj = None
                                if payment_date and pd.notna(payment_date):
                                    try:
                                        if isinstance(payment_date, str):
                                            payment_date_obj = datetime.strptime(payment_date.split()[0], '%Y-%m-%d').date()
                                        else:
                                            payment_date_obj = payment_date.date() if hasattr(payment_date, 'date') else payment_date
                                    except:
                                        payment_date_obj = datetime.now().date()
                                else:
                                    payment_date_obj = datetime.now().date()
                                
                                # Create billing rate if not exists
                                billing_rate, _ = BillingRate.objects.get_or_create(
                                    month=month_info['name'],
                                    defaults={
                                        'days': int(days) if days and pd.notna(days) else 30,
                                        'electric_charge': 0,
                                        'mess_charge': float(mess_charge) if mess_charge else 0,
                                        'service_charge': 0,
                                        'net_demand': float(mess_charge) if mess_charge else 0,
                                        'collection': float(mess_charge) if mess_charge else 0,
                                        'date': payment_date_obj
                                    }
                                )
                                
                                # Create payment record
                                payment = MessPayment.objects.create(
                                    student_name=student_name,
                                    roll_no=reg_no,
                                    room_no=student.room_no or "Not Allotted",
                                    class_yr=student.class_yr or "2nd Year",
                                    date=payment_date_obj,
                                    month=month_info['name'],
                                    amount=int(float(mess_charge)) if mess_charge else 0,
                                    payment_mode="Online",
                                    purpose="Mess Fee",
                                    status="Success",
                                    student=student,
                                    billing_rate=billing_rate,
                                    days_count=int(days) if days and pd.notna(days) else 0
                                )
                                payments_created += 1
                                print(f"  ✅ Created payment for {month_info['name']}: ₹{mess_charge}")
                            else:
                                print(f"  ⏭️ Payment for {month_info['name']} already exists")
                    
                    except Exception as e:
                        print(f"Error processing month {month_info['name']} for {student_name}: {e}")
                        errors.append(f"Student {student_name}, Month {month_info['name']}: {str(e)}")
                
                success_count += 1
                
            except Exception as e:
                print(f"Error processing row {index}: {e}")
                errors.append(f"Row {index + 2}: {str(e)}")
                error_count += 1
        
        # Save uploaded file
        file_path = default_storage.save(f'uploads/students/{excel_file.name}', ContentFile(excel_file.read()))
        
        return JsonResponse({
            'success': True,
            'message': f'Upload completed: {success_count} students processed, {students_created} new students, {payments_created} payments created',
            'students_processed': success_count,
            'students_created': students_created,
            'payments_created': payments_created,
            'errors': errors[:20],
            'file_path': file_path
        }, status=200)
        
    except Exception as e:
        print(f"Server error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def upload_billing_excel(request):
    """
    Upload Excel file with billing rates
    Expected columns: MONTH, DAYS, ELECTRIC_CHARGE, MESS_CHARGE, SERVICE_CHARGE, NET_DEMAND, COLLECTION, DATE
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        excel_file = request.FILES['file']
        
        if not excel_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({'error': 'Invalid file format'}, status=400)
        
        df = pd.read_excel(excel_file)
        
        # Check for required columns (case insensitive)
        df.columns = [col.strip().upper() for col in df.columns]
        
        required_columns = ['MONTH', 'DAYS', 'MESS_CHARGE', 'DATE']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return JsonResponse({'error': f'Missing columns: {missing_columns}'}, status=400)
        
        success_count = 0
        for index, row in df.iterrows():
            try:
                date_value = pd.to_datetime(row['DATE']).date()
                month_name = row['MONTH']
                
                billing_rate, created = BillingRate.objects.update_or_create(
                    month=month_name,
                    defaults={
                        'days': int(row['DAYS']),
                        'electric_charge': float(row.get('ELECTRIC_CHARGE', 0)),
                        'mess_charge': float(row.get('MESS_CHARGE', 0)),
                        'service_charge': float(row.get('SERVICE_CHARGE', 0)),
                        'net_demand': float(row.get('NET_DEMAND', row.get('MESS_CHARGE', 0))),
                        'collection': float(row.get('COLLECTION', row.get('MESS_CHARGE', 0))),
                        'date': date_value
                    }
                )
                success_count += 1
                print(f"✅ {'Updated' if not created else 'Created'} billing rate for {month_name}")
            except Exception as e:
                print(f"Error row {index}: {e}")
        
        # Save uploaded file
        file_path = default_storage.save(f'uploads/billing/{excel_file.name}', ContentFile(excel_file.read()))
        
        return JsonResponse({
            'success': True,
            'message': f'Uploaded {success_count} billing records',
            'count': success_count,
            'file_path': file_path
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)
    

@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_billing(request):
    """Get billing details for a student"""
    try:
        admission_no = request.GET.get('admission_no', '').strip()
        reg_no = request.GET.get('reg_no', '').strip()
        
        # Find student
        student = None
        if admission_no:
            student = Student.objects.filter(admission_no__iexact=admission_no).first()
        elif reg_no:
            student = Student.objects.filter(reg_no__iexact=reg_no).first()
        
        if not student:
            return Response({'error': 'Student not found'}, status=404)
        
        # Get all mess payments for this student
        mess_payments = MessPayment.objects.filter(
            roll_no=student.reg_no
        ).order_by('-date')
        
        billing_details = []
        for payment in mess_payments:
            billing_details.append({
                'month': payment.month,
                'days': payment.days_count,
                'electric_charge': payment.billing_rate.electric_charge if payment.billing_rate else 0,
                'mess_charge': payment.amount,
                'service_charge': payment.billing_rate.service_charge if payment.billing_rate else 0,
                'net_demand': payment.billing_rate.net_demand if payment.billing_rate else payment.amount,
                'collection': payment.amount,
                'date': payment.date.strftime('%Y-%m-%d'),
                'transaction_id': payment.razorpay_payment_id,
                'payment_time': payment.created_at.strftime('%Y-%m-%d %H:%M:%S') if payment.created_at else None,
                'status': payment.status
            })
        
        return Response({
            'student': {
                'name': student.full_name,
                'admission_no': student.admission_no,
                'reg_no': student.reg_no,
                'room_no': student.room_no,
                'class_yr': student.class_yr
            },
            'billing_history': billing_details,
            'total_paid': sum(p.amount for p in mess_payments),
            'total_months': len(billing_details)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_billing_rate_by_month(request):
    """Get billing rate for a specific month"""
    try:
        month = request.GET.get('month')
        
        if not month:
            return Response({'error': 'Month is required'}, status=400)
        
        billing_rate = BillingRate.objects.filter(month=month).first()
        
        if billing_rate:
            return Response({
                'success': True,
                'days': billing_rate.days,
                'electric_charge': billing_rate.electric_charge,
                'mess_charge': billing_rate.mess_charge,
                'service_charge': billing_rate.service_charge,
                'net_demand': billing_rate.net_demand,
                'collection': billing_rate.collection,
                'date': billing_rate.date
            })
        else:
            return Response({
                'success': False,
                'error': f'No billing rate found for {month}'
            }, status=404)
            
    except Exception as e:
        return Response({'error': str(e)}, status=500)
    

@api_view(['GET'])
@permission_classes([AllowAny])
def check_month_paid(request):
    """Check if a student has already paid for a specific month"""
    try:
        roll_no = request.GET.get('roll_no')
        month = request.GET.get('month')
        
        if not roll_no or not month:
            return Response({
                'paid': False,
                'error': 'Missing roll_no or month parameter'
            }, status=400)
        
        # Check if payment exists for this student and month
        payment_exists = MessPayment.objects.filter(
            roll_no=roll_no,
            month=month,
            status='Success'
        ).exists()
        
        return Response({
            'paid': payment_exists,
            'roll_no': roll_no,
            'month': month
        })
        
    except Exception as e:
        print(f"Error checking month paid: {str(e)}")
        return Response({
            'paid': False,
            'error': str(e)
        }, status=500)
    

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def upload_meta_hostel_excel(request):
    """
    Upload META Hostel Excel file with student data and monthly expenses
    Excel format:
    - Row 1: S.no, Name of the Student, Roll no, Class, Room no, etc.
    - Row 2: Month headers (Jul-24, Aug-24, etc.)
    - Row 3: Column headers (DAYS, ELECTRIC CHARGE, MESS CHARGE, etc.)
    - Row 4+: Data rows
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    def safe_str(val):
        if pd.notna(val):
            return str(val).strip()
        return ''
    
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        excel_file = request.FILES['file']
        
        if not excel_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({'error': 'Invalid file format. Please upload .xlsx or .xls file'}, status=400)
        
        df = pd.read_excel(excel_file, header=None)
        
        # Find header row containing 'S.no' and 'Name of the Student'
        header_row = None
        for idx in range(min(10, len(df))):
            row = df.iloc[idx]
            row_str = row.astype(str)
            if row_str.str.contains('S.no', case=False, na=False).any() and row_str.str.contains('Name', case=False, na=False).any():
                header_row = idx
                break
        
        if header_row is None:
            return JsonResponse({'error': 'Could not find header row. Make sure Excel has "S.no" and "Name of the Student" columns'}, status=400)
        
        # Parse headers
        headers = df.iloc[header_row].astype(str).tolist()
        print(f"Header row: {header_row}")
        print(f"Total columns: {len(headers)}")
        
        # Find column indices
        col_map = {}
        for i, h in enumerate(headers):
            h_lower = str(h).lower().strip()
            if 's.no' in h_lower or 'sno' in h_lower:
                col_map['sno'] = i
            elif 'name' in h_lower and ('student' in h_lower or 'name of' in h_lower):
                col_map['student_name'] = i
            elif 'roll' in h_lower or 'reg' in h_lower:
                col_map['roll_no'] = i
            elif 'class' in h_lower or 'year' in h_lower:
                col_map['class'] = i
            elif 'room' in h_lower:
                col_map['room_no'] = i
            elif 'hostel' in h_lower or 'block' in h_lower:
                col_map['hostel'] = i
            elif 'phone' in h_lower or 'mobile' in h_lower:
                col_map['phone'] = i
            elif 'dob' in h_lower:
                col_map['dob'] = i
            elif 'aadhar' in h_lower:
                col_map['aadhar'] = i
            elif 'scholarship' in h_lower:
                col_map['scholarship'] = i
            elif 'caste' in h_lower:
                col_map['caste'] = i
            elif 'parent' in h_lower and 'name' in h_lower:
                col_map['parent_name'] = i
            elif 'parent' in h_lower and 'phone' in h_lower:
                col_map['parent_phone'] = i
            elif 'address' in h_lower:
                col_map['address'] = i
            elif 'caution' in h_lower:
                col_map['caution'] = i
            elif 'jul' in h_lower or 'july' in h_lower:
                if 'month_start' not in col_map:
                    col_map['month_start'] = i
            elif 'aug' in h_lower or 'august' in h_lower:
                if 'month_start' not in col_map:
                    col_map['month_start'] = i
        
        print(f"Column map: {col_map}")
        
        # Find all month columns dynamically
        month_headers = []
        month_patterns = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        
        for i, h in enumerate(headers):
            h_lower = str(h).lower().strip()
            for pattern in month_patterns:
                if pattern in h_lower and ('24' in h or '25' in h or '26' in h):
                    month_name = h.strip()
                    if month_name not in [m['name'] for m in month_headers]:
                        month_headers.append({
                            'name': month_name,
                            'col_index': i
                        })
                    break
        
        print(f"Found months: {month_headers}")
        
        # Get data rows (skip header rows)
        data_df = df.iloc[header_row + 1:].reset_index(drop=True)
        
        # Find month data columns for each month
        for month in month_headers:
            month_start = month['col_index']
            month['days'] = month_start
            month['electric'] = month_start + 1
            month['mess'] = month_start + 2
            month['service'] = month_start + 3
            month['net_demand'] = month_start + 4
            month['collection'] = month_start + 5
            month['date'] = month_start + 6
        
        students_created = 0
        students_updated = 0
        payments_created = 0
        errors = []
        
        for idx, row in data_df.iterrows():
            try:
                # Get registration/admission number FIRST
                roll_col = col_map.get('roll_no', 2)
                reg_no = safe_str(row.iloc[roll_col]) if len(row) > roll_col else ''
                
                if reg_no == 'nan' or not reg_no:
                    # Try next few columns for roll no
                    for rc in range(roll_col, min(roll_col + 5, len(row))):
                        val = safe_str(row.iloc[rc])
                        if val and not val.isdigit() and len(val) > 5:
                            reg_no = val
                            roll_col = rc
                            break
                
                if not reg_no or reg_no.isdigit():
                    continue
                
                admission_no = reg_no
                name_col = col_map.get('student_name', 1)
                student_name = ''
                
                # Try columns BEFORE and AFTER roll column for name
                search_cols = []
                if roll_col > 0:
                    search_cols.extend(range(0, roll_col))
                search_cols = list(range(roll_col + 1, min(roll_col + 5, len(row))))
                
                for check_col in search_cols:
                    if check_col >= len(row):
                        continue
                    val = safe_str(row.iloc[check_col])
                    # Must have letters and be longer than 3 chars
                    if val and len(val) > 3 and any(c.isalpha() for c in val):
                        if 'nan' not in val.lower() and 'total' not in val.lower() and 'days' not in val.lower():
                            student_name = val
                            break
                
                # If still no name, skip row
                if not student_name or len(student_name) < 4:
                    continue
                
                print(f"DEBUG: reg_no={reg_no}, student_name='{student_name}'")
                
                print(f"DEBUG: Found name '{student_name}' for reg_no {reg_no}")
                
                # Get registration/admission number
                roll_col = col_map.get('roll_no', 2)
                reg_no = safe_str(row.iloc[roll_col]) if len(row) > roll_col else ''
                
                if reg_no == 'nan' or not reg_no:
                    reg_no = f"META{idx:04d}"
                
                admission_no = reg_no
                
                # Detect block from file name or from Excel column
                block_name = "Orange Hostel"
                if "META" in str(excel_file.name).upper():
                    block_name = "Meta H Hostel"
                elif "ORANGE" in str(excel_file.name).upper():
                    block_name = "Orange Hostel"
                elif "ALUMINI" in str(excel_file.name).upper():
                    block_name = "Alumini Hostel"
                
                # Override block from Excel if hostel column exists
                hostel_col = col_map.get('hostel')
                if hostel_col is not None and len(row) > hostel_col:
                    excel_hostel = safe_str(row.iloc[hostel_col])
                    if excel_hostel and excel_hostel != 'nan':
                        block_name = excel_hostel
                
                # Get other student details
                class_col = col_map.get('class', 3)
                class_yr = str(row.iloc[class_col]) if len(row) > class_col and pd.notna(row.iloc[class_col]) else '2nd Year'
                
                room_col = col_map.get('room_no', 4)
                room_no = safe_str(row.iloc[room_col])
                
                phone_col = col_map.get('phone', 5)
                phone = str(row.iloc[phone_col]) if len(row) > phone_col and pd.notna(row.iloc[phone_col]) else ''
                
                aadhar_col = col_map.get('aadhar', 7)
                aadhar = str(row.iloc[aadhar_col]) if len(row) > aadhar_col and pd.notna(row.iloc[aadhar_col]) else ''
                
                parent_name_col = col_map.get('parent_name', 10)
                parent_name = str(row.iloc[parent_name_col]) if len(row) > parent_name_col and pd.notna(row.iloc[parent_name_col]) else ''
                parent_phone = str(row.iloc[parent_phone_col]) if len(row) > parent_phone_col and pd.notna(row.iloc[parent_phone_col]) else ''
                address = str(row.iloc[address_col]) if len(row) > address_col and pd.notna(row.iloc[address_col]) else ''
                caste = str(row.iloc[caste_col]) if len(row) > caste_col and pd.notna(row.iloc[caste_col]) else ''
                
                print(f"Processing: {student_name} ({admission_no})")
                
                # Check if student exists
                student = Student.objects.filter(admission_no=admission_no).first()
                
                if student:
                    students_updated += 1
                    # Update student details
                    student.full_name = student_name
                    student.class_yr = class_yr
                    student.room_no = room_no
                    student.block = block_name
                    student.mobile = phone
                    student.aadhar = aadhar
                    student.father_name = parent_name
                    student.father_phone = parent_phone
                    student.address = address
                    student.caste = caste
                    student.reg_no = reg_no  # Ensure reg_no is always updated
                    student.save()
                    print(f"  Updated existing student: {student_name}")
                else:
                    # Create new student
                    student = Student.objects.create(
                        full_name=student_name,
                        admission_no=admission_no,
                        reg_no=reg_no or admission_no,  # Ensure reg_no is always set
                        class_yr=class_yr,
                        branch="CSE",
                        mobile=phone,
                        email=f"{reg_no}@student.au.edu.in" if reg_no else f"{admission_no}@student.au.edu.in",
                        aadhar=aadhar,
                        father_name=parent_name,
                        father_phone=parent_phone,
                        address=address,
                        caste=caste,
                        room_no=room_no,
                        block=block_name,
                        amount="13250"
                    )
                    students_created += 1
                    print(f"  Created new student: {student_name} ({admission_no})")
                
                # Process monthly payments for each month
                for month in month_headers:
                    try:
                        mess_col = month.get('mess')
                        if mess_col is None or len(row) <= mess_col:
                            continue
                            
                        mess_charge = row.iloc[mess_col]
                        
                        # Check if there's valid payment data
                        if pd.notna(mess_charge) and mess_charge != '':
                            try:
                                mess_charge = float(mess_charge)
                            except:
                                mess_charge = 0
                        else:
                            mess_charge = 0
                        
                        if mess_charge > 0:
                            days_col = month.get('days')
                            days = int(float(row.iloc[days_col]) if days_col and len(row) > days_col and pd.notna(row.iloc[days_col]) else 30)
                            
                            electric_col = month.get('electric')
                            electric = float(row.iloc[electric_col]) if electric_col and len(row) > electric_col and pd.notna(row.iloc[electric_col]) else 0
                            
                            service_col = month.get('service')
                            service = float(row.iloc[service_col]) if service_col and len(row) > service_col and pd.notna(row.iloc[service_col]) else 0
                            
                            net_col = month.get('net_demand')
                            net = float(row.iloc[net_col]) if net_col and len(row) > net_col and pd.notna(row.iloc[net_col]) else mess_charge
                            
                            collection_col = month.get('collection')
                            collection = float(row.iloc[collection_col]) if collection_col and len(row) > collection_col and pd.notna(row.iloc[collection_col]) else mess_charge
                            
                            date_col = month.get('date')
                            payment_date = None
                            if date_col and len(row) > date_col and pd.notna(row.iloc[date_col]):
                                try:
                                    if isinstance(row.iloc[date_col], str):
                                        payment_date = datetime.strptime(row.iloc[date_col].split()[0], '%Y-%m-%d').date()
                                    else:
                                        payment_date = row.iloc[date_col].date() if hasattr(row.iloc[date_col], 'date') else datetime.now().date()
                                except:
                                    payment_date = datetime.now().date()
                            else:
                                payment_date = datetime.now().date()
                            
                            # Check if payment already exists
                            existing = MessPayment.objects.filter(
                                roll_no=reg_no,
                                month=month['name'],
                                status='Success'
                            ).first()
                            
                            if not existing:
                                # Create billing rate
                                billing_rate, _ = BillingRate.objects.get_or_create(
                                    month=month['name'],
                                    defaults={
                                        'days': days,
                                        'electric_charge': electric,
                                        'mess_charge': mess_charge,
                                        'service_charge': service,
                                        'net_demand': net,
                                        'collection': collection,
                                        'date': payment_date
                                    }
                                )
                                
                                # Create mess payment
                                MessPayment.objects.create(
                                    student_name=student_name,
                                    roll_no=reg_no,
                                    room_no=room_no or "Not Allotted",
                                    class_yr=class_yr,
                                    date=payment_date,
                                    month=month['name'],
                                    amount=int(mess_charge),
                                    payment_mode="Excel Upload",
                                    purpose="Mess Fee",
                                    status="Success",
                                    student=student,
                                    billing_rate=billing_rate,
                                    days_count=days
                                )
                                payments_created += 1
                                print(f"    Created payment for {month['name']}: ₹{mess_charge}")
                            else:
                                print(f"    Payment for {month['name']} already exists")
                    
                    except Exception as e:
                        errors.append(f"{student_name} - {month.get('name', 'Unknown')}: {str(e)}")
                        print(f"Error processing month: {e}")
                
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
                print(f"Error processing row {idx}: {e}")
        
        # Save uploaded file
        file_path = default_storage.save(f'uploads/meta_hostel/{excel_file.name}', ContentFile(excel_file.read()))
        
        return JsonResponse({
            'success': True,
            'message': f'Upload completed! Students: {students_created} created, {students_updated} updated, Payments: {payments_created} created',
            'students_created': students_created,
            'students_updated': students_updated,
            'payments_created': payments_created,
            'errors': errors[:20] if errors else [],
            'file_path': file_path
        }, status=200)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_billing_rates(request):
    """Get all billing rates for dropdown in mess payment"""
    try:
        billing_rates = BillingRate.objects.all().order_by('-date')
        data = []
        for rate in billing_rates:
            data.append({
                'month': rate.month,
                'days': rate.days,
                'mess_charge': float(rate.mess_charge),
                'electric_charge': float(rate.electric_charge),
                'service_charge': float(rate.service_charge),
                'net_demand': float(rate.net_demand),
                'collection': float(rate.collection),
                'date': rate.date.strftime('%Y-%m-%d') if rate.date else None
            })
        return Response({
            'success': True,
            'data': data
        })
    except Exception as e:
        print(f"Error in get_all_billing_rates: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_students_billing_table(request):
    """
    Get all students with monthly billing details in table format
    Columns: Student details + monthly billing for Jul-24 to May-25
    """
    try:
        student_class_filter = request.GET.get('class_yr')
        
        students_query = Student.objects.all()
        if student_class_filter:
            students_query = students_query.filter(class_yr=student_class_filter)
        
        students = students_query.order_by('full_name')
        
        month_list = [
            'July 2024', 'August 2024', 'September 2024', 'October 2024', 
            'November 2024', 'December 2024', 'January 2025', 'February 2025', 
            'March 2025', 'April 2025', 'May 2025'
        ]
        
        results = []
        for student in students:
            student_payments = MessPayment.objects.filter(
                roll_no=student.reg_no
            ).order_by('month')
            
            payment_by_month = {}
            for payment in student_payments:
                payment_by_month[payment.month] = {
                    'days': payment.days_count,
                    'electric_charge': float(payment.billing_rate.electric_charge) if payment.billing_rate else 0,
                    'mess_charge': float(payment.amount),
                    'service_charge': float(payment.billing_rate.service_charge) if payment.billing_rate else 0,
                    'net_demand': float(payment.billing_rate.net_demand) if payment.billing_rate else payment.amount,
                    'collection': float(payment.billing_rate.collection) if payment.billing_rate else payment.amount,
                    'date': payment.date.strftime('%Y-%m-%d') if payment.date else None,
                    'status': payment.status
                }
            
            row = {
                'sno': len(results) + 1,
                'name': student.full_name,
                'roll_no': student.reg_no or student.admission_no,
                'class': student.class_yr or '',
                'room_no': student.room_no or '',
                'phone': student.mobile or '',
                'dob': student.dob.strftime('%Y-%m-%d') if student.dob else '',
                'aadhar': student.aadhar or '',
                'scholarship': '',
                'caste': student.caste or '',
                'parent_name': student.father_name or '',
                'parent_phone': student.father_phone or '',
                'address': student.address or '',
                'caution_fee': student.amount or '0',
            }
            
            for month in month_list:
                payment = payment_by_month.get(month, {})
                row[f'{month.lower().replace(" ", "_")}_days'] = payment.get('days', '')
                row[f'{month.lower().replace(" ", "_")}_electric'] = payment.get('electric_charge', '')
                row[f'{month.lower().replace(" ", "_")}_mess'] = payment.get('mess_charge', '')
                row[f'{month.lower().replace(" ", "_")}_service'] = payment.get('service_charge', '')
                row[f'{month.lower().replace(" ", "_")}_net'] = payment.get('net_demand', '')
                row[f'{month.lower().replace(" ", "_")}_collection'] = payment.get('collection', '')
                row[f'{month.lower().replace(" ", "_")}_date'] = payment.get('date', '')
            
            results.append(row)
        
        return Response({
            'success': True,
            'data': results,
            'total_students': len(results),
            'columns': list(row.keys()) if results else []
        })
        
    except Exception as e:
        print(f"Error in get_all_students_billing_table: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_dynamic_billing_by_regno(request):
    """
    Get billing details by registration number with dynamic year/month selection
    Query params: reg_no, year (e.g., 2024, 2025)
    Returns: Student details + all months billing for specified year
    """
    try:
        reg_no = request.GET.get('reg_no', '').strip()
        year = request.GET.get('year', '')
        
        if not reg_no:
            return Response({
                'success': False,
                'error': 'Registration number is required'
            }, status=400)
        
        if not year:
            year = str(datetime.now().year)
        
        student = Student.objects.filter(reg_no__iexact=reg_no).first()
        
        if not student:
            student = Student.objects.filter(admission_no__iexact=reg_no).first()
        
        if not student:
            return Response({
                'success': False,
                'error': 'Student not found'
            }, status=404)
        
        roll_no_to_search = student.reg_no if student.reg_no else student.admission_no
        
        print(f"Searching billing for roll_no: {roll_no_to_search}, year: {year}")
        
        payments = MessPayment.objects.filter(roll_no__iexact=roll_no_to_search).order_by('date')
        print(f"Found {payments.count()} payments for this student")
        
        all_months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        billing_data = []
        total_demand = 0
        total_collected = 0
        
        for month_name in all_months:
            month_full = f"{month_name} {year}"
            
            payment = payments.filter(month=month_full, status='Success').first()
            
            if payment:
                billing_data.append({
                    'month': month_full,
                    'days': payment.days_count,
                    'electric_charge': float(payment.billing_rate.electric_charge) if payment.billing_rate else 0,
                    'mess_charge': float(payment.amount),
                    'service_charge': float(payment.billing_rate.service_charge) if payment.billing_rate else 0,
                    'net_demand': float(payment.billing_rate.net_demand) if payment.billing_rate else payment.amount,
                    'collection': float(payment.billing_rate.collection) if payment.billing_rate else payment.amount,
                    'date': payment.date.strftime('%Y-%m-%d') if payment.date else None,
                    'payment_mode': payment.payment_mode,
                    'status': payment.status
                })
                total_demand += float(payment.billing_rate.net_demand) if payment.billing_rate else payment.amount
                total_collected += float(payment.billing_rate.collection) if payment.billing_rate else payment.amount
            else:
                billing_data.append({
                    'month': month_full,
                    'days': 0,
                    'electric_charge': 0,
                    'mess_charge': 0,
                    'service_charge': 0,
                    'net_demand': 0,
                    'collection': 0,
                    'date': None,
                    'payment_mode': '',
                    'status': 'Pending'
                })
        
        return Response({
            'success': True,
            'student': {
                'name': student.full_name,
                'reg_no': student.reg_no,
                'admission_no': student.admission_no,
                'class_yr': student.class_yr,
                'room_no': student.room_no,
                'phone': student.mobile,
                'dob': student.dob.strftime('%Y-%m-%d') if student.dob else None,
                'aadhar': student.aadhar,
                'caste': student.caste,
                'father_name': student.father_name,
                'father_phone': student.father_phone,
                'address': student.address
            },
            'year': year,
            'billing': billing_data,
            'summary': {
                'total_months_paid': len([b for b in billing_data if b['status'] == 'Success']),
                'total_net_demand': total_demand,
                'total_collected': total_collected,
                'pending': total_demand - total_collected
            }
        })
        
    except Exception as e:
        print(f"Error in get_dynamic_billing_by_regno: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def upload_excel_unified(request):
    """
    Excel format:
    Row 1: Header row with columns (S.no, Name, Roll no, Class, Room no, Phone, etc)
    Row 2+: Data with monthly columns (Jul-24 to May-25 for 12 months)
    
    Columns:
    0: S.no
    1: Name of the Student
    2: Roll no
    3: Class
    4: Room no
    5: stu. Phone
    6: DOB
    7: Stu Aadhar
    8: Nature of Scholarship
    9: Caste
    10: Parent Name
    11: Parent Phone
    12: Address
    13: Hostel
    14: Caution fee
    
    Then for each month: DAYS, ELECTRIC, MESS, SERVICE, NET, COLLECTION, DATE (7 cols per month)
    - 12 months = 84 columns
    Plus CREDIT columns at end
    """
    from datetime import datetime
    
    def safe_str(val):
        if pd.notna(val):
            return str(val).strip()
        return ''
    
    def safe_float(val):
        try:
            return float(safe_str(val).replace(',', ''))
        except:
            return 0.0
    
    def safe_int(val):
        try:
            return int(safe_float(val))
        except:
            return 0
    
    try:
        if request.method != 'POST':
            return JsonResponse({'error': 'Method not allowed'}, status=405)
        
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        excel_file = request.FILES['file']
        if not excel_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({'error': 'Invalid file format'}, status=400)
        
        df = pd.read_excel(excel_file, header=None)
        
        if df.empty:
            return JsonResponse({'error': 'Empty Excel file'}, status=400)
        
        print(f"Total rows: {len(df)}, Cols: {len(df.columns)}")
        
        # Find header row (contains "S.no", "Name", "Roll")
        header_row_idx = 0
        for idx in range(min(5, len(df))):
            row_str = ' '.join([str(v).lower() for v in df.iloc[idx].values if pd.notna(v)])
            if 's.no' in row_str and 'name' in row_str and 'roll' in row_str:
                header_row_idx = idx
                break
        
        headers = [safe_str(h) for h in df.iloc[header_row_idx].values]
        print(f"Header row {header_row_idx}: {headers[:15]}")
        
        # === Find months from rows ABOVE header (merged cells) ===
        # Row 1 has dates like 2024-07-01, 2024-08-01, etc.
        months_data = []
        
        print(f"\n=== Finding months in row 1 ===")
        for col_idx in range(15, min(105, len(df.columns)):
            val = df.iloc[1, col_idx]  # Row 1 has dates
            if pd.notna(val) and str(val) != 'nan':
                print(f"  Col {col_idx}: {val}")
                try:
                    dt = pd.to_datetime(val)
                    month_name = dt.strftime('%B %Y')  # "July 2024"
                    months_data.append({
                        'name': month_name,
                        'days': col_idx,
                        'electric': col_idx + 1,
                        'mess': col_idx + 2,
                        'service': col_idx + 3,
                        'net': col_idx + 4,
                        'collection': col_idx + 5,
                        'date': col_idx + 6,
                    })
                    print(f"  -> Month: {month_name} at cols {col_idx}-{col_idx+6}")
                except Exception as e:
                    pass
        
        if not months_data:
            return JsonResponse({'error': 'No month columns found in row 1'}, status=400)
        
        # Student columns mapping (fixed positions)
        student_cols = {
            'sno': 0,
            'name': 1,
            'roll': 2,
            'class': 3,
            'room': 4,
            'phone': 5,
            'dob': 6,
            'aadhar': 7,
            'scholarship': 8,
            'caste': 9,
            'parent_name': 10,
            'parent_phone': 11,
            'address': 12,
            'hostel': 13,
            'caution': 14
        }
        
        # Process data rows (row 3 onwards)
        print(f"\n=== Processing {len(months_data)} months: {[m['name'] for m in months_data]}")
        
        # Process data rows
        students_created = 0
        students_updated = 0
        payments_created = 0
        errors = []
        
        data_start = header_row_idx + 1
        
        for row_idx in range(data_start, len(df)):
            row = df.iloc[row_idx]
            
            # Get student info
            roll_no = safe_str(row.iloc[student_cols['roll']])
            name = safe_str(row.iloc[student_cols['name']])
            
            # Skip header/empty rows
            if not roll_no or roll_no == 'nan' or not name or name == 'nan':
                continue
            
            if 'total' in roll_no.lower() or 'total' in name.lower():
                continue
            
            # Clean roll number
            roll_no = roll_no.replace('.0', '')
            
            print(f"\nProcessing: {name} ({roll_no})")
            
            # Find or create student
            student = Student.objects.filter(
                models.Q(admission_no=roll_no) | models.Q(reg_no=roll_no)
            ).first()
            
            if not student:
                # Create new student
                student = Student(
                    admission_no=roll_no,
                    reg_no=roll_no,
                    full_name=name,
                    mobile=safe_str(row.iloc[student_cols['phone']]),
                    email=f"{roll_no}@hostel.ac.in",
                    class_yr=safe_str(row.iloc[student_cols['class']]),
                    room_no=safe_str(row.iloc[student_cols['room']]),
                    aadhar=safe_str(row.iloc[student_cols['aadhar']]),
                    caste=safe_str(row.iloc[student_cols['caste']]),
                    father_name=safe_str(row.iloc[student_cols['parent_name']]),
                    father_phone=safe_str(row.iloc[student_cols['parent_phone']]),
                    address=safe_str(row.iloc[student_cols['address']]),
                    block=safe_str(row.iloc[student_cols['hostel']]),
                    amount="13250"
                )
                student.save()
                students_created += 1
                print(f"  Created student: {roll_no}")
            else:
                # Update existing student
                student.full_name = name
                student.mobile = safe_str(row.iloc[student_cols['phone']])
                student.class_yr = safe_str(row.iloc[student_cols['class']])
                student.room_no = safe_str(row.iloc[student_cols['room']])
                student.block = safe_str(row.iloc[student_cols['hostel']])
                student.save()
                students_updated += 1
            
            # Process each month's billing
            for m in months_data:
                month_name = m['name']
                
                days = safe_int(row.iloc[m['days']])
                electric = safe_float(row.iloc[m['electric']])
                mess = safe_float(row.iloc[m['mess']])
                service = safe_float(row.iloc[m['service']])
                net = safe_float(row.iloc[m['net']])
                collection = safe_float(row.iloc[m['collection']])
                date_val = safe_str(row.iloc[m['date']])
                
                if days == 0 and electric == 0 and mess == 0:
                    continue
                
                # Convert date string to date object
                payment_date = None
                if date_val and date_val != 'nan':
                    try:
                        payment_date = datetime.strptime(date_val.split()[0], '%Y-%m-%d').date()
                    except:
                        try:
                            payment_date = datetime.strptime(date_val.split()[0], '%d-%m-%Y').date()
                        except:
                            pass
                
                # Create or update payment record
                status = 'paid' if collection >= net else 'pending'
                
                payment, created = MessPayment.objects.update_or_create(
                    student=student,
                    month=month_name,
                    defaults={
                        'student_name': name,
                        'roll_no': roll_no,
                        'room_no': safe_str(row.iloc[student_cols['room']]),
                        'class_yr': safe_str(row.iloc[student_cols['class']]),
                        'date': payment_date or datetime.now().date(),
                        'amount': int(net),
                        'days_count': days,
                        'status': status,
                    }
                )
                
                if created:
                    payments_created += 1
                
                print(f"  {month_name}: days={days}, net={net}, paid={collection}")
        
return JsonResponse({
            'success': True,
            'students_created': students_created,
            'students_updated': students_updated,
            'payments_created': payments_created,
            'months': [m['name'] for m in months_data]
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_available_billing_years(request):
    """
    Get available years and months from billing data for filter dropdowns
    """
    try:
        payments = MessPayment.objects.all().values_list('month', flat=True).distinct()
        
        years = set()
        months_data = {}
        
        for month_str in payments:
            if month_str:
                parts = month_str.split()
                if len(parts) == 2:
                    month_name, year = parts
                    years.add(year)
                    if year not in months_data:
                        months_data[year] = []
                    months_data[year].append(month_name)
        
        import datetime
        current_year = str(datetime.datetime.now().year)
        if current_year not in years:
            years.add(current_year)
            if current_year not in months_data:
                months_data[current_year] = []
        
        year_order = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
        
        sorted_years = sorted(list(years), reverse=True)
        for year in sorted_years:
            if year in months_data:
                months_data[year] = sorted(months_data[year], key=lambda m: year_order.index(m) if m in year_order else 12)
        
        return Response({
            'success': True,
            'years': sorted_years,
            'months_by_year': months_data,
            'current_year': current_year
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def debug_billing_list(request):
    """
    Debug endpoint to list all billing records - for troubleshooting
    """
    try:
        reg_no = request.GET.get('reg_no', '')
        
        if reg_no:
            payments = MessPayment.objects.filter(roll_no__iexact=reg_no).order_by('-date')
        else:
            payments = MessPayment.objects.order_by('-date')[:50]
        
        data = []
        for p in payments:
            data.append({
                'id': p.id,
                'roll_no': p.roll_no,
                'student_name': p.student_name,
                'month': p.month,
                'amount': p.amount,
                'status': p.status,
                'date': str(p.date) if p.date else None
            })
        
        total = MessPayment.objects.count()
        
        return Response({
            'success': True,
            'total_records': total,
            'records': data
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)