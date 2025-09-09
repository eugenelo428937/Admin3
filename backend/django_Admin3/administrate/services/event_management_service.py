"""
Event management service for Administrate events.
Handles operations like setting websale status, deleting events, and retrieving events.
"""

import logging
from typing import List, Optional, Dict, Any
from administrate.utils.graphql_loader import load_graphql_query, load_graphql_mutation
from administrate.models import CustomField
from enum import Enum

logger = logging.getLogger(__name__)


class EventLifecycleState(Enum):
    """Event lifecycle states."""
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"


class EventManagementService:
    """Service for managing Administrate events."""
    
    def __init__(self, api_service):
        """
        Initialize the event management service.
        
        Args:
            api_service: AdministrateAPIService instance
        """
        self.api_service = api_service
    
    def get_events(self, current_sitting: str, state: str, first: int = 100, offset: int = 0) -> List[str]:
        """
        Get events by sitting and lifecycle state.
        
        Args:
            current_sitting: The sitting period (e.g., "26A")
            state: The lifecycle state (draft, published, cancelled)
            first: Number of events to fetch
            offset: Offset for pagination
            
        Returns:
            List of event IDs
        """
        events = []
        query = load_graphql_query('get_events_by_sitting_and_lifecycle')
        variables = {
            "current_sitting": current_sitting,
            "state": state,
            "first": first,
            "offset": offset
        }
        
        try:
            result = self.api_service.execute_query(query, variables)
            
            if (result and 'data' in result and
                'events' in result['data'] and
                'edges' in result['data']['events']):
                for event in result['data']['events']['edges']:
                    events.append(event['node']['id'])
                    
            logger.info(f"Retrieved {len(events)} events for sitting {current_sitting} with state {state}")
            
        except Exception as e:
            logger.error(f"Error retrieving events: {str(e)}")
            raise
            
        return events
    
    def delete_events(self, event_ids: List[str]) -> Dict[str, Any]:
        """
        Delete multiple events by their IDs.
        
        Args:
            event_ids: List of event IDs to delete
            
        Returns:
            Result of the deletion operation
        """
        if not event_ids:
            logger.warning("No event IDs provided for deletion")
            return {"error": "No event IDs provided"}
            
        query = load_graphql_mutation('delete_events')
        variables = {"eventids": event_ids}
        
        try:
            logger.info(f"Deleting {len(event_ids)} events")
            result = self.api_service.execute_query(query, variables)
            
            if result and 'data' in result:
                logger.info(f"Successfully deleted events: {event_ids}")
            else:
                logger.error(f"Failed to delete events. Response: {result}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error deleting events: {str(e)}")
            raise
    
    def set_event_websale(self, event_id: str, websale_cf_key: str, websale: str, 
                         lifecycle_state: str) -> Dict[str, Any]:
        """
        Set the web sale status of an event.
        
        Args:
            event_id: Event ID to update
            websale_cf_key: Custom field key for websale
            websale: Web sale status ("True" or "False")
            lifecycle_state: Lifecycle state to set
            
        Returns:
            Result of the update operation
        """
        query = load_graphql_mutation('set_event_websale')
        variables = {
            "eventId": event_id,
            "websale": websale,
            "websaleCFKey": websale_cf_key,
            "lifecycleState": lifecycle_state,
        }
        
        try:
            logger.debug(f"Setting websale={websale} for event {event_id}")
            result = self.api_service.execute_query(query, variables)
            
            if result and 'data' in result and 'event' in result['data']:
                logger.info(f"Successfully updated websale for event {event_id}")
            else:
                logger.error(f"Failed to update websale for event {event_id}. Response: {result}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error setting websale for event {event_id}: {str(e)}")
            raise
    
    def set_event_soldout(self, event_id: str, is_sold_out: bool = True) -> Dict[str, Any]:
        """
        Set the sold out status of an event.
        
        Args:
            event_id: Event ID to update
            is_sold_out: Whether the event is sold out (default: True)
            
        Returns:
            Result of the update operation
        """
        query = load_graphql_mutation('set_event_soldout')
        variables = {
            "eventId": event_id,
            "isSoldOut": is_sold_out
        }
        
        try:
            logger.debug(f"Setting soldout={is_sold_out} for event {event_id}")
            result = self.api_service.execute_query(query, variables)
            
            if result and 'data' in result and 'event' in result['data']:
                logger.info(f"Successfully updated soldout status for event {event_id}")
            else:
                logger.error(f"Failed to update soldout status for event {event_id}. Response: {result}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error setting soldout for event {event_id}: {str(e)}")
            raise
    
    def get_custom_field_keys_by_entity_type(self, entity_type: str, debug: bool = False) -> Dict[str, str]:
        """
        Get the definition keys for custom fields by entity type.
        
        Args:
            entity_type: The entity type (e.g., "Event", "Session")
            debug: Enable debug logging
            
        Returns:
            Dictionary mapping field labels to their definition keys
        """
        custom_field_keys = {}
        
        try:
            custom_fields = CustomField.objects.filter(
                entity_type=entity_type
            )
            
            for cf in custom_fields:
                custom_field_keys[cf.label] = cf.external_id
            
            if debug:
                logger.info(
                    f"Retrieved {len(custom_field_keys)} custom field keys for {entity_type}"
                )
                
            return custom_field_keys
        
        except Exception as e:
            logger.error(f"Error retrieving custom field keys: {str(e)}")
            return {}
    
    def bulk_set_websale(self, sitting: str, current_state: str, websale: str, 
                        new_state: Optional[str] = None, batch_size: int = 100) -> Dict[str, int]:
        """
        Bulk update websale status for events.
        
        Args:
            sitting: The sitting period
            current_state: Current lifecycle state of events
            websale: Web sale status to set
            new_state: Optional new lifecycle state
            batch_size: Number of events to process per batch
            
        Returns:
            Dictionary with counts of successful and failed updates
        """
        if new_state is None:
            new_state = current_state
            
        # Get custom field key for websale
        custom_field_keys = self.get_custom_field_keys_by_entity_type("Event")
        if "Web sale" not in custom_field_keys:
            raise ValueError("Web sale custom field not found")
            
        websale_cf_key = custom_field_keys["Web sale"]
        
        # Process events in batches
        offset = 0
        total_events = 0
        successful_updates = 0
        failed_updates = 0
        
        while True:
            events = self.get_events(sitting, current_state, first=batch_size, offset=offset)
            
            if not events:
                break
                
            total_events += len(events)
            
            for event_id in events:
                try:
                    result = self.set_event_websale(event_id, websale_cf_key, websale, new_state)
                    
                    if result and 'data' in result and 'event' in result['data']:
                        successful_updates += 1
                    else:
                        failed_updates += 1
                        
                except Exception as e:
                    logger.error(f"Failed to update event {event_id}: {str(e)}")
                    failed_updates += 1
            
            if len(events) < batch_size:
                break
                
            offset += batch_size
        
        return {
            "total": total_events,
            "successful": successful_updates,
            "failed": failed_updates
        }
    
    def bulk_delete_draft_events(self, sitting: str, batch_size: int = 50) -> Dict[str, int]:
        """
        Bulk delete draft events for a sitting.
        
        Args:
            sitting: The sitting period
            batch_size: Number of events to delete per batch
            
        Returns:
            Dictionary with counts of successful and failed deletions
        """
        # Get all draft events
        all_event_ids = []
        offset = 0
        fetch_batch_size = 100
        
        while True:
            events = self.get_events(
                sitting, 
                EventLifecycleState.DRAFT.value,
                first=fetch_batch_size,
                offset=offset
            )
            
            if not events:
                break
                
            all_event_ids.extend(events)
            
            if len(events) < fetch_batch_size:
                break
                
            offset += fetch_batch_size
        
        if not all_event_ids:
            return {"total": 0, "deleted": 0, "failed": 0}
        
        # Delete in batches
        deleted_count = 0
        failed_count = 0
        
        for i in range(0, len(all_event_ids), batch_size):
            batch = all_event_ids[i:i + batch_size]
            
            try:
                result = self.delete_events(batch)
                
                if result and 'data' in result and 'event' in result['data']:
                    deleted_count += len(batch)
                else:
                    failed_count += len(batch)
                    
            except Exception as e:
                logger.error(f"Failed to delete batch: {str(e)}")
                failed_count += len(batch)
        
        return {
            "total": len(all_event_ids),
            "deleted": deleted_count,
            "failed": failed_count
        }
    
    def bulk_set_soldout(self, sitting: str, is_sold_out: bool = True, 
                        state: str = "published", batch_size: int = 100) -> Dict[str, int]:
        """
        Bulk update sold out status for events.
        
        Args:
            sitting: The sitting period
            is_sold_out: Whether to mark as sold out (True) or not sold out (False)
            state: Lifecycle state of events to update (default: published)
            batch_size: Number of events to process per batch
            
        Returns:
            Dictionary with counts of successful and failed updates
        """
        # Process events in batches
        offset = 0
        total_events = 0
        successful_updates = 0
        failed_updates = 0
        
        while True:
            events = self.get_events(sitting, state, first=batch_size, offset=offset)
            
            if not events:
                break
                
            total_events += len(events)
            
            for event_id in events:
                try:
                    result = self.set_event_soldout(event_id, is_sold_out)
                    
                    if result and 'data' in result and 'event' in result['data']:
                        successful_updates += 1
                    else:
                        failed_updates += 1
                        
                except Exception as e:
                    logger.error(f"Failed to update soldout status for event {event_id}: {str(e)}")
                    failed_updates += 1
            
            if len(events) < batch_size:
                break
                
            offset += batch_size
        
        return {
            "total": total_events,
            "successful": successful_updates,
            "failed": failed_updates
        }