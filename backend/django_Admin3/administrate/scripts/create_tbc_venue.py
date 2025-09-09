import os
import sys
import django
from django.conf import settings
from pprint import pprint
from pathlib import Path
import json
import requests
import base64

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'django_Admin3.settings.development')
django.setup()

from administrate.services.api_service import AdministrateAPIService

def update_tbc_venue():
    data = {u'name': u'To be confirmed'}

    ids = ["VmVudWU6MjU=",
           "VmVudWU6MjY=",
           "VmVudWU6MTc=",
           "VmVudWU6MTg=",
           "VmVudWU6MTk=",
           "VmVudWU6MTM=",
           "VmVudWU6MTQ=",
           "VmVudWU6MTY=",
           "VmVudWU6MTU="]
    
    for venue_id_base64 in ids:
        # Decode base64 and extract numeric ID
        decoded = base64.b64decode(venue_id_base64).decode('utf-8')
        venue_id = decoded.split(':')[1]  # Extract number after ':'
        
        response = requests.put(f"{settings.ADMINISTRATE_REST_API_URL}/api/v2/event/account_venues/13",
                                data=json.dumps(data),
                                headers={'content-type': 'application/json'},
                                auth=('acted-test@bpp.com', 'P@ssw0rd!'))
        print(response)
    return

if __name__ == "__main__":
    update_tbc_venue()
