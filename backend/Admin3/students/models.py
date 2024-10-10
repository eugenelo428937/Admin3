# students/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class CustomUserManager(BaseUserManager):
    def create_user(self, firstname, lastname, password=None, **extra_fields):
        if not firstname or not lastname:
            raise ValueError('The Firstname and Lastname fields must be set')
        user = self.model(firstname=firstname, lastname=lastname, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, firstname, lastname, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(firstname, lastname, password, **extra_fields)

class CustomUser(AbstractBaseUser):
    firstname = models.CharField(max_length=30)
    lastname = models.CharField(max_length=30)
    password = models.CharField(max_length=128)

    objects = CustomUserManager()

    USERNAME_FIELD = 'id'
    REQUIRED_FIELDS = ['lastname']

    def __str__(self):
        return f"{self.firstname} {self.lastname}"

class Student(models.Model):
    student_ref = models.AutoField(primary_key=True)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    # Add other fields as necessary

    def __str__(self):
        return f"Student {self.student_ref} - {self.user.firstname} {self.user.lastname}"
