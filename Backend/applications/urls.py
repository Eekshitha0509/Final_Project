from django.urls import path
from . import views
from .views import test_api
from .views import hostel_list

urlpatterns = [
    path('submit-profile/', views.submit_profile, name='submit-profile'),
    path('applications/', views.HostelApplicationViewSet.as_view({'get': 'list', 'post': 'create'}), name='applications-list'),
    path('applications/<int:pk>/', views.HostelApplicationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='applications-detail'),
    path("test/", test_api),
    path("hostel/", hostel_list),
]