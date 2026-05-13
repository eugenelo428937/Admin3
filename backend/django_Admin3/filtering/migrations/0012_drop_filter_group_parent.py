from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0011_alter_productproductgroup_product_group'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='filtergroup',
            name='parent',
        ),
    ]
