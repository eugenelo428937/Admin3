# students/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Student

class StudentInline(admin.StackedInline):
    model = Student
    can_delete = False
    verbose_name_plural = 'Student Profile'

class CustomUserAdmin(UserAdmin):
    inlines = (StudentInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_student_ref')
    
    def get_student_ref(self, obj):
        try:
            return obj.student.student_ref
        except Student.DoesNotExist:
            return None
    get_student_ref.short_description = 'Student Ref'

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
