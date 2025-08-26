# Generated migration to update entry points to match new specification
# This migration simplifies entry points to match the new JSONB-based rules engine

from django.db import migrations, models


def update_entry_points_to_spec(apps, schema_editor):
    """Update RuleEntryPoint table to match new specification"""
    RuleEntryPoint = apps.get_model('rules_engine', 'RuleEntryPoint')
    
    # Clear existing entry points
    RuleEntryPoint.objects.all().delete()
    
    # Create new entry points based on specification
    entry_points = [
        ('home_page_mount', 'Home Page Mount', 'Triggered when the home page is loaded'),
        ('checkout_terms', 'Checkout Terms & Conditions', 'Triggered when terms and conditions are displayed during checkout'),
        ('payment_process', 'Payment Process', 'Triggered during payment processing'),
        ('product_view', 'Product View', 'Triggered when viewing product details'),
    ]
    
    for code, name, description in entry_points:
        RuleEntryPoint.objects.create(
            code=code,
            name=name,
            description=description,
            is_active=True
        )


def reverse_entry_points_update(apps, schema_editor):
    """Reverse migration - restore original entry points"""
    RuleEntryPoint = apps.get_model('rules_engine', 'RuleEntryPoint')
    
    # Clear spec-based entry points
    RuleEntryPoint.objects.all().delete()
    
    # Restore original entry points
    original_entry_points = [
        ('home_page_mount', 'Home Page Mount', 'Triggered when the home page is loaded'),
        ('product_list_mount', 'Product List Mount', 'Triggered when product list page is loaded'),
        ('add_to_cart', 'Add to Cart', 'Triggered when a product is added to the cart'),
        ('checkout_start', 'Checkout Start', 'Triggered at the beginning of the checkout process'),
        ('checkout_terms', 'Checkout Terms & Conditions', 'Triggered when terms and conditions are displayed'),
        ('checkout_details', 'Checkout Details', 'Triggered when checkout details are entered'),
        ('checkout_payment_start', 'Checkout Payment Start', 'Triggered when payment process begins'),
        ('checkout_payment_end', 'Checkout Payment End', 'Triggered when payment process completes'),
        ('checkout_order_placed', 'Checkout Order Placed', 'Triggered after successful order placement'),
        ('user_registration_start', 'User Registration Start', 'Triggered at the start of user registration'),
        ('user_registration_end', 'User Registration End', 'Triggered after successful user registration'),
        ('user_authenticated', 'User Authenticated', 'Triggered when user successfully logs in'),
    ]
    
    for code, name, description in original_entry_points:
        RuleEntryPoint.objects.create(
            code=code,
            name=name,
            description=description,
            is_active=True
        )


class Migration(migrations.Migration):

    dependencies = [
        ("rules_engine", "0012_alter_rulecondition_condition_type"),
    ]

    operations = [
        # Update field choices to match new spec
        migrations.AlterField(
            model_name="ruleentrypoint",
            name="code",
            field=models.CharField(
                choices=[
                    ("home_page_mount", "Home Page Mount"),
                    ("checkout_terms", "Checkout Terms & Conditions"),
                    ("payment_process", "Payment Process"),
                    ("product_view", "Product View"),
                ],
                max_length=30,
                unique=True,
            ),
        ),
        # Update entry points data
        migrations.RunPython(
            update_entry_points_to_spec,
            reverse_code=reverse_entry_points_update,
        ),
    ]