# Passwords for logins
admin - admin123
warden - warden123


# Hostel Management Backend

Django REST API for hostel application management.

## Setup Instructions

1. **Create a virtual environment:**

   ```
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```
   pip install -r requirements.txt
   ```

3. **Apply database migrations:**

   ```
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Create a superuser (optional, for admin panel):**

   ```
   python manage.py createsuperuser
   ```

5. **Run the server:**
   ```
   python manage.py runserver
   ```

The server will run at `http://127.0.0.1:8000/`

## API Endpoints

- `POST /api/submit-profile/` - Submit a hostel application
- `GET /api/applications/` - List all applications
- `GET /api/applications/<id>/` - Get a specific application
- `DELETE /api/applications/<id>/` - Delete an application

## CORS Configuration

CORS is enabled for:

- `http://localhost:5173` (React dev server)
- `http://127.0.0.1:5173`
- `http://localhost:3000`
- `http://127.0.0.1:3000`
