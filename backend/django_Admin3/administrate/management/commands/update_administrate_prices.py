import logging
import time
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from administrate.models import CourseTemplatePriceLevel
from administrate.services.api_service import AdministrateAPIService
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query, load_graphql_mutation

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Update course template prices in Administrate API from local database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug logging'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=True,
            help='Run without making actual API calls (default: True for safety)'
        )
        parser.add_argument(
            '--no-dry-run',
            action='store_true',
            help='Actually update prices in Administrate (use with caution)'
        )
        parser.add_argument(
            '--course-code',
            type=str,
            help='Update prices only for a specific course code'
        )
        parser.add_argument(
            '--price-level',
            type=str,
            help='Update prices only for a specific price level'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.5,
            help='Delay in seconds between API calls (default: 0.5)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Number of updates to show before confirmation in non-dry-run mode (default: 10)'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        dry_run = not options['no_dry_run']  # Default to dry-run unless explicitly disabled
        course_code = options['course_code']
        price_level_name = options['price_level']
        delay = options['delay']
        batch_size = options['batch_size']
        
        if debug:
            logger.setLevel(logging.DEBUG)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    'DRY RUN MODE - No actual API calls will be made\n'
                    'To actually update prices, use --no-dry-run'
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    'LIVE MODE - Prices will be updated in Administrate!\n'
                    'Press Ctrl+C to cancel if this was not intended.'
                )
            )
            # Give user a chance to cancel
            time.sleep(3)
        
        try:
            # Get price levels to update
            queryset = CourseTemplatePriceLevel.objects.select_related(
                'course_template', 'price_level'
            )
            
            # Apply filters if specified
            if course_code:
                queryset = queryset.filter(course_template__code=course_code)
                self.stdout.write(f'Filtering by course code: {course_code}')
            
            if price_level_name:
                queryset = queryset.filter(price_level__name=price_level_name)
                self.stdout.write(f'Filtering by price level: {price_level_name}')
            
            # Order by course template and price level for organized output
            queryset = queryset.order_by('course_template__code', 'price_level__name')
            
            total_count = queryset.count()
            
            if total_count == 0:
                self.stdout.write(
                    self.style.WARNING('No price levels found matching the criteria')
                )
                return
            
            self.stdout.write(f'Found {total_count} price level records to process\n')
            
            # Initialize API service only if not in dry-run mode
            api_service = None
            if not dry_run:
                api_service = AdministrateAPIService()
                mutation = load_graphql_mutation('update_course_price')
            
            # Process updates
            success_count = 0
            error_count = 0
            skipped_count = 0
            
            for index, price_level in enumerate(queryset, 1):
                try:
                    # Check if we have an external_id
                    if not price_level.external_id:
                        self.stdout.write(
                            self.style.WARNING(
                                f'{index}/{total_count}: Skipping {price_level.course_template.code} - '
                                f'{price_level.price_level.name}: No external_id'
                            )
                        )
                        skipped_count += 1
                        continue
                    
                    # Display what would be/is being updated
                    self.stdout.write(
                        f'{index}/{total_count}: {"[DRY RUN] Would update" if dry_run else "Updating"} '
                        f'{price_level.course_template.code} - {price_level.price_level.name}: '
                        f'£{price_level.amount} (ID: {price_level.external_id})'
                    )
                    
                    if not dry_run:
                        # Prepare variables for the mutation
                        variables = {
                            'coursePriceId': price_level.external_id,
                            'amount': float(price_level.amount)
                        }
                        
                        if debug:
                            self.stdout.write(
                                self.style.WARNING(f'  API Call Variables: {variables}')
                            )
                        
                        # Execute the mutation
                        result = api_service.execute_query(mutation, variables)
                        
                        # Check for errors in the response
                        if self._check_errors(result, price_level, debug):
                            error_count += 1
                        else:
                            success_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(f'  ✓ Successfully updated')
                            )
                        
                        # Add delay between API calls to avoid rate limiting
                        if index < total_count:
                            time.sleep(delay)
                        
                        # Batch confirmation in live mode
                        if index % batch_size == 0 and index < total_count:
                            response = input(
                                f'\nProcessed {index}/{total_count}. '
                                f'Continue with next {min(batch_size, total_count - index)}? (y/n): '
                            )
                            if response.lower() != 'y':
                                self.stdout.write(
                                    self.style.WARNING('Update cancelled by user')
                                )
                                break
                    else:
                        success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'{index}/{total_count}: Error processing '
                            f'{price_level.course_template.code} - '
                            f'{price_level.price_level.name}: {str(e)}'
                        )
                    )
                    if debug:
                        logger.exception(e)
            
            # Print summary
            self._print_summary(
                success_count, error_count, skipped_count, 
                total_count, dry_run
            )
            
        except AdministrateAPIError as e:
            self.stdout.write(self.style.ERROR(f'API Error: {str(e)}'))
            if debug:
                logger.exception(e)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
            if debug:
                logger.exception(e)

    def _check_errors(self, result, price_level, debug):
        """Check for errors in the API response"""
        try:
            # Navigate through the response structure
            if 'data' not in result:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Invalid response: missing data field')
                )
                if debug:
                    self.stdout.write(f'  Response: {result}')
                return True
            
            if 'courseTemplate' not in result['data']:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Invalid response: missing courseTemplate field')
                )
                if debug:
                    self.stdout.write(f'  Response: {result}')
                return True
            
            update_result = result['data']['courseTemplate'].get('updatePrices', {})
            errors = update_result.get('errors', [])
            
            if errors:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ API returned errors:')
                )
                for error in errors:
                    self.stdout.write(
                        self.style.ERROR(
                            f'    - {error.get("label", "")}: '
                            f'{error.get("message", "")} '
                            f'(value: {error.get("value", "")})'
                        )
                    )
                return True
            
            return False
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ✗ Error parsing response: {str(e)}')
            )
            if debug:
                self.stdout.write(f'  Response: {result}')
            return True

    def _print_summary(self, success_count, error_count, skipped_count, 
                      total_count, dry_run):
        """Print summary of the operation"""
        
        mode = '[DRY RUN] ' if dry_run else ''
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{mode}Price update to Administrate completed:\n'
                f'  Total processed: {total_count}\n'
                f'  {"Would update" if dry_run else "Updated"}: {success_count}\n'
                f'  Skipped (no external_id): {skipped_count}\n'
                f'  Errors: {error_count}'
            )
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\nThis was a dry run. To actually update prices, use --no-dry-run'
                )
            )