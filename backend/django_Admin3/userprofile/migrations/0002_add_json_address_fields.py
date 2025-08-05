# Generated migration for JSON address fields
from django.db import migrations, models


def migrate_address_data_to_json(apps, schema_editor):
    """Migrate existing address data to JSON format"""
    UserProfileAddress = apps.get_model('userprofile', 'UserProfileAddress')
    
    for address in UserProfileAddress.objects.all():
        # Create JSON data from existing fields
        address_data = {}
        
        # Map old fields to new JSON structure
        if hasattr(address, 'building') and address.building:
            address_data['building'] = address.building
        if hasattr(address, 'street') and address.street:
            address_data['address'] = address.street  # Use 'address' as the generic field name
        if hasattr(address, 'district') and address.district:
            address_data['district'] = address.district
        if hasattr(address, 'town') and address.town:
            address_data['city'] = address.town  # Use 'city' as the generic field name
        if hasattr(address, 'county') and address.county:
            address_data['state'] = address.county  # Use 'state' as the generic field name
        if hasattr(address, 'postcode') and address.postcode:
            address_data['postal_code'] = address.postcode
        if hasattr(address, 'state') and address.state:
            address_data['state'] = address.state
        
        # Set the JSON data
        address.address_data = address_data
        address.save()


def reverse_migrate_address_data(apps, schema_editor):
    """Reverse migration - populate old fields from JSON data"""
    UserProfileAddress = apps.get_model('userprofile', 'UserProfileAddress')
    
    for address in UserProfileAddress.objects.all():
        if address.address_data:
            # Map JSON data back to old fields
            address.building = address.address_data.get('building', '')
            address.street = address.address_data.get('address', '')
            address.district = address.address_data.get('district', '')
            address.town = address.address_data.get('city', '')
            address.county = address.address_data.get('state', '')
            address.postcode = address.address_data.get('postal_code', '')
            address.save()


class Migration(migrations.Migration):

    dependencies = [
        ('userprofile', '0001_initial'),
    ]

    operations = [
        # Add the JSON field first
        migrations.AddField(
            model_name='userprofileaddress',
            name='address_data',
            field=models.JSONField(default=dict, help_text='Address data in JSON format to support different country address structures'),
        ),
        
        # Migrate existing data to JSON format
        migrations.RunPython(
            migrate_address_data_to_json,
            reverse_migrate_address_data
        ),
        
        # Remove old individual address fields (we'll keep them for now for backward compatibility)
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='building',
        # ),
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='street',
        # ),
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='district',
        # ),
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='town',
        # ),
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='county',
        # ),
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='postcode',
        # ),
        # migrations.RemoveField(
        #     model_name='userprofileaddress',
        #     name='state',
        # ),
    ]