# applications/models.py - ONLY hostel management
# All student-related models moved to 'student' app

from django.db import models
from django.contrib.auth.models import User


class Block(models.Model):
    BLOCK_CHOICES = (
        ('orange', 'Orange Hostel'),
        ('meta', 'Meta H Hostel'),
        ('alumini', 'Alumini Hostel'),
    )
    
    name = models.CharField(max_length=50, choices=BLOCK_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    total_floors = models.IntegerField(default=5)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.display_name


class Floor(models.Model):
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='floors')
    floor_number = models.IntegerField()
    total_rooms = models.IntegerField(default=10)

    class Meta:
        unique_together = ('block', 'floor_number')

    def __str__(self):
        return f"{self.block.display_name} - Floor {self.floor_number}"


class Room(models.Model):
    ROOM_TYPES = (
        ('regular', 'Regular Room'),
        ('office', 'Office'),
        ('washroom', 'Washroom'),
        ('common', 'Common Room'),
    )
    
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=10)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default='regular')
    capacity = models.IntegerField(default=4)
    current_occupancy = models.IntegerField(default=0)
    price_per_semester = models.DecimalField(max_digits=10, decimal_places=2, default=5000)
    label = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        unique_together = ('floor', 'room_number')

    def __str__(self):
        return f"{self.room_number} ({self.get_room_type_display()})"

    @property
    def available_beds(self):
        return self.capacity - self.current_occupancy

    @property
    def is_full(self):
        return self.current_occupancy >= self.capacity
    
    @property
    def is_available(self):
        return self.current_occupancy < self.capacity


class Booking(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    
    class Meta:
        unique_together = ('student', 'status')

    def save(self, *args, **kwargs):
        if self.pk is None and self.status == 'confirmed':
            self.room.current_occupancy += 1
            self.room.save()
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        if self.status == 'confirmed':
            self.room.current_occupancy -= 1
            if self.room.current_occupancy < 0:
                self.room.current_occupancy = 0
            self.room.save()
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.student.username} - {self.room.room_number}"


class Payment(models.Model):
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    
    class Meta:
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"Payment {self.id} - {self.booking.student.username} - ₹{self.amount}"