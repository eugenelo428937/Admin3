# Generated by Django 5.2.2 on 2025-07-09 13:40

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exam_sessions_subjects", "0002_initial"),
        (
            "exam_sessions_subjects_products",
            "0006_price_price_type_alter_price_variation_and_more",
        ),
        ("products", "0006_productbundle_productbundleproduct_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExamSessionSubjectBundle",
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
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this bundle is currently available for this exam session",
                    ),
                ),
                (
                    "display_order",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Order in which to display this bundle for this exam session",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "bundle",
                    models.ForeignKey(
                        help_text="The bundle template from the master table",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="products.productbundle",
                    ),
                ),
                (
                    "exam_session_subject",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="available_bundles",
                        to="exam_sessions_subjects.examsessionsubject",
                    ),
                ),
            ],
            options={
                "verbose_name": "Exam Session Subject Bundle",
                "verbose_name_plural": "Exam Session Subject Bundles",
                "db_table": "acted_exam_session_subject_bundles",
                "ordering": ["display_order", "bundle__bundle_name"],
                "unique_together": {("exam_session_subject", "bundle")},
            },
        ),
        migrations.CreateModel(
            name="ExamSessionSubjectBundleProduct",
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
                    "default_price_type",
                    models.CharField(
                        choices=[
                            ("standard", "Standard"),
                            ("retaker", "Retaker"),
                            ("additional", "Additional Copy"),
                        ],
                        default="standard",
                        help_text="Default price type for this product when added via bundle",
                        max_length=20,
                    ),
                ),
                (
                    "quantity",
                    models.PositiveIntegerField(
                        default=1,
                        help_text="Number of this product to add when bundle is selected",
                    ),
                ),
                (
                    "sort_order",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Display order of this product within the bundle",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this product is currently active in the bundle",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "bundle",
                    models.ForeignKey(
                        help_text="The exam session bundle this product belongs to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="bundle_products",
                        to="exam_sessions_subjects_products.examsessionsubjectbundle",
                    ),
                ),
                (
                    "exam_session_subject_product",
                    models.ForeignKey(
                        help_text="The specific exam session product included in this bundle",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="exam_sessions_subjects_products.examsessionsubjectproduct",
                    ),
                ),
                (
                    "exam_session_subject_product_variation",
                    models.ForeignKey(
                        blank=True,
                        help_text="Specific variation of the exam session product (optional)",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="exam_sessions_subjects_products.examsessionsubjectproductvariation",
                    ),
                ),
            ],
            options={
                "verbose_name": "Exam Session Bundle Product",
                "verbose_name_plural": "Exam Session Bundle Products",
                "db_table": "acted_exam_session_subject_bundle_products",
                "ordering": [
                    "sort_order",
                    "exam_session_subject_product__product__shortname",
                ],
                "unique_together": {
                    (
                        "bundle",
                        "exam_session_subject_product",
                        "exam_session_subject_product_variation",
                    )
                },
            },
        ),
    ]
