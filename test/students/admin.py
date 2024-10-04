from django.contrib import admin
from .models import User, UserEmail, UserContactNumber, Student

admin.site.register(User)
admin.site.register(UserEmail)
admin.site.register(UserContactNumber)
admin.site.register(Student)
