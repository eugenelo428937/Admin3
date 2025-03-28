from django.db import models

class PriceLevel(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    last_synced = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'adm.pricelevels'
        verbose_name = 'Price Level'
        verbose_name_plural = 'Price Levels'
    
    def __str__(self):
        return self.name
