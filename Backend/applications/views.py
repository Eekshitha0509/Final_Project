# applications/views.py - COMPLETE FIXED VERSION

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import StudentProfile, Block, Floor, Room, Booking, HostelApplication, Payment
from .models import PasswordResetOTP, StudentRegistration, Certificate, Student, MessPayment
from .serializers import *
import traceback
import razorpay
import hmac
import hashlib
import json
from django.conf import settings
import random
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password
import io
from django.core.files.base import ContentFile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from rest_framework.decorators import parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from datetime import datetime
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
import uuid
from django.utils import timezone
from .pdf_generator import send_room_allotment_email
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from django.http import HttpResponse, Http404
import pandas as pd
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import BillingRate, StudentBilling
from django.db.models import Sum

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

User = get_user_model()

# ==================== JWT AUTHENTICATION VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new student"""
    try:
        print("Registration data received:", request.data)
        
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                
                # Create or update StudentProfile with admission number
                admission = request.data.get('admission_no') or request.data.get('admission_number') or request.data.get('admission', '')
                year = request.data.get('year', 1)
                branch = request.data.get('branch', '')
                phone_number = request.data.get('phone', '') or request.data.get('phone_number', '')
                
                # Create or get the profile and save the admission number
                profile, created = StudentProfile.objects.get_or_create(user=user)
                profile.admission = admission
                profile.year = year
                profile.branch = branch
                profile.phone_number = phone_number
                profile.save()
                
                print(f"Saved/Updated profile for {user.username}: Admission={profile.admission}, Created={created}")
                
                return Response({
                    'success': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'full_name': user.get_full_name(),
                        'admission': profile.admission,
                        'year': profile.year,
                        'branch': profile.branch,
                        'phone_number': profile.phone_number
                    },
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'message': 'Registration successful'
                }, status=status.HTTP_201_CREATED)
        else:
            print("Serializer errors:", serializer.errors)
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        print("Error in registration:", str(e))
        print(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login a student using admission number only"""
    try:
        admission_number = request.data.get('admission_number')
        password = request.data.get('password')
        
        print(f"Login attempt with admission number: {admission_number}")
        
        if not admission_number or not password:
            return Response({
                'success': False,
                'error': 'Please provide admission_number and password'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = None
        
        # Find user by admission number in StudentProfile
        try:
            student_profile = StudentProfile.objects.filter(admission=admission_number).first()
            if student_profile:
                user = authenticate(username=student_profile.user.username, password=password)
                print(f"Found user by admission number: {user}")
        except Exception as e:
            print(f"Error finding by admission: {e}")
        
        # If not found, check in StudentRegistration model
        if not user:
            try:
                student_reg = StudentRegistration.objects.filter(admission_no=admission_number).first()
                if student_reg:
                    # Create Django user if doesn't exist
                    user, created = User.objects.get_or_create(
                        username=student_reg.admission_no,
                        defaults={
                            'email': student_reg.email,
                            'first_name': student_reg.full_name.split()[0] if student_reg.full_name else '',
                            'last_name': ' '.join(student_reg.full_name.split()[1:]) if student_reg.full_name else ''
                        }
                    )
                    if created:
                        user.set_password(password)
                        user.save()
                    
                    # Create student profile
                    StudentProfile.objects.get_or_create(
                        user=user,
                        defaults={
                            'admission': student_reg.admission_no,
                            'phone_number': student_reg.phone,
                            'year': 1,
                            'branch': ''
                        }
                    )
                    
                    user = authenticate(username=user.username, password=password)
                    print(f"Found in StudentRegistration: {user}")
            except Exception as e:
                print(f"Error in StudentRegistration: {e}")
        
        # Login successful
        if user and user.is_active:
            refresh = RefreshToken.for_user(user)
            
            # Get profile details
            try:
                profile = StudentProfile.objects.get(user=user)
                year = profile.year
                branch = profile.branch
                phone_number = profile.phone_number
                address = profile.address
            except StudentProfile.DoesNotExist:
                year = 1
                branch = ""
                phone_number = ""
                address = ""
            
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.get_full_name(),
                    'admission_number': admission_number,
                    'year': year,
                    'branch': branch,
                    'phone_number': phone_number,
                    'address': address
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'message': 'Login successful'
            })
        
        # Login failed
        return Response({
            'success': False,
            'error': 'Invalid admission number or password'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh JWT token"""
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return Response({
            'error': 'Refresh token required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token)
        })
    except Exception as e:
        return Response({
            'error': 'Invalid refresh token'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get student profile"""
    try:
        user = request.user
        try:
            profile = StudentProfile.objects.get(user=user)
            admission = profile.admission
            year = profile.year
            branch = profile.branch
            phone_number = profile.phone_number
            address = profile.address
        except StudentProfile.DoesNotExist:
            admission = ""
            year = 1
            branch = ""
            phone_number = ""
            address = ""
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.get_full_name(),
                'admission': admission,
                'year': year,
                'branch': branch,
                'phone_number': phone_number,
                'address': address
            }
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except:
                pass
        return Response({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== PROFILE UPDATE VIEW ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_profile(request):
    """Submit or update student profile and hostel application"""
    try:
        user = request.user
        data = request.data
        
        print("Received profile submission data:", data)
        
        # Get or create student profile
        profile, created = StudentProfile.objects.get_or_create(user=user)
        
        # Update user's name if provided
        if 'full_name' in data and data['full_name']:
            name_parts = data['full_name'].split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
            user.save()
        
        # Update profile fields
        if 'mobile' in data:
            profile.phone_number = data['mobile']
        if 'address' in data:
            profile.address = data['address']
        if 'email' in data:
            user.email = data['email']
            user.save()
        
        profile.save()
        
        # Create hostel application
        application = HostelApplication.objects.create(
            full_name=data.get('full_name', user.get_full_name()),
            aadhar=data.get('aadhar', ''),
            class_yr=data.get('class_yr', ''),
            branch=data.get('branch', profile.branch),
            roll_no=data.get('roll_no', ''),
            dob=data.get('dob', None),
            mobile=data.get('mobile', profile.phone_number),
            email=data.get('email', user.email),
            address=data.get('address', profile.address),
            caste=data.get('caste', ''),
            catering=data.get('catering', ''),
            amount=data.get('amount', '')
        )
        
        return Response({
            'success': True,
            'message': 'Application submitted successfully',
            'application_id': application.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print("Error submitting application:", str(e))
        print(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== BLOCK VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_blocks(request):
    """Get all blocks"""
    try:
        blocks = Block.objects.all()
        serializer = BlockSerializer(blocks, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_block_for_year(request):
    """Get the appropriate block based on student's year"""
    try:
        user = request.user
        profile = StudentProfile.objects.get(user=user)
        year = profile.year
        
        block_mapping = {
            1: 'orange',
            2: 'meta',
            3: 'alumini',
            4: 'orange',
        }
        
        block_name = block_mapping.get(year, 'orange')
        block = Block.objects.get(name=block_name)
        serializer = BlockSerializer(block)
        
        return Response({
            'block': serializer.data,
            'message': f'Showing {block.display_name} for Year {year} students'
        })
    except Block.DoesNotExist:
        return Response({'error': 'Block not found'}, status=404)
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
            profile = StudentProfile.objects.get(user=user)
            student_year = profile.year
        except StudentProfile.DoesNotExist:
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
            
            # Check year restriction
            block_name = room.floor.block.name
            
            if student_year == 1 and block_name != 'orange':
                return Response({'error': '1st year students can only book Orange Hostel'}, status=status.HTTP_400_BAD_REQUEST)
            if student_year == 2 and block_name != 'meta':
                return Response({'error': '2nd year students can only book Meta H Hostel'}, status=status.HTTP_400_BAD_REQUEST)
            if student_year == 3 and block_name != 'alumini':
                return Response({'error': '3rd year students can only book Alumini Hostel'}, status=status.HTTP_400_BAD_REQUEST)
            if student_year == 4 and block_name != 'orange':
                return Response({'error': '4th year students can only book Orange Hostel'}, status=status.HTTP_400_BAD_REQUEST)
            
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
        try:
            student_profile = StudentProfile.objects.get(user=request.user)
            student_phone = student_profile.phone_number or ''
        except StudentProfile.DoesNotExist:
            student_phone = ''
        
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


# ==================== STUDENT REGISTRATION VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    """Register a new student in StudentRegistration model"""
    try:
        admission_no = request.data.get("admission_no", "").strip()
        reg_no = request.data.get("reg_no", "").strip()
        full_name = request.data.get("full_name", "").strip()
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")

        # Validate required fields
        validation_errors = []
        
        if not admission_no:
            validation_errors.append("Admission number is required")
        if not full_name:
            validation_errors.append("Full name is required")
        if not phone:
            validation_errors.append("Phone number is required")
        if not email:
            validation_errors.append("Email is required")
        if not password:
            validation_errors.append("Password is required")
        
        if validation_errors:
            return Response({
                "status": "error",
                "message": " | ".join(validation_errors)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if exists
        if StudentRegistration.objects.filter(admission_no=admission_no).exists():
            return Response({
                "status": "error",
                "message": "Admission number already registered"
            }, status=status.HTTP_400_BAD_REQUEST)

        if phone and StudentRegistration.objects.filter(phone=phone).exists():
            return Response({
                "status": "error",
                "message": "Phone number already registered"
            }, status=status.HTTP_400_BAD_REQUEST)

        if StudentRegistration.objects.filter(email=email).exists():
            return Response({
                "status": "error",
                "message": "Email already registered"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create the student
        student = StudentRegistration.objects.create(
            admission_no=admission_no,
            reg_no=reg_no if reg_no else admission_no,
            full_name=full_name,
            phone=phone,
            email=email,
            password=make_password(password)
        )
        
        # Also create Django user for JWT
        user, created = User.objects.get_or_create(
            username=admission_no,
            defaults={
                'email': email,
                'first_name': full_name.split()[0] if full_name else '',
                'last_name': ' '.join(full_name.split()[1:]) if full_name else ''
            }
        )
        if created:
            user.set_password(password)
            user.save()
        
        # Create student profile
        StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                'admission': admission_no,
                'phone_number': phone,
                'year': 1,
                'branch': ''
            }
        )

        return Response({
            "status": "success",
            "message": "Registration successful",
            "student": student.full_name,
            "admission_no": student.admission_no,
            "reg_no": student.reg_no
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(traceback.format_exc())
        return Response({
            "status": "error",
            "message": f"Registration failed: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def student_login(request):
    """Student login using StudentRegistration model with JWT"""
    print("=" * 50)
    print("Student login request received")
    
    try:
        login_id = request.data.get("login_id", "").strip()
        password = request.data.get("password", "").strip()

        print(f"Login ID: {login_id}")

        if not login_id or not password:
            return Response({
                "error": "Both login ID and password are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Find student
        student = StudentRegistration.objects.filter(admission_no=login_id).first()
        if not student:
            student = StudentRegistration.objects.filter(reg_no=login_id).first()
        if not student:
            student = StudentRegistration.objects.filter(email=login_id).first()

        if student and check_password(password, student.password):
            # Get or create Django user
            user, created = User.objects.get_or_create(
                username=student.admission_no,
                defaults={
                    'email': student.email,
                    'first_name': student.full_name.split()[0] if student.full_name else '',
                    'last_name': ' '.join(student.full_name.split()[1:]) if student.full_name else ''
                }
            )
            
            if created:
                user.set_password(password)
                user.save()
            
            # Create student profile
            StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'admission': student.admission_no,
                    'phone_number': student.phone,
                    'year': 1,
                    'branch': ''
                }
            )
            
            # Generate JWT
            refresh = RefreshToken.for_user(user)
            
            return Response({
                "status": "success",
                "message": "Login successful",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": student.full_name,
                    "admission_no": student.admission_no,
                    "reg_no": student.reg_no,
                    "phone": student.phone
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Invalid credentials"
            }, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())
        return Response({
            "error": f"Login failed: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== ADMIN LOGIN ====================

from django.contrib.auth.hashers import check_password
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from applications.models import AdminWardenUser
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(['POST'])
def admin_login(request):
    print("=" * 50)
    print("Admin login request received")

    admin_id = request.data.get("admin_id")
    password = request.data.get("password")

    print("Admin ID:", admin_id)

    if not admin_id or not password:
        return Response({
            "error": "Both admin ID and password are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = AdminWardenUser.objects.get(username=admin_id)

        # 🔥 IMPORTANT FIX
        if check_password(password, user.password):

            # ⚠️ Since this is NOT Django User, we fake token payload
            refresh = RefreshToken()
            refresh['username'] = user.username
            refresh['role'] = user.role

            return Response({
                "status": "success",
                "message": "Login successful",
                "username": user.username,
                "role": user.role,
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            }, status=status.HTTP_200_OK)

        else:
            return Response({
                "error": "Invalid password"
            }, status=status.HTTP_401_UNAUTHORIZED)

    except AdminWardenUser.DoesNotExist:
        return Response({
            "error": "User not found"
        }, status=status.HTTP_401_UNAUTHORIZED)

# ==================== PROFILE SUBMISSION ====================

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def submit_profile_second(request):
    """Submit or UPDATE student profile with all details"""
    try:
        data = request.data
        admission_no = data.get("admission_no")
        
        print(f"📝 Profile submission/update for admission: {admission_no}")
        print(f"Data keys: {list(data.keys())}")
        print(f"Files: {list(request.FILES.keys())}")

        if not admission_no:
            return Response({
                "status": "error",
                "message": "Admission number is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Parse date of birth
        dob_value = data.get("dob")
        if dob_value:
            try:
                dob_value = datetime.strptime(dob_value, "%Y-%m-%d").date()
            except:
                dob_value = None
        else:
            dob_value = None

        # Clean aadhar number
        aadhar = data.get("aadhar", "").replace(" ", "")

        # Check if profile already exists
        existing_student = Student.objects.filter(admission_no=admission_no).first()
        
        if existing_student:
            # UPDATE existing profile
            print(f"🔄 Updating existing profile for {admission_no}")
            
            existing_student.full_name = data.get("full_name", existing_student.full_name)
            existing_student.aadhar = aadhar or existing_student.aadhar
            existing_student.reg_no = data.get("reg_no", existing_student.reg_no)
            existing_student.class_yr = data.get("class_yr", existing_student.class_yr)
            existing_student.branch = data.get("branch", existing_student.branch)
            existing_student.roll_no = data.get("roll_no", existing_student.roll_no)
            existing_student.dob = dob_value or existing_student.dob
            existing_student.mobile = data.get("mobile", existing_student.mobile)
            existing_student.email = data.get("email", existing_student.email)
            existing_student.address = data.get("address", existing_student.address)
            existing_student.caste = data.get("caste", existing_student.caste)
            existing_student.catering = data.get("catering", existing_student.catering)
            existing_student.amount = data.get("amount", existing_student.amount)
            existing_student.father_name = data.get("father_name", existing_student.father_name)
            existing_student.father_phone = data.get("father_phone", existing_student.father_phone)
            existing_student.mother_name = data.get("mother_name", existing_student.mother_name)
            existing_student.mother_phone = data.get("mother_phone", existing_student.mother_phone)
            existing_student.guardian_name = data.get("guardian_name", existing_student.guardian_name)
            existing_student.guardian_phone = data.get("guardian_phone", existing_student.guardian_phone)
            
            # Update files if new ones are provided
            if request.FILES.get("student_photo"):
                existing_student.student_photo = request.FILES.get("student_photo")
            if request.FILES.get("father_aadhar"):
                existing_student.father_aadhar = request.FILES.get("father_aadhar")
            if request.FILES.get("father_photo"):
                existing_student.father_photo = request.FILES.get("father_photo")
            if request.FILES.get("mother_aadhar"):
                existing_student.mother_aadhar = request.FILES.get("mother_aadhar")
            if request.FILES.get("mother_photo"):
                existing_student.mother_photo = request.FILES.get("mother_photo")
            if request.FILES.get("guardian_aadhar"):
                existing_student.guardian_aadhar = request.FILES.get("guardian_aadhar")
            
            existing_student.save()
            
            return Response({
                "status": "success",
                "message": "Profile updated successfully",
                "student": existing_student.full_name,
                "admission_no": existing_student.admission_no
            }, status=status.HTTP_200_OK)
            
        else:
            # CREATE new profile
            print(f"✨ Creating new profile for {admission_no}")
            
            student = Student.objects.create(
                full_name=data.get("full_name", ""),
                aadhar=aadhar,
                admission_no=admission_no,
                reg_no=data.get("reg_no", ""),
                class_yr=data.get("class_yr", ""),
                branch=data.get("branch", ""),
                roll_no=data.get("roll_no", ""),
                dob=dob_value,
                mobile=data.get("mobile", ""),
                email=data.get("email", ""),
                address=data.get("address", ""),
                caste=data.get("caste", ""),
                catering=data.get("catering", ""),
                amount=data.get("amount", "13000"),
                student_photo=request.FILES.get("student_photo"),
                father_name=data.get("father_name", ""),
                father_phone=data.get("father_phone", ""),
                father_aadhar=request.FILES.get("father_aadhar"),
                father_photo=request.FILES.get("father_photo"),
                mother_name=data.get("mother_name", ""),
                mother_phone=data.get("mother_phone", ""),
                mother_aadhar=request.FILES.get("mother_aadhar"),
                mother_photo=request.FILES.get("mother_photo"),
                guardian_name=data.get("guardian_name", ""),
                guardian_phone=data.get("guardian_phone", ""),
                guardian_aadhar=request.FILES.get("guardian_aadhar"),
            )

            return Response({
                "status": "success",
                "message": "Profile submitted successfully",
                "student": student.full_name,
                "admission_no": student.admission_no
            }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Profile submission error: {str(e)}")
        print(traceback.format_exc())
        return Response({
            "status": "error",
            "message": f"Profile submission failed: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== STUDENT PROFILE WITH HOSTEL DETAILS (FIXED) ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_profile(request):
    """Get complete student profile by admission number with hostel details"""
    try:
        admission_no = request.GET.get('admission_no')
        reg_no = request.GET.get('reg_no')
        
        print(f"🔍 Fetching profile - Admission: {admission_no}, Reg: {reg_no}")

        # Find the student
        student_data = None
        if admission_no:
            student_data = Student.objects.filter(admission_no=admission_no).first()
        elif reg_no:
            student_data = Student.objects.filter(reg_no=reg_no).first()

        if student_data:
            # Get room details from booking
            block_name = "Not Allotted"
            room_number = "Not Allotted"
            floor_number = None
            bed_number = None
            room_type = None
            sharing_type = None
            allotted_date = None
            booking_found = False
            
            try:
                # Find user by admission number in StudentProfile
                user_profile = StudentProfile.objects.filter(admission=student_data.admission_no).first()
                print(f"User profile found: {user_profile}")
                
                if user_profile and user_profile.user:
                    # Get active booking
                    booking = Booking.objects.filter(
                        student=user_profile.user, 
                        status='confirmed'
                    ).first()
                    
                    if booking:
                        booking_found = True
                        # Get room details
                        room = booking.room
                        block_name = room.floor.block.display_name
                        room_number = room.room_number
                        floor_number = room.floor.floor_number
                        room_type = room.get_room_type_display()
                        sharing_type = f"{room.capacity} Sharing" if room.capacity else "N/A"
                        allotted_date = booking.booking_date.strftime('%Y-%m-%d') if booking.booking_date else None
                        
                        print(f"✅ Found booking - Block: {block_name}, Room: {room_number}")
                    else:
                        print("No active booking found")
                else:
                    print("No user profile found")
                    
            except Exception as e:
                print(f"Error getting booking: {e}")
                import traceback
                traceback.print_exc()
            
            # Create room_details object
            room_details = {
                'room_number': room_number,
                'block_name': block_name,
                'floor': floor_number,
                'bed_number': bed_number,
                'room_type': room_type,
                'sharing_type': sharing_type,
                'allotted_date': allotted_date
            } if booking_found else None
            
            # Prepare response
            response_data = {
                'full_name': student_data.full_name,
                'aadhar_no': student_data.aadhar,
                'admission_no': student_data.admission_no,
                'reg_no': student_data.reg_no,
                'class_yr': student_data.class_yr,
                'branch': student_data.branch,
                'roll_no': student_data.roll_no,
                'dob': student_data.dob.strftime('%Y-%m-%d') if student_data.dob else '',
                'mobile': student_data.mobile,
                'email': student_data.email,
                'address': student_data.address,
                'caste': student_data.caste,
                'catering': student_data.catering,
                'amount': student_data.amount,
                'father_name': student_data.father_name,
                'father_phone': student_data.father_phone,
                'mother_name': student_data.mother_name,
                'mother_phone': student_data.mother_phone,
                'guardian_name': student_data.guardian_name,
                'guardian_phone': student_data.guardian_phone,
                'student_photo': student_data.student_photo.url if student_data.student_photo else None,
                'room_details': room_details,  # ✅ Added room_details object
                'block': block_name,  # Keep for backward compatibility
                'room_no': room_number,  # Keep for backward compatibility
                'has_booking': booking_found
            }
            
            print(f"Returning response with room_details: {room_details}")
            return Response(response_data)
        
        # Try StudentProfile as fallback
        profile = None
        if admission_no:
            profile = StudentProfile.objects.filter(admission=admission_no).first()
        elif reg_no:
            student_by_reg = Student.objects.filter(reg_no=reg_no).first()
            if student_by_reg:
                profile = StudentProfile.objects.filter(admission=student_by_reg.admission_no).first()

        if profile:
            user = profile.user
            
            # Get booking info
            booking = Booking.objects.filter(student=user, status='confirmed').first()
            block_name = "Not Allotted"
            room_number = "Not Allotted"
            floor_number = None
            room_type = None
            sharing_type = None
            allotted_date = None
            booking_found = False
            
            if booking:
                booking_found = True
                room = booking.room
                block_name = room.floor.block.display_name
                room_number = room.room_number
                floor_number = room.floor.floor_number
                room_type = room.get_room_type_display()
                sharing_type = f"{room.capacity} Sharing" if room.capacity else "N/A"
                allotted_date = booking.booking_date.strftime('%Y-%m-%d') if booking.booking_date else None
                print(f"✅ Found booking via profile - Block: {block_name}, Room: {room_number}")
            
            room_details = {
                'room_number': room_number,
                'block_name': block_name,
                'floor': floor_number,
                'bed_number': None,
                'room_type': room_type,
                'sharing_type': sharing_type,
                'allotted_date': allotted_date
            } if booking_found else None

            return Response({
                'full_name': user.get_full_name(),
                'aadhar': '',
                'admission_no': profile.admission,
                'reg_no': profile.admission,
                'class_yr': f"{profile.year} Year" if profile.year else "",
                'branch': profile.branch,
                'roll_no': '',
                'dob': '',
                'mobile': profile.phone_number,
                'email': user.email,
                'address': profile.address,
                'caste': '',
                'catering': '',
                'amount': '13000',
                'father_name': '',
                'father_phone': '',
                'mother_name': '',
                'mother_phone': '',
                'guardian_name': '',
                'guardian_phone': '',
                'student_photo': None,
                'room_details': room_details,  # ✅ Added room_details object
                'block': block_name,
                'room_no': room_number,
                'has_booking': booking_found
            })

        return Response({"error": "Student not found"}, status=404)

    except Exception as e:
        print(f"Error in get_student_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

# ==================== DEDICATED HOSTEL INFO ENDPOINT (NEW) ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_hostel(request):
    """Get hostel allocation for a student"""
    reg_no = request.GET.get('reg_no')
    admission_no = request.GET.get('admission_no')
    
    print(f"🔍 get_student_hostel called - Reg: {reg_no}, Admission: {admission_no}")
    
    if not reg_no and not admission_no:
        return JsonResponse({'error': 'Registration number or admission number required'}, status=400)
    
    try:
        # Find student by reg_no or admission_no
        student = None
        if reg_no:
            student = Student.objects.filter(reg_no=reg_no).first()
        if not student and admission_no:
            student = Student.objects.filter(admission_no=admission_no).first()
        
        if not student:
            return JsonResponse({
                'success': False,
                'block_name': None,
                'block': None,
                'room_number': None,
                'room_no': None,
                'message': 'Student not found'
            }, status=404)
        
        # Find user profile
        user_profile = StudentProfile.objects.filter(admission=student.admission_no).first()
        
        if not user_profile or not user_profile.user:
            return JsonResponse({
                'success': False,
                'block_name': None,
                'block': None,
                'room_number': None,
                'room_no': None,
                'message': 'User profile not found'
            }, status=404)
        
        # Get active booking
        booking = Booking.objects.filter(
            student=user_profile.user,
            status='confirmed'
        ).first()
        
        if booking and booking.room:
            return JsonResponse({
                'success': True,
                'block_name': booking.room.floor.block.display_name,
                'block': booking.room.floor.block.name,
                'room_number': booking.room.room_number,
                'room_no': booking.room.room_number,
                'booking_id': booking.id,
                'room_id': booking.room.id
            })
        else:
            return JsonResponse({
                'success': False,
                'block_name': None,
                'block': None,
                'room_number': None,
                'room_no': None,
                'message': 'No active hostel allocation'
            }, status=404)
            
    except Exception as e:
        print(f"Error in get_student_hostel: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


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

    params_dict = {
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    }

    try:
        client.utility.verify_payment_signature(params_dict)
        
        # Find the payment record by roll_no
        payment_record = MessPayment.objects.filter(roll_no=roll_no).last()
        
        if payment_record:
            payment_record.payment_mode = "Online"
            payment_record.razorpay_order_id = order_id
            payment_record.razorpay_payment_id = payment_id
            payment_record.status = "Success"
            payment_record.save()
            
            # IMPORTANT: Return the receipt_no (database ID), not the payment_id
            return Response({
                "status": "success",
                "message": "Payment verified",
                "receipt_id": str(payment_record.receipt_no)  # Fix: Return receipt_no
            })
        else:
            # If no payment record found, create one
            payment_record = MessPayment.objects.create(
                student_name=data.get('student_name', 'Unknown'),
                roll_no=roll_no,
                room_no=data.get('room_no', ''),
                class_yr=data.get('class_yr', ''),
                date=datetime.now().date(),
                month=datetime.now().strftime("%B %Y"),
                amount=3000,
                payment_mode="Online",
                purpose="Mess Fee",
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
                status="Success"
            )
            
            return Response({
                "status": "success",
                "message": "Payment verified and recorded",
                "receipt_id": str(payment_record.receipt_no)  # Fix: Return receipt_no
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
        
        payment = MessPayment.objects.create(
            student_name=data.get("student_name"),
            roll_no=data.get("roll_no"),
            room_no=data.get("room_no"),
            class_yr=data.get("class_yr"),
            date=data.get("date"),
            month=data.get("month"),
            amount=amount_value,
            payment_mode=data.get("payment_mode"),
            purpose=data.get("purpose")
        )
        # Return receipt_no (database ID) for later reference
        return Response({
            "message": "Payment data stored", 
            "receipt_id": payment.receipt_no,  # Fix: Return receipt_no
            "id": payment.receipt_no
        })
    except ValueError:
        return Response({"error": "Invalid amount format"}, status=400)
    except Exception as e:
        print(f"Database Error: {e}")
        return Response({"error": "Internal Server Error"}, status=500)

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
        
        # Get student profile
        try:
            student_profile = StudentProfile.objects.get(user=request.user)
        except StudentProfile.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Student profile not found'
            }, status=404)
        
        # Store months in session
        request.session['no_dues_months'] = months
        
        return Response({
            'success': True,
            'message': f'Successfully updated to {months} months',
            'data': {
                'months': months,
                'student': student_profile.admission,
                'student_name': request.user.get_full_name()
            }
        }, status=200)
        
    except Exception as e:
        print(f"Error in update_months: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)
    

# Add this near your other certificate endpoints (around line 900)

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
        
        # Calculate dues (example logic - adjust based on your models)
        # You need to implement based on your actual payment models
        
        # Example: Check mess payments
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
            user_profile = StudentProfile.objects.filter(admission=student.admission_no).first()
            if user_profile and user_profile.user:
                booking = Booking.objects.filter(
                    student=user_profile.user,
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

class RequestOTP(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            print(f"RequestOTP called with email: {email}")
            
            if not email:
                return Response(
                    {"error": "Email is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = StudentRegistration.objects.filter(email=email).first()
            
            if not user:
                return Response(
                    {"error": "User not found with this email"},
                    status=status.HTTP_404_NOT_FOUND
                )

            PasswordResetOTP.objects.filter(user=user).delete()

            otp = str(random.randint(100000, 999999))
            print(f"Generated OTP for {email}: {otp}")

            PasswordResetOTP.objects.create(user=user, otp=otp)

            try:
                subject = 'Password Reset OTP - Andhra University Hostel'
                message = f"""
Dear {user.full_name},

Your OTP for password reset is: {otp}

This OTP is valid for 10 minutes.

If you did not request this password reset, please ignore this email.

Best regards,
Andhra University Hostel Management
                """
                
                send_mail(
                    subject,
                    message,
                    'andhrahostels@gmail.com',
                    [email],
                    fail_silently=False,
                    auth_user='andhrahostels@gmail.com',
                    auth_password='hqpbspdfmyatjjlz',
                    connection=None,
                )
                print(f"OTP email sent successfully to {email}")
            except Exception as email_error:
                print(f"Email sending failed: {email_error}")

            return Response(
                {
                    "status": "success",
                    "message": "OTP sent successfully to your email",
                    "email": email
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            print(f"Error in RequestOTP: {str(e)}")
            return Response(
                {"error": f"Failed to send OTP: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyOTP(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            otp = request.data.get('otp')
            
            if not email or not otp:
                return Response(
                    {"error": "Email and OTP are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record = PasswordResetOTP.objects.filter(
                user__email=email,
                otp=otp
            ).last()

            if record and record.is_valid():
                return Response({
                    "status": "success",
                    "reset_token": str(record.reset_token)
                }, status=status.HTTP_200_OK)

            return Response(
                {"error": "Invalid or expired OTP"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            print(f"Error in VerifyOTP: {str(e)}")
            return Response(
                {"error": f"Verification failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResetPassword(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            token = request.data.get('reset_token')
            new_password = request.data.get('new_password')
            
            if not token or not new_password:
                return Response(
                    {"error": "Reset token and new password are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record = PasswordResetOTP.objects.filter(reset_token=token).last()

            if record and record.is_valid():
                user = record.user
                user.password = make_password(new_password)
                user.save()
                record.delete()

                return Response({
                    "status": "success",
                    "message": "Password updated successfully"
                }, status=status.HTTP_200_OK)

            return Response(
                {"error": "Invalid or expired reset token"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            print(f"Error in ResetPassword: {str(e)}")
            return Response(
                {"error": f"Password reset failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Legacy forgot password - use RequestOTP instead"""
    try:
        email = request.data.get("email")
        
        if not email:
            return Response({
                "status": "error",
                "message": "Email is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to find in StudentRegistration
        try:
            student = StudentRegistration.objects.get(email=email)
            user_type = "student"
        except StudentRegistration.DoesNotExist:
            # Try to find in Django User
            try:
                user = User.objects.get(email=email)
                student = None
                user_type = "user"
            except User.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Email not registered"
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate OTP
        otp = random.randint(100000, 999999)
        
        # Store in session
        request.session["reset_email"] = email
        request.session["otp"] = str(otp)
        
        # Send email
        send_mail(
            "Password Reset OTP - Andhra University Hostel",
            f"Your OTP for password reset is: {otp}\n\nThis OTP is valid for 10 minutes.",
            settings.EMAIL_HOST_USER,
            [email],
            fail_silently=False,
        )
        
        return Response({
            "status": "success",
            "message": "OTP sent to email"
        })
        
    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return Response({
            "status": "error",
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

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
        from reportlab.lib.utils import simpleSplit
        
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
        admission_no = request.GET.get('admission_no')
        reg_no = request.GET.get('reg_no')
        
        # Find student
        student = None
        if admission_no:
            student = Student.objects.filter(admission_no=admission_no).first()
        elif reg_no:
            student = Student.objects.filter(reg_no=reg_no).first()
        
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
    Upload META Hostel Excel file with student data and monthly payments
    Handles the exact format of your Excel file
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
        
        # Find the header row (row 3 in your Excel - index 2)
        header_row = None
        for idx in range(10):
            row = df.iloc[idx]
            if row.astype(str).str.contains('S.no').any() and row.astype(str).str.contains('Name of the Student').any():
                header_row = idx
                break
        
        if header_row is None:
            return JsonResponse({'error': 'Could not find header row in Excel'}, status=400)
        
        print(f"Found header at row: {header_row}")
        
        # Get data rows
        data_df = df.iloc[header_row + 1:].reset_index(drop=True)
        
        # Define month columns based on your Excel structure
        month_columns = [
            {'name': 'July 2024', 'days_col': 4, 'mess_col': 6, 'date_col': 10},
            {'name': 'August 2024', 'days_col': 12, 'mess_col': 14, 'date_col': 18},
            {'name': 'September 2024', 'days_col': 21, 'mess_col': 23, 'date_col': 27},
            {'name': 'October 2024', 'days_col': 30, 'mess_col': 32, 'date_col': 36},
            {'name': 'November 2024', 'days_col': 39, 'mess_col': 41, 'date_col': 45},
            {'name': 'December 2024', 'days_col': 48, 'mess_col': 50, 'date_col': 54},
            {'name': 'January 2025', 'days_col': 57, 'mess_col': 59, 'date_col': 63},
            {'name': 'February 2025', 'days_col': 66, 'mess_col': 68, 'date_col': 72},
            {'name': 'March 2025', 'days_col': 75, 'mess_col': 77, 'date_col': 81},
            {'name': 'April 2025', 'days_col': 84, 'mess_col': 86, 'date_col': 90},
            {'name': 'May 2025', 'days_col': 93, 'mess_col': 95, 'date_col': 99},
        ]
        
        students_created = 0
        students_updated = 0
        payments_created = 0
        errors = []
        
        for idx, row in data_df.iterrows():
            try:
                # Extract basic student info
                s_no = row.iloc[0] if len(row) > 0 and pd.notna(row.iloc[0]) else None
                student_name = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
                registration_no = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else ''
                
                # Skip empty rows or total rows
                if not student_name or student_name == 'nan' or 'Total' in student_name:
                    continue
                
                # Generate admission number
                admission_no = registration_no if registration_no and registration_no != 'nan' else f"META{int(s_no) if s_no else idx:04d}"
                reg_no = registration_no if registration_no and registration_no != 'nan' else admission_no
                
                # Check if student exists
                student = Student.objects.filter(admission_no=admission_no).first()
                
                if student:
                    students_updated += 1
                    print(f"Updating existing student: {student_name}")
                else:
                    # Determine class year
                    class_yr = "2nd Year"
                    if registration_no and registration_no != 'nan':
                        if registration_no.startswith('323'):
                            class_yr = "2nd Year"
                        elif registration_no.startswith('322'):
                            class_yr = "3rd Year"
                    
                    # Create new student
                    student = Student.objects.create(
                        full_name=student_name,
                        admission_no=admission_no,
                        reg_no=reg_no,
                        class_yr=class_yr,
                        branch="CSE",
                        mobile="",
                        email=f"{reg_no}@au.edu.in" if reg_no != 'nan' else f"{admission_no}@au.edu.in",
                        password=make_password(reg_no if reg_no != 'nan' else admission_no),
                        amount="13250"
                    )
                    students_created += 1
                    print(f"Created new student: {student_name} ({admission_no})")
                
                # Process monthly payments
                for month_info in month_columns:
                    try:
                        mess_charge = row.iloc[month_info['mess_col']] if len(row) > month_info['mess_col'] else None
                        days = row.iloc[month_info['days_col']] if len(row) > month_info['days_col'] else None
                        payment_date = row.iloc[month_info['date_col']] if len(row) > month_info['date_col'] else None
                        
                        if mess_charge and pd.notna(mess_charge) and isinstance(mess_charge, (int, float)) and mess_charge > 0:
                            
                            existing_payment = MessPayment.objects.filter(
                                roll_no=reg_no,
                                month=month_info['name'],
                                status='Success'
                            ).first()
                            
                            if not existing_payment:
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
                                
                                billing_rate, _ = BillingRate.objects.get_or_create(
                                    month=month_info['name'],
                                    defaults={
                                        'days': int(days) if days and pd.notna(days) else 30,
                                        'electric_charge': 0,
                                        'mess_charge': float(mess_charge),
                                        'service_charge': 0,
                                        'net_demand': float(mess_charge),
                                        'collection': float(mess_charge),
                                        'date': payment_date_obj
                                    }
                                )
                                
                                MessPayment.objects.create(
                                    student_name=student_name,
                                    roll_no=reg_no,
                                    room_no=student.room_no or "Not Allotted",
                                    class_yr=student.class_yr or "2nd Year",
                                    date=payment_date_obj,
                                    month=month_info['name'],
                                    amount=int(float(mess_charge)),
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
                        errors.append(f"Student {student_name}, Month {month_info['name']}: {str(e)}")
                        print(f"Error processing month {month_info['name']}: {e}")
                
            except Exception as e:
                errors.append(f"Row {idx + header_row + 2}: {str(e)}")
                print(f"Error processing row {idx}: {e}")
        
        # Save uploaded file
        file_path = default_storage.save(f'uploads/meta_hostel/{excel_file.name}', ContentFile(excel_file.read()))
        
        return JsonResponse({
            'success': True,
            'message': f'Upload completed! Students: {students_created} created, {students_updated} updated, Payments: {payments_created} created',
            'students_created': students_created,
            'students_updated': students_updated,
            'payments_created': payments_created,
            'errors': errors[:20],
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