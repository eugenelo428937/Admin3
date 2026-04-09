"""Legacy product archive.

Flat denormalized table holding all historical ActEd product rows
imported from the legacy CSV exports (1995-2026). Each CSV row becomes
one row here — no uniqueness constraints, no FK relationships to the
modern acted.* catalog/store tables.

The normalized_name column is populated by the normalize_fullname()
helper from catalog.management.commands._legacy_import_helpers and
powers the legacy product search endpoint.

Table: legacy.products
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
        db_index=True,
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
