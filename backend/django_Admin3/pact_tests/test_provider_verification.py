"""
Pact Provider Verification Test.

This test:
1. Starts a Django LiveServer
2. Spins up a lightweight state change server
3. Runs pact.v3.Verifier to replay all consumer interactions
   against the live Django server

Run with:
    python manage.py test pact_tests --settings=django_Admin3.settings.development --keepdb
"""
import json
import os
import threading

from django.core.management import call_command
from django.test import LiveServerTestCase

from .conftest import PACT_FILE, PROVIDER_NAME
from .state_handlers import STATE_HANDLERS


class PactProviderVerificationTest(LiveServerTestCase):
    """Verify that the Django backend satisfies the Pact contracts."""

    _state_server = None

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Start the state change handler server in a background thread
        cls._state_server_port = _find_free_port()
        cls._state_server, cls._state_server_thread = _start_state_server(
            cls._state_server_port
        )

    @classmethod
    def tearDownClass(cls):
        # Shut down the state change server so it releases its thread
        if cls._state_server is not None:
            cls._state_server.shutdown()
        super().tearDownClass()

    def _fixture_teardown(self):
        """Override to use CASCADE on TRUNCATE.

        LiveServerTestCase -> TransactionTestCase flushes the DB between
        tests. PostgreSQL refuses to TRUNCATE auth_user without CASCADE
        because filter_configurations has a FK reference to it. Django
        only adds CASCADE when available_apps is set, so we override
        teardown to pass allow_cascade=True directly.
        """
        for db_name in self._databases_names(include_mirrors=False):
            call_command(
                'flush',
                verbosity=0,
                interactive=False,
                database=db_name,
                reset_sequences=False,
                allow_cascade=True,
                inhibit_post_migrate=True,
            )

    def test_provider_honours_pact_with_consumer(self):
        """Replay all consumer interactions and verify responses match."""
        if not os.path.exists(PACT_FILE):
            self.skipTest(
                f'Pact file not found at {PACT_FILE}. '
                'Run frontend consumer tests first: npm run test:pact'
            )

        from pact.v3 import Verifier

        verifier = Verifier()

        # Point verifier at our live Django server
        verifier.set_info(
            PROVIDER_NAME,
            url=self.live_server_url,
        )

        # Tell verifier where to POST state changes (body=True sends
        # state as JSON POST body, which our handler expects)
        verifier.set_state(
            f'http://127.0.0.1:{self._state_server_port}/_pact/state',
            teardown=False,
            body=True,
        )

        # Load the contract file
        verifier.add_source(PACT_FILE)

        # Run verification
        verifier.verify()


def _find_free_port():
    """Find a free TCP port."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]


def _start_state_server(port):
    """Start the state change server in a background thread.

    Returns:
        (HTTPServer, Thread) - server instance and thread for cleanup.
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class StateHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path.startswith('/_pact/state'):
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                data = json.loads(body) if body else {}

                state = data.get('state', '')
                action = data.get('action', 'setup')
                params = data.get('params', {})

                if action == 'setup' and state in STATE_HANDLERS:
                    try:
                        STATE_HANDLERS[state](params)
                        self.send_response(200)
                    except Exception as e:
                        self.send_response(500)
                        self.end_headers()
                        self.wfile.write(str(e).encode())
                        return
                else:
                    # Unknown state or teardown - just acknowledge
                    self.send_response(200)

                self.end_headers()
                self.wfile.write(b'{}')
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            # Suppress request logging
            pass

    server = HTTPServer(('127.0.0.1', port), StateHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread
