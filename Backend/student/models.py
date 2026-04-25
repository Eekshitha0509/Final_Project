# student/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model


class Student(models.Model):
    DEGREE_CHOICES = [
        ('B.Tech', 'B.Tech'),
        ('M.Tech', 'M.Tech'),
        ('MSc', 'M.Sc'),
    ]
     
    full_name = models.CharField(max_length=100)
    reg_no = models.CharField(max_length=20, unique=True)
    dob = models.DateField(blank=True, null=True)
    aadhar = models.CharField(max_length=12, blank=True, null=True)
    caste = models.CharField(max_length=50, blank=True, null=True)
    admission_no = models.CharField(max_length=20, unique=True)
    admission_date = models.DateField(blank=True, null=True)
    degree = models.CharField(max_length=10, choices=DEGREE_CHOICES, null=True, blank=True)
    branch = models.CharField(max_length=50, blank=True, null=True)
    roll_no = models.CharField(max_length=20, blank=True, null=True)
    class_yr = models.CharField(max_length=10, blank=True, null=True)
    room_no = models.CharField(max_length=20, blank=True, null=True, default="Not Allotted")
    mobile = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    amount = models.CharField(max_length=10, default="13000")
    months_stayed = models.IntegerField(default=0)
    is_leaving = models.BooleanField(default=False)
    
    father_name = models.CharField(max_length=100, blank=True, null=True)
    father_phone = models.CharField(max_length=15, blank=True, null=True)
    mother_name = models.CharField(max_length=100, blank=True, null=True)
    mother_phone = models.CharField(max_length=15, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    block = models.CharField(max_length=100, blank=True, null=True, default="Not Allotted")
    
    student_photo = models.FileField(upload_to='students/photos/', blank=True, null=True)
    father_photo = models.FileField(upload_to='parents/photos/', blank=True, null=True)
    mother_photo = models.FileField(upload_to='parents/photos/', blank=True, null=True)
    aadhar_pdf = models.FileField(upload_to='students/aadhar/', blank=True, null=True)
    father_aadhar = models.FileField(upload_to='parents/aadhar/', blank=True, null=True)
    mother_aadhar = models.FileField(upload_to='parents/aadhar/', blank=True, null=True)

    def __str__(self):
        return f"{self.full_name} ({self.reg_no})"


class StudentRegistration(models.Model):
    admission_no = models.CharField(max_length=20, unique=True)
    reg_no = models.CharField(max_length=20, null=True, blank=True)
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.admission_no})"


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


UserModel = get_user_model()


class PasswordResetOTP(models.Model):
    user = models.ForeignKey('StudentRegistration', on_delete=models.CASCADE, related_name='password_reset_otps', null=True, blank=True)
    otp = models.CharField(max_length=6)
    reset_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    email = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def is_valid(self):
        now = timezone.now()
        
        if self.created_at is None:
            return False
            
        created = self.created_at
        
        if timezone.is_naive(created):
            created = timezone.make_aware(created)
        
        return (now - created).total_seconds() < 600
    
    def __str__(self):
        user_email = self.user.email if self.user else self.email
        return f"OTP for {user_email} - {self.otp} - Valid: {self.is_valid()}"


class AdminWardenUser(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('warden', 'Warden'),
    ]
    
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.username} ({self.role})"


class BillingRate(models.Model):
    month = models.CharField(max_length=50, unique=True)
    days = models.IntegerField(default=0)
    mess_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_demand = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.month} - {self.days} days - ₹{self.net_demand}"


class MessPayment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    PAYMENT_MODE_CHOICES = [
        ('online', 'Online'),
        ('cash', 'Cash'),
    ]
    
    receipt_no = models.CharField(max_length=50, unique=True)
    student_name = models.CharField(max_length=100)
    roll_no = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.CharField(max_length=50)
    date = models.DateField(auto_now_add=True)
    payment_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default='online')
    
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.receipt_no} - {self.student_name} - {self.month} - ₹{self.amount}"


class StudentBilling(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='billings', null=True, blank=True)
    roll_no = models.CharField(max_length=20, blank=True, null=True)
    month = models.CharField(max_length=50)
    year = models.IntegerField(default=2024)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_date = models.DateField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ('roll_no', 'month', 'year')
    
    def __str__(self):
        return f"{self.roll_no} - {self.month} - ₹{self.amount_paid}"