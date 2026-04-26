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

from .models import Block, Floor, Room, Booking, Payment
from .serializers import *
from .pdf_generator import send_room_allotment_email

from student.models import PasswordResetOTP, StudentRegistration, Certificate, Student, MessPayment, BillingRate, StudentBillingRecord

import traceback
import razorpay
import json
import random
import re  # 🔥 ADDED: Used to safely extract numbers from year strings
from datetime import datetime
import pandas as pd

razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

User = get_user_model()


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
    try:
        from student.models import Student
        student = Student.objects.get(admission_no=request.user.username)
        
        # Parse year from class_yr (e.g., "4/4" → 4)
        year_str = str(student.class_yr or '1')
        student_year = int(year_str.split('/')[0].strip()) if year_str else 1
        
        if student_year == 1:
            block_name = 'orange'
            allowed_floors = [1, 2, 3]
        elif student_year == 2:
            block_name = 'meta'
            allowed_floors = [0, 1, 2]
        elif student_year == 3:
            block_name = 'alumini'
            allowed_floors = [0, 1, 2]
        elif student_year == 4:
            block_name = 'orange'
            allowed_floors = [4, 5]
        else:
            block_name = 'orange'
            allowed_floors = [1, 2, 3]
        
        block = Block.objects.filter(name=block_name).first()
        if not block:
            return Response({'error': f'Hostel Block "{block_name}" not found. Please ensure database is loaded.'}, status=404)
        
        floors = Floor.objects.filter(block=block, floor_number__in=allowed_floors).order_by('floor_number')
        
        floor_data = []
        for floor in floors:
            rooms = Room.objects.filter(floor=floor, room_type='regular').order_by('room_number')
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
                    'available': r.capacity - r.current_occupancy,
                    'available_beds': r.capacity - r.current_occupancy,
                    'is_full': r.current_occupancy >= r.capacity
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
            'student_year': student_year
        })
    except Student.DoesNotExist:
        return Response({'error': 'Student Profile not found. Complete your profile first.'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ==================== FLOOR & ROOM VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_floors_with_rooms(request, block_id):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_room_availability(request, room_id):
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


# ==================== SECURE BOOKING VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_room(request):
    user = request.user
    room_id = request.data.get('room_id')
    
    if not room_id:
        return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    existing_booking = Booking.objects.filter(student=user, status='confirmed').first()
    if existing_booking:
        return Response({
            'error': 'You already have an active confirmed booking.',
            'booking_id': existing_booking.id,
            'room_number': existing_booking.room.room_number
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from student.models import Student
        student = Student.objects.get(admission_no=request.user.username)
        year_str = str(student.class_yr or "1")
        student_year = int(year_str.split('/')[0].strip()) if year_str else 1
    except Student.DoesNotExist:
        return Response({
            'error': 'Student profile not found. Please complete your profile first.'
        }, status=status.HTTP_400_BAD_REQUEST)
            
    with transaction.atomic():
        room = Room.objects.select_for_update().get(id=room_id)
        
        old_pendings = Booking.objects.filter(student=user, status='pending')
        for old_p in old_pendings:
            old_room = Room.objects.select_for_update().get(id=old_p.room.id)
            old_room.current_occupancy -= 1
            if old_room.current_occupancy < 0:
                old_room.current_occupancy = 0
            old_room.save()
            Payment.objects.filter(booking=old_p).delete()
            old_p.delete()

        block_name = room.floor.block.name
        floor_num = room.floor.floor_number
        
        if student_year == 1 and (block_name != 'orange' or floor_num not in [1, 2, 3]):
            return Response({'error': '1st year students can only book Orange Hostel (Floors 1-3)'}, status=status.HTTP_400_BAD_REQUEST)
        elif student_year == 2 and (block_name != 'meta' or floor_num not in [0, 1, 2]):
            return Response({'error': '2nd year students can only book Meta H Hostel (Ground, 1st, 2nd floors)'}, status=status.HTTP_400_BAD_REQUEST)
        elif student_year == 3 and (block_name != 'alumini' or floor_num not in [0, 1, 2]):
            return Response({'error': '3rd year students can only book Alumini Hostel (Floors 1-3)'}, status=status.HTTP_400_BAD_REQUEST)
        elif student_year == 4 and (block_name != 'orange' or floor_num not in [4, 5]):
            return Response({'error': '4th year students can only book Orange Hostel (Floors 4-5)'}, status=status.HTTP_400_BAD_REQUEST)
        
        if room.current_occupancy >= room.capacity:
            return Response({'error': 'This room is currently full. Please select another.'}, status=status.HTTP_400_BAD_REQUEST)
        
        booking = Booking.objects.create(
            student=user,
            room=room,
            status='pending'
        )
        
        room.current_occupancy += 1 
        room.save()
            
        payment = Payment.objects.create(
            booking=booking,
            amount=room.price_per_semester,
            payment_status='pending'
        )
        
        return Response({
            'message': 'Room reserved successfully. Please complete payment to confirm.',
            'booking_id': booking.id,
            'room_id': room.id,
            'amount': str(room.price_per_semester),
            'payment_required': True
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_booking(request):
    user = request.user
    try:
        booking = Booking.objects.filter(student=user, status='confirmed').first()
        if booking:
            room = booking.room
            booking_data = {
                'id': booking.id,
                'room_number': room.room_number,
                'block_name': room.floor.block.display_name,
                'floor_number': room.floor.floor_number,
                'booking_date': booking.booking_date.isoformat() if booking.booking_date else None,
                'status': booking.status
            }
            return Response({
                'status': 'confirmed',
                'booking': booking_data
            })
        
        pending_booking = Booking.objects.filter(student=user, status='pending').first()
        if pending_booking:
            return Response({
                'status': 'pending',
                'booking_id': pending_booking.id,
                'room_id': pending_booking.room.id,
                'amount': str(pending_booking.room.price_per_semester),
                'message': 'Payment pending'
            })
        
        return Response({'message': 'No active booking'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    try:
        booking = Booking.objects.get(id=booking_id, student=request.user)
        
        with transaction.atomic():
            room = Room.objects.select_for_update().get(id=booking.room.id)
            
            room.current_occupancy -= 1
            if room.current_occupancy < 0:
                room.current_occupancy = 0
            room.save()
            
            Payment.objects.filter(booking=booking).delete()
            booking.delete()
        
        return Response({
            'message': 'Booking cancelled successfully, bed released.',
            'room_available_beds': room.capacity - room.current_occupancy,
            'room_current_occupancy': room.current_occupancy
        }, status=status.HTTP_200_OK)
        
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)


# ==================== RAZORPAY PAYMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    try:
        booking_id = request.data.get('booking_id')
        
        if not booking_id:
            return Response({'success': False, 'error': 'Booking ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.get(id=booking_id, student=request.user, status='pending')
        except Booking.DoesNotExist:
            return Response({'success': False, 'error': 'Booking not found or already confirmed'}, status=status.HTTP_404_NOT_FOUND)
        
        if Payment.objects.filter(booking=booking, payment_status='completed').exists():
            return Response({'success': False, 'error': 'Payment already completed for this booking'}, status=status.HTTP_400_BAD_REQUEST)
        
        student = Student.objects.filter(admission_no=request.user.username).first()
        student_phone = student.mobile if student else ''
        
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
        
        payment = Payment.objects.filter(booking=booking).first()
        if payment:
            payment.razorpay_order_id = razorpay_order['id']
            payment.save()
        else:
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
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_razorpay_payment(request):
    test_mode = request.data.get('test_mode', False)
    booking_id = request.data.get('booking_id')
    
    # Test mode - skip Razorpay verification
    if test_mode and booking_id:
        try:
            from student.models import Student
            
            booking = Booking.objects.get(id=booking_id, student=request.user)
            payment = Payment.objects.filter(booking=booking).first()
            if not payment:
                return Response({'success': False, 'error': 'Payment not found'}, status=404)
            
            payment.payment_status = 'completed'
            payment.transaction_id = f'TEST_{booking.id}'
            payment.save()
            
            booking.status = 'confirmed'
            booking.save()
            
            # Update student details
            student_data = Student.objects.filter(admission_no=booking.student.username).first()
            if student_data:
                student_data.block = booking.room.floor.block.display_name
                student_data.room_no = booking.room.room_number
                student_data.save()
            
            return Response({
                'success': True,
                'message': 'Payment verified (TEST MODE)!',
                'booking_id': booking.id,
                'room_number': booking.room.room_number
            })
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=400)
    
    try:
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        try:
            razorpay_client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
        except razorpay.errors.SignatureVerificationError:
            return Response({'success': False, 'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
        except Payment.DoesNotExist:
            return Response({'success': False, 'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature = razorpay_signature
            payment.payment_status = 'completed'
            payment.transaction_id = razorpay_payment_id
            payment.save()
            
            booking = payment.booking
            if booking.status == 'pending':
                booking.status = 'confirmed'
                booking.save()
                
                # Update student details with room info
                student_data = Student.objects.filter(admission_no=booking.student.username).first()
                if student_data:
                    student_data.block = booking.room.floor.block.display_name
                    student_data.room_no = booking.room.room_number
                    student_data.save()
        
        try:
            student_data = Student.objects.filter(admission_no=booking.student.username).first()
            send_room_allotment_email(
                booking=booking,
                student_data=student_data,
                payment=payment,
                user_email=booking.student.email,
                student_name=booking.student.get_full_name()
            )
        except Exception as email_error:
            pass
        
        return Response({
            'success': True,
            'message': 'Payment verified and booking confirmed!',
            'booking_id': booking.id,
            'payment_id': payment.id,
            'room_number': booking.room.room_number
        })
        
    except Exception as e:
        print("Error verifying payment:", str(e))
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_status(request, booking_id):
    try:
        payment = Payment.objects.filter(booking_id=booking_id, booking__student=request.user).first()
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
            return Response({'success': True, 'payment_status': 'no_payment'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
def razorpay_webhook(request):
    if request.method == 'POST':
        try:
            payload = request.body
            data = json.loads(payload)
            event = data.get('event')
            
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
                except Payment.DoesNotExist:
                    pass
            return JsonResponse({'status': 'success'}, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_details(request, payment_id):
    try:
        payment = Payment.objects.get(id=payment_id, booking__student=request.user)
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
        return Response({'success': False, 'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)


# ==================== MESS PAYMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    try:
        amount_inr = int(request.data.get('amount', 3000))
        data = { "amount": amount_inr * 100, "currency": "INR", "payment_capture": 1 }
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

    params_dict = {'razorpay_order_id': order_id, 'razorpay_payment_id': payment_id, 'razorpay_signature': signature}

    try:
        client.utility.verify_payment_signature(params_dict)
        payment_record = MessPayment.objects.filter(roll_no=roll_no, month=month, status='Pending').order_by('-created_at').first()
        
        if payment_record:
            payment_record.payment_mode = "Online"
            payment_record.razorpay_order_id = order_id
            payment_record.razorpay_payment_id = payment_id
            payment_record.status = "Success"
            payment_record.save()
            return Response({"status": "success", "message": "Payment verified", "receipt_id": str(payment_record.receipt_no), "days": payment_record.days_count})
        
        return Response({"status": "success", "message": "Payment verified and recorded", "receipt_id": "test", "days": 30})

    except razorpay.errors.SignatureVerificationError:
        return Response({"status": "error", "message": "Invalid Signature"}, status=400)
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=400)


def parse_date(value):
    if pd.isna(value): return None
    if hasattr(value, 'date'): return value.date()
    try:
        value = str(value).strip().replace('.', '')
        return pd.to_datetime(value, dayfirst=True).date()
    except:
        return None


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_excel(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        df = pd.read_excel(file, header=0)
        df.columns = df.columns.str.strip()

        errors = []
        students_created = 0

        with transaction.atomic():
            for _, row in df.iterrows():
                reg_no_raw = row.get('reg_no')
                if pd.isna(reg_no_raw) or str(reg_no_raw).strip() == '' or str(reg_no_raw).lower() == 'nan': 
                    continue
                
                reg_no = str(reg_no_raw).split('.')[0].strip()
                
                admission_no_raw = row.get('admission_no')
                if pd.isna(admission_no_raw) or str(admission_no_raw).strip() == '' or str(admission_no_raw).lower() == 'nan':
                    admission_no = reg_no[:20]
                else:
                    admission_no = str(admission_no_raw).split('.')[0].strip()[:20]
                
                full_name = str(row.get('full_name', '')).strip()[:100] if pd.notna(row.get('full_name')) else ''
                if full_name.lower() == 'nan': full_name = ''
                
                year_raw = row.get('year', '')
                year = ''
                if pd.notna(year_raw) and str(year_raw).strip() != '' and str(year_raw).lower() != 'nan':
                    import re
                    match = re.search(r'\d', str(year_raw))
                    year = match.group(0) if match else ''
                
                branch = str(row.get('branch', '')).strip() if pd.notna(row.get('branch')) else ''
                
                degree = str(row.get('degree', '')).strip() if pd.notna(row.get('degree')) else ''
                if degree and len(degree) > 10:
                    degree = degree[:10]
                
                hostel_raw = row.get('hostel', '')
                hostel_name = ''
                if pd.notna(hostel_raw) and str(hostel_raw).strip() != '' and str(hostel_raw).lower() != 'nan':
                    hostel_name = str(hostel_raw).strip()
                
                room_no = str(row.get('room_no', '')).strip()
                if room_no.lower() == 'nan': room_no = ''
                
                mobile_raw = row.get('mobile')
                mobile = ''
                if pd.notna(mobile_raw):
                    mobile = str(mobile_raw).split('.')[0].strip()[:15]
                if mobile.lower() == 'nan': mobile = ''
                
                email = str(row.get('email', '')).strip() if pd.notna(row.get('email')) else ''
                if email.lower() == 'nan': email = ''
                
                address = str(row.get('address', '')).strip() if pd.notna(row.get('address')) else ''
                if address.lower() == 'nan': address = ''
                
                aadhar_raw = row.get('aadhar_no')
                aadhar_no = ''
                if pd.notna(aadhar_raw):
                    aadhar_no = str(aadhar_raw).replace(' ', '').split('.')[0].strip()
                if aadhar_no.lower() == 'nan': aadhar_no = ''
                
                caste = str(row.get('caste', '')).strip() if pd.notna(row.get('caste')) else ''
                if caste.lower() == 'nan': caste = ''
                
                amount_raw = row.get('amount')
                amount = '0'
                if pd.notna(amount_raw):
                    amount = str(amount_raw).split('.')[0].strip()
                if amount.lower() == 'nan': amount = '0'
                
                months_stayed = 0
                if pd.notna(row.get('months_stayed')):
                    try:
                        months_stayed = int(float(row.get('months_stayed')))
                    except:
                        months_stayed = 0
                
                is_leaving = False
                if pd.notna(row.get('is_leaving')):
                    is_leaving = str(row.get('is_leaving')).lower() in ['yes', 'true', '1', 'y']
                
                father_name = str(row.get('father_name', '')).strip() if pd.notna(row.get('father_name')) else ''
                if father_name.lower() == 'nan': father_name = ''
                
                father_phone_raw = row.get('father_phone')
                father_phone = ''
                if pd.notna(father_phone_raw):
                    father_phone = str(father_phone_raw).split('.')[0].strip()
                if father_phone.lower() == 'nan': father_phone = ''
                
                mother_name = str(row.get('mother_name', '')).strip() if pd.notna(row.get('mother_name')) else ''
                if mother_name.lower() == 'nan': mother_name = ''
                
                mother_phone_raw = row.get('mother_phone')
                mother_phone = ''
                if pd.notna(mother_phone_raw):
                    mother_phone = str(mother_phone_raw).split('.')[0].strip()
                if mother_phone.lower() == 'nan': mother_phone = ''
                
                dob = None
                if pd.notna(row.get('dob')):
                    dob = parse_date(row.get('dob'))
                
                admission_date = None
                if pd.notna(row.get('admission_date')):
                    admission_date = parse_date(row.get('admission_date'))
                
                student, created = Student.objects.update_or_create(
                    reg_no=reg_no,
                    defaults={
                        "admission_no": admission_no,
                        "full_name": full_name,
                        "roll_no": reg_no,
                        "dob": dob,
                        "aadhar": aadhar_no if aadhar_no else None,
                        "caste": caste,
                        "class_yr": year,
                        "branch": branch,
                        "degree": degree,
                        "block": hostel_name,
                        "room_no": room_no,
                        "mobile": mobile if mobile else None,
                        "email": email if email else None,
                        "address": address,
                        "amount": amount,
                        "months_stayed": months_stayed,
                        "is_leaving": is_leaving,
                        "father_name": father_name,
                        "father_phone": father_phone if father_phone else None,
                        "mother_name": mother_name,
                        "mother_phone": mother_phone if mother_phone else None,
                        "admission_date": admission_date
                    }
                )
                
                if created:
                    students_created += 1

        return Response({
            "message": "Student details uploaded successfully!",
            "students_created": students_created,
            "errors": errors
        })

    except Exception as e:
        import traceback
        print("EXCEL ERROR:", traceback.format_exc())
        return Response({"error": f"Failed to parse Excel: {str(e)}"}, status=500)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_billing_excel(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        temp_df = pd.read_excel(file, header=None)
        header_row = 0
        for i in range(min(5, len(temp_df))):
            row_vals = [str(v).lower() for v in temp_df.iloc[i].values if pd.notna(v)]
            row_str = ' '.join(row_vals)
            if 'name of the student' in row_str and 'roll no' in row_str:
                header_row = i
                break
        
        df = pd.read_excel(file, header=header_row)
        df.columns = df.columns.str.strip().str.lower()
        
        records_created = 0
        
        def safe_float(val):
            try:
                if pd.isna(val):
                    return 0
                if isinstance(val, str):
                    val = val.replace(',', '').strip()
                    if val == '' or val.lower() == 'nan':
                        return 0
                return float(val)
            except:
                return 0

        def safe_date(val):
            if pd.isna(val):
                return None
            try:
                return pd.to_datetime(val).strftime('%Y-%m-%d')
            except:
                return None

        month_order = [
            ('jul-24', 'Jul-24'), ('aug-24', 'Aug-24'), ('sep-24', 'Sep-24'),
            ('oct-24', 'Oct-24'), ('nov-24', 'Nov-24'), ('dec-24', 'Dec-24'),
            ('jan-25', 'Jan-25'), ('feb-25', 'Feb-25'), ('mar-25', 'Mar-25'),
            ('apr-25', 'Apr-25'), ('may-25', 'May-25'),
        ]

        with transaction.atomic():
            for idx, row in df.iterrows():
                roll_no_raw = row.get('roll no')
                if pd.isna(roll_no_raw) or str(roll_no_raw).strip() == '':
                    continue
                
                reg_no = str(roll_no_raw).split('.')[0].strip()
                
                student_name = str(row.get('name of the student', '')).strip()
                
                student, created = Student.objects.get_or_create(
                    reg_no=reg_no,
                    defaults={
                        'admission_no': reg_no,
                        'full_name': student_name
                    }
                )
                
                billing_record, _ = StudentBillingRecord.objects.get_or_create(
                    roll_no=reg_no,
                    year='2024-25',
                    defaults={
                        'student': student,
                        'student_name': student_name
                    }
                )
                
                base_cols = ['days', 'electric charge', 'mess charge', 'service charge', 'net demand', 'collection', 'date']
                
                for month_idx, (col_key, month_label) in enumerate(month_order):
                    try:
                        if month_idx == 0:
                            days = safe_float(row.get('days'))
                            electric = safe_float(row.get('electric charge'))
                            mess = safe_float(row.get('mess charge'))
                            service = safe_float(row.get('service charge'))
                            net = safe_float(row.get('net demand'))
                            coll = safe_float(row.get('collection'))
                            date_str = safe_date(row.get('date'))
                        else:
                            days = safe_float(row.get(f'days.{month_idx}'))
                            electric = safe_float(row.get(f'electric charge.{month_idx}'))
                            mess = safe_float(row.get(f'mess charge.{month_idx}'))
                            service = safe_float(row.get(f'service charge.{month_idx}'))
                            net = safe_float(row.get(f'net demand.{month_idx}'))
                            coll = safe_float(row.get(f'collection.{month_idx}'))
                            date_str = safe_date(row.get(f'date.{month_idx}'))
                        
                        if days > 0 or electric > 0 or mess > 0 or service > 0 or net > 0 or coll > 0:
                            month_data = {
                                'days': int(days),
                                'electric_charge': electric,
                                'mess_charge': mess,
                                'service_charge': service,
                                'net_demand': net,
                                'collection': coll,
                                'date': date_str
                            }
                            billing_record.set_month_data(month_label, month_data)
                    except Exception as e:
                        continue
                
                credit_val = row.get('credit')
                if pd.notna(credit_val):
                    billing_record.credit = safe_float(credit_val)
                
                billing_record.save()
                records_created += 1

        return Response({
            "message": "Billing data uploaded successfully!",
            "records_created": records_created
        })

    except Exception as e:
        import traceback
        print("BILLING ERROR:", traceback.format_exc())
        return Response({"error": f"Failed: {str(e)}"}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def fetch_student_billing(request):
    reg_no = request.GET.get('reg_no')
    if not reg_no:
        return Response({"error": "Registration number is required"}, status=400)
    
    try:
        student = Student.objects.filter(reg_no__iexact=reg_no).first()
        if not student:
            return Response({"error": "Student not found", "student": None}, status=404)
        
        billing_records = StudentBillingRecord.objects.filter(roll_no=reg_no)
        
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
                "message": "No billing records found"
            })
        
        billing_data = []
        for record in billing_records:
            data = {
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
            }
            billing_data.append(data)
        
        return Response({
            "student": {
                "reg_no": student.reg_no,
                "full_name": student.full_name,
                "roll_no": student.roll_no,
                "room_no": student.room_no,
                "block": student.block
            },
            "billing_data": billing_data
        })
    
    except Exception as e:
        import traceback
        print("FETCH BILLING ERROR:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_student_billing(request):
    reg_no = request.GET.get('reg_no') or request.GET.get('admission_no')
    if not reg_no:
        return Response({"error": "reg_no or admission_no required"}, status=400)
    
    try:
        student = Student.objects.filter(reg_no__iexact=reg_no).first()
        if not student:
            student = Student.objects.filter(admission_no__iexact=reg_no).first()
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
    
    except Exception as e:
        import traceback
        print("GET BILLING ERROR:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_billing_rates(request):
    return Response([])

@api_view(['GET'])
@permission_classes([AllowAny])
def check_no_dues(request):
    return Response({'success': True, 'is_no_dues': True, 'total_paid': 0, 'required_amount': 0, 'pending_amount': 0})

@api_view(['GET'])
@permission_classes([AllowAny])
def test_endpoint(request):
    return Response({"message": "Backend connection successful!", "authenticated": request.user.is_authenticated})