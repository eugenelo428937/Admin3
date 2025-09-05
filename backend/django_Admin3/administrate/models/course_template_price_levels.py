from django.db import models
from decimal import Decimal

class CourseTemplatePriceLevel(models.Model):
    course_template = models.ForeignKey(
        'administrate.CourseTemplate',
        on_delete=models.CASCADE,
        related_name='price_levels',
        db_column='course_template_id'
    )
    price_level = models.ForeignKey(
        'administrate.PriceLevel',
        on_delete=models.CASCADE,
        related_name='course_template_prices',
        db_column='price_level_id'
    )
    external_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00')
    )
    last_synced = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = 'adm.course_template_price_levels'
        unique_together = [['course_template', 'price_level']]
        ordering = ['course_template', 'price_level']
        verbose_name = 'Course Template Price Level'
        verbose_name_plural = 'Course Template Price Levels'

    def __str__(self):
        return f"{self.course_template.code} - {self.price_level.name}: £{self.amount}"