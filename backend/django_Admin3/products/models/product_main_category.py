from django.db import models

class ProductMainCategory(models.Model):
    name = models.CharField(max_length=64)
    order_sequence = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'acted_product_main_category'