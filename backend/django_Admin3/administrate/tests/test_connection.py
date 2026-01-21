import unittest
from django.test import SimpleTestCase
from administrate.services.api_service import AdministrateAPIService
from administrate.services.auth_service import AdministrateAuthService
from administrate.exceptions import AdministrateAPIError

SKIP_EXTERNAL_API_REASON = "Skipping external Administrate API tests - requires live API connection"


@unittest.skip(SKIP_EXTERNAL_API_REASON)
class AdministrateConnectionTest(SimpleTestCase):
    def setUp(self):
        self.auth_service = AdministrateAuthService()

        """Set up test environment"""
        self.api_service = AdministrateAPIService()

    def test_get_price_levels(self):
        """Test retrieving price levels from Administrate API"""
        query = """
        query {
            priceLevels {
                edges {
                    node {
                        id
                        name
                        description        
                    }
                }
            }
        }
        """    
        
        try:
            result = self.api_service.execute_query(query)
            self.assertIn('data', result, "Response should contain 'data' key")
            self.assertIn('priceLevels', result['data'], "Data should contain 'priceLevels' key")
            self.assertIn('edges', result['data']['priceLevels'], "PriceLevels should contain 'edges' key")
            
            # Print results for debugging
            print("\nRetrieved price levels:")
            for edge in result['data']['priceLevels']['edges']:
                print(f"- {edge['node']['name']}: {edge['node']['description']}")
                
        except AdministrateAPIError as e:
            self.fail(f"API call failed: {str(e)}")
