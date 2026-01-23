from django.db import models
from django.conf import settings


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    session_key = models.CharField(max_length=40, null=True, blank=True, unique=True)
    has_marking = models.BooleanField(default=False, help_text="Indicates if cart contains marking products")
    has_digital = models.BooleanField(default=False, help_text="Indicates if cart contains digital products (eBooks, Online Classroom)")
    has_tutorial = models.BooleanField(default=False, help_text="Indicates if cart contains tutorial products")
    has_material = models.BooleanField(default=False, help_text="Indicates if cart contains material products (printed books, eBooks)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # VAT calculation results
    vat_result = models.JSONField(
        null=True,
        blank=True,
        help_text="VAT calculation results from rules engine"
    )

    # VAT error tracking fields
    vat_calculation_error = models.BooleanField(
        default=False,
        help_text="Indicates if VAT calculation failed for this cart"
    )
    vat_calculation_error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Error message if VAT calculation failed"
    )
    vat_last_calculated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of last VAT calculation attempt"
    )

    class Meta:
        db_table = '"acted"."carts"'
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'
        ordering = ['updated_at']
        indexes = [
            models.Index(fields=['vat_result'], name='idx_cart_vat_result'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(user__isnull=False),
                name='unique_cart_per_user'
            ),
        ]

    def __str__(self):
        if self.user:
            return f"Cart (User: {self.user.username})"
        return f"Cart (Session: {self.session_key})"
