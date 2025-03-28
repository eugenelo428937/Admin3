import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import CustomField
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize custom fields from Administrate API to local database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--entity-type',
            type=str,
            choices=['EVENT', 'CONTACT', 'OPPORTUNITY', 'ALL'],
            default='ALL',
            help='Type of entity to sync custom fields for'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force synchronization even if no changes detected'
        )

    def handle(self, *args, **options):
        entity_type = options['entity_type']
        force = options['force']

        self.stdout.write(f'Fetching custom fields from Administrate API for {entity_type}...')

        try:
            api_service = AdministrateAPIService()
            
            # Define the GraphQL query
            query = """
            query GetCustomFields($entityType: String) {
                customFields(type: $entityType) {
                    edges {
                        node {
                            key
                            label
                            type
                            roles
                            isRequired
                            isSystem                            
                            possibleValues {
                                edges {
                                    node {
                                        value
                                        label
                                    }
                                }
                            }
                        }
                    }
                }
            }
            """
            
            # If entity_type is ALL, fetch each type separately
            entity_types = ['EVENT', 'CONTACT', 'OPPORTUNITY'] if entity_type == 'ALL' else [entity_type]
            
            all_custom_fields = []
            for et in entity_types:
                variables = {"entityType": et}
                result = api_service.execute_query(query, variables)
                
                if not self._validate_response(result):
                    self.stdout.write(
                        self.style.WARNING(f'Invalid response format for {et}')
                    )
                    continue
                
                custom_fields = result['data']['customFields']['edges']
                self.stdout.write(
                    f'Retrieved {len(custom_fields)} custom fields for {et}'
                )
                all_custom_fields.extend(custom_fields)
            
            # Synchronize with database
            self._sync_custom_fields(all_custom_fields)
            
            self.stdout.write(
                self.style.SUCCESS('Custom fields synchronization completed successfully')
            )
            
        except AdministrateAPIError as e:
            self.stdout.write(self.style.ERROR(f'API error: {str(e)}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))

    def _validate_response(self, result):
        """Validate the API response format"""
        return (
            isinstance(result, dict) and
            'data' in result and
            'customFields' in result['data'] and
            'edges' in result['data']['customFields']
        )

    def _process_possible_values(self, field_data):
        """Process possible values from the API response"""
        if not field_data.get('possibleValues'):
            return None
            
        values = []
        for edge in field_data['possibleValues']['edges']:
            node = edge['node']
            values.append({
                'value': node['value'],
                'label': node['label']
            })
        return values

    @transaction.atomic
    def _sync_custom_fields(self, api_custom_fields):
        """Synchronize custom fields with database"""
        # Get existing custom fields
        existing_fields = {
            cf.external_id: cf for cf in CustomField.objects.all()
        }
        
        # Track IDs to detect removed items
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        
        for edge in api_custom_fields:
            node = edge['node']
            external_id = node['id']
            processed_ids.add(external_id)
            
            field_data = {
                'name': node['name'],
                'field_type': node['type'],
                'description': node['description'],
                'is_required': node['isRequired'],
                'is_system': node['isSystem'],
                'entity_type': node['entityType'],
                'possible_values': self._process_possible_values(node)
            }
            
            # Get or create custom field
            if external_id in existing_fields:
                custom_field = existing_fields[external_id]
                # Check if any field has changed
                if any(getattr(custom_field, k) != v for k, v in field_data.items()):
                    for key, value in field_data.items():
                        setattr(custom_field, key, value)
                    custom_field.save()
                    updated_count += 1
                    self.stdout.write(f'Updated custom field: {custom_field.name}')
                else:
                    unchanged_count += 1
            else:
                # Create new custom field
                custom_field = CustomField.objects.create(
                    external_id=external_id,
                    **field_data
                )
                created_count += 1
                self.stdout.write(f'Created custom field: {custom_field.name}')
        
        # Delete custom fields that no longer exist in the API
        deleted_count = 0
        for external_id, custom_field in existing_fields.items():
            if external_id not in processed_ids:
                custom_field.delete()
                deleted_count += 1
                self.stdout.write(f'Deleted custom field: {custom_field.name}')
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'Synchronization completed: {created_count} created, '
                f'{updated_count} updated, {unchanged_count} unchanged, '
                f'{deleted_count} deleted'
            )
        )
