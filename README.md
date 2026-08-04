# 🏠 Hostel Management System

A **Hostel Management System** is a web-based application developed to streamline hostel administration by automating student management, room allocation, hostel operations, and mess fee tracking. The system provides dedicated dashboards for administrators, wardens, and students, ensuring efficient, transparent, and secure hostel management.

---

# 📌 Project Overview

Traditional hostel management often relies on manual processes, making it difficult to track room occupancy, student records, and payments efficiently. This project provides a centralized platform that simplifies these tasks by digitizing hostel operations.

The system enables administrators to manage hostels, allocate rooms, monitor occupancy, and maintain student records, while students can access their hostel information and payment details through an easy-to-use interface.

---

# ✨ Features

## 👨‍🎓 Student Module

* Student registration and secure login
* View allocated hostel and room details
* Update personal profile information
* Submit hostel-related requests
* View mess fee payment history and status

## 🏢 Hostel Management

* Add, edit, and manage hostel buildings
* Manage rooms and hostel capacity
* Track room availability in real time
* Monitor occupied and vacant rooms

## 🛏️ Room Allocation

* Automatic room allocation based on predefined criteria
* Prevent duplicate room assignments
* Track room availability
* Maintain allocation history
* Support waitlisting when rooms are unavailable

## 👨‍💼 Warden Module

* View students assigned to the hostel
* Manage hostel information
* Approve or reject student requests
* Monitor room occupancy and hostel statistics

## 👑 Admin Module

* Manage students, wardens, and hostels
* Add and manage rooms
* Allocate and reassign rooms
* Monitor hostel occupancy
* Manage user accounts
* View overall hostel statistics

## 💳 Mess Fee Management

* Record mess fee payments
* Store payment receipt details
* Track payment status
* Maintain payment history

## 📊 Dashboard

* Total students
* Total hostels
* Total rooms
* Available rooms
* Occupied rooms
* Pending requests
* Hostel occupancy statistics

---

# 🛠️ Tech Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript
* Axios

### Backend

* Django
* Django REST Framework (DRF)

### Database

* SQLite (Development)
* PostgreSQL (Production)

### Authentication

* Django Authentication
* JSON Web Token (JWT)

### Development Tools

* Git
* GitHub
* VS Code
* Postman

---

# 🚀 Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/Hostel-Management-System.git
```

### Backend Setup

```bash
python -m venv venv

# Activate the virtual environment

pip install -r requirements.txt

python manage.py migrate

python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

npm install

npm start
```

---

# 🎯 Objectives

* Digitize hostel administration
* Simplify room allocation
* Reduce manual paperwork
* Improve hostel occupancy management
* Maintain centralized student records
* Track mess fee payments efficiently
* Enhance communication between students and hostel administration

---

# 👥 User Roles

| Role              | Responsibilities                                                        |
| ----------------- | ----------------------------------------------------------------------- |
| **Student**       | View room details, update profile, view payment status, submit requests |
| **Warden**        | Manage hostel, monitor students, approve requests                       |
| **Admin**         | Manage users, hostels, rooms, allocations, payments, and reports        |

---

# 🔮 Future Enhancements

* Online payment gateway integration
* QR code-based hostel entry
* Complaint management system
* Visitor management
* Email and SMS notifications
* Attendance tracking
* AI-based room allocation recommendations
* Mobile application support



