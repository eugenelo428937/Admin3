# Generated migration to update entry points to correct specification list
# Entry points: Home page mount, product list mount, product card mount, checkout start, checkout preference, checkout terms, checkout payment

from django.db import migrations, models


def update_entry_points_correct_list(apps, schema_editor):
    """Update RuleEntryPoint table to correct specification list"""
    RuleEntryPoint = apps.get_model('rules_engine', 'RuleEntryPoint')
    
    # Clear existing entry points
    RuleEntryPoint.objects.all().delete()
    
    # Create new entry points based on correct specification
    entry_points = [
        ('home_page_mount', 'Home Page Mount', 'Triggered when the home page is loaded'),
        ('product_list_mount', 'Product List Mount', 'Triggered when the product list page is loaded'),
        ('product_card_mount', 'Product Card Mount', 'Triggered when a product card is displayed'),
        ('checkout_start', 'Checkout Start', 'Triggered at the beginning of the checkout process'),
        ('checkout_preference', 'Checkout Preference', 'Triggered when checkout preferences are displayed'),
        ('checkout_terms', 'Checkout Terms', 'Triggered when terms and conditions are displayed during checkout'),
        ('checkout_payment', 'Checkout Payment', 'Triggered during checkout payment process'),
    ]
    
    for code, name, description in entry_points:
        RuleEntryPoint.objects.create(
            code=code,
            name=name,
            description=description,
            is_active=True
        )


def reverse_entry_points_correct_list(apps, schema_editor):
    """Reverse migration - restore previous entry points"""
    RuleEntryPoint = apps.get_model('rules_engine', 'RuleEntryPoint')
    
    # Clear current entry points
    RuleEntryPoint.objects.all().delete()
    
    # Restore previous entry points
    previous_entry_points = [
        ('home_page_mount', 'Home Page Mount', 'Triggered when the home page is loaded'),
        ('checkout_terms', 'Checkout Terms & Conditions', 'Triggered when terms and conditions are displayed during checkout'),
        ('payment_process', 'Payment Process', 'Triggered during payment processing'),
        ('product_view', 'Product View', 'Triggered when viewing product details'),
    ]
    
    for code, name, description in previous_entry_points:
        RuleEntryPoint.objects.create(
            code=code,
            name=name,
            description=description,
            is_active=True
        )


class Migration(migrations.Migration):

    dependencies = [
        ("rules_engine", "0013_update_entry_points_to_spec"),
    ]

    operations = [
        # Update field choices to match correct spec
        migrations.AlterField(
            model_name="ruleentrypoint",
            name="code",
            field=models.CharField(
                choices=[
                    ("home_page_mount", "Home Page Mount"),
                    ("product_list_mount", "Product List Mount"),
                    ("product_card_mount", "Product Card Mount"),
                    ("checkout_start", "Checkout Start"),
                    ("checkout_preference", "Checkout Preference"),
                    ("checkout_terms", "Checkout Terms"),
                    ("checkout_payment", "Checkout Payment"),
                ],
                max_length=30,
                unique=True,
            ),
        ),
        # Update entry points data
        migrations.RunPython(
            update_entry_points_correct_list,
            reverse_code=reverse_entry_points_correct_list,
        ),
    ]