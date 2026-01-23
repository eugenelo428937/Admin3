from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import EmailValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import uuid
import json
from decimal import Decimal


# ============================================================================
# VAT-Related Models (Phase 1: Database Foundation)
# ============================================================================

class UtilsRegion(models.Model):
    """VAT region master data (UK, IE, EU, SA, ROW)."""

    code = models.CharField(max_length=10, unique=True, primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_regions'
        verbose_name = 'VAT Region'
        verbose_name_plural = 'VAT Regions'

    def __str__(self):
        return f"{self.code} - {self.name}"


class UtilsCountrys(models.Model):
    """Country data with VAT rates and phone codes."""

    code = models.CharField(max_length=2, unique=True, primary_key=True)
    name = models.CharField(max_length=100)
    phone_code = models.CharField(max_length=10, blank=True, default='', help_text="International dialling code (e.g., +44)")
    vat_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="VAT percentage (e.g., 20.00 for 20%)"
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_countrys'
        verbose_name = 'VAT Country'
        verbose_name_plural = 'VAT Countries'

    def __str__(self):
        return f"{self.code} - {self.name}"


class UtilsCountryRegion(models.Model):
    """Country-to-region mapping with effective dates."""

    country = models.ForeignKey('UtilsCountrys', on_delete=models.CASCADE)
    region = models.ForeignKey(UtilsRegion, on_delete=models.CASCADE)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_country_region'
        unique_together = ['country', 'effective_from']

    def clean(self):
        """Validate that effective_to is after effective_from."""
        if self.effective_to and self.effective_to <= self.effective_from:
            raise ValidationError('effective_to must be after effective_from')

    def is_current(self):
        """
        Check if mapping is currently active.

        Returns:
            bool: True if mapping is active today, False otherwise
        """
        from datetime import date
        today = date.today()

        # Check if mapping has started
        if self.effective_from > today:
            return False

        # Check if mapping has expired
        if self.effective_to and self.effective_to < today:
            return False

        return True

    is_current.boolean = True  # Display as boolean icon in admin
    is_current.short_description = 'Current?'

    def __str__(self):
        return f"{self.country.code} → {self.region.code} (from {self.effective_from})"


# ============================================================================
# Email System Models - MOVED TO email_system app (20260115-util-refactoring)
# ============================================================================
# The following models have been moved to the email_system app:
# - EmailTemplate
# - EmailAttachment
# - EmailTemplateAttachment
# - EmailQueue
# - EmailLog
# - EmailSettings
# - EmailContentRule
# - EmailTemplateContentRule
# - EmailContentPlaceholder
#
# Import from email_system.models instead:
# from email_system.models import EmailTemplate, EmailQueue, EmailLog, etc.
# ============================================================================
