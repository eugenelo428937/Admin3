# Generated manually for table rename

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0018_add_order_contact_models'),
    ]

    operations = [
        # Rename the table and related name
        migrations.RenameModel(
            old_name='OrderDeliveryPreference',
            new_name='OrderDeliveryDetail',
        ),
        # Update the database table name
        migrations.AlterModelTable(
            name='orderdeliverydetail',
            table='acted_order_delivery_detail',
        ),
        # Update the verbose names
        migrations.AlterModelOptions(
            name='orderdeliverydetail',
            options={
                'verbose_name': 'Order Delivery Detail',
                'verbose_name_plural': 'Order Delivery Details',
            },
        ),
    ]