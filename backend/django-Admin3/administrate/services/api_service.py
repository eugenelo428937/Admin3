import requests
from urllib3.util import Retry
from requests.adapters import HTTPAdapter
from django.conf import settings
from .auth_service import AdministrateAuthService
from ..exceptions import AdministrateAPIError

class AdministrateAPIService:
    def __init__(self):
        self.api_url = settings.ADMINISTRATE_API_URL
        self.auth_service = AdministrateAuthService()
        self.session = self._create_session()

    def _create_session(self):
        """Create a session with retry logic"""
        session = requests.Session()
        retry = Retry(
            total=10,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        session.mount('http://', HTTPAdapter(max_retries=retry))
        session.mount('https://', HTTPAdapter(max_retries=retry))
        return session

    def execute_query(self, query, variables=None, ignore_errors=False):
        """Execute a GraphQL query"""
        headers = {
            'Authorization': f'Bearer {self.auth_service.get_access_token()}',
            'Content-Type': 'application/json',
        }

        payload = {'query': query}
        if variables:
            payload['variables'] = variables

        response = self.session.post(
            self.api_url,
            headers=headers,
            json=payload
        )

        if response.status_code != 200:
            raise AdministrateAPIError(
                f"GraphQL query failed with status {response.status_code}: {response.text}"
            )

        result = response.json()
        if not ignore_errors and 'errors' in result:
            raise AdministrateAPIError(
                f"GraphQL query returned errors: {result['errors']}"
            )

        return result

    def execute_rest_call(self, method, endpoint, data=None):
        """Execute a REST API call"""
        headers = {
            'Authorization': f'Bearer {self.auth_service.get_access_token()}',
            'Content-Type': 'application/json',
        }

        url = f"{settings.ADMINISTRATE_REST_API_URL}/{endpoint.lstrip('/')}"
        
        response = self.session.request(
            method,
            url,
            headers=headers,
            json=data
        )

        if not 200 <= response.status_code < 300:
            raise AdministrateAPIError(
                f"REST API call failed with status {response.status_code}: {response.text}"
            )

        return response.json()
