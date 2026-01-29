from django.db import models
from django.conf import settings
from django.utils import timezone


class MarkingVoucher(models.Model):
    """
    Standalone marking vouchers - not tied to exam sessions or subjects
    """
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Availability
    is_active = models.BooleanField(default=True)
    expiry_date = models.DateTimeField(null=True, blank=True, help_text="Voucher expires after this date. Leave blank for no expiry.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_vouchers"'
        verbose_name = 'Marking Voucher'
        verbose_name_plural = 'Marking Vouchers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def is_available(self):
        """Check if voucher is currently available"""
        if not self.is_active:
            return False
        if self.expiry_date and timezone.now() > self.expiry_date:
            return False
        return True
