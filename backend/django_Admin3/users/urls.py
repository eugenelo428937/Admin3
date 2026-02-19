from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter
from . import views

# Admin router for profile and staff management (SimpleRouter = no API root view)
admin_router = SimpleRouter()
admin_router.register(r'profiles', views.UserProfileViewSet, basename='profile')
admin_router.register(r'staff', views.StaffViewSet, basename='staff')

# Registration/user router
user_router = DefaultRouter()
user_router.register(r'', views.UserViewSet)

urlpatterns = [
    # Nested sub-resource PUT endpoints for profiles
    path('profiles/<int:profile_pk>/addresses/<int:pk>/', views.update_address, name='profile-address-update'),
    path('profiles/<int:profile_pk>/contacts/<int:pk>/', views.update_contact, name='profile-contact-update'),
    path('profiles/<int:profile_pk>/emails/<int:pk>/', views.update_email, name='profile-email-update'),

    # Admin ViewSet URLs (must come before user router to avoid conflicts)
    path('', include(admin_router.urls)),

    # User registration/profile ViewSet URLs
    path('', include(user_router.urls)),
]
