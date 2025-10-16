"""
Rule Entry Point Model
"""
from .base import models


class RuleEntryPoint(models.Model):
    """Strict predefined entry points for rule execution"""
    ENTRY_POINTS = [
        ('home_page_mount', 'Home Page Mount'),
        ('product_list_mount', 'Product List Mount'),
        ('product_card_mount', 'Product Card Mount'),
        ('checkout_start', 'Checkout Start'),
        ('checkout_preference', 'Checkout Preference'),
        ('checkout_terms', 'Checkout Terms'),
        ('checkout_payment', 'Checkout Payment'),
        ('user_registration', 'User Registration'),
        ('cart_calculate_vat', 'Cart Calculate VAT'),
    ]
    
    code = models.CharField(max_length=30, choices=ENTRY_POINTS, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'acted_rule_entry_points'
        verbose_name = 'Rule Entry Point'
        verbose_name_plural = 'Rule Entry Points'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"