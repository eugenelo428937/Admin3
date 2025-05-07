from django.db import models

class ProductGroup(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children', on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'acted_product_group'
        verbose_name = 'Product Group'
        verbose_name_plural = 'Product Groups'