# applications/models.py
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.hashers import make_password, check_password
import uuid
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

# ========================
# HOSTEL APPLICATION MODEL (from first config)
# ========================

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


# ========================
# STUDENT PROFILE MODEL (from first config)
# ========================

class StudentProfile(models.Model):
    YEAR_CHOICES = (
        (1, '1st Year'),
        (2, '2nd Year'),
        (3, '3rd Year'),
        (4, '4th Year'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    admission = models.CharField(max_length=50, unique=True, null=True, blank=True)
    year = models.IntegerField(choices=YEAR_CHOICES, null=True, blank=True)
    branch = models.CharField(max_length=100, null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.admission if self.admission else 'No Admission'}"


# Auto-create profile when user is created
@receiver(post_save, sender=User)
def create_student_profile(sender, instance, created, **kwargs):
    if created:
        StudentProfile.objects.create(user=instance)


# Auto-save profile when user is saved
@receiver(post_save, sender=User)
def save_student_profile(sender, instance, **kwargs):
    if hasattr(instance, 'student_profile'):
        instance.student_profile.save()


# ========================
# BLOCK MODEL (from first config)
# ========================

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


# ========================
# FLOOR MODEL (from first config)
# ========================

class Floor(models.Model):
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='floors')
    floor_number = models.IntegerField()
    total_rooms = models.IntegerField(default=10)

    class Meta:
        unique_together = ('block', 'floor_number')

    def __str__(self):
        return f"{self.block.display_name} - Floor {self.floor_number}"


# ========================
# ROOM MODEL (from first config)
# ========================

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
    def is_available(self):  # ✅ Add this property instead of database field
        """Room is available if not full"""
        return self.current_occupancy < self.capacity


# ========================
# BOOKING MODEL (FIXED - with proper occupancy management)
# ========================

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
        # Only update occupancy for new confirmed bookings
        if self.pk is None and self.status == 'confirmed':
            print(f"📚 Increasing occupancy for room {self.room.room_number}")
            self.room.current_occupancy += 1
            print(f"   New occupancy: {self.room.current_occupancy}/{self.room.capacity}")
            self.room.save()
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Update occupancy when cancelling a confirmed booking
        if self.status == 'confirmed':
            print(f"📚 Decreasing occupancy for room {self.room.room_number}")
            self.room.current_occupancy -= 1
            if self.room.current_occupancy < 0:
                self.room.current_occupancy = 0
            print(f"   New occupancy: {self.room.current_occupancy}/{self.room.capacity}")
            self.room.save()
        
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.student.username} - {self.room.room_number}"

# ========================
# PROFILE MODEL (from first config - for backward compatibility)
# ========================

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


# ========================
# PAYMENT MODEL (from first config)
# ========================

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
    
    # Razorpay fields
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    
    # Transaction details
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    
    class Meta:
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"Payment {self.id} - {self.booking.student.username} - ₹{self.amount}"


# ========================
# STUDENT MODEL (from second config)
# ========================

class Student(models.Model):
    DEGREE_CHOICES = [
    ('BTECH', 'B.Tech'),
    ('MTECH', 'M.Tech'),
    ('MSC', 'M.Sc'),
    ('DUAL', 'B.Tech + M.Tech'),
]
     
    full_name = models.CharField(max_length=100)
    aadhar = models.CharField(max_length=12, blank=True, null=True)
    admission_no = models.CharField(max_length=20, unique=True)
    reg_no = models.CharField(max_length=20, null=True, blank=True)
    class_yr = models.CharField(max_length=10, blank=True, null=True)
    branch = models.CharField(max_length=50, blank=True, null=True)
    roll_no = models.CharField(max_length=20, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    mobile = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField(blank=True, null=True)
    caste = models.CharField(max_length=50, blank=True, null=True)
    catering = models.CharField(max_length=20, blank=True, null=True)
    amount = models.CharField(max_length=10, default="13000")
    student_photo = models.ImageField(upload_to="students/photos/", null=True, blank=True)
    
    # Hostel related fields (from first model)
    months_stayed = models.IntegerField(default=0)
    is_leaving = models.BooleanField(default=False)
    room = models.CharField(max_length=20, null=True, blank=True)
    
    # Parents & Guardian
    father_name = models.CharField(max_length=100, blank=True, null=True)
    father_phone = models.CharField(max_length=15, blank=True, null=True)
    father_aadhar = models.FileField(upload_to="parents/father/aadhar/", null=True, blank=True)
    father_photo = models.ImageField(upload_to="parents/father/photos/", null=True, blank=True)
    mother_name = models.CharField(max_length=100, blank=True, null=True)
    mother_phone = models.CharField(max_length=15, blank=True, null=True)
    mother_aadhar = models.FileField(upload_to="parents/mother/aadhar/", null=True, blank=True)
    mother_photo = models.ImageField(upload_to="parents/mother/photos/", null=True, blank=True)
    guardian_name = models.CharField(max_length=100, blank=True, null=True)
    guardian_phone = models.CharField(max_length=15, blank=True, null=True)
    guardian_aadhar = models.FileField(upload_to="guardian/aadhar/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    block = models.CharField(max_length=100, blank=True, null=True, default="Not Allotted")
    room_no = models.CharField(max_length=20, blank=True, null=True, default="Not Allotted")
    hostel_name = models.CharField(max_length=100, blank=True, null=True)
    degree = models.CharField(max_length=10, choices=DEGREE_CHOICES, null=True, blank=True)

    def __str__(self):
        return f"{self.full_name} ({self.admission_no})"
    
    
# ========================
# STUDENT REGISTRATION MODEL (from second config)
# ========================

class StudentRegistration(models.Model):
    admission_no = models.CharField(max_length=20, unique=True)
    reg_no = models.CharField(max_length=20, null=True, blank=True, unique=True)
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.admission_no})"


# ========================
# CERTIFICATE MODEL (from second config)
# ========================

class Certificate(models.Model):
    CERTIFICATE_TYPES = [
        ('resident', 'Resident Certificate'),
        ('nodues', 'No Dues Certificate'),
        ('estimation', 'Estimation Slip'),
    ]
    admission_no = models.CharField(max_length=20)
    reg_no = models.CharField(max_length=20, null=True, blank=True)
    student_name = models.CharField(max_length=100)
    certificate_type = models.CharField(max_length=20, choices=CERTIFICATE_TYPES)
    certificate_file = models.FileField(upload_to='certificates/', null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_name} - {self.certificate_type}"



# Add to applications/models.py
class BillingRate(models.Model):
    """Store billing rates from Excel"""
    days = models.IntegerField()
    electric_charge = models.DecimalField(max_digits=10, decimal_places=2)
    mess_charge = models.DecimalField(max_digits=10, decimal_places=2)
    service_charge = models.DecimalField(max_digits=10, decimal_places=2)
    net_demand = models.DecimalField(max_digits=10, decimal_places=2)
    collection = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    month = models.CharField(max_length=20)  # e.g., "January 2024"
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.month} - Days: {self.days}"

class StudentBilling(models.Model):
    """Track student-specific billing"""
    student = models.ForeignKey('Student', on_delete=models.CASCADE, related_name='billings')
    month = models.CharField(max_length=20)
    billing_rate = models.ForeignKey(BillingRate, on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, default='pending')  # pending, paid, partial
    payment_date = models.DateTimeField(null=True, blank=True)
    mess_payment = models.ForeignKey('MessPayment', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        unique_together = ('student', 'month')
    
    def __str__(self):
        return f"{self.student.full_name} - {self.month}"

# Update MessPayment model in applications/models.py

class MessPayment(models.Model):
    receipt_no = models.AutoField(primary_key=True)
    student_name = models.CharField(max_length=100)
    roll_no = models.CharField(max_length=20)
    room_no = models.CharField(max_length=10)
    class_yr = models.CharField(max_length=20)
    date = models.DateField()
    month = models.CharField(max_length=20)
    amount = models.IntegerField()
    payment_mode = models.CharField(max_length=20)
    purpose = models.CharField(max_length=50, default="Mess Payment")
    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, default="Pending")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    # Add these fields
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name='mess_payments')
    billing_rate = models.ForeignKey(BillingRate, on_delete=models.SET_NULL, null=True, blank=True)
    days_count = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.student_name} - {self.month} - {self.status}"

# ========================
# PASSWORD RESET OTP MODEL (from second config)
# ========================

UserModel = get_user_model()

class PasswordResetOTP(models.Model):
    user = models.ForeignKey('StudentRegistration', on_delete=models.CASCADE, related_name='password_reset_otps')
    otp = models.CharField(max_length=6)
    reset_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def is_valid(self):
        # OTP is valid for 10 minutes (600 seconds)
        now = timezone.now()
        return (now - self.created_at).total_seconds() < 600
    
    def __str__(self):
        return f"OTP for {self.user.email} - {self.otp} - Valid: {self.is_valid()}"

class AdminWardenUser(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('warden', 'Warden'),
    ]
    
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)  # Will store hashed passwords
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.username} ({self.role})"
