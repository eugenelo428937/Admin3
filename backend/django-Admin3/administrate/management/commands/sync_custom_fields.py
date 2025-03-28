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
            choices=["Account", "Achievement", "Company", "Contact", 
                     "Content", "Course", "CourseTemplate", "Event", 
                     "Learner", "LearningPath", "LearningPathLearner", 
                     "Opportunity", "OpportunityEventInterestLearner", 
                     "OpportunityPassInterestLearner", "OpportunityPathInterestLearner", 
                     "OpportunityStockItemInterest", "Session", "StockItem", "TokenIssue"
                     ],
            default='Account',  # Changed default from 'ALL' to 'Account' since we need a specific type
            help='Type of entity to sync custom fields for'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force synchronization even if no changes detected'
        )

    def handle(self, *args, **options):
        entity_types = [
            "Account", "Achievement", "Company", "Contact",
            "Content", "Course", "CourseTemplate", "Event",
            "Learner", "LearningPath", "LearningPathLearner",
            "Opportunity", "OpportunityEventInterestLearner",
            "OpportunityPassInterestLearner", "OpportunityPathInterestLearner",
            "Session", "StockItem", "TokenIssue"
        ]
        force = options['force']

        

        try:
            api_service = AdministrateAPIService()
            
            # Updated GraphQL query with correct type
            query = """
            query GetCustomFieldDefinitions($type: SupportsCustomField!) {
                customFieldTemplate(type: $type) {
                    customFieldDefinitions {
                        key
                        label
                        description
                        type                        
                        isRequired
                        roles                        
                    }
                }
            }
            """

            for entity_type in entity_types:
                self.stdout.write(
                    f'Fetching custom fields from Administrate API for {entity_type}...')
                variables = {"type": entity_type}
                result = api_service.execute_query(query, variables)
                
                if not self._validate_response(result):
                    self.stdout.write(
                        self.style.WARNING(f'Invalid response format for {entity_type}')
                    )
                    return
                
                custom_fields = result['data']['customFieldTemplate']['customFieldDefinitions']
                self.stdout.write(
                    f'Retrieved {len(custom_fields)} custom fields for {entity_type}'
                )
                
                # Add entity_type to each field
                for field in custom_fields:
                    field['entityType'] = entity_type
                
                # Synchronize with database
                self._sync_custom_fields(custom_fields)
                
                self.stdout.write(
                    self.style.SUCCESS('Custom fields synchronization completed successfully')
                )
            
        except AdministrateAPIError as e:
            self.stdout.write(self.style.ERROR(f'API error: {str(e)}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            logger.exception(e)

    def _validate_response(self, result):
        """Validate the API response format"""
        return (
            isinstance(result, dict) and
            'data' in result and
            'customFieldTemplate' in result['data'] and
            'customFieldDefinitions' in result['data']['customFieldTemplate']
        )

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
        
        for field in api_custom_fields:
            external_id = field['key']
            processed_ids.add(external_id)
            
            # Map API fields to model fields
            field_data = {
                'label': field['label'],
                'field_type': field['type'],
                'description': field.get('description', ''),
                'is_required': field.get('isRequired', False),
                'roles': field.get('roles', []),                
                'entity_type': field['entityType']
            }
            
            # Get or create custom field
            if external_id in existing_fields:
                custom_field = existing_fields[external_id]
                # Check if any field has changed
                has_changed = False
                for key, value in field_data.items():
                    if getattr(custom_field, key) != value:
                        setattr(custom_field, key, value)
                        has_changed = True
                
                if has_changed:
                    custom_field.save()
                    updated_count += 1
                    self.stdout.write(f'Updated custom field: {custom_field.label}')
                else:
                    unchanged_count += 1
            else:
                # Create new custom field
                custom_field = CustomField.objects.create(
                    external_id=external_id,
                    **field_data
                )
                created_count += 1
                self.stdout.write(f'Created custom field: {custom_field.label}')
        
        # Delete custom fields that no longer exist in the API
        deleted_count = 0
        for external_id, custom_field in existing_fields.items():
            if external_id not in processed_ids:
                custom_field.delete()
                deleted_count += 1
                self.stdout.write(f'Deleted custom field: {custom_field.label}')
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'Synchronization completed: {created_count} created, '
                f'{updated_count} updated, {unchanged_count} unchanged, '
                f'{deleted_count} deleted'
            )
        )


    
