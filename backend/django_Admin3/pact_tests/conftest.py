"""
Pact provider verification configuration.

Provides a base test class that:
1. Starts a Django LiveServer
2. Sets up provider states (test fixtures)
3. Runs the Pact Verifier against the generated contract file
"""
import os

# Pact contract file location (project root / pacts /)
# __file__ -> pact_tests/ -> django_Admin3/ -> backend/ -> Admin3 (project root)
PACT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    'pacts',
)
PACT_FILE = os.path.join(PACT_DIR, 'Admin3Frontend-Admin3Backend.json')

PROVIDER_NAME = 'Admin3Backend'
CONSUMER_NAME = 'Admin3Frontend'
