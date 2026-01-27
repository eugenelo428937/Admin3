from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=16, blank=True, null=True)
    send_invoices_to = models.CharField(max_length=8, choices=[('HOME', 'Home'), ('WORK', 'Work')], default='HOME')
    send_study_material_to = models.CharField(max_length=8, choices=[('HOME', 'Home'), ('WORK', 'Work')], default='HOME')
    remarks = models.TextField(max_length=500, blank=True, null=True)

    def __str__(self):
        return self.user.username
    
    class Meta:
        db_table = '"acted"."user_profile"'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
