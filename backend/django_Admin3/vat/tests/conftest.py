"""
pytest fixtures for VAT testing - Epic 3 Phase 6

Fixtures for:
- Users with different regions (UK, EU, ROW, SA, IE)
- Carts with different product combinations
- Products with different classifications

Note: VAT system uses CartItem.actual_price and metadata fields,
not Product model prices. This aligns with the VAT context schema.
"""

import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from country.models import Country
from userprofile.models import UserProfile, UserProfileAddress

User = get_user_model()


# ============================================================================
# User Fixtures - Different Regions
# ============================================================================

@pytest.fixture
def uk_user(db):
    """User with UK address (GB country code)."""
    user = User.objects.create_user(
        username='uk_user',
        email='uk@example.com',
        password='testpass123'
    )
    country, _ = Country.objects.get_or_create(
        iso_code='GB',
        defaults={'name': 'United Kingdom', 'phone_code': '+44'}
    )
    profile = UserProfile.objects.create(user=user)
    UserProfileAddress.objects.create(
        user_profile=profile,
        address_type='HOME',
        country='GB',  # Store iso_code as string
        address_data={'postcode': 'SW1A 1AA'}
    )
    return user


@pytest.fixture
def eu_user(db):
    """User with EU address (DE country code)."""
    user = User.objects.create_user(
        username='eu_user',
        email='eu@example.com',
        password='testpass123'
    )
    country, _ = Country.objects.get_or_create(
        iso_code='DE',
        defaults={'name': 'Germany', 'phone_code': '+49'}
    )
    profile = UserProfile.objects.create(user=user)
    UserProfileAddress.objects.create(
        user_profile=profile,
        address_type='HOME',
        country='DE',  # Store iso_code as string
        address_data={'postcode': '10115'}
    )
    return user


@pytest.fixture
def row_user(db):
    """User with ROW (Rest of World) address (AU country code)."""
    user = User.objects.create_user(
        username='row_user',
        email='row@example.com',
        password='testpass123'
    )
    country, _ = Country.objects.get_or_create(
        iso_code='AU',
        defaults={'name': 'Australia', 'phone_code': '+61'}
    )
    profile = UserProfile.objects.create(user=user)
    UserProfileAddress.objects.create(
        user_profile=profile,
        address_type='HOME',
        country='AU',  # Store iso_code as string
        address_data={'postcode': '2000'}
    )
    return user


@pytest.fixture
def sa_user(db):
    """User with South Africa address (ZA country code)."""
    user = User.objects.create_user(
        username='sa_user',
        email='sa@example.com',
        password='testpass123'
    )
    country, _ = Country.objects.get_or_create(
        iso_code='ZA',
        defaults={'name': 'South Africa', 'phone_code': '+27'}
    )
    profile = UserProfile.objects.create(user=user)
    UserProfileAddress.objects.create(
        user_profile=profile,
        address_type='HOME',
        country='ZA',  # Store iso_code as string
        address_data={'postcode': '0001'}
    )
    return user


@pytest.fixture
def ie_user(db):
    """User with Ireland address (IE country code)."""
    user = User.objects.create_user(
        username='ie_user',
        email='ie@example.com',
        password='testpass123'
    )
    country, _ = Country.objects.get_or_create(
        iso_code='IE',
        defaults={'name': 'Ireland', 'phone_code': '+353'}
    )
    profile = UserProfile.objects.create(user=user)
    UserProfileAddress.objects.create(
        user_profile=profile,
        address_type='HOME',
        country='IE',  # Store iso_code as string
        address_data={'postcode': 'D01'}
    )
    return user


# ============================================================================
# Cart Item Helper Fixtures - Schema-Aligned
# ============================================================================
# These fixtures create CartItem objects with proper actual_price and metadata
# fields as required by the VAT context schema

@pytest.fixture
def ebook_item_data():
    """eBook item data for creating cart items."""
    return {
        'actual_price': Decimal('50.00'),
        'quantity': 1,
        'item_type': 'fee',  # Use 'fee' to bypass product FK constraint for tests
        'metadata': {
            'product_code': 'MAT-EBOOK-CS2',
            'product_name': 'CS2 eBook',
            'classification': {
                'is_ebook': True,
                'is_digital': True,
                'is_material': False,
                'is_live_tutorial': False,
                'is_marking': False,
                'product_type': 'ebook'
            }
        }
    }


@pytest.fixture
def physical_book_item_data():
    """Physical book item data for creating cart items."""
    return {
        'actual_price': Decimal('100.00'),
        'quantity': 1,
        'item_type': 'fee',  # Use 'fee' to bypass product FK constraint for tests
        'metadata': {
            'product_code': 'MAT-PRINT-CS2',
            'product_name': 'CS2 Printed Material',
            'classification': {
                'is_ebook': False,
                'is_digital': False,
                'is_material': True,
                'is_live_tutorial': False,
                'is_marking': False,
                'product_type': 'material'
            }
        }
    }


@pytest.fixture
def digital_item_data():
    """Digital product item data for creating cart items."""
    return {
        'actual_price': Decimal('80.00'),
        'quantity': 1,
        'item_type': 'fee',  # Use 'fee' to bypass product FK constraint for tests
        'metadata': {
            'product_code': 'MAT-DIGITAL-CS2',
            'product_name': 'CS2 Digital Course',
            'classification': {
                'is_ebook': False,
                'is_digital': True,
                'is_material': False,
                'is_live_tutorial': False,
                'is_marking': False,
                'product_type': 'digital'
            }
        }
    }


@pytest.fixture
def tutorial_item_data():
    """Live tutorial item data for creating cart items."""
    return {
        'actual_price': Decimal('200.00'),
        'quantity': 1,
        'item_type': 'fee',  # Use 'fee' to bypass product FK constraint for tests
        'metadata': {
            'product_code': 'TUT-LIVE-CS2',
            'product_name': 'CS2 Live Tutorial',
            'classification': {
                'is_ebook': False,
                'is_digital': False,
                'is_material': False,
                'is_live_tutorial': True,
                'is_marking': False,
                'product_type': 'live_tutorial'
            }
        }
    }


@pytest.fixture
def marking_item_data():
    """Marking product item data for creating cart items."""
    return {
        'actual_price': Decimal('50.00'),
        'quantity': 1,
        'item_type': 'fee',  # Use 'fee' to bypass product FK constraint for tests
        'metadata': {
            'product_code': 'MARK-CS2',
            'product_name': 'CS2 Marking',
            'classification': {
                'is_ebook': False,
                'is_digital': False,
                'is_material': False,
                'is_live_tutorial': False,
                'is_marking': True,
                'product_type': 'marking'
            }
        }
    }


# ============================================================================
# Cart Fixtures - Different Combinations
# ============================================================================

@pytest.fixture
def empty_cart(db, uk_user):
    """Empty cart for edge case testing."""
    return Cart.objects.create(user=uk_user)


@pytest.fixture
def uk_cart_ebook_only(db, uk_user, ebook_item_data):
    """UK cart with only an ebook (0% VAT)."""
    cart = Cart.objects.create(user=uk_user)
    CartItem.objects.create(cart=cart, **ebook_item_data)
    return cart


@pytest.fixture
def uk_cart_mixed(db, uk_user, ebook_item_data, physical_book_item_data):
    """UK cart with ebook + physical book (mixed VAT)."""
    cart = Cart.objects.create(user=uk_user)
    CartItem.objects.create(cart=cart, **ebook_item_data)
    CartItem.objects.create(cart=cart, **physical_book_item_data)
    return cart


@pytest.fixture
def uk_cart_multiple_quantities(db, uk_user, physical_book_item_data):
    """UK cart with 3x physical book."""
    cart = Cart.objects.create(user=uk_user)
    item_data = physical_book_item_data.copy()
    item_data['quantity'] = 3
    item_data['actual_price'] = Decimal('300.00')  # 3 x 100
    CartItem.objects.create(cart=cart, **item_data)
    return cart


@pytest.fixture
def row_cart_digital(db, row_user, digital_item_data):
    """ROW cart with digital product (0% VAT)."""
    cart = Cart.objects.create(user=row_user)
    CartItem.objects.create(cart=cart, **digital_item_data)
    return cart


@pytest.fixture
def sa_cart_tutorial(db, sa_user, tutorial_item_data):
    """SA cart with tutorial (15% VAT)."""
    cart = Cart.objects.create(user=sa_user)
    CartItem.objects.create(cart=cart, **tutorial_item_data)
    return cart


@pytest.fixture
def sa_cart_mixed(db, sa_user, tutorial_item_data, physical_book_item_data):
    """SA cart with tutorial + book (both 15% VAT)."""
    cart = Cart.objects.create(user=sa_user)
    CartItem.objects.create(cart=cart, **tutorial_item_data)
    CartItem.objects.create(cart=cart, **physical_book_item_data)
    return cart


@pytest.fixture
def eu_cart_material(db, eu_user, physical_book_item_data):
    """EU cart with material (0% VAT as ROW treatment)."""
    cart = Cart.objects.create(user=eu_user)
    CartItem.objects.create(cart=cart, **physical_book_item_data)
    return cart


# ============================================================================
# Helper Function Fixtures
# ============================================================================

@pytest.fixture
def build_vat_context():
    """Helper function to build VAT context for testing."""
    from vat.context_builder import build_vat_context as _build_vat_context
    return _build_vat_context


@pytest.fixture
def calculate_vat_for_cart():
    """VAT calculation service function."""
    from vat.service import calculate_vat_for_cart as _calculate_vat_for_cart
    return _calculate_vat_for_cart


@pytest.fixture
def calculate_vat_for_item():
    """Per-item VAT calculation function."""
    from vat.service import calculate_vat_for_item as _calculate_vat_for_item
    return _calculate_vat_for_item


# ============================================================================
# Pre-built Context Fixtures (for direct rule testing)
# ============================================================================

@pytest.fixture
def vat_context_uk_ebook():
    """Pre-built VAT context for UK user with ebook."""
    return {
        'user_address': {
            'country': 'GB',
            'region': 'UK',
            'postcode': 'SW1A 1AA'
        },
        'cart': {
            'id': 1,
            'items': [{
                'item_id': 1,
                'product_code': 'MAT-EBOOK-CS2',
                'net_amount': '50.00',
                'quantity': 1,
                'classification': {
                    'is_ebook': True,
                    'is_digital': True,
                    'is_material': False,
                    'product_type': 'ebook'
                }
            }],
            'total_net': '50.00'
        },
        'settings': {
            'effective_date': '2025-09-30',
            'context_version': '1.0'
        }
    }


@pytest.fixture
def vat_context_sa_tutorial():
    """Pre-built VAT context for SA user with tutorial."""
    return {
        'user_address': {
            'country': 'ZA',
            'region': 'SA',
            'postcode': '0001'
        },
        'cart': {
            'id': 1,
            'items': [{
                'item_id': 1,
                'product_code': 'TUT-LIVE-CS2',
                'net_amount': '200.00',
                'quantity': 1,
                'classification': {
                    'is_live_tutorial': True,
                    'product_type': 'live_tutorial'
                }
            }],
            'total_net': '200.00'
        },
        'settings': {
            'effective_date': '2025-09-30',
            'context_version': '1.0'
        }
    }


@pytest.fixture
def vat_context_row_digital():
    """Pre-built VAT context for ROW user with digital product."""
    return {
        'user_address': {
            'country': 'AU',
            'region': 'ROW',
            'postcode': '2000'
        },
        'cart': {
            'id': 1,
            'items': [{
                'item_id': 1,
                'product_code': 'MAT-DIGITAL-CS2',
                'net_amount': '80.00',
                'quantity': 1,
                'classification': {
                    'is_digital': True,
                    'product_type': 'digital'
                }
            }],
            'total_net': '80.00'
        },
        'settings': {
            'effective_date': '2025-09-30',
            'context_version': '1.0'
        }
    }


# ============================================================================
# API Client Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Django REST Framework API client."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_api_client(api_client, uk_user):
    """Authenticated API client (UK user)."""
    api_client.force_authenticate(user=uk_user)
    return api_client
