"""
VAT API Contract Tests - Epic 3 Phase 6
Test Matrix Stage 4: API contract tests for VAT calculation endpoints

Tests the REST API endpoints for VAT calculation:
- /api/rules/engine/calculate-vat/ endpoint
- Request/response contract validation
- Authentication and permissions
- Error handling
- Rate limiting (if applicable)

Test IDs: API01-API08+
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestVATCalculationAPI:
    """Test /api/rules/engine/calculate-vat/ endpoint."""

    def test_api01_calculate_vat_for_cart_success(self, authenticated_api_client, uk_cart_mixed):
        """API01: Calculate VAT for cart returns correct response structure."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert 'ok' in data
        assert data['ok'] is True
        assert 'cart' in data
        assert 'total_vat' in data['cart']
        assert 'vat_result' in data['cart']

        # Verify vat_result structure
        vat_result = data['cart']['vat_result']
        assert 'items' in vat_result
        assert 'region' in vat_result
        assert 'calculation_timestamp' in vat_result

        # Verify item structure
        for item in vat_result['items']:
            assert 'item_id' in item
            assert 'vat_rate' in item
            assert 'vat_amount' in item
            assert 'rule_applied' in item

    def test_api02_authentication_required(self, api_client):
        """API02: Endpoint requires authentication."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': 1
        }

        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_api03_invalid_cart_id_returns_error(self, authenticated_api_client):
        """API03: Invalid cart_id returns error response."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': 99999  # Non-existent cart
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]

        data = response.json()
        assert 'error' in data or 'detail' in data

    def test_missing_cart_id_returns_error(self, authenticated_api_client):
        """Missing cart_id parameter returns error."""
        url = reverse('rules-engine:calculate-vat')

        payload = {}

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_can_only_access_own_cart(self, api_client, uk_user, eu_user, uk_cart_mixed):
        """User can only calculate VAT for their own cart."""
        url = reverse('rules-engine:calculate-vat')

        # Authenticate as different user
        api_client.force_authenticate(user=eu_user)

        payload = {
            'cart_id': uk_cart_mixed.id  # UK user's cart
        }

        response = api_client.post(url, payload, format='json')

        # Should return 403 Forbidden or 404 Not Found
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestVATCalculationResponseContract:
    """Test API response contract matches specification."""

    def test_api04_response_includes_all_required_fields(self, authenticated_api_client, uk_cart_ebook_only):
        """API04: Response includes all required fields per contract."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_ebook_only.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        # Top-level required fields
        required_top_level = ['ok', 'cart']
        for field in required_top_level:
            assert field in data, f"Missing required field: {field}"

        # Cart-level required fields
        cart = data['cart']
        required_cart_fields = ['total_vat', 'vat_result']
        for field in required_cart_fields:
            assert field in cart, f"Missing required cart field: {field}"

        # VAT result required fields
        vat_result = cart['vat_result']
        required_vat_result_fields = ['items', 'region', 'calculation_timestamp', 'context_version']
        for field in required_vat_result_fields:
            assert field in vat_result, f"Missing required vat_result field: {field}"

    def test_api05_item_vat_result_contract(self, authenticated_api_client, uk_cart_mixed):
        """API05: Each item VAT result matches contract specification."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        vat_result = data['cart']['vat_result']

        # Required fields for each item
        required_item_fields = [
            'item_id',
            'product_id',
            'product_code',
            'net_amount',
            'quantity',
            'vat_rate',
            'vat_amount',
            'rule_applied',
            'classification'
        ]

        for item in vat_result['items']:
            for field in required_item_fields:
                assert field in item, f"Missing required item field: {field}"

            # Verify data types
            assert isinstance(item['item_id'], int)
            assert isinstance(item['product_id'], int)
            assert isinstance(item['product_code'], str)
            assert isinstance(item['quantity'], int)
            assert isinstance(item['rule_applied'], str)
            assert isinstance(item['classification'], dict)

            # Verify Decimal string format for monetary values
            assert isinstance(item['net_amount'], str)
            assert isinstance(item['vat_rate'], str)
            assert isinstance(item['vat_amount'], str)

    def test_decimal_values_formatted_correctly(self, authenticated_api_client, uk_cart_mixed):
        """Decimal values formatted as strings with correct precision."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        vat_result = data['cart']['vat_result']

        for item in vat_result['items']:
            # VAT rate should be formatted with 2 decimal places
            vat_rate = Decimal(item['vat_rate'])
            assert vat_rate.as_tuple().exponent >= -2

            # VAT amount should have exactly 2 decimal places
            vat_amount = Decimal(item['vat_amount'])
            assert vat_amount.as_tuple().exponent == -2

        # Total VAT should have exactly 2 decimal places
        total_vat = Decimal(data['cart']['total_vat'])
        assert total_vat.as_tuple().exponent == -2


@pytest.mark.django_db
class TestVATCalculationScenarios:
    """Test various VAT calculation scenarios through API."""

    def test_api06_uk_mixed_cart_calculates_correctly(self, authenticated_api_client, uk_cart_mixed):
        """API06: UK mixed cart (ebook + material) calculates correct VAT."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        # Expected: ebook £50 @ 0% + material £100 @ 20% = £20 total VAT
        assert Decimal(data['cart']['total_vat']) == Decimal('20.00')

        vat_result = data['cart']['vat_result']
        assert len(vat_result['items']) == 2

        # Item 1: ebook with 0% VAT
        item1 = vat_result['items'][0]
        assert Decimal(item1['vat_rate']) == Decimal('0.00')
        assert Decimal(item1['vat_amount']) == Decimal('0.00')

        # Item 2: material with 20% VAT
        item2 = vat_result['items'][1]
        assert Decimal(item2['vat_rate']) == Decimal('0.20')
        assert Decimal(item2['vat_amount']) == Decimal('20.00')

    def test_api07_sa_cart_calculates_15_percent(self, api_client, sa_user, sa_cart_tutorial):
        """API07: SA cart calculates 15% VAT correctly."""
        url = reverse('rules-engine:calculate-vat')

        api_client.force_authenticate(user=sa_user)

        payload = {
            'cart_id': sa_cart_tutorial.id
        }

        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        # Expected: tutorial £200 @ 15% = £30 VAT
        assert Decimal(data['cart']['total_vat']) == Decimal('30.00')

        vat_result = data['cart']['vat_result']
        item = vat_result['items'][0]
        assert Decimal(item['vat_rate']) == Decimal('0.15')
        assert Decimal(item['vat_amount']) == Decimal('30.00')

    def test_api08_row_cart_zero_vat(self, api_client, row_user, row_cart_digital):
        """API08: ROW cart has 0% VAT."""
        url = reverse('rules-engine:calculate-vat')

        api_client.force_authenticate(user=row_user)

        payload = {
            'cart_id': row_cart_digital.id
        }

        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        assert Decimal(data['cart']['total_vat']) == Decimal('0.00')

        vat_result = data['cart']['vat_result']
        for item in vat_result['items']:
            assert Decimal(item['vat_rate']) == Decimal('0.00')
            assert Decimal(item['vat_amount']) == Decimal('0.00')

    def test_empty_cart_returns_zero_vat(self, authenticated_api_client, empty_cart):
        """Empty cart returns zero VAT without errors."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': empty_cart.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert Decimal(data['cart']['total_vat']) == Decimal('0.00')
        assert data['cart']['vat_result']['items'] == []

    def test_multiple_quantities_vat_calculation(self, authenticated_api_client, uk_cart_multiple_quantities):
        """Multiple quantities calculate VAT correctly."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_multiple_quantities.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        # Expected: 3x £100 = £300 @ 20% = £60 VAT
        assert Decimal(data['cart']['total_vat']) == Decimal('60.00')

        vat_result = data['cart']['vat_result']
        item = vat_result['items'][0]
        assert item['quantity'] == 3
        assert Decimal(item['vat_amount']) == Decimal('60.00')


@pytest.mark.django_db
class TestAPIErrorHandling:
    """Test API error handling and validation."""

    def test_invalid_json_payload_returns_error(self, authenticated_api_client):
        """Invalid JSON payload returns error."""
        url = reverse('rules-engine:calculate-vat')

        response = authenticated_api_client.post(
            url,
            data='invalid json',
            content_type='application/json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_wrong_http_method_returns_error(self, authenticated_api_client, uk_cart_mixed):
        """Wrong HTTP method returns error."""
        url = reverse('rules-engine:calculate-vat')

        # Try GET instead of POST
        response = authenticated_api_client.get(url)

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_malformed_cart_id_returns_error(self, authenticated_api_client):
        """Malformed cart_id returns error."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': 'invalid'  # Should be integer
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_negative_cart_id_returns_error(self, authenticated_api_client):
        """Negative cart_id returns error."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': -1
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestAPIPerformance:
    """Test API performance characteristics."""

    def test_large_cart_calculates_within_timeout(self, authenticated_api_client, uk_user):
        """Large cart calculates VAT within reasonable time."""
        from cart.models import Cart, CartItem
        from store.models import Product

        # Create large cart with 50 items
        cart = Cart.objects.create(user_id=uk_user.id)

        for i in range(50):
            product = Product.objects.create(
                product_name=f'Product {i}',
                product_code=f'PROD-{i:03d}',
                price=Decimal('100.00')
            )
            CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=1,
                price=product.price
            )

        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': cart.id
        }

        import time
        start_time = time.time()
        response = authenticated_api_client.post(url, payload, format='json')
        elapsed_time = time.time() - start_time

        assert response.status_code == status.HTTP_200_OK
        assert elapsed_time < 5.0, f"API took {elapsed_time:.2f}s, expected < 5s"

        data = response.json()
        assert len(data['cart']['vat_result']['items']) == 50

    def test_concurrent_requests_handle_correctly(self, authenticated_api_client, uk_cart_mixed):
        """Concurrent requests to same cart handle correctly."""
        import concurrent.futures

        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        def make_request():
            return authenticated_api_client.post(url, payload, format='json')

        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All requests should succeed
        for response in responses:
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert Decimal(data['cart']['total_vat']) == Decimal('20.00')


@pytest.mark.django_db
class TestAPIIdempotency:
    """Test API idempotency characteristics."""

    def test_repeated_calls_return_consistent_results(self, authenticated_api_client, uk_cart_mixed):
        """Repeated calls to same cart return consistent results."""
        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        # Make 3 consecutive calls
        responses = []
        for _ in range(3):
            response = authenticated_api_client.post(url, payload, format='json')
            responses.append(response.json())

        # All responses should be identical
        for response in responses:
            assert response['ok'] is True
            assert Decimal(response['cart']['total_vat']) == Decimal('20.00')
            assert len(response['cart']['vat_result']['items']) == 2

    def test_vat_calculation_does_not_modify_cart(self, authenticated_api_client, uk_cart_mixed):
        """VAT calculation endpoint does not modify cart data."""
        from cart.models import CartItem

        # Get initial cart state
        initial_items = list(CartItem.objects.filter(cart=uk_cart_mixed).values())

        url = reverse('rules-engine:calculate-vat')

        payload = {
            'cart_id': uk_cart_mixed.id
        }

        response = authenticated_api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK

        # Cart items should remain unchanged
        final_items = list(CartItem.objects.filter(cart=uk_cart_mixed).values())
        assert initial_items == final_items
