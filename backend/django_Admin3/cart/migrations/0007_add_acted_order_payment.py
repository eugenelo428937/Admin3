# Generated by Django 5.2.2 on 2025-06-30 14:23

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cart", "0006_actedorder_calculations_applied_actedorder_subtotal_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActedOrderPayment",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "payment_method",
                    models.CharField(
                        choices=[
                            ("card", "Credit/Debit Card"),
                            ("invoice", "Invoice"),
                            ("bank_transfer", "Bank Transfer"),
                        ],
                        default="card",
                        max_length=20,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2, help_text="Payment amount", max_digits=10
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        default="GBP", help_text="Payment currency", max_length=3
                    ),
                ),
                (
                    "transaction_id",
                    models.CharField(
                        blank=True,
                        help_text="Opayo transaction ID",
                        max_length=100,
                        null=True,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                            ("refunded", "Refunded"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                (
                    "client_ip",
                    models.GenericIPAddressField(
                        blank=True, help_text="Client IP address", null=True
                    ),
                ),
                (
                    "user_agent",
                    models.TextField(
                        blank=True, help_text="User agent string", null=True
                    ),
                ),
                (
                    "opayo_response",
                    models.JSONField(
                        blank=True, default=dict, help_text="Full Opayo API response"
                    ),
                ),
                (
                    "opayo_status_code",
                    models.CharField(
                        blank=True,
                        help_text="Opayo status code",
                        max_length=10,
                        null=True,
                    ),
                ),
                (
                    "opayo_status_detail",
                    models.CharField(
                        blank=True,
                        help_text="Opayo status detail",
                        max_length=200,
                        null=True,
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True,
                        help_text="Error message if payment failed",
                        null=True,
                    ),
                ),
                (
                    "error_code",
                    models.CharField(
                        blank=True,
                        help_text="Error code if payment failed",
                        max_length=50,
                        null=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "processed_at",
                    models.DateTimeField(
                        blank=True, help_text="When payment was processed", null=True
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Additional payment metadata",
                    ),
                ),
                (
                    "order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="cart.actedorder",
                    ),
                ),
            ],
            options={
                "verbose_name": "Order Payment",
                "verbose_name_plural": "Order Payments",
                "db_table": "acted_order_payments",
                "ordering": ["-created_at"],
            },
        ),
    ]
