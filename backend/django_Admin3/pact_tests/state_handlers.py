"""
Provider state handlers for Pact verification.

Each handler sets up the database state needed for a specific consumer
interaction. Handler names correspond to the `given()` strings in
consumer Pact tests.

Returns a dict/function map: { 'state description': handler_function }
"""
import logging
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)

# Test credentials used across provider states
TEST_EMAIL = 'test@example.com'
TEST_PASSWORD = 'ValidPass123!'


# ---------------------------------------------------------------------------
# Shared setup helpers
# ---------------------------------------------------------------------------

def setup_registered_user():
    """Create a test user for auth-related states."""
    user, created = User.objects.get_or_create(
        email=TEST_EMAIL,
        defaults={
            'username': TEST_EMAIL,
            'first_name': 'Test',
            'last_name': 'User',
            'is_active': True,
        },
    )
    if created:
        user.set_password(TEST_PASSWORD)
        user.save()
    return user


def setup_authenticated_user():
    """Create and return an authenticated user."""
    return setup_registered_user()


def setup_catalog_foundation():
    """Create the foundational catalog objects needed by most states.

    Returns (subject, exam_session, ess, catalog_product, variation, ppv).
    """
    from catalog.models import (
        Subject, ExamSession, ExamSessionSubject,
        Product as CatalogProduct, ProductVariation,
        ProductProductVariation,
    )

    subject, _ = Subject.objects.get_or_create(
        code='CM2',
        defaults={'description': 'CM2 - Models', 'active': True},
    )

    exam_session, _ = ExamSession.objects.get_or_create(
        session_code='2025-04',
        defaults={
            'start_date': timezone.now(),
            'end_date': timezone.now() + timezone.timedelta(days=90),
        },
    )

    ess, _ = ExamSessionSubject.objects.get_or_create(
        exam_session=exam_session,
        subject=subject,
        defaults={'is_active': True},
    )

    catalog_product, _ = CatalogProduct.objects.get_or_create(
        code='SM01',
        defaults={
            'fullname': 'CM2 Printed Study Material',
            'shortname': 'CM2',
            'is_active': True,
        },
    )

    variation, _ = ProductVariation.objects.get_or_create(
        code='PCSM01P',
        defaults={
            'variation_type': 'Printed',
            'name': 'Printed Combined Study Material',
        },
    )

    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=catalog_product,
        product_variation=variation,
    )

    return subject, exam_session, ess, catalog_product, variation, ppv


def setup_store_product():
    """Create a store product with a standard price.

    Returns (store_product, price).
    """
    from store.models import Product as StoreProduct, Price

    _subject, _es, ess, _cp, _var, ppv = setup_catalog_foundation()

    store_product, _ = StoreProduct.objects.get_or_create(
        exam_session_subject=ess,
        product_product_variation=ppv,
        defaults={
            'product_code': 'CM2/PCSM01P/2025-04',
            'is_active': True,
        },
    )

    price, _ = Price.objects.get_or_create(
        product=store_product,
        price_type='standard',
        defaults={'amount': Decimal('59.99'), 'currency': 'GBP'},
    )

    return store_product, price


def setup_filter_groups():
    """Create filter groups used by navigation, product-group-filters, etc.

    Returns dict of { name: FilterGroup }.
    """
    from filtering.models import FilterGroup

    group_names = [
        'Core Study Materials', 'Revision Materials', 'Marking', 'Tutorial',
    ]
    groups = {}
    for name in group_names:
        g, _ = FilterGroup.objects.get_or_create(
            name=name,
            defaults={'is_active': True, 'display_order': 0},
        )
        groups[name] = g

    return groups


# ---------------------------------------------------------------------------
# Auth state handlers
# ---------------------------------------------------------------------------

def state_a_registered_user_exists(params=None):
    """State: a registered user exists

    Also cleans up any carts with NULL session_key to prevent
    merge_guest_cart from matching stale carts during login.
    """
    from cart.models import Cart

    setup_registered_user()
    # Remove carts with no session key (login's merge_guest_cart
    # queries Cart.objects.get(session_key=None) and would match these)
    Cart.objects.filter(session_key__isnull=True).delete()


def state_no_user_with_email_exists(params=None):
    """State: no user with email newuser@example.com exists"""
    User.objects.filter(email='newuser@example.com').delete()


def state_valid_refresh_token_exists(params=None):
    """State: a valid refresh token exists"""
    setup_registered_user()


def state_an_authenticated_user(params=None):
    """State: an authenticated user"""
    setup_authenticated_user()


def state_inactive_user_with_activation_token(params=None):
    """State: an inactive user with valid activation token"""
    user, _ = User.objects.get_or_create(
        email=TEST_EMAIL,
        defaults={
            'username': TEST_EMAIL,
            'first_name': 'Test',
            'last_name': 'User',
            'is_active': False,
        },
    )
    user.set_password(TEST_PASSWORD)
    user.save()


# ---------------------------------------------------------------------------
# Cart state handlers
# ---------------------------------------------------------------------------

def state_authenticated_user_with_items_in_cart(params=None):
    """State: an authenticated user with items in cart"""
    user = setup_authenticated_user()
    store_product, price = setup_store_product()

    from cart.models import Cart, CartItem

    cart, _ = Cart.objects.get_or_create(user=user)
    # Clear previous items to ensure clean state
    cart.items.all().delete()

    CartItem.objects.create(
        cart=cart,
        product=store_product,
        item_type='product',
        quantity=1,
        price_type='standard',
        actual_price=price.amount,
        metadata={
            'variationId': store_product.product_product_variation.id,
            'variationName': 'Printed',
            'variationType': 'Material',
            'is_digital': False,
            'is_marking': False,
            'is_material': True,
            'is_tutorial': False,
        },
    )


def state_authenticated_user_with_empty_cart(params=None):
    """State: an authenticated user with empty cart"""
    user = setup_authenticated_user()

    from cart.models import Cart

    cart, _ = Cart.objects.get_or_create(user=user)
    cart.items.all().delete()


def state_authenticated_user_and_purchasable_product(params=None):
    """State: an authenticated user and a purchasable product exists"""
    setup_authenticated_user()
    setup_store_product()


def state_authenticated_user_with_valid_payment(params=None):
    """State: an authenticated user with items in cart and valid payment"""
    # Re-use the "items in cart" handler
    state_authenticated_user_with_items_in_cart()


# ---------------------------------------------------------------------------
# Store / product state handlers
# ---------------------------------------------------------------------------

def state_store_products_exist(params=None):
    """State: store products exist"""
    setup_store_product()


def state_catalog_data_exists(params=None):
    """State: catalog data exists

    Navigation data needs subjects, filter groups with products.
    """
    subject, _es, _ess, catalog_product, _var, _ppv = setup_catalog_foundation()
    groups = setup_filter_groups()

    # Associate catalog product with each filter group so navigation returns products
    for group in groups.values():
        group.catalog_products.add(catalog_product)


def state_product_groups_exist(params=None):
    """State: product groups exist

    product-group-filters endpoint needs ProductGroupFilter with groups.
    """
    from filtering.models import ProductGroupFilter

    groups = setup_filter_groups()

    pgf, _ = ProductGroupFilter.objects.get_or_create(
        name='Study Materials',
        defaults={'filter_type': 'type'},
    )
    pgf.groups.add(groups['Core Study Materials'])


def state_filter_configuration_exists(params=None):
    """State: filter configuration exists

    filter-configuration endpoint needs FilterConfiguration with options.
    """
    from filtering.models import FilterConfiguration

    setup_catalog_foundation()  # ensures subjects exist

    FilterConfiguration.objects.get_or_create(
        name='subjects',
        defaults={
            'display_label': 'Subjects',
            'filter_type': 'subject',
            'filter_key': 'subjects',
            'ui_component': 'multi_select',
            'is_active': True,
            'display_order': 1,
        },
    )


def state_exam_session_bundles_exist(params=None):
    """State: exam session bundles exist"""
    from catalog.models import ProductBundle
    from store.models import Bundle, BundleProduct

    subject, _es, ess, _cp, _var, _ppv = setup_catalog_foundation()
    store_product, _price = setup_store_product()

    bundle_template, _ = ProductBundle.objects.get_or_create(
        subject=subject,
        bundle_name='CM2 April 2025 Bundle',
        defaults={
            'bundle_description': 'Complete CM2 study package',
            'is_active': True,
        },
    )

    bundle, _ = Bundle.objects.get_or_create(
        bundle_template=bundle_template,
        exam_session_subject=ess,
        defaults={'is_active': True},
    )

    BundleProduct.objects.get_or_create(
        bundle=bundle,
        product=store_product,
        defaults={'quantity': 1, 'is_active': True},
    )


def state_searchable_products_exist(params=None):
    """State: searchable products exist"""
    setup_store_product()
    setup_catalog_foundation()


def state_products_exist_for_default_search(params=None):
    """State: products exist for default search"""
    setup_store_product()
    setup_catalog_foundation()


# ---------------------------------------------------------------------------
# State handler mapping
# ---------------------------------------------------------------------------

STATE_HANDLERS = {
    'a registered user exists': state_a_registered_user_exists,
    'no user with email newuser@example.com exists': state_no_user_with_email_exists,
    'a valid refresh token exists': state_valid_refresh_token_exists,
    'an authenticated user': state_an_authenticated_user,
    'an inactive user with valid activation token': state_inactive_user_with_activation_token,
    'an authenticated user with items in cart': state_authenticated_user_with_items_in_cart,
    'an authenticated user with empty cart': state_authenticated_user_with_empty_cart,
    'an authenticated user and a purchasable product exists': state_authenticated_user_and_purchasable_product,
    'an authenticated user with items in cart and valid payment': state_authenticated_user_with_valid_payment,
    'store products exist': state_store_products_exist,
    'catalog data exists': state_catalog_data_exists,
    'product groups exist': state_product_groups_exist,
    'filter configuration exists': state_filter_configuration_exists,
    'exam session bundles exist': state_exam_session_bundles_exist,
    'searchable products exist': state_searchable_products_exist,
    'products exist for default search': state_products_exist_for_default_search,
}
