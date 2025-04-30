from django.db import models

class ActedProductCategory(models.Model):
    code = models.CharField(max_length=8, unique=True)
    name = models.CharField(max_length=64)

    def __str__(self):
        return f"{self.name} ({self.code})"

# Create your models here.
