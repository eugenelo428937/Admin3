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
            default='Account',
            help='Type of entity to sync custom fields for'
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug logging'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        if debug:
            logger.setLevel(logging.DEBUG)

        entity_types = [
            "Account", "Achievement", "Company", "Contact",
            "Content", "Course", "CourseTemplate", "Event",
            "Learner", "LearningPath", "LearningPathLearner",
            "Opportunity", "OpportunityEventInterestLearner",
            "OpportunityPassInterestLearner", "OpportunityPathInterestLearner",
            "Session", "StockItem", "TokenIssue"
        ]

        # Use specific entity type if provided
        if options['entity_type'] != 'Account':
            entity_types = [options['entity_type']]

        try:
            api_service = AdministrateAPIService()
            
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

            all_custom_fields = []

            for entity_type in entity_types:
                self.stdout.write(f'Fetching custom fields for {entity_type}...')
                
                try:
                    variables = {"type": entity_type}
                    result = api_service.execute_query(query, variables)
                    
                    if not self._validate_response(result):
                        self.stdout.write(
                            self.style.WARNING(f'Invalid response format for {entity_type}')
                        )
                        continue
                    
                    custom_fields = result['data']['customFieldTemplate']['customFieldDefinitions']
                    
                    # Add entity_type to each field
                    for field in custom_fields:
                        field['entityType'] = entity_type
                        all_custom_fields.append(field)
                    
                    self.stdout.write(
                        f'Retrieved {len(custom_fields)} custom fields for {entity_type}'
                    )
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing {entity_type}: {str(e)}')
                    )
                    if debug:
                        logger.exception(e)
                    continue

            if all_custom_fields:
                self.stdout.write(f'Syncing {len(all_custom_fields)} total custom fields...')
                self._sync_custom_fields(all_custom_fields, debug)
            else:
                self.stdout.write(self.style.WARNING('No custom fields found to sync'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _validate_response(self, result):
        """Validate the API response format"""
        return (
            isinstance(result, dict) and
            'data' in result and
            'customFieldTemplate' in result['data'] and
            'customFieldDefinitions' in result['data']['customFieldTemplate']
        )

    def _sync_custom_fields(self, api_custom_fields, debug=False):
        """Synchronize custom fields with database"""
        # Get existing custom fields outside transaction
        existing_fields = {
            cf.external_id: cf for cf in CustomField.objects.all()
        }
        
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deleted_count = 0
        error_count = 0
        
        # Process each field in its own transaction
        for field in api_custom_fields:
            external_id = field.get('key', 'unknown')
            
            try:
                with transaction.atomic():
                    field_data = {
                        'label': field['label'],
                        'field_type': field['type'],
                        'description': field.get('description', ''),
                        'is_required': field.get('isRequired', False),
                        'roles': field.get('roles', []),                
                        'entity_type': field['entityType']
                    }
                    
                    logger.debug(f"Processing field: {external_id}")
                    if debug:
                        logger.debug(f"Field data: {field_data}")
                    
                    processed_ids.add(external_id)
                    
                    if external_id in existing_fields:
                        custom_field = existing_fields[external_id]
                        has_changed = False
                        
                        for key, value in field_data.items():
                            current_value = getattr(custom_field, key)
                            if current_value != value:
                                logger.debug(f"Updating {key}: {current_value} -> {value}")
                                setattr(custom_field, key, value)
                                has_changed = True
                        
                        if has_changed:
                            custom_field.save()
                            updated_count += 1
                            self.stdout.write(f'Updated custom field: {custom_field.label}')
                        else:
                            unchanged_count += 1
                    else:
                        custom_field = CustomField.objects.create(
                            external_id=external_id,
                            **field_data
                        )
                        created_count += 1
                        self.stdout.write(f'Created custom field: {custom_field.label}')
            
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"Error processing field {external_id}: {str(e)}"))
                if debug:
                    logger.exception(e)
        
        # Handle deletions in separate transactions
        for external_id, custom_field in existing_fields.items():
            if external_id not in processed_ids:
                try:
                    with transaction.atomic():
                        field_label = custom_field.label
                        custom_field.delete()
                        deleted_count += 1
                        self.stdout.write(f'Deleted custom field: {field_label}')
                except Exception as e:
                    error_count += 1
                    self.stdout.write(self.style.ERROR(f"Error deleting field {external_id}: {str(e)}"))
                    if debug:
                        logger.exception(e)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Synchronization completed: {created_count} created, '
                f'{updated_count} updated, {unchanged_count} unchanged, '
                f'{deleted_count} deleted, {error_count} errors'
            )
        )
