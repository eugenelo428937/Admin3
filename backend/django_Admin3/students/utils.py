# students/utils.py

from django.contrib.auth.models import User
from .models import Student
from django.db import transaction

def add_student(username, password, email, **student_data):
    try:
        with transaction.atomic():
            # Create the user
            user = User.objects.create_user(username=username, password=password, email=email)
            
            # Create the student using the user
            student = Student.objects.create(user=user, **student_data)
            
            return student
    except Exception as e:
        print(f"An error occurred in add_student: {e}")  # Debugging log
        return None
