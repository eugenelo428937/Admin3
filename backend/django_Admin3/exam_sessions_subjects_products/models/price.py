from django.db import models
from .exam_session_subject_product_variation import ExamSessionSubjectProductVariation

class Price(models.Model):
    PRICE_TYPE_CHOICES = [
        ("standard", "Standard"),
        ("retaker", "Retaker"),
        ("reduced", "Reduced Rate"),
        ("additional", "Additional Copy"),
    ]
    variation = models.ForeignKey(
        ExamSessionSubjectProductVariation,
        on_delete=models.CASCADE,
        related_name="prices"
    )
    price_type = models.CharField(max_length=20, choices=PRICE_TYPE_CHOICES, default="standard")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="GBP")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "acted_exam_session_subject_product_variation_price"
        verbose_name = "Price"
        verbose_name_plural = "Prices"
        unique_together = ("variation", "price_type")

    def __str__(self):
        return f"{self.variation} - {self.price_type} - {self.amount} {self.currency}"
