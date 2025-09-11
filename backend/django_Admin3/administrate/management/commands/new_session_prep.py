"""
Django management command for managing Administrate events.
Provides functionality to sync Administrate data to local DB.

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
    help = 'Sync administrate data in preparation for new session import'
    def handle(self, *args, **options):
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

