from django.db import models
from django.conf import settings
from django.utils import timezone
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

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
    
    # Product references - either regular product or marking voucher
    product = models.ForeignKey(ExamSessionSubjectProduct, on_delete=models.CASCADE, null=True, blank=True)
    marking_voucher = models.ForeignKey('marking_vouchers.MarkingVoucher', on_delete=models.CASCADE, null=True, blank=True)
    
    # Item type to distinguish between products, vouchers, and fees
    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('marking_voucher', 'Marking Voucher'),
        ('fee', 'Fee'),
    ]
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='product')
    
    quantity = models.PositiveIntegerField(default=1)
    price_type = models.CharField(max_length=20, default="standard")  # standard, retaker, additional
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    has_expired_deadline = models.BooleanField(default=False, help_text="Indicates if marking product has expired deadlines")
    expired_deadlines_count = models.IntegerField(default=0, help_text="Number of expired deadlines for marking products")
    marking_paper_count = models.IntegerField(default=0, help_text="Total number of marking papers for marking products")
    is_marking = models.BooleanField(default=False, help_text="Indicates if this is a marking product")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data (e.g., tutorial choices, variation IDs)")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'acted_cart_items'
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        ordering = ['added_at']
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(item_type='fee')
                ),
                name='cart_item_has_product_or_voucher_or_is_fee'
            ),
            models.CheckConstraint(
                check=~(models.Q(product__isnull=False) & models.Q(marking_voucher__isnull=False)),
                name='cart_item_not_both_product_and_voucher'
            )
        ]

    def __str__(self):
        if self.item_type == 'marking_voucher':
            return f"{self.quantity} x {self.marking_voucher} in cart {self.cart.id}"
        return f"{self.quantity} x {self.product} ({self.price_type}) in cart {self.cart.id}"
    
    @property
    def item_name(self):
        """Get the display name of the item"""
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.name
        return str(self.product)
    
    @property
    def item_price(self):
        """Get the price of the item"""
        if self.actual_price is not None:
            return self.actual_price
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.price
        return None

class CartFee(models.Model):
    """
    Model for cart fees (booking fees, service charges, etc.)
    These are separate from regular cart items as they're not products
    """
    FEE_TYPES = [
        ('tutorial_booking_fee', 'Tutorial Booking Fee'),
        ('service_charge', 'Service Charge'),
        ('processing_fee', 'Processing Fee'),
        ('convenience_fee', 'Convenience Fee'),
    ]
    
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='fees')
    fee_type = models.CharField(max_length=50, choices=FEE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GBP')
    is_refundable = models.BooleanField(default=False)
    applied_at = models.DateTimeField(auto_now_add=True)
    applied_by_rule = models.IntegerField(null=True, blank=True, help_text="Rule ID that applied this fee")
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'acted_cart_fees'
        verbose_name = 'Cart Fee'
        verbose_name_plural = 'Cart Fees'
        unique_together = ['cart', 'fee_type']  # Prevent duplicate fee types per cart
    
    def __str__(self):
        return f"{self.name} - £{self.amount} ({self.cart.user.email})"
    
    @property
    def amount_display(self):
        """Display amount with currency symbol"""
        if self.currency == 'GBP':
            return f"£{self.amount}"
        elif self.currency == 'USD':
            return f"${self.amount}"
        elif self.currency == 'EUR':
            return f"€{self.amount}"
        return f"{self.amount} {self.currency}"

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
    
    # Product references - either regular product or marking voucher
    product = models.ForeignKey(ExamSessionSubjectProduct, on_delete=models.CASCADE, null=True, blank=True)
    marking_voucher = models.ForeignKey('marking_vouchers.MarkingVoucher', on_delete=models.CASCADE, null=True, blank=True)
    
    # Item type to distinguish between products, vouchers, and fees
    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('marking_voucher', 'Marking Voucher'),
        ('fee', 'Fee'),
    ]
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='product')
    
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
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(item_type='fee')
                ),
                name='order_item_has_product_or_voucher_or_is_fee'
            ),
            models.CheckConstraint(
                check=~(models.Q(product__isnull=False) & models.Q(marking_voucher__isnull=False)),
                name='order_item_not_both_product_and_voucher'
            )
        ]

    def __str__(self):
        if self.item_type == 'marking_voucher':
            return f"{self.quantity} x {self.marking_voucher} - £{self.gross_amount} (Order #{self.order.id})"
        return f"{self.quantity} x {self.product} ({self.price_type}) - £{self.gross_amount} (Order #{self.order.id})"
    
    @property
    def item_name(self):
        """Get the display name of the item"""
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.name
        return str(self.product)
    
    @property
    def item_price(self):
        """Get the price of the item"""
        if self.actual_price is not None:
            return self.actual_price
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.price
        return None

class OrderUserAcknowledgment(models.Model):
    """Generic model to store all types of user acknowledgments for orders"""
    
    # Acknowledgment types
    ACKNOWLEDGMENT_TYPE_CHOICES = [
        ('terms_conditions', 'Terms & Conditions'),
        ('product_specific', 'Product-Specific Acknowledgment'),
        ('deadline_expired', 'Expired Deadline Acknowledgment'),
        ('policy_change', 'Policy Change Acknowledgment'),
        ('warning', 'Warning Acknowledgment'),
        ('custom', 'Custom Acknowledgment'),
    ]
    
    order = models.ForeignKey(
        ActedOrder, 
        on_delete=models.CASCADE, 
        related_name='user_acknowledgments',
        help_text="Associated order for this acknowledgment"
    )
    
    # Type and identification
    acknowledgment_type = models.CharField(
        max_length=50,
        choices=ACKNOWLEDGMENT_TYPE_CHOICES,
        help_text="Type of acknowledgment required"
    )
    rule_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of the rule that triggered this acknowledgment"
    )
    template_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of the message template used for this acknowledgment"
    )
    
    # Acknowledgment details
    title = models.CharField(
        max_length=255,
        help_text="Title/subject of the acknowledgment"
    )
    content_summary = models.TextField(
        help_text="Brief summary of what was acknowledged"
    )
    is_accepted = models.BooleanField(
        default=False,
        help_text="Whether user accepted/acknowledged this requirement"
    )
    accepted_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when acknowledgment was made"
    )
    
    # User session information for audit trail
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of user who made the acknowledgment"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string of browser used to make acknowledgment"
    )
    
    # Version tracking and data
    content_version = models.CharField(
        max_length=20,
        default='1.0',
        help_text="Version of content that was acknowledged"
    )
    acknowledgment_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured data related to this acknowledgment (product IDs, specific conditions, etc.)"
    )
    
    # Rules engine integration
    rules_engine_context = models.JSONField(
        default=dict,
        blank=True,
        help_text="Context data from rules engine evaluation that triggered this acknowledgment"
    )
    
    class Meta:
        db_table = 'acted_order_user_acknowledgments'
        verbose_name = 'Order User Acknowledgment'
        verbose_name_plural = 'Order User Acknowledgments'
        ordering = ['-accepted_at']
        indexes = [
            models.Index(fields=['order', 'acknowledgment_type']),
            models.Index(fields=['rule_id']),
            models.Index(fields=['acknowledgment_type']),
        ]
    
    def __str__(self):
        status = "Accepted" if self.is_accepted else "Pending"
        return f"{self.get_acknowledgment_type_display()} {status} for Order #{self.order.id}"
    
    @property 
    def is_terms_and_conditions(self):
        """Check if this is a Terms & Conditions acknowledgment"""
        return self.acknowledgment_type == 'terms_conditions'
    
    @property
    def is_product_specific(self):
        """Check if this is a product-specific acknowledgment"""
        return self.acknowledgment_type == 'product_specific'
    
    def get_affected_products(self):
        """Get list of product IDs affected by this acknowledgment"""
        return self.acknowledgment_data.get('product_ids', [])
    
    def add_product_acknowledgment(self, product_id, condition_type, condition_details):
        """Add a product-specific acknowledgment detail"""
        if 'products' not in self.acknowledgment_data:
            self.acknowledgment_data['products'] = {}
        
        self.acknowledgment_data['products'][str(product_id)] = {
            'condition_type': condition_type,
            'condition_details': condition_details,
            'acknowledged_at': timezone.now().isoformat()
        }
        self.save()
    
    # Backward compatibility methods for Terms & Conditions
    @property
    def general_terms_accepted(self):
        """Backward compatibility: Check if general terms were accepted"""
        return (self.acknowledgment_type == 'terms_conditions' and self.is_accepted)
    
    @property
    def terms_version(self):
        """Backward compatibility: Get terms version"""
        return self.content_version
    
    @property
    def product_acknowledgments(self):
        """Backward compatibility: Get product acknowledgments"""
        return self.acknowledgment_data.get('products', {})


class OrderUserPreference(models.Model):
    """Store user preferences collected during checkout for an order"""

    # Preference type choices
    PREFERENCE_TYPE_CHOICES = [
        ('marketing', 'Marketing Preferences'),
        ('communication', 'Communication Preferences'),
        ('delivery', 'Delivery Preferences'),
        ('notification', 'Notification Preferences'),
        ('custom', 'Custom Preference'),
    ]

    # Input type choices
    INPUT_TYPE_CHOICES = [
        ('radio', 'Radio Button'),
        ('checkbox', 'Checkbox'),
        ('text', 'Text Input'),
        ('textarea', 'Text Area'),
        ('select', 'Dropdown Select'),
        ('custom', 'Custom Input'),
    ]

    # Display mode choices
    DISPLAY_MODE_CHOICES = [
        ('inline', 'Inline Display'),
        ('modal', 'Modal Dialog'),
    ]

    # Core relationships
    order = models.ForeignKey(
        ActedOrder,
        on_delete=models.CASCADE,
        related_name='user_preferences',
        help_text="Associated order for this preference"
    )

    # Import rules models at module level to avoid circular imports
    rule = models.ForeignKey(
        'rules_engine.ActedRule',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    template = models.ForeignKey(
        'rules_engine.MessageTemplate',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    # Preference identification
    preference_type = models.CharField(
        max_length=50,
        choices=PREFERENCE_TYPE_CHOICES,
        default='custom',
        help_text="Type of preference"
    )
    preference_key = models.CharField(
        max_length=100,
        help_text="Unique key identifying this preference"
    )
    preference_value = models.JSONField(
        default=dict,
        help_text="User's preference value(s) stored as JSON"
    )

    # Input metadata
    input_type = models.CharField(
        max_length=20,
        choices=INPUT_TYPE_CHOICES,
        default='text',
        help_text="Type of input used to collect this preference"
    )
    display_mode = models.CharField(
        max_length=20,
        choices=DISPLAY_MODE_CHOICES,
        default='inline',
        help_text="How the preference was displayed to the user"
    )

    # Content details
    title = models.CharField(
        max_length=255,
        help_text="Title of the preference displayed to user"
    )
    content_summary = models.TextField(
        blank=True,
        help_text="Brief summary of the preference content"
    )

    # Behavioral flags
    is_submitted = models.BooleanField(
        default=True,
        help_text="Whether the user has submitted this preference"
    )

    # Audit fields
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Rules engine integration
    rules_engine_context = models.JSONField(
        default=dict,
        blank=True,
        help_text="Context data from rules engine evaluation"
    )

    class Meta:
        db_table = 'acted_order_user_preferences'
        verbose_name = 'Order User Preference'
        verbose_name_plural = 'Order User Preferences'
        unique_together = ['order', 'rule', 'preference_key']
        indexes = [
            models.Index(fields=['order', 'preference_type']),
            models.Index(fields=['preference_key']),
            models.Index(fields=['submitted_at']),
        ]

    def __str__(self):
        return f"Order #{self.order.id} preference: {self.preference_key}"

    def get_display_value(self):
        """Get human-readable display value for the preference"""
        if self.input_type == 'radio':
            return self.preference_value.get('choice', '')
        elif self.input_type == 'checkbox':
            selections = self.preference_value.get('selections', [])
            return ', '.join(selections) if selections else ''
        elif self.input_type in ['text', 'textarea']:
            return self.preference_value.get('text', '')
        elif self.input_type == 'select':
            return self.preference_value.get('selected', '')
        return str(self.preference_value)


class OrderUserContact(models.Model):
    """Store order-specific contact information"""
    order = models.ForeignKey(
        ActedOrder,
        on_delete=models.CASCADE,
        related_name='user_contact',
        help_text="Associated order for this contact information"
    )

    # Contact Information
    home_phone = models.CharField(max_length=20, null=True, blank=True)
    mobile_phone = models.CharField(max_length=20, help_text="Required mobile phone number")
    work_phone = models.CharField(max_length=20, null=True, blank=True)
    email_address = models.EmailField(max_length=254, help_text="Required email address")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_order_user_contact'
        verbose_name = 'Order User Contact'
        verbose_name_plural = 'Order User Contacts'
        indexes = [
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f"Contact for Order #{self.order.id}: {self.email_address}"


class OrderDeliveryDetail(models.Model):
    """Store order-specific delivery and invoice address details"""
    ADDRESS_TYPE_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
    ]

    order = models.ForeignKey(
        ActedOrder,
        on_delete=models.CASCADE,
        related_name='delivery_detail',
        help_text="Associated order for this delivery detail"
    )

    # Delivery Address
    delivery_address_type = models.CharField(
        max_length=10,
        choices=ADDRESS_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Type of delivery address (home/work)"
    )
    delivery_address_line1 = models.CharField(max_length=255, null=True, blank=True)
    delivery_address_line2 = models.CharField(max_length=255, null=True, blank=True)
    delivery_city = models.CharField(max_length=100, null=True, blank=True)
    delivery_state = models.CharField(max_length=100, null=True, blank=True)
    delivery_postal_code = models.CharField(max_length=20, null=True, blank=True)
    delivery_country = models.CharField(max_length=100, null=True, blank=True)

    # Invoice Address
    invoice_address_type = models.CharField(
        max_length=10,
        choices=ADDRESS_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Type of invoice address (home/work)"
    )
    invoice_address_line1 = models.CharField(max_length=255, null=True, blank=True)
    invoice_address_line2 = models.CharField(max_length=255, null=True, blank=True)
    invoice_city = models.CharField(max_length=100, null=True, blank=True)
    invoice_state = models.CharField(max_length=100, null=True, blank=True)
    invoice_postal_code = models.CharField(max_length=20, null=True, blank=True)
    invoice_country = models.CharField(max_length=100, null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_order_delivery_detail'
        verbose_name = 'Order Delivery Detail'
        verbose_name_plural = 'Order Delivery Details'
        indexes = [
            models.Index(fields=['order']),
        ]

    def __str__(self):
        delivery_type = self.delivery_address_type or 'unspecified'
        return f"Delivery Detail for Order #{self.order.id}: {delivery_type} delivery"


class ActedOrderPayment(models.Model):
    """Model to store payment transaction details for orders"""
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('invoice', 'Invoice'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    order = models.ForeignKey(ActedOrder, on_delete=models.CASCADE, related_name='payments')
    
    # Payment details
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='card')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Payment amount")
    currency = models.CharField(max_length=3, default='GBP', help_text="Payment currency")
    
    # Transaction details
    transaction_id = models.CharField(max_length=100, null=True, blank=True, help_text="Opayo transaction ID")
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Client information
    client_ip = models.GenericIPAddressField(null=True, blank=True, help_text="Client IP address")
    user_agent = models.TextField(null=True, blank=True, help_text="User agent string")
    
    # Opayo response data
    opayo_response = models.JSONField(default=dict, blank=True, help_text="Full Opayo API response")
    opayo_status_code = models.CharField(max_length=10, null=True, blank=True, help_text="Opayo status code")
    opayo_status_detail = models.CharField(max_length=200, null=True, blank=True, help_text="Opayo status detail")
    
    # Error information
    error_message = models.TextField(null=True, blank=True, help_text="Error message if payment failed")
    error_code = models.CharField(max_length=50, null=True, blank=True, help_text="Error code if payment failed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True, help_text="When payment was processed")
    
    # Additional metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional payment metadata")
    
    class Meta:
        db_table = 'acted_order_payments'
        verbose_name = 'Order Payment'
        verbose_name_plural = 'Order Payments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} for Order #{self.order.id} - {self.status} (£{self.amount})"
    
    @property
    def is_successful(self):
        """Check if payment was successful"""
        return self.status == 'completed'
    
    @property
    def is_card_payment(self):
        """Check if this is a card payment"""
        return self.payment_method == 'card'
    
    @property
    def is_invoice_payment(self):
        """Check if this is an invoice payment"""
        return self.payment_method == 'invoice'
