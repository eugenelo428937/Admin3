"""
pytest fixtures for VAT testing - Epic 3 Phase 6

Provides reusable fixtures for:
- Users with different regions (UK, EU, ROW, SA)
- Carts with different product combinations
- Products with different classifications
"""

import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from products.models import Product
from country.models import Country
from userprofile.models import UserProfile

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
        code='GB',
        defaults={'name': 'United Kingdom'}
    )
    UserProfile.objects.create(
        user=user,
        country=country,
        postcode='SW1A 1AA'
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
        code='DE',
        defaults={'name': 'Germany'}
    )
    UserProfile.objects.create(
        user=user,
        country=country,
        postcode='10115'
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
        code='AU',
        defaults={'name': 'Australia'}
    )
    UserProfile.objects.create(
        user=user,
        country=country,
        postcode='2000'
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
        code='ZA',
        defaults={'name': 'South Africa'}
    )
    UserProfile.objects.create(
        user=user,
        country=country,
        postcode='0001'
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
        code='IE',
        defaults={'name': 'Ireland'}
    )
    UserProfile.objects.create(
        user=user,
        country=country,
        postcode='D01'
    )
    return user


# ============================================================================
# Product Fixtures - Different Types
# ============================================================================

@pytest.fixture
def ebook_product(db):
    """eBook product (digital, zero VAT for UK)."""
    return Product.objects.create(
        product_name='CS2 eBook',
        product_code='MAT-EBOOK-CS2',
        price=Decimal('50.00')
    )


@pytest.fixture
def physical_book_product(db):
    """Physical book product (material, standard VAT)."""
    return Product.objects.create(
        product_name='CS2 Printed Material',
        product_code='MAT-PRINT-CS2',
        price=Decimal('100.00')
    )


@pytest.fixture
def digital_product(db):
    """Digital product (zero VAT for ROW)."""
    return Product.objects.create(
        product_name='CS2 Digital Course',
        product_code='MAT-DIGITAL-CS2',
        price=Decimal('80.00')
    )


@pytest.fixture
def tutorial_product(db):
    """Live tutorial product (standard VAT for region)."""
    return Product.objects.create(
        product_name='CS2 Live Tutorial',
        product_code='TUT-LIVE-CS2',
        price=Decimal('200.00')
    )


@pytest.fixture
def marking_product(db):
    """Marking product (standard VAT)."""
    return Product.objects.create(
        product_name='CS2 Marking',
        product_code='MARK-CS2',
        price=Decimal('50.00')
    )


# ============================================================================
# Cart Fixtures - Different Combinations
# ============================================================================

@pytest.fixture
def empty_cart(db, uk_user):
    """Empty cart for edge case testing."""
    return Cart.objects.create(user_id=uk_user.id)


@pytest.fixture
def uk_cart_ebook_only(db, uk_user, ebook_product):
    """UK cart with only an ebook (0% VAT)."""
    cart = Cart.objects.create(user_id=uk_user.id)
    CartItem.objects.create(
        cart=cart,
        product=ebook_product,
        quantity=1,
        price=ebook_product.price
    )
    return cart


@pytest.fixture
def uk_cart_mixed(db, uk_user, ebook_product, physical_book_product):
    """UK cart with ebook + physical book (mixed VAT)."""
    cart = Cart.objects.create(user_id=uk_user.id)

    CartItem.objects.create(
        cart=cart,
        product=ebook_product,
        quantity=1,
        price=ebook_product.price
    )

    CartItem.objects.create(
        cart=cart,
        product=physical_book_product,
        quantity=1,
        price=physical_book_product.price
    )

    return cart


@pytest.fixture
def row_cart_digital(db, row_user, digital_product):
    """ROW cart with digital product (0% VAT)."""
    cart = Cart.objects.create(user_id=row_user.id)
    CartItem.objects.create(
        cart=cart,
        product=digital_product,
        quantity=1,
        price=digital_product.price
    )
    return cart


@pytest.fixture
def sa_cart_tutorial(db, sa_user, tutorial_product):
    """SA cart with tutorial (15% VAT)."""
    cart = Cart.objects.create(user_id=sa_user.id)
    CartItem.objects.create(
        cart=cart,
        product=tutorial_product,
        quantity=1,
        price=tutorial_product.price
    )
    return cart


@pytest.fixture
def sa_cart_mixed(db, sa_user, tutorial_product, physical_book_product):
    """SA cart with tutorial + book (both 15% VAT)."""
    cart = Cart.objects.create(user_id=sa_user.id)

    CartItem.objects.create(
        cart=cart,
        product=tutorial_product,
        quantity=1,
        price=tutorial_product.price
    )

    CartItem.objects.create(
        cart=cart,
        product=physical_book_product,
        quantity=1,
        price=physical_book_product.price
    )

    return cart


@pytest.fixture
def uk_cart_multiple_quantities(db, uk_user, physical_book_product):
    """UK cart with multiple quantities of same product."""
    cart = Cart.objects.create(user_id=uk_user.id)
    CartItem.objects.create(
        cart=cart,
        product=physical_book_product,
        quantity=3,
        price=physical_book_product.price
    )
    return cart


@pytest.fixture
def eu_cart_material(db, eu_user, physical_book_product):
    """EU cart with physical material (0% VAT - ROW treatment)."""
    cart = Cart.objects.create(user_id=eu_user.id)
    CartItem.objects.create(
        cart=cart,
        product=physical_book_product,
        quantity=1,
        price=physical_book_product.price
    )
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
    """Helper function to calculate VAT for cart."""
    from vat.service import calculate_vat_for_cart as _calculate_vat_for_cart
    return _calculate_vat_for_cart


@pytest.fixture
def calculate_vat_for_item():
    """Helper function to calculate VAT for single item."""
    from vat.service import calculate_vat_for_item as _calculate_vat_for_item
    return _calculate_vat_for_item


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
    """Authenticated API client with UK user."""
    api_client.force_authenticate(user=uk_user)
    return api_client


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def vat_context_uk_ebook(uk_user, ebook_product):
    """Pre-built VAT context for UK user with ebook."""
    return {
        'user_address': {
            'country': 'GB',
            'region': 'UK',
            'postcode': 'SW1A 1AA'
        },
        'cart': {
            'id': 1,
            'items': [
                {
                    'item_id': 1,
                    'product_id': ebook_product.id,
                    'product_code': 'MAT-EBOOK-CS2',
                    'net_amount': Decimal('50.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': True,
                        'is_digital': True,
                        'is_material': False,
                        'is_live_tutorial': False,
                        'is_marking': False,
                        'product_type': 'ebook'
                    }
                }
            ],
            'total_net': Decimal('50.00')
        },
        'settings': {
            'effective_date': '2025-09-30',
            'context_version': '1.0'
        }
    }


@pytest.fixture
def vat_context_row_digital(row_user, digital_product):
    """Pre-built VAT context for ROW user with digital product."""
    return {
        'user_address': {
            'country': 'AU',
            'region': 'ROW',
            'postcode': '2000'
        },
        'cart': {
            'id': 2,
            'items': [
                {
                    'item_id': 2,
                    'product_id': digital_product.id,
                    'product_code': 'MAT-DIGITAL-CS2',
                    'net_amount': Decimal('80.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': False,
                        'is_digital': True,
                        'is_material': False,
                        'is_live_tutorial': False,
                        'is_marking': False,
                        'product_type': 'digital'
                    }
                }
            ],
            'total_net': Decimal('80.00')
        },
        'settings': {
            'effective_date': '2025-09-30',
            'context_version': '1.0'
        }
    }


@pytest.fixture
def vat_context_sa_tutorial(sa_user, tutorial_product):
    """Pre-built VAT context for SA user with tutorial."""
    return {
        'user_address': {
            'country': 'ZA',
            'region': 'SA',
            'postcode': '0001'
        },
        'cart': {
            'id': 3,
            'items': [
                {
                    'item_id': 3,
                    'product_id': tutorial_product.id,
                    'product_code': 'TUT-LIVE-CS2',
                    'net_amount': Decimal('200.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': False,
                        'is_digital': False,
                        'is_material': False,
                        'is_live_tutorial': True,
                        'is_marking': False,
                        'product_type': 'live_tutorial'
                    }
                }
            ],
            'total_net': Decimal('200.00')
        },
        'settings': {
            'effective_date': '2025-09-30',
            'context_version': '1.0'
        }
    }
