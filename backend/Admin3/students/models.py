# myapp/models.py

from django.db import models


class Users(models.Model):
    firstname = models.CharField(max_length=100)
    lastname = models.CharField(max_length=100)
    password = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.firstname} {self.lastname}"

    class Meta:
        db_table = 'Users'  # Specify the custom table name


class Students(models.Model):
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    student_ref = models.AutoField(primary_key=True)
    
    class Meta:
        db_table = 'Students'  # Specify the custom table name
