# Generated manually for adding fee item type

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0005_cart_has_material_cart_has_tutorial_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='actedorderitem',
            name='item_type',
            field=models.CharField(choices=[('product', 'Product'), ('marking_voucher', 'Marking Voucher'), ('fee', 'Fee')], default='product', max_length=20),
        ),
        migrations.AlterField(
            model_name='cartitem',
            name='item_type',
            field=models.CharField(choices=[('product', 'Product'), ('marking_voucher', 'Marking Voucher'), ('fee', 'Fee')], default='product', max_length=20),
        ),
    ]