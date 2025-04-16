import sys
import csv
import base64
import pandas as pd
from pathlib import Path
import os
import validators
import django
import logging
import json
import environ
from dotenv import load_dotenv

from enum import Enum
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '../..')))
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))
env_path = os.path.join(project_root, '.env.production')

load_dotenv(env_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'django_Admin3.settings')
django.setup()

from datetime import datetime,date,time
from django.core.exceptions import ValidationError
from administrate.services.api_service import AdministrateAPIService
from administrate.models import CourseTemplate, Location, Venue, Instructor, CustomField
from administrate.exceptions import AdministrateAPIError
from administrate.utils.graphql_loader import load_graphql_query, load_graphql_mutation
logger = logging.getLogger(__name__)

file_path = r"C:\Users\elo\OneDrive - BPP SERVICES LIMITED\Documents\Code\Admin3\backend\django_Admin3\administrate\src\OCRCancelledtest.csv"
class EventLifecycleState(Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"


def get_events(api_service, title, first=100, offset=0):    
    query = load_graphql_query('get_events_by_title')
    variables = {"title": title, "first": first, "offset": offset}
    result = api_service.execute_query(query, variables)       
    return result


def set_event_active(api_service, event_id, lifecycleState):
    """
    Set the web sale status of an event
    
    Args:
        api_service: AdministrateAPIService instance
        event_id: Event ID to update
        websale: Web sale status (True/False)
    
    Returns:
        dict: Result of the update operation
    """

    query = load_graphql_mutation('set_event_active')
    variables = {
        "eventId": event_id,
        "lifecycleState": lifecycleState,
    }
    result = api_service.execute_query(query, variables)

    return result


def set_event_soldout(api_service, event_id, isSoldOut=False):
    query = load_graphql_mutation('set_event_soldout')
    variables = {"eventId": event_id,
                 "isSoldOut": isSoldOut, }
    result = api_service.execute_query(query, variables)

    return result
def reactive_learner(api_service, learner_id):
    query = load_graphql_mutation('reactivate_learner')
    variables = {
        "learnerId": learner_id,
    }
    result = api_service.execute_query(query, variables)

    return result

def main():
    eventids=[]
    api_service = AdministrateAPIService()
    first = 100
    offset = 0
    title = "25A"            
    
    while True:                      
        result = get_events(api_service, title, first, offset)
        offset += first   
        if (result and 'data' in result and
            'events' in result['data'] and
                'edges' in result['data']['events']):        
            for event in result['data']['events']['edges']:
                eventids.append(event['node']['id'])

        if not result['data']['events']['pageInfo']['hasNextPage']:
            break

    print(len(eventids))
    count = 0       
    for e in eventids:
        print(f"{count} : Event ID: {e}")
        count += 1
        set_event_soldout(api_service, e, isSoldOut=True)
        # set_event_active(api_service, e, EventLifecycleState.PUBLISHED.value)

    # with open(file_path, newline='') as csvfile:
    #     r = csv.reader(csvfile)
    #     for row in r:
    #         learnerId_base64 = str(base64.b64encode(
    #             bytes("learner:"+str(row[8]), 'utf-8')).decode("utf-8"))
    #         result = reactive_learner(api_service, learnerId_base64)
    #         if 'data' in result and 'errors' in result['data']:
    #             print(f"Error reactivating learner {row[8]}: {result['data']['errors']}")
    # get a list of all contact cancelled
    # reactive all learners in Online Classroom
    # cancel learners in cancelation list 
    return


if __name__ == "__main__":
    main()
