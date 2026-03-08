# applications/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import HostelApplication, StudentProfile, Block, Floor, Room, Booking, Profile

class HostelApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelApplication
        fields = '__all__'
        read_only_fields = ['created_at']


# User Serializer
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


# Student Profile Serializer
class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'admission', 'year', 'branch', 'phone_number', 'address', 'full_name', 'created_at']


# Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})
    admission = serializers.CharField(write_only=True)
    year = serializers.IntegerField(write_only=True)
    branch = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'admission', 'year', 'branch']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        # Check if admission already exists
        if StudentProfile.objects.filter(admission=data['admission']).exists():
            raise serializers.ValidationError({"admission": "Admission number already exists"})
        
        return data
    
    def create(self, validated_data):
        # Remove profile data
        admission = validated_data.pop('admission')
        year = validated_data.pop('year')
        branch = validated_data.pop('branch')
        validated_data.pop('password2')
        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        # Update profile with admission, year, branch
        profile = user.student_profile
        profile.admission = admission
        profile.year = year
        profile.branch = branch
        profile.save()
        
        return user


# Login Serializer
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


# Block Serializer
class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = '__all__'


# Floor Serializer
class FloorSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source='block.display_name', read_only=True)
    
    class Meta:
        model = Floor
        fields = '__all__'


# Room Serializer
class RoomSerializer(serializers.ModelSerializer):
    floor_number = serializers.IntegerField(source='floor.floor_number', read_only=True)
    block_name = serializers.CharField(source='floor.block.display_name', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    available_beds = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Room
        fields = '__all__'


# Booking Serializer
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


# Profile Serializer (for backward compatibility)
class ProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    
    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']