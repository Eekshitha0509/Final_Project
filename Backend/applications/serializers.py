# applications/serializers.py - CLEANED VERSION

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import (
    Block, Floor, Room, Booking, Payment, Student, StudentRegistration
)

# ========================
# JWT AUTH & USER SERIALIZERS
# ========================

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    admission = serializers.SerializerMethodField()
    year = serializers.SerializerMethodField()
    branch = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'admission', 'year', 'branch']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_admission(self, obj):
        return obj.username  # Since username is mapped to admission_no
    
    def get_year(self, obj):
        student = Student.objects.filter(admission_no=obj.username).first()
        return student.class_yr if student else None
    
    def get_branch(self, obj):
        student = Student.objects.filter(admission_no=obj.username).first()
        return student.branch if student else None

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        # In our cleaned architecture, StudentRegistration holds the admission and checks auth
        student_reg = StudentRegistration.objects.filter(admission_no=username).first()
        if not student_reg:
            student_reg = StudentRegistration.objects.filter(reg_no=username).first()
            
        if not student_reg:
            raise serializers.ValidationError("Invalid username or password")
            
        user = authenticate(username=student_reg.admission_no, password=password)
        
        if not user:
            raise serializers.ValidationError("Invalid username or password")
        
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")
        
        data['user'] = user
        data['student_reg'] = student_reg
        return data
    
    def to_representation(self, instance):
        user = instance.get('user')
        student_reg = instance.get('student_reg')
        refresh = RefreshToken.for_user(user)
        
        student = Student.objects.filter(admission_no=student_reg.admission_no).first()
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'admission': student_reg.admission_no,
                'year': student.class_yr if student else None,
                'branch': student.branch if student else None,
            }
        }

# ========================
# HOSTEL ARCHITECTURE SERIALIZERS
# ========================

class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = '__all__'

class FloorSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source='block.display_name', read_only=True)
    
    class Meta:
        model = Floor
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    floor_number = serializers.IntegerField(source='floor.floor_number', read_only=True)
    block_name = serializers.CharField(source='floor.block.display_name', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    available_beds = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Room
        fields = '__all__'

class RoomDetailSerializer(serializers.ModelSerializer):
    floor_number = serializers.IntegerField(source='floor.floor_number', read_only=True)
    block_name = serializers.CharField(source='floor.block.display_name', read_only=True)
    block_id = serializers.IntegerField(source='floor.block.id', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    available_beds = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Room
        fields = '__all__'

# ========================
# BOOKING & PAYMENT SERIALIZERS
# ========================

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='booking.student.get_full_name', read_only=True)
    room_number = serializers.CharField(source='booking.room.room_number', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_date']

class BookingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    block_name = serializers.CharField(source='room.floor.block.display_name', read_only=True)
    floor_number = serializers.IntegerField(source='room.floor.floor_number', read_only=True)
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['booking_date']

class BookingDetailSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    block_name = serializers.CharField(source='room.floor.block.display_name', read_only=True)
    floor_number = serializers.IntegerField(source='room.floor.floor_number', read_only=True)
    room_details = RoomDetailSerializer(source='room', read_only=True)
    payment_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = '__all__'
    
    def get_payment_status(self, obj):
        payment = obj.payments.order_by('-payment_date').first()
        if payment:
            return {
                'status': payment.payment_status,
                'amount': str(payment.amount),
                'date': payment.payment_date
            }
        return None

# ========================
# STUDENT SERIALIZER
# ========================

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = "__all__"