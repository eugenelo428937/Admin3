import os
import json
import datetime
from pathlib import Path
import requests
from django.conf import settings
from ..exceptions import AdministrateAuthError

class AdministrateAuthService:
    def __init__(self):
        self.instance_url = settings.ADMINISTRATE_INSTANCE_URL
        self.api_url = settings.ADMINISTRATE_API_URL
        self.token_file_path = os.path.join(settings.BASE_DIR, 'tokens')
        self.token_cache = {}
        
        # Create tokens directory if it doesn't exist
        if not os.path.exists(self.token_file_path):
            os.makedirs(self.token_file_path)

    def get_access_token(self):
        """Get a valid access token, refreshing if necessary"""
        token = self._load_token_data()
        
        if not token or not self._is_token_valid(token):
            token = self._setup_tokens(token or {})
            self._write_token_to_file(token)

        if not self._is_token_complete(token):
            raise AdministrateAuthError("Couldn't obtain valid token information")

        # Check if access token is expired
        if self._is_token_expired(token):
            token = self._refresh_token(token)
            self._write_token_to_file(token)

        return token['access_token']

    def _is_token_complete(self, token):
        """Check if token has all required fields and values"""
        required_fields = [
            'access_token',
            'refresh_token',
            'expires_at',
            'client_id',
            'client_secret',
            'auth_user'
        ]
        return all(field in token and token[field] for field in required_fields)

    def _setup_tokens(self, token_data):
        """Initial token setup using OAuth 2.0 client credentials flow"""
        token_time = datetime.datetime.utcnow()
        
        # Get credentials from settings if not in token_data
        client_id = token_data.get(
            'client_id') or settings.ADMINISTRATE_API_KEY
        client_secret = token_data.get(
            'client_secret') or settings.ADMINISTRATE_API_SECRET
        auth_user = token_data.get('auth_user') or settings.ADMINISTRATE_AUTH_USER

        if not all([client_id, client_secret, auth_user]):
            raise AdministrateAuthError("Missing required credentials in settings")

        # Prepare the token request
        payload = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': 'read write'
        }

        try:
            response = requests.post(
                self._get_token_server_url('token'),
                data=payload,
                allow_redirects=True
            )

            if response.status_code != 200:
                raise AdministrateAuthError(
                    f"Token request failed with status {response.status_code}: {response.text}"
                )

            token_response = response.json()
            
            # Construct complete token data
            token_data = {
                'access_token': token_response['access_token'],
                'refresh_token': token_response.get('refresh_token'),  # might be None for client credentials
                'token_type': token_response['token_type'],
                'expires_in': token_response['expires_in'],
                'time_retrieved': str(token_time),
                'expires_at': str(token_time + datetime.timedelta(seconds=token_response['expires_in'])),
                'client_id': client_id,
                'client_secret': client_secret,
                'auth_user': auth_user
            }

            return token_data

        except requests.exceptions.RequestException as e:
            raise AdministrateAuthError(f"Failed to setup tokens: {str(e)}")

    def _load_token_data(self):
        """Load token data from cache or file"""
        if self.instance_url in self.token_cache:
            return self.token_cache[self.instance_url]

        token_file = self._get_token_filename()
        if os.path.exists(token_file):
            try:
                with open(token_file, 'r') as f:
                    token = json.load(f)
                    self.token_cache[self.instance_url] = token
                    return token
            except (json.JSONDecodeError, IOError) as e:
                print(f"Error reading token file: {str(e)}")
                return None
        return None

    def _write_token_to_file(self, token):
        """Write token data to file and cache"""
        try:
            self.token_cache[self.instance_url] = token
            with open(self._get_token_filename(), 'w') as f:
                json.dump(token, f, ensure_ascii=True, indent=4)
        except IOError as e:
            raise AdministrateAuthError(f"Failed to write token to file: {str(e)}")

    def _refresh_token(self, token_data):
        """Refresh access token using refresh token or get new token if refresh not available"""
        if not token_data.get('refresh_token'):
            # If no refresh token, get new token using client credentials
            return self._setup_tokens(token_data)

        token_time = datetime.datetime.utcnow()
        payload = {
            'grant_type': 'refresh_token',
            'client_id': token_data['client_id'],
            'client_secret': token_data['client_secret'],
            'refresh_token': token_data['refresh_token']
        }

        try:
            response = requests.post(
                self._get_token_server_url('token'),
                data=payload,
                allow_redirects=True
            )

            if response.status_code != 200:
                # If refresh fails, try getting new token
                return self._setup_tokens(token_data)

            new_token = response.json()
            new_token.update({
                'time_retrieved': str(token_time),
                'expires_at': str(token_time + datetime.timedelta(seconds=new_token['expires_in'])),
                'client_id': token_data['client_id'],
                'client_secret': token_data['client_secret'],
                'auth_user': token_data['auth_user']
            })

            return new_token

        except requests.exceptions.RequestException as e:
            raise AdministrateAuthError(f"Token refresh failed: {str(e)}")

    def _is_token_valid(self, token):
        """Check if token has all required fields"""
        required_fields = ['access_token', 'expires_at']
        return all(field in token for field in required_fields)

    def _is_token_expired(self, token):
        """Check if token is expired"""
        try:
            expires_at = datetime.datetime.fromisoformat(token['expires_at'].replace('Z', '+00:00'))
            # Add some buffer time (e.g., 5 minutes) to prevent edge cases
            buffer_time = datetime.timedelta(minutes=5)
            return expires_at - buffer_time < datetime.datetime.utcnow()
        except (ValueError, KeyError):
            return True

    def _get_token_filename(self):
        """Get the token file path"""
        return os.path.join(
            self.token_file_path,
            f"{self.instance_url.replace('.', '_')}-TOKENS.txt"
        )

    def _get_token_server_url(self, url_type):
        """Get the appropriate token server URL"""
        if ".staging" in self.instance_url:
            base_url = "https://auth.stagingadministratehq.com/oauth"
        else:
            base_url = "https://auth.getadministrate.com/oauth"

        endpoints = {
            'auth': f"{base_url}/authorize",
            'token': f"{base_url}/token"
        }
        return endpoints[url_type]
