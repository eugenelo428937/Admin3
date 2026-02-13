import logging
import requests
from urllib3.util import Retry
from requests.adapters import HTTPAdapter
from django.conf import settings
from django.utils import timezone
from .auth_service import AdministrateAuthService
from ..exceptions import AdministrateAPIError

logger = logging.getLogger(__name__)

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
        """Execute a GraphQL query with audit logging."""
        from administrate.models.api_audit_log import ApiAuditLog

        started_at = timezone.now()
        operation = (
            'mutation' if query.strip().lower().startswith('mutation')
            else 'query'
        )

        headers = {
            'Authorization': f'Bearer {self.auth_service.get_access_token()}',
            'Content-Type': 'application/json',
        }

        payload = {'query': query}
        if variables:
            payload['variables'] = variables

        status_code = None
        response_body = None
        error_message = ''
        success = True

        try:
            response = self.session.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            status_code = response.status_code

            if response.status_code != 200:
                error_message = (
                    f"GraphQL query failed with status "
                    f"{response.status_code}: {response.text}"
                )
                success = False
                raise AdministrateAPIError(error_message)

            result = response.json()
            response_body = result

            if not ignore_errors and 'errors' in result:
                error_message = (
                    f"GraphQL query returned errors: {result['errors']}"
                )
                success = False
                raise AdministrateAPIError(error_message)

            return result

        except Exception as e:
            if not error_message:
                error_message = str(e)
                success = False
            raise

        finally:
            completed_at = timezone.now()
            duration_ms = int(
                (completed_at - started_at).total_seconds() * 1000
            )
            try:
                ApiAuditLog.objects.create(
                    command=ApiAuditLog.get_current_command(),
                    operation=operation,
                    graphql_query=query,
                    variables=variables or {},
                    response_body=response_body,
                    status_code=status_code,
                    success=success,
                    error_message=error_message,
                    started_at=started_at,
                    completed_at=completed_at,
                    duration_ms=duration_ms,
                )
            except Exception as log_err:
                logger.warning(f"Failed to write API audit log: {log_err}")

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

    def get_custom_field_definitions(self, entity_type=None):
        """
        Get custom field definitions from Administrate API
        
        Args:
            entity_type (str, optional): Filter by entity type (EVENT, CONTACT, OPPORTUNITY)
            
        Returns:
            list: List of custom field definitions
        """
        query = """
        query GetCustomFieldDefinitions($type: String) {
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

        variables = {"type": entity_type} if entity_type else {}
        result = self.execute_query(query, variables)

        if 'data' in result and 'customFieldDefinitions' in result['data']:
            return result['data']['customFieldDefinitions']['edges']
        return []
