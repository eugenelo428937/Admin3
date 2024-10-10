# # students/urls.py

# from django.urls import path
# from .views import create_user, create_student

# urlpatterns = [
#     path('create_user/', create_user, name='create_user'),
#     path('create_student/', create_student, name='create_student'),
# ]
# students/urls.py
from django.urls import path
from .views import StudentCreateView

urlpatterns = [
    path('create/', StudentCreateView.as_view(), name='student-create'),
]
