"""Legacy archive models.

Flat denormalized tables holding historical ActEd data imported from
legacy CSV exports. No FK relationships to the modern acted.* tables —
joins are via indexed code/ref fields.

Tables:
  legacy.products     — product catalog rows (1995-2026)
  legacy.orders       — order headers grouped by student + date + delivery
  legacy.order_items  — individual order line items
"""
from django.db import models


class LegacyProduct(models.Model):
    """One row from a legacy product CSV, stored flat for search."""

    subject_code = models.CharField(
        max_length=10,
        db_index=True,
        help_text='Subject code (e.g., CM2, 101, CB1)',
    )
    delivery_format = models.CharField(
        max_length=1,
        help_text='Delivery format: P=Printed, C=eBook, M=Marking, T=Tutorial',
    )
    product_template_code = models.CharField(
        max_length=50,
        help_text='Product template code from CSV col3 (e.g., N, C, X, EX)',
    )
    session_code = models.CharField(
        max_length=10,
        db_index=True,
        help_text='Exam session code (e.g., 95, 01, 20, 26S)',
    )
    full_code = models.CharField(
        max_length=64,
        unique=True,
        help_text='Full product code from CSV col5 (e.g., CM2/PC/20)',
    )
    legacy_product_name = models.TextField(
        help_text='Original raw fullname from the CSV (col6)',
    )
    short_name = models.CharField(
        max_length=255,
        help_text='Short name from the CSV (col7)',
    )
    normalized_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text='Output of normalize_fullname() — powers search matching',
    )
    source_file = models.CharField(
        max_length=100,
        help_text='CSV filename this row was imported from (provenance)',
    )
    source_line = models.PositiveIntegerField(
        help_text='Line number in the source CSV (provenance)',
    )

    class Meta:
        db_table = '"legacy"."products"'
        verbose_name = 'Legacy Product'
        verbose_name_plural = 'Legacy Products'
        indexes = [
            models.Index(
                fields=['subject_code', 'session_code'],
                name='legacy_prod_subj_sess_idx',
            ),
            models.Index(
                fields=['normalized_name'],
                name='legacy_prod_norm_name_idx',
            ),
        ]

    def __str__(self):
        return f'{self.full_code} — {self.legacy_product_name}'


class LegacyOrder(models.Model):
    """Order header grouped by student_ref + order_date + delivery_pref.

    Mixed-delivery orders (items split across Home and Work) are stored
    as separate LegacyOrder rows with the same student_ref and order_date.

    Table: legacy.orders
    """

    student_ref = models.IntegerField(
        db_index=True,
        help_text='Student reference (joins to acted.students.student_ref)',
    )
    order_date = models.DateField(
        help_text='Order date from CSV',
    )
    delivery_pref = models.CharField(
        max_length=1,
        help_text='Delivery preference: H=Home, W=Work',
    )

    class Meta:
        db_table = '"legacy"."orders"'
        verbose_name = 'Legacy Order'
        verbose_name_plural = 'Legacy Orders'
        indexes = [
            models.Index(
                fields=['student_ref', 'order_date'],
                name='legacy_ord_ref_date_idx',
            ),
        ]

    def __str__(self):
        return f'Order ref={self.student_ref} date={self.order_date} dlv={self.delivery_pref}'


class LegacyOrderItem(models.Model):
    """Individual order line item from the legacy CSV.

    Table: legacy.order_items
    """

    order = models.ForeignKey(
        LegacyOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    order_no = models.IntegerField(
        db_index=True,
        help_text='Legacy order line number (column 7 in CSV, not unique)',
    )
    product = models.ForeignKey(
        LegacyProduct,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='order_items',
        help_text='FK to legacy.products (null for session 26 items)',
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Price paid',
    )
    quantity = models.IntegerField(
        help_text='Quantity ordered',
    )
    free_of_charge = models.BooleanField(
        default=False,
        help_text='Item was free of charge',
    )
    is_retaker = models.BooleanField(
        default=False,
        help_text='Retaker pricing applied',
    )
    is_reduced = models.BooleanField(
        default=False,
        help_text='Reduced pricing applied',
    )
    is_additional = models.BooleanField(
        default=False,
        help_text='Additional copy',
    )
    is_reduced_rate = models.BooleanField(
        default=False,
        help_text='Reduced rate applied',
    )
    source_line = models.PositiveIntegerField(
        help_text='Line number in the source CSV (provenance)',
    )

    class Meta:
        db_table = '"legacy"."order_items"'
        verbose_name = 'Legacy Order Item'
        verbose_name_plural = 'Legacy Order Items'

    def __str__(self):
        code = self.product.full_code if self.product else '(no product)'
        return f'{code} qty={self.quantity} £{self.price}'
