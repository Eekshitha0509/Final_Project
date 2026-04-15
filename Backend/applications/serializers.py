# applications/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import (
    HostelApplication, StudentProfile, Block, Floor, Room, Booking, Profile, Payment,
    Student
)

# ========================
# JWT AUTH SERIALIZERS (ADD THESE)
# ========================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})
    admission = serializers.CharField(write_only=True, required=False)
    year = serializers.IntegerField(write_only=True, required=False)
    branch = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'admission', 'year', 'branch']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        # Check if username exists
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "Username already exists"})
        
        # Check if email exists
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already exists"})
        
        return data
    
    def create(self, validated_data):
        # Remove profile data
        admission = validated_data.pop('admission', None)
        year = validated_data.pop('year', None)
        branch = validated_data.pop('branch', None)
        validated_data.pop('password2')
        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        # Create or update student profile
        student_profile, created = StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                'admission': admission or '',
                'year': year or 1,
                'branch': branch or '',
                'phone_number': '',
                'address': ''
            }
        )
        
        if not created and admission:
            student_profile.admission = admission
            student_profile.year = year or student_profile.year
            student_profile.branch = branch or student_profile.branch
            student_profile.save()
        
        # Return user with JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Add tokens to serializer data
        self.tokens = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        
        return user
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['tokens'] = self.tokens
        representation['id'] = instance.id
        return representation


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        # Try to authenticate with username
        user = authenticate(username=username, password=password)
        
        # If failed, try to authenticate with admission number
        if not user:
            try:
                student_profile = StudentProfile.objects.filter(admission=username).first()
                if student_profile:
                    user = authenticate(username=student_profile.user.username, password=password)
            except:
                pass
        
        if not user:
            raise serializers.ValidationError("Invalid username or password")
        
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")
        
        data['user'] = user
        return data
    
    def to_representation(self, instance):
        user = instance.get('user')
        refresh = RefreshToken.for_user(user)
        
        # Get student profile
        student_profile = StudentProfile.objects.filter(user=user).first()
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'admission': student_profile.admission if student_profile else None,
                'year': student_profile.year if student_profile else None,
                'branch': student_profile.branch if student_profile else None,
            }
        }


# ========================
# HOSTEL APPLICATION SERIALIZER
# ========================

class HostelApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelApplication
        fields = '__all__'
        read_only_fields = ['created_at']


# ========================
# USER SERIALIZER
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
        try:
            return obj.student_profile.admission
        except:
            return None
    
    def get_year(self, obj):
        try:
            return obj.student_profile.year
        except:
            return None
    
    def get_branch(self, obj):
        try:
            return obj.student_profile.branch
        except:
            return None


# ========================
# STUDENT PROFILE SERIALIZER
# ========================

class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'admission', 'year', 'branch', 'phone_number', 'address', 'full_name', 'created_at']


# ========================
# BLOCK SERIALIZER
# ========================

class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = '__all__'


# ========================
# FLOOR SERIALIZER
# ========================

class FloorSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source='block.display_name', read_only=True)
    
    class Meta:
        model = Floor
        fields = '__all__'


# ========================
# ROOM SERIALIZER
# ========================

class RoomSerializer(serializers.ModelSerializer):
    floor_number = serializers.IntegerField(source='floor.floor_number', read_only=True)
    block_name = serializers.CharField(source='floor.block.display_name', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    available_beds = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Room
        fields = '__all__'


# ========================
# BOOKING SERIALIZER
# ========================

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


# ========================
# PROFILE SERIALIZER
# ========================

class ProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    
    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


# ========================
# PAYMENT SERIALIZER
# ========================

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='booking.student.get_full_name', read_only=True)
    room_number = serializers.CharField(source='booking.room.room_number', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_date']


# ========================
# ROOM DETAIL SERIALIZER
# ========================

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
# BOOKING DETAIL SERIALIZER
# ========================

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