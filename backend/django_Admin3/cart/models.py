from django.db import models
from django.conf import settings
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    session_key = models.CharField(max_length=40, null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_carts'
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'
        ordering = ['updated_at']

    def __str__(self):
        if self.user:
            return f"Cart (User: {self.user.username})"
        return f"Cart (Session: {self.session_key})"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(ExamSessionSubjectProduct, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_type = models.CharField(max_length=20, default="standard")  # standard, retaker, additional
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data (e.g., tutorial choices, variation IDs)")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'acted_cart_items'
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        ordering = ['added_at']

    def __str__(self):
        return f"{self.quantity} x {self.product} ({self.price_type}) in cart {self.cart.id}"

class ActedOrder(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # Order totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total before VAT and fees")
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total VAT amount")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Final total including VAT")
    
    # VAT information
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True, help_text="VAT rate applied (e.g., 0.2000 for 20%)")
    vat_country = models.CharField(max_length=2, null=True, blank=True, help_text="Country code for VAT calculation")
    vat_calculation_type = models.CharField(max_length=50, null=True, blank=True, help_text="Type of VAT calculation used")
    
    # Rule engine calculations
    calculations_applied = models.JSONField(default=dict, blank=True, help_text="All rule engine calculations applied to this order")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} by {self.user.username} (£{self.total_amount})"

class ActedOrderItem(models.Model):
    order = models.ForeignKey(ActedOrder, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(ExamSessionSubjectProduct, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_type = models.CharField(max_length=20, default="standard")  # standard, retaker, additional
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # VAT information per item
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Amount before VAT")
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="VAT amount for this item")
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total amount including VAT")
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0000, help_text="VAT rate applied to this item")
    is_vat_exempt = models.BooleanField(default=False, help_text="Whether this item is exempt from VAT")
    
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data (e.g., tutorial choices, variation IDs)")

    class Meta:
        db_table = 'acted_order_items'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f"{self.quantity} x {self.product} ({self.price_type}) - £{self.gross_amount} (Order #{self.order.id})"
