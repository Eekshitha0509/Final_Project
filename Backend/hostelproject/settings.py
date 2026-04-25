"""
Django settings for hostelproject project.
"""

# ========================
# FIX SSL CERTIFICATE ERROR - MUST BE AT THE VERY TOP
# ========================
import ssl
import certifi
import os

# Force SSL to use system certificates
os.environ['SSL_CERT_FILE'] = certifi.where()
ssl._create_default_https_context = ssl._create_unverified_context

from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ========================
# Media Files Configuration
# ========================
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# ========================
# Quick-start development settings
# ========================

SECRET_KEY = 'django-insecure-_r9zzou=y!82u&19u6m1qd63$lnlj1a0+%bwj@pqc(nyk4&9_('
DEBUG = True
ALLOWED_HOSTS = ['*']

# ========================
# Application definition
# ========================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third Party Apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Custom Apps
    'applications',
    'student',
]

# ========================
# CORS Configuration
# ========================

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Also add specific origins for security
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

# ========================
# Middleware Configuration
# ========================

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ========================
# URLs & Templates
# ========================

ROOT_URLCONF = 'hostelproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hostelproject.wsgi.application'

# ========================
# Database Configuration
# ========================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'AU_HOSTELS',
        'USER': 'postgres',
        'PASSWORD': 'root123',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# ========================
# Password Validation
# ========================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ========================
# Internationalization
# ========================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ========================
# Static Files
# ========================

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

# ========================
# Default Primary Key Field Type
# ========================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ========================
# Django REST Framework + JWT Configuration
# ========================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',  
    ),
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# ========================
# Custom Authentication Backend
# ========================

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Default Django auth
]

# ========================
# Session Configuration
# ========================

SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400  # 24 hours in seconds
SESSION_SAVE_EVERY_REQUEST = True

# ========================
# Razorpay Payment Configuration
# ========================

RAZORPAY_KEY_ID = 'rzp_test_SPwdd9NISZKvHz'
RAZORPAY_KEY_SECRET = 'LiPZcn6YJ2zm8XHCFWVMrtgi'

# ========================
# Email Configuration - SMTP with Gmail
# ========================

EMAIL_BACKEND = 'applications.email_backend.SSLIgnoreEmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'andhrahostels@gmail.com'
# REPLACE THIS WITH YOUR ACTUAL APP PASSWORD FROM GOOGLE
EMAIL_HOST_PASSWORD = 'hqpbspdfmyatjjlz'

# ========================
# Security Settings (for development)
# ========================

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

# Disable CSRF for API endpoints in development
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = False

# ========================
# Logging Configuration (for debugging)
# ========================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'applications': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}