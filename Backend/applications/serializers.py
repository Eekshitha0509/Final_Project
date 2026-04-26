# applications/serializers.py

from rest_framework import serializers
from .models import Block, Floor, Room, Booking, Payment, HostelAllocation


class BlockSerializer(serializers.ModelSerializer):
    floors_count = serializers.SerializerMethodField()
    floors_list = serializers.SerializerMethodField()
    allocation = serializers.SerializerMethodField()
    
    class Meta:
        model = Block
        fields = ['id', 'name', 'display_name', 'total_floors', 'description', 'floors_count', 'floors_list', 'allocation']
    
    def get_floors_count(self, obj):
        return obj.floors.count()
    
    def get_floors_list(self, obj):
        return list(obj.floors.values_list('floor_number', flat=True))
    
    def get_allocation(self, obj):
        try:
            alloc = obj.allocation
            return {
                'year_1_floors': alloc.year_1_floors,
                'year_2_floors': alloc.year_2_floors,
                'year_3_floors': alloc.year_3_floors,
                'year_4_floors': alloc.year_4_floors,
            }
        except HostelAllocation.DoesNotExist:
            return None


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