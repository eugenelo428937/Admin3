"""
Django management command for managing Administrate events.
Provides functionality to set websale status and delete draft events.
"""

import sys
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from administrate.services.api_service import AdministrateAPIService
from administrate.services.event_management_service import (
    EventManagementService,
    EventLifecycleState
)
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Manage Administrate events - set websale status or delete draft events'

    def add_arguments(self, parser):
        # Add subcommands
        subparsers = parser.add_subparsers(
            dest='action',
            help='Action to perform'
        )

        # Subcommand: set-websale
        websale_parser = subparsers.add_parser(
            'set-websale',
            help='Set websale status for events'
        )
        websale_parser.add_argument(
            '--sitting',
            type=str,
            required=True,
            help='The sitting period (e.g., "26A")'
        )
        websale_parser.add_argument(
            '--state',
            type=str,
            choices=['draft', 'published', 'cancelled'],
            default='draft',
            help='Current lifecycle state of events to update'
        )
        websale_parser.add_argument(
            '--websale',
            type=str,
            choices=['True', 'False'],
            required=True,
            help='Set websale status to True or False'
        )
        websale_parser.add_argument(
            '--new-state',
            type=str,
            choices=['draft', 'published', 'cancelled'],
            help='New lifecycle state to set (optional, defaults to current state)'
        )
        websale_parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without making them'
        )
        websale_parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Number of events to fetch per batch (default: 100)'
        )

        # Subcommand: delete-draft
        delete_parser = subparsers.add_parser(
            'delete-draft',
            help='Delete draft events for a specific sitting'
        )
        delete_parser.add_argument(
            '--sitting',
            type=str,
            required=True,
            help='The sitting period (e.g., "26A")'
        )
        delete_parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview deletion without actually deleting'
        )
        delete_parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of events to fetch per batch (default: 100)'
        )
        delete_parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt (use with caution)'
        )

        # Subcommand: list
        list_parser = subparsers.add_parser(
            'list',
            help='List events for a specific sitting and state'
        )
        list_parser.add_argument(
            '--sitting',
            type=str,
            required=True,
            help='The sitting period (e.g., "26A")'
        )
        list_parser.add_argument(
            '--state',
            type=str,
            choices=['Draft', 'published', 'cancelled'],
            required=True,
            help='Lifecycle state of events to list'
        )
        list_parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of events to fetch per batch (default: 100)'
        )

        # Subcommand: set-soldout
        soldout_parser = subparsers.add_parser(
            'set-soldout',
            help='Set sold out status for events'
        )
        soldout_parser.add_argument(
            '--sitting',
            type=str,
            required=True,
            help='The sitting period (e.g., "25S")'
        )
        soldout_parser.add_argument(
            '--state',
            type=str,
            choices=['Draft', 'published', 'cancelled'],
            default='published',
            help='Lifecycle state of events to update (default: published)'
        )
        soldout_parser.add_argument(
            '--soldout',
            type=str,
            choices=['True', 'False'],
            required=True,
            help='Set sold out status to True or False'
        )
        soldout_parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without making them'
        )
        soldout_parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Number of events to process per batch (default: 100)'
        )

        # Note: --verbosity is already provided by Django's BaseCommand

    def handle(self, *args, **options):
        action = options.get('action')
        
        if not action:
            self.stdout.write(self.style.ERROR('No action specified. Use --help for available options.'))
            return

        # Set up logging based on verbosity
        verbosity = options.get('verbosity', 1)
        if verbosity == 0:
            logger.setLevel(logging.ERROR)
        elif verbosity == 1:
            logger.setLevel(logging.INFO)
        else:
            logger.setLevel(logging.DEBUG)

        # Initialize API service and event management service
        try:
            api_service = AdministrateAPIService()
            event_service = EventManagementService(api_service)
        except Exception as e:
            raise CommandError(f"Failed to initialize services: {str(e)}")

        # Execute the appropriate action
        if action == 'set-websale':
            self.handle_set_websale(event_service, options)
        elif action == 'delete-draft':
            self.handle_delete_draft(event_service, options)
        elif action == 'list':
            self.handle_list_events(event_service, options)
        elif action == 'set-soldout':
            self.handle_set_soldout(event_service, options)
        else:
            raise CommandError(f"Unknown action: {action}")

    def handle_set_websale(self, event_service, options):
        """Handle setting websale status for events."""
        sitting = options['sitting']
        state = options['state']
        websale = options['websale']
        new_state = options.get('new_state') or state
        dry_run = options.get('dry_run', False)
        batch_size = options.get('batch_size', 500)

        self.stdout.write(f"\n{'[DRY RUN] ' if dry_run else ''}Setting websale status for events:")
        self.stdout.write(f"  Sitting: {sitting}")
        self.stdout.write(f"  Current state: {state}")
        self.stdout.write(f"  Websale: {websale}")
        self.stdout.write(f"  batch_size: {batch_size}")
        if new_state != state:
            self.stdout.write(f"  New state: {new_state}")
        self.stdout.write("")

        try:
            # Get custom field keys
            event_custom_field_keys = event_service.get_custom_field_keys_by_entity_type(
                "Event", debug=options.get('verbosity', 1) > 1
            )
            
            if "Web sale" not in event_custom_field_keys:
                raise CommandError("Web sale custom field not found in Event custom fields")
            
            websale_cf_key = event_custom_field_keys["Web sale"]
            
            # Fetch events
            offset = 0
            total_events = 0
            successful_updates = 0
            failed_updates = 0
            
            while True:
                events = event_service.get_events(sitting, state, first=batch_size, offset=offset)
                
                if not events:
                    break
                
                self.stdout.write(f"Processing batch of {len(events)} events (offset: {offset})...")
                
                for event_id in events:
                    total_events += 1
                    
                    if dry_run:
                        self.stdout.write(f"  Would update event {event_id}")
                        successful_updates += 1
                    else:
                        try:
                            result = event_service.set_event_websale(
                                event_id, 
                                websale_cf_key, 
                                websale,
                                new_state
                            )
                            
                            if result and 'data' in result and 'event' in result['data']:
                                successful_updates += 1
                                if options.get('verbosity', 1) > 1:
                                    self.stdout.write(self.style.SUCCESS(f"  ✓ Updated event {event_id}"))
                            else:
                                failed_updates += 1
                                self.stdout.write(self.style.ERROR(f"  ✗ Failed to update event {event_id}"))
                                if options.get('verbosity', 1) > 1:
                                    self.stdout.write(f"    Response: {result}")
                        except Exception as e:
                            failed_updates += 1
                            self.stdout.write(self.style.ERROR(f"  ✗ Error updating event {event_id}: {str(e)}"))
                
                # Check if we got all events in this batch
                if len(events) < batch_size:
                    break
                    
                offset += batch_size
            
            # Summary
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Summary:"))
            self.stdout.write(f"  Total events found: {total_events}")
            self.stdout.write(f"  Successfully updated: {successful_updates}")
            if failed_updates > 0:
                self.stdout.write(self.style.WARNING(f"  Failed updates: {failed_updates}"))
                
        except Exception as e:
            raise CommandError(f"Error setting websale status: {str(e)}")

    def handle_delete_draft(self, event_service, options):
        """Handle deleting draft events."""
        sitting = options['sitting']
        dry_run = options.get('dry_run', False)
        batch_size = options.get('batch_size', 500)
        confirm = options.get('confirm', False)

        self.stdout.write(f"\n{'[DRY RUN] ' if dry_run else ''}Deleting draft events:")
        self.stdout.write(f"  Sitting: {sitting}")
        self.stdout.write(f"  State: Draft")
        self.stdout.write("")

        try:
            # Fetch draft events
            offset = 0
            all_event_ids = []
            
            while True:
                events = event_service.get_events(
                    sitting, 
                    EventLifecycleState.DRAFT.value,
                    first=batch_size, 
                    offset=offset
                )
                
                if not events:
                    break
                    
                all_event_ids.extend(events)
                
                if len(events) < batch_size:
                    break
                    
                offset += batch_size
            
            if not all_event_ids:
                self.stdout.write(self.style.WARNING("No draft events found to delete."))
                return
            
            self.stdout.write(f"Found {len(all_event_ids)} draft events to delete.")
            
            # Confirmation prompt
            if not dry_run and not confirm:
                self.stdout.write("")
                self.stdout.write(self.style.WARNING("⚠️  WARNING: This action cannot be undone!"))
                response = input(f"Are you sure you want to delete {len(all_event_ids)} draft events? (yes/no): ")
                if response.lower() != 'yes':
                    self.stdout.write(self.style.WARNING("Operation cancelled."))
                    return
            
            if dry_run:
                self.stdout.write(f"\n[DRY RUN] Would delete the following event IDs:")
                for event_id in all_event_ids[:10]:  # Show first 10 for preview
                    self.stdout.write(f"  - {event_id}")
                if len(all_event_ids) > 10:
                    self.stdout.write(f"  ... and {len(all_event_ids) - 10} more")
            else:
                # Delete events in batches
                batch_size_delete = 50  # Smaller batch size for deletion
                deleted_count = 0
                failed_count = 0
                
                for i in range(0, len(all_event_ids), batch_size_delete):
                    batch = all_event_ids[i:i + batch_size_delete]
                    self.stdout.write(f"Deleting batch {i//batch_size_delete + 1} ({len(batch)} events)...")
                    
                    try:
                        result = event_service.delete_events(batch)
                        
                        if result and 'data' in result and 'event' in result['data']:
                            deleted_count += len(batch)
                            if options.get('verbosity', 1) > 1:
                                self.stdout.write(self.style.SUCCESS(f"  ✓ Deleted {len(batch)} events"))
                        else:
                            failed_count += len(batch)
                            self.stdout.write(self.style.ERROR(f"  ✗ Failed to delete batch"))
                            if options.get('verbosity', 1) > 1:
                                self.stdout.write(f"    Response: {result}")
                    except Exception as e:
                        failed_count += len(batch)
                        self.stdout.write(self.style.ERROR(f"  ✗ Error deleting batch: {str(e)}"))
                
                # Summary
                self.stdout.write("")
                self.stdout.write(self.style.SUCCESS("Deletion Summary:"))
                self.stdout.write(f"  Total events: {len(all_event_ids)}")
                self.stdout.write(f"  Successfully deleted: {deleted_count}")
                if failed_count > 0:
                    self.stdout.write(self.style.WARNING(f"  Failed deletions: {failed_count}"))
                    
        except Exception as e:
            raise CommandError(f"Error deleting draft events: {str(e)}")

    def handle_list_events(self, event_service, options):
        """Handle listing events for review."""
        sitting = options['sitting']
        state = options['state']
        batch_size = options.get('batch_size', 500)

        self.stdout.write(f"\nListing events:")
        self.stdout.write(f"  Sitting: {sitting}")
        self.stdout.write(f"  State: {state}")
        self.stdout.write("")

        try:
            # Fetch events
            offset = 0
            all_event_ids = []
            
            while True:
                events = event_service.get_events(sitting, state, first=batch_size, offset=offset)
                
                if not events:
                    break
                    
                all_event_ids.extend(events)
                
                if len(events) < batch_size:
                    break
                    
                offset += batch_size
            
            if not all_event_ids:
                self.stdout.write(self.style.WARNING(f"No {state} events found for sitting {sitting}."))
                return
            
            self.stdout.write(f"Found {len(all_event_ids)} {state} events:")
            
            # Display events
            max_display = 20 if options.get('verbosity', 1) < 2 else len(all_event_ids)
            
            for i, event_id in enumerate(all_event_ids[:max_display], 1):
                self.stdout.write(f"  {i}. {event_id}")
            
            if len(all_event_ids) > max_display:
                self.stdout.write(f"  ... and {len(all_event_ids) - max_display} more")
                self.stdout.write("\n(Use --verbosity 2 to see all events)")
                
        except Exception as e:
            raise CommandError(f"Error listing events: {str(e)}")
    
    def handle_set_soldout(self, event_service, options):
        """Handle setting sold out status for events."""
        sitting = options['sitting']
        state = options['state']
        soldout = options['soldout']
        dry_run = options.get('dry_run', False)
        batch_size = options.get('batch_size', 500)
        
        # Convert string to boolean
        is_sold_out = soldout == 'True'

        self.stdout.write(f"\n{'[DRY RUN] ' if dry_run else ''}Setting sold out status for events:")
        self.stdout.write(f"  Sitting: {sitting}")
        self.stdout.write(f"  State: {state}")
        self.stdout.write(f"  Sold out: {soldout}")
        self.stdout.write("")

        try:
            # Fetch events
            offset = 0
            total_events = 0
            successful_updates = 0
            failed_updates = 0
            
            while True:
                events = event_service.get_events(sitting, state, first=batch_size, offset=offset)
                
                if not events:
                    break
                
                self.stdout.write(f"Processing batch of {len(events)} events (offset: {offset})...")
                
                for event_id in events:
                    total_events += 1
                    
                    if dry_run:
                        self.stdout.write(f"  Would update event {event_id} to soldout={soldout}")
                        successful_updates += 1
                    else:
                        try:
                            result = event_service.set_event_soldout(event_id, is_sold_out)
                            
                            if result and 'data' in result and 'event' in result['data']:
                                successful_updates += 1
                                if options.get('verbosity', 1) > 1:
                                    self.stdout.write(self.style.SUCCESS(f"  ✓ Updated event {event_id}"))
                            else:
                                failed_updates += 1
                                self.stdout.write(self.style.ERROR(f"  ✗ Failed to update event {event_id}"))
                                if options.get('verbosity', 1) > 1:
                                    self.stdout.write(f"    Response: {result}")
                        except Exception as e:
                            failed_updates += 1
                            self.stdout.write(self.style.ERROR(f"  ✗ Error updating event {event_id}: {str(e)}"))
                
                # Check if we got all events in this batch
                if len(events) < batch_size:
                    break
                    
                offset += batch_size
            
            # Summary
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Summary:"))
            self.stdout.write(f"  Total events found: {total_events}")
            self.stdout.write(f"  Successfully updated: {successful_updates}")
            if failed_updates > 0:
                self.stdout.write(self.style.WARNING(f"  Failed updates: {failed_updates}"))
                
        except Exception as e:
            raise CommandError(f"Error setting sold out status: {str(e)}")