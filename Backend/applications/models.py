from django.db import models
from django.contrib.auth.hashers import make_password, check_password



class HostelApplication(models.Model):
    full_name = models.CharField(max_length=255, blank=False)
    aadhar = models.CharField(max_length=20, blank=False)
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


class Block(models.Model):
    block_name = models.CharField(max_length=100, unique=True)
    year_group = models.CharField(max_length=50)
    total_floors = models.IntegerField()
    rooms_per_floor = models.IntegerField()
    description = models.TextField()

    def __str__(self):
        return self.block_name


class Floor(models.Model):
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name="floors")
    floor_number = models.IntegerField()

    def __str__(self):
        return f"{self.block.block_name} - Floor {self.floor_number}"


class Room(models.Model):
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="rooms")
    room_number = models.CharField(max_length=10)
    capacity = models.IntegerField()
    current_members = models.IntegerField(default=0)
    available = models.BooleanField(default=True)

    def __str__(self):
        return self.room_number


class Student(models.Model):
    name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    password = models.CharField(max_length=255)
    admission = models.CharField(max_length=50, unique=True)
    year = models.IntegerField()
    branch = models.CharField(max_length=100, blank=True)
    block = models.ForeignKey(Block, null=True, blank=True, on_delete=models.SET_NULL)
    room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


class Warden(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    block = models.ForeignKey(Block, null=True, blank=True, on_delete=models.SET_NULL)


class Booking(models.Model):
    STATUS_CHOICES = (
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    )

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    block = models.ForeignKey(Block, on_delete=models.CASCADE)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE)
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')