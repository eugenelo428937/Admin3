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

    Creates FilterGroup data for the product-group-filters endpoint.
    """
    from filtering.models import FilterGroup

    # Create parent group (category level)
    study_materials, _ = FilterGroup.objects.get_or_create(
        name='Study Materials',
        defaults={'is_active': True, 'display_order': 0, 'parent': None},
    )

    # Create child group
    core_materials, _ = FilterGroup.objects.get_or_create(
        name='Core Study Materials',
        defaults={'is_active': True, 'display_order': 0, 'parent': study_materials},
    )


def state_filter_configuration_exists(params=None):
    """State: filter configuration exists

    filter-configuration endpoint needs FilterConfiguration with options.
    Seeds FilterConfigurationGroup data so filter_groups is populated
    in the response (US1/US5 contract update).
    """
    from filtering.models import FilterConfiguration, FilterGroup, FilterConfigurationGroup

    setup_catalog_foundation()  # ensures subjects exist

    # Subjects config (no filter groups — uses subject options)
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

    # Categories config with filter groups (US1)
    categories_config, _ = FilterConfiguration.objects.get_or_create(
        name='Categories',
        defaults={
            'display_label': 'Categories',
            'filter_type': 'filter_group',
            'filter_key': 'categories',
            'ui_component': 'multi_select',
            'is_active': True,
            'display_order': 2,
        },
    )

    # Create and assign groups to categories
    groups = setup_filter_groups()
    material, _ = FilterGroup.objects.get_or_create(
        name='Material',
        defaults={'is_active': True, 'display_order': 0},
    )
    FilterConfigurationGroup.objects.get_or_create(
        filter_configuration=categories_config,
        filter_group=material,
        defaults={'display_order': 0},
    )

    # Product types config with filter groups
    pt_config, _ = FilterConfiguration.objects.get_or_create(
        name='Product Types',
        defaults={
            'display_label': 'Product Types',
            'filter_type': 'filter_group',
            'filter_key': 'product_types',
            'ui_component': 'multi_select',
            'is_active': True,
            'display_order': 3,
        },
    )

    for group_name in ['Core Study Materials', 'Revision Materials']:
        if group_name in groups:
            FilterConfigurationGroup.objects.get_or_create(
                filter_configuration=pt_config,
                filter_group=groups[group_name],
                defaults={'display_order': 0},
            )


def state_exam_session_bundles_exist(params=None):
    """State: exam session bundles exist

    Creates a bundle with component products. The component products
    are linked to filter groups so bundle filtering across dimensions
    can be verified (US4).
    """
    from catalog.models import ProductBundle
    from store.models import Bundle, BundleProduct
    from filtering.models import FilterGroup

    subject, _es, ess, _cp, _var, _ppv = setup_catalog_foundation()
    store_product, _price = setup_store_product()

    # Associate catalog product with a filter group for dimension filtering
    core_group, _ = FilterGroup.objects.get_or_create(
        name='Core Study Materials',
        defaults={'is_active': True, 'display_order': 0},
    )
    _cp.groups.add(core_group)

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
    """State: products exist for default search

    The /api/search/default-data/ endpoint returns:
    - popular_products: from StoreProduct
    - suggested_filters.subjects: from Subject
    - suggested_filters.product_groups: from FilterGroup (is_active=True)
    """
    setup_store_product()
    setup_catalog_foundation()
    setup_filter_groups()  # Required for product_groups in suggested_filters


# ---------------------------------------------------------------------------
# Catalog state handlers (Phase 2)
# ---------------------------------------------------------------------------

def state_catalog_subjects_exist(params=None):
    """State: catalog subjects exist"""
    setup_catalog_foundation()


def state_catalog_exam_sessions_exist(params=None):
    """State: catalog exam sessions exist"""
    setup_catalog_foundation()


def state_catalog_products_exist(params=None):
    """State: catalog products exist"""
    setup_catalog_foundation()


# ---------------------------------------------------------------------------
# Rules Engine state handlers (Phase 3)
# ---------------------------------------------------------------------------

def state_rules_for_home_page_mount_exist(params=None):
    """State: rules for home_page_mount exist

    The execute endpoint returns {success, rules_evaluated, effects} even
    when no rules match, so we just need a valid entry point.
    """
    pass  # execute endpoint handles missing entry points gracefully


def state_vat_configuration_exists(params=None):
    """State: VAT configuration exists

    Creates a UtilsCountrys record for GB with 20% VAT so the
    calculate-vat endpoint can look up the rate.
    """
    from utils.models import UtilsCountrys

    UtilsCountrys.objects.get_or_create(
        code='GB',
        defaults={
            'name': 'United Kingdom',
            'vat_percent': Decimal('20.00'),
            'active': True,
        },
    )


def state_acted_rules_exist(params=None):
    """State: acted rules exist

    Creates an ActedRule so the acted-rules list endpoint returns data.
    """
    from rules_engine.models import ActedRule

    ActedRule.objects.get_or_create(
        rule_code='rule_home_banner',
        defaults={
            'name': 'Home Page Banner',
            'entry_point': 'home_page_mount',
            'priority': 100,
            'active': True,
            'condition': {'==': [True, True]},
            'actions': [
                {
                    'type': 'display_message',
                    'message': 'Welcome to the store',
                }
            ],
        },
    )


# ---------------------------------------------------------------------------
# Tutorial state handlers (Phase 3)
# ---------------------------------------------------------------------------

def setup_tutorial_catalog_product():
    """Create a tutorial-type catalog product with variation and store product.

    Returns (store_product, catalog_product).
    """
    from catalog.models import (
        Product as CatalogProduct, ProductVariation,
        ProductProductVariation,
    )
    from store.models import Product as StoreProduct

    subject, exam_session, ess, _cp, _var, _ppv = setup_catalog_foundation()

    tutorial_product, _ = CatalogProduct.objects.get_or_create(
        code='TUT01',
        defaults={
            'fullname': 'CM2 Tutorial London',
            'shortname': 'CM2 Tutorial',
            'is_active': True,
        },
    )

    tutorial_variation, _ = ProductVariation.objects.get_or_create(
        code='TLONCM2',
        defaults={
            'variation_type': 'Tutorial',
            'name': 'London Face-to-Face Tutorial',
        },
    )

    tutorial_ppv, _ = ProductProductVariation.objects.get_or_create(
        product=tutorial_product,
        product_variation=tutorial_variation,
    )

    tutorial_store_product, _ = StoreProduct.objects.get_or_create(
        exam_session_subject=ess,
        product_product_variation=tutorial_ppv,
        defaults={
            'product_code': 'CM2/TLONCM2/2025-04',
            'is_active': True,
        },
    )

    return tutorial_store_product, tutorial_product


def state_tutorial_events_exist(params=None):
    """State: tutorial events exist

    Creates a TutorialEvent linked to a tutorial store product.
    """
    from tutorials.models import TutorialEvents
    import datetime

    tutorial_store_product, _cp = setup_tutorial_catalog_product()

    TutorialEvents.objects.get_or_create(
        code='TUT-CM2-LON-2025',
        defaults={
            'venue': 'London',
            'is_soldout': False,
            'remain_space': 20,
            'start_date': datetime.date(2025, 4, 1),
            'end_date': datetime.date(2025, 4, 5),
            'store_product': tutorial_store_product,
        },
    )


def state_tutorial_products_exist(params=None):
    """State: tutorial products exist

    Creates tutorial store products so products/all/ returns data.
    The view filters by fullname__icontains='tutorial'.
    """
    setup_tutorial_catalog_product()


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
    'filter configuration exists': state_filter_configuration_exists,
    'exam session bundles exist': state_exam_session_bundles_exist,
    'searchable products exist': state_searchable_products_exist,
    'products exist for default search': state_products_exist_for_default_search,
    'product groups exist': state_product_groups_exist,
    # Phase 2: Catalog
    'catalog subjects exist': state_catalog_subjects_exist,
    'catalog exam sessions exist': state_catalog_exam_sessions_exist,
    'catalog products exist': state_catalog_products_exist,
    # Phase 3: Rules Engine
    'rules for home_page_mount exist': state_rules_for_home_page_mount_exist,
    'VAT configuration exists': state_vat_configuration_exists,
    'acted rules exist': state_acted_rules_exist,
    # Phase 3: Tutorials
    'tutorial events exist': state_tutorial_events_exist,
    'tutorial products exist': state_tutorial_products_exist,
}
