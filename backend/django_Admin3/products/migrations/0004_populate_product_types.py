# products/migrations/XXXX_populate_product_types.py
from django.db import migrations

def create_product_types_and_subtypes(apps, schema_editor):
    ProductType = apps.get_model('products', 'ProductType')
    ProductSubtype = apps.get_model('products', 'ProductSubtype')

    # Create Product Types
    materials = ProductType.objects.create(name='Materials')
    tutorials = ProductType.objects.create(name='Tutorials')
    marking = ProductType.objects.create(name='Marking')

    # Create Subtypes for Materials
    ProductSubtype.objects.create(product_type=materials, name='Paper')
    ProductSubtype.objects.create(product_type=materials, name='eBook')

    # Create Subtypes for Tutorials
    ProductSubtype.objects.create(product_type=tutorials, name='Face-to-face')
    ProductSubtype.objects.create(product_type=tutorials, name='Online Classroom')
    ProductSubtype.objects.create(product_type=tutorials, name='Live Online')

    # Create Subtypes for Marking
    ProductSubtype.objects.create(product_type=marking, name='Series X Marking')
    ProductSubtype.objects.create(product_type=marking, name='Series Y Marking')
    ProductSubtype.objects.create(product_type=marking, name='Mock Exam Marking')
    ProductSubtype.objects.create(product_type=marking, name='Marking Vouchers')

def reverse_product_types_and_subtypes(apps, schema_editor):
    ProductType = apps.get_model('products', 'ProductType')
    ProductType.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('products', 'previous_migration'),  # Replace with actual previous migration
    ]

    operations = [
        migrations.RunPython(
            create_product_types_and_subtypes,
            reverse_product_types_and_subtypes
        ),
    ]
