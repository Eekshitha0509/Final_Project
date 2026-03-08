# applications/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from .models import StudentProfile, Block, Floor, Room, Booking, HostelApplication
from .serializers import *
import traceback


# ==================== AUTHENTICATION VIEWS ====================

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
                
                # Get profile data
                profile = StudentProfile.objects.get(user=user)
                
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
                        'branch': profile.branch
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
    """Login a student"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'success': False,
                'error': 'Please provide username and password'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            
            # Get profile
            try:
                profile = StudentProfile.objects.get(user=user)
                year = profile.year
                branch = profile.branch
                admission = profile.admission
            except StudentProfile.DoesNotExist:
                year = 1
                branch = ""
                admission = ""
            
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
                    'branch': branch
                },
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            })
        
        return Response({
            'success': False,
            'error': 'Invalid username or password'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    except Exception as e:
        print("Error in login:", str(e))
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get student profile"""
    try:
        user = request.user
        profile = StudentProfile.objects.get(user=user)
        
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
                'phone_number': profile.phone_number,
                'address': profile.address
            }
        })
    except StudentProfile.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


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
        
        block_name = block_mapping.get(year)
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
    
    # Check if student already has an active booking
    if Booking.objects.filter(student=user, status='confirmed').exists():
        return Response({
            'error': 'You already have an active booking. Please cancel it before booking a new room.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        room = Room.objects.get(id=room_id)
        
        # Check if room is available
        if not room.is_available:
            return Response({'error': 'Room is not available'}, status=status.HTTP_400_BAD_REQUEST)
        
        if room.is_full:
            return Response({'error': 'Room is full'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check year restriction
        profile = StudentProfile.objects.get(user=user)
        student_year = profile.year
        block_name = room.floor.block.name
        
        if student_year == 1 and block_name != 'orange':
            return Response({'error': '1st year students can only book Orange Hostel'}, status=status.HTTP_400_BAD_REQUEST)
        if student_year == 2 and block_name != 'meta':
            return Response({'error': '2nd year students can only book Meta H Hostel'}, status=status.HTTP_400_BAD_REQUEST)
        if student_year == 3 and block_name != 'alumini':
            return Response({'error': '3rd year students can only book Alumini Hostel'}, status=status.HTTP_400_BAD_REQUEST)
        if student_year == 4 and block_name != 'orange':
            return Response({'error': '4th year students can only book Orange Hostel'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create booking
        booking = Booking.objects.create(
            student=user,
            room=room,
            status='confirmed'
        )
        
        serializer = BookingSerializer(booking)
        return Response({
            'message': 'Room booked successfully!',
            'booking': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
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
    """Cancel a booking"""
    try:
        booking = Booking.objects.get(id=booking_id, student=request.user, status='confirmed')
        booking.status = 'cancelled'
        booking.save()
        return Response({'message': 'Booking cancelled successfully'})
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)