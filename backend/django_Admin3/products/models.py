from django.db import models

class Product(models.Model):
    code = models.CharField(max_length=50, unique=True)
    fullname = models.CharField(max_length=255)
    shortname = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.shortname}"
    
    class Meta:
        db_table = 'acted_products' 
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['code']
