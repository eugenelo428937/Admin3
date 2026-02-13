import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from administrate.models import PriceLevel
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronize price levels from Administrate API to local database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug logging',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force synchronization even if no changes detected',
        )
        parser.add_argument(
            '--no-prompt',
            action='store_true',
            help='Skip interactive prompts; unmatched records are logged only'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        force = options['force']

        if debug:
            logger.setLevel(logging.DEBUG)

        self.stdout.write('Fetching price levels from Administrate API...')
        
        try:
            # Get price levels from API
            api_service = AdministrateAPIService()
            query = """
            query {
                priceLevels {
                    edges {
                        node {
                            id
                            name
                            description
                        }
                    }
                }
            }
            """
            
            result = api_service.execute_query(query)
            
            if ('data' not in result or 'priceLevels' not in result['data'] or 
                'edges' not in result['data']['priceLevels']):
                self.stdout.write(self.style.ERROR('Invalid response format from API'))
                return
            
            price_levels = result['data']['priceLevels']['edges']
            self.stdout.write(f'Retrieved {len(price_levels)} price levels from API')
            
            # Synchronize with database
            self._sync_price_levels(price_levels)
            
            self.stdout.write(self.style.SUCCESS('Price levels synchronization completed successfully'))
            
        except AdministrateAPIError as e:
            self.stdout.write(self.style.ERROR(f'API error: {str(e)}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
    
    @transaction.atomic
    def _sync_price_levels(self, api_price_levels):
        """Synchronize price levels with database"""
        # Get existing price levels
        existing_price_levels = {pl.external_id: pl for pl in PriceLevel.objects.all()}
        
        # Track IDs to detect removed items
        processed_ids = set()
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        
        for edge in api_price_levels:
            node = edge['node']
            external_id = node['id']
            processed_ids.add(external_id)
            
            # Get or create price level
            if external_id in existing_price_levels:
                price_level = existing_price_levels[external_id]
                # Update if changed
                if price_level.name != node['name'] or price_level.description != node['description']:
                    price_level.name = node['name']
                    price_level.description = node['description']
                    price_level.save()
                    updated_count += 1
                    self.stdout.write(f'Updated price level: {price_level.name}')
                else:
                    unchanged_count += 1
            else:
                # Create new price level
                price_level = PriceLevel.objects.create(
                    external_id=external_id,
                    name=node['name'],
                    description=node['description']
                )
                created_count += 1
                self.stdout.write(f'Created price level: {price_level.name}')
        
        # Delete price levels that no longer exist in the API
        deleted_count = 0
        for external_id, price_level in existing_price_levels.items():
            if external_id not in processed_ids:
                price_level.delete()
                deleted_count += 1
                self.stdout.write(f'Deleted price level: {price_level.name}')
        
        # Summary
        self.stdout.write(self.style.SUCCESS(
            f'Synchronization completed: {created_count} created, '
            f'{updated_count} updated, {unchanged_count} unchanged, '
            f'{deleted_count} deleted'
        ))
