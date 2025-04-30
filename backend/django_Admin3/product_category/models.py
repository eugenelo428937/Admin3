from django.db import models

class ProductCategory(models.Model):
    name = models.CharField(max_length=64)
    is_core = models.BooleanField(default=False)
    is_display = models.BooleanField(default=True)
    order_sequence = models.PositiveIntegerField(default=0)
    is_revision = models.BooleanField(default=False)
    is_marking = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'acted_product_category'
# Create your models here.
