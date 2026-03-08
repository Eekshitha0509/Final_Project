# applications/models.py
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.hashers import make_password, check_password

# Keep HostelApplication as is
class HostelApplication(models.Model):
    full_name = models.CharField(max_length=255)
    aadhar = models.CharField(max_length=20)
    class_yr = models.CharField(max_length=10, blank=True)
    branch = models.CharField(max_length=50, blank=True)
    roll_no = models.CharField(max_length=20, blank=True)
    dob = models.DateField(blank=True, null=True)
    mobile = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    caste = models.CharField(max_length=50, blank=True)
    catering = models.CharField(max_length=50, blank=True)
    amount = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} - {self.roll_no}"


# NEW: StudentProfile using Django User
class StudentProfile(models.Model):
    YEAR_CHOICES = (
        (1, '1st Year'),
        (2, '2nd Year'),
        (3, '3rd Year'),
        (4, '4th Year'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    admission = models.CharField(max_length=50, unique=True, null=True, blank=True)  # Made nullable temporarily
    year = models.IntegerField(choices=YEAR_CHOICES, null=True, blank=True)  # Made nullable temporarily
    branch = models.CharField(max_length=100, null=True, blank=True)  # Made nullable temporarily
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.admission if self.admission else 'No Admission'}"


# Auto-create profile when user is created - FIXED VERSION
@receiver(post_save, sender=User)
def create_student_profile(sender, instance, created, **kwargs):
    if created:
        StudentProfile.objects.create(user=instance)


# Auto-save profile when user is saved
@receiver(post_save, sender=User)
def save_student_profile(sender, instance, **kwargs):
    if hasattr(instance, 'student_profile'):
        instance.student_profile.save()


# Block model (unchanged)
class Block(models.Model):
    BLOCK_CHOICES = (
        ('orange', 'Orange Hostel'),
        ('meta', 'Meta H Hostel'),
        ('alumini', 'Alumini Hostel'),
    )
    
    YEAR_MAPPING = {
        1: 'orange',
        2: 'meta',
        3: 'alumini',
        4: 'orange',
    }
    
    name = models.CharField(max_length=50, choices=BLOCK_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    total_floors = models.IntegerField(default=3)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.display_name


# Floor model (unchanged)
class Floor(models.Model):
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='floors')
    floor_number = models.IntegerField()
    total_rooms = models.IntegerField(default=10)

    class Meta:
        unique_together = ('block', 'floor_number')

    def __str__(self):
        return f"{self.block.display_name} - Floor {self.floor_number}"


# Room model (unchanged)
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
    is_available = models.BooleanField(default=True)
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


# Booking model (updated to use User instead of Student)
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
        if self.status == 'confirmed':
            self.room.current_occupancy += 1
            if self.room.current_occupancy >= self.room.capacity:
                self.room.is_available = False
            self.room.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.username} - {self.room.room_number}"


# Keep Profile for backward compatibility (optional)
class Profile(models.Model):
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name='old_profile', null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=15, blank=True)
    emergency_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile for {self.student if self.student else 'Unknown'}"
    
    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"