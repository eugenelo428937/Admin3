# students/models.py
from django.db import models
from django.contrib.auth.models import User

class Student(models.Model):
    STUDENT_TYPES = [
        ('S', 'STUDENTS'),
        ('Q', 'QUALIFIED'),
        ('I', 'INACTIVE'),
    ]
    
    APPRENTICE_TYPES = [
        ('none', 'None'),
        ('L4', 'LEVEL 4'),
        ('L7', 'LEVEL 7'),
    ]

    student_ref = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student'
    )
    student_type = models.CharField(
        max_length=50,
        choices=STUDENT_TYPES,
        default='regular'
    )
    apprentice_type = models.CharField(
        max_length=50,
        choices=APPRENTICE_TYPES,
        default='none'
    )
    create_date = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'acted_students'
        verbose_name = 'Student'
        verbose_name_plural = 'Students'

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_ref})"
