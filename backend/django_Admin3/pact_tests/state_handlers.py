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
            'description': 'Full printed study material',
            'description_short': 'Printed material',
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
    subject, _es, _ess, catalog_product, _var, ppv = setup_catalog_foundation()
    groups = setup_filter_groups()

    # Associate PPV with each filter group so navigation returns products
    from filtering.models import ProductProductGroup
    for group in groups.values():
        ProductProductGroup.objects.get_or_create(
            product_product_variation=ppv, product_group=group,
        )


def state_product_groups_exist(params=None):
    """State: product groups exist

    Creates FilterGroup data for the product-group-filters endpoint.
    Uses update_or_create for the child group to ensure the parent
    relationship is set correctly even if the record already exists
    (e.g. created by setup_filter_groups() without a parent).
    """
    from filtering.models import FilterGroup

    # Create parent group (category level)
    study_materials, _ = FilterGroup.objects.get_or_create(
        name='Study Materials',
        defaults={'is_active': True, 'display_order': 0, 'parent': None},
    )

    # Create or update child group — ensure parent is always set
    core_materials, _ = FilterGroup.objects.update_or_create(
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

    # Associate PPV with a filter group for dimension filtering
    from filtering.models import ProductProductGroup
    core_group, _ = FilterGroup.objects.get_or_create(
        name='Core Study Materials',
        defaults={'is_active': True, 'display_order': 0},
    )
    ProductProductGroup.objects.get_or_create(
        product_product_variation=_ppv, product_group=core_group,
    )

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
            'description': 'Face-to-face tutorial in London',
            'description_short': 'London tutorial',
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
    venue is a FK to TutorialVenue, so we must create a venue instance.
    """
    from tutorials.models import TutorialEvents, TutorialVenue
    import datetime

    tutorial_store_product, _cp = setup_tutorial_catalog_product()

    venue, _ = TutorialVenue.objects.get_or_create(
        name='London',
        defaults={'description': 'London venue'},
    )

    TutorialEvents.objects.get_or_create(
        code='TUT-CM2-LON-2025',
        defaults={
            'venue': venue,
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
# Email System state handlers (Phase 6)
# ---------------------------------------------------------------------------

def setup_email_template():
    """Create a test email template at id=1.

    Returns the template instance.
    """
    from email_system.models import EmailTemplate

    existing = EmailTemplate.objects.filter(name='order_confirmation').first()
    if existing and existing.id == 1:
        return existing

    # Clear the id=1 slot and any existing order_confirmation template
    EmailTemplate.objects.filter(name='order_confirmation').delete()
    EmailTemplate.objects.filter(id=1).delete()

    template = EmailTemplate.objects.create(
        id=1,
        name='order_confirmation',
        template_type='ORDER',
        display_name='Order Confirmation',
        description='Sent after a successful order',
        use_master_template=True,
        default_priority='normal',
        is_active=True,
    )
    # subject_template now lives on EmailTemplateVersion
    template.create_version(
        subject_template='Your Order #{{order_id}}',
        change_note='pact setup',
    )
    return template


def setup_email_placeholder(template=None):
    """Create a test email content placeholder.

    Returns the placeholder instance.
    """
    from email_system.models import EmailContentPlaceholder

    placeholder, _ = EmailContentPlaceholder.objects.get_or_create(
        name='order_details_block',
        defaults={
            'display_name': 'Order Details Block',
            'description': 'Dynamic order details section',
            'default_content_template': '<p>Order details here</p>',
            'insert_position': 'replace',
            'is_required': True,
            'is_active': True,
        },
    )

    if template:
        placeholder.templates.add(template)

    return placeholder


def state_email_settings_exist(params=None):
    """State: email settings exist"""
    from email_system.models import EmailSettings

    EmailSettings.objects.get_or_create(
        key='smtp_host',
        defaults={
            'setting_type': 'smtp',
            'display_name': 'SMTP Host',
            'value': 'mail.example.com',
            'is_active': True,
        },
    )


def state_email_templates_exist(params=None):
    """State: email templates exist"""
    setup_email_template()


def state_email_template_exists(params=None):
    """State: email template exists"""
    setup_email_template()


def state_email_queue_items_exist(params=None):
    """State: email queue items exist"""
    from email_system.models import EmailQueue

    template = setup_email_template()

    EmailQueue.objects.get_or_create(
        subject='Test Email Subject',
        defaults={
            'template': template,
            'to_emails': ['test@example.com'],
            'from_email': 'noreply@acted.co.uk',
            'priority': 'normal',
            'status': 'pending',
        },
    )


def _ensure_email_queue_item_at_id_1():
    """Ensure an email queue item exists at id=1 for pact detail endpoint."""
    from email_system.models import EmailQueue

    existing = EmailQueue.objects.filter(subject='Test Email Subject').first()
    if existing and existing.id == 1:
        return

    template = setup_email_template()

    # Remove ALL existing test queue items to prevent MultipleObjectsReturned
    # on subsequent get_or_create calls, then clear the id=1 slot.
    EmailQueue.objects.filter(subject='Test Email Subject').delete()
    EmailQueue.objects.filter(id=1).delete()

    EmailQueue.objects.create(
        id=1,
        subject='Test Email Subject',
        template=template,
        to_emails=['test@example.com'],
        from_email='noreply@acted.co.uk',
        priority='normal',
        status='pending',
    )


def state_email_queue_item_exists(params=None):
    """State: email queue item exists

    Pact detail endpoint uses /api/email/queue/1/, so ensure id=1 exists.
    """
    state_email_queue_items_exist()
    _ensure_email_queue_item_at_id_1()


def state_email_attachments_exist(params=None):
    """State: email attachments exist"""
    from email_system.models import EmailAttachment

    EmailAttachment.objects.get_or_create(
        name='terms_and_conditions',
        defaults={
            'display_name': 'Terms and Conditions',
            'attachment_type': 'static',
            'file_path': 'static/documents/terms.pdf',
            'file_size': 1024,
            'mime_type': 'application/pdf',
            'is_active': True,
        },
    )


def state_email_content_rules_exist(params=None):
    """State: email content rules exist"""
    from email_system.models import EmailContentRule

    template = setup_email_template()
    placeholder = setup_email_placeholder(template)

    EmailContentRule.objects.get_or_create(
        name='product_upsell_rule',
        defaults={
            'rule_type': 'product_based',
            'placeholder': placeholder,
            'condition_field': 'items.product_code',
            'condition_operator': 'contains',
            'condition_value': 'CM2',
            'priority': 100,
            'is_active': True,
        },
    )


def state_email_placeholders_exist(params=None):
    """State: email placeholders exist"""
    template = setup_email_template()
    setup_email_placeholder(template)


# ---------------------------------------------------------------------------
# Additional catalog state handlers
# ---------------------------------------------------------------------------

def state_catalog_exam_session_subjects_exist(params=None):
    """State: catalog exam session subjects exist"""
    setup_catalog_foundation()


def state_catalog_product_variations_exist(params=None):
    """State: catalog product variations exist"""
    setup_catalog_foundation()


def state_catalog_product_product_variations_exist(params=None):
    """State: catalog product product variations exist"""
    setup_catalog_foundation()


def state_catalog_product_bundles_exist(params=None):
    """State: catalog product bundles exist"""
    from catalog.models import ProductBundle

    subject, _es, _ess, _cp, _var, _ppv = setup_catalog_foundation()

    ProductBundle.objects.get_or_create(
        subject=subject,
        bundle_name='CM2 April 2025 Bundle',
        defaults={
            'bundle_description': 'Complete CM2 study package',
            'is_active': True,
        },
    )


def state_catalog_bundle_products_exist(params=None):
    """State: catalog bundle products exist"""
    from catalog.models import ProductBundle, ProductBundleProduct

    subject, _es, _ess, _cp, _var, ppv = setup_catalog_foundation()

    bundle_template, _ = ProductBundle.objects.get_or_create(
        subject=subject,
        bundle_name='CM2 April 2025 Bundle',
        defaults={
            'bundle_description': 'Complete CM2 study package',
            'is_active': True,
        },
    )

    ProductBundleProduct.objects.get_or_create(
        bundle=bundle_template,
        product_product_variation=ppv,
        defaults={
            'quantity': 1,
            'sort_order': 0,
            'is_active': True,
        },
    )


def state_catalog_recommendations_exist(params=None):
    """State: catalog recommendations exist

    Creates a recommendation linking one PPV to another.
    Needs two distinct ProductProductVariation records.
    """
    from catalog.models import (
        Product as CatalogProduct, ProductVariation,
        ProductProductVariation, ProductVariationRecommendation,
    )

    _subject, _es, _ess, _cp, _var, ppv = setup_catalog_foundation()

    # Create a second catalog product + variation for the recommendation target
    ebook_product, _ = CatalogProduct.objects.get_or_create(
        code='SM01E',
        defaults={
            'fullname': 'CM2 eBook Study Material',
            'shortname': 'CM2 eBook',
            'is_active': True,
        },
    )

    ebook_variation, _ = ProductVariation.objects.get_or_create(
        code='ECSM01',
        defaults={
            'variation_type': 'eBook',
            'name': 'eBook Combined Study Material',
            'description': 'Full eBook study material',
            'description_short': 'eBook material',
        },
    )

    ebook_ppv, _ = ProductProductVariation.objects.get_or_create(
        product=ebook_product,
        product_variation=ebook_variation,
    )

    ProductVariationRecommendation.objects.get_or_create(
        product_product_variation=ppv,
        defaults={'recommended_product_product_variation': ebook_ppv},
    )


# ---------------------------------------------------------------------------
# Store detail state handlers
# ---------------------------------------------------------------------------

def state_store_product_exists(params=None):
    """State: store product exists (single product detail)

    Pact detail endpoint uses /api/store/products/1/, so ensure id=1 exists.
    """
    from store.models import Product as StoreProduct

    store_product, _price = setup_store_product()

    if store_product.id == 1:
        return

    # Move store product to id=1
    StoreProduct.objects.filter(id=1).exclude(pk=store_product.pk).delete()
    store_product.delete()

    _subject, _es, ess, _cp, _var, ppv = setup_catalog_foundation()
    from store.models import Price
    from decimal import Decimal as D

    sp = StoreProduct.objects.create(
        id=1,
        exam_session_subject=ess,
        product_product_variation=ppv,
        product_code='CM2/PCSM01P/2025-04',
        is_active=True,
    )
    Price.objects.get_or_create(
        product=sp,
        price_type='standard',
        defaults={'amount': D('59.99'), 'currency': 'GBP'},
    )


def state_store_bundles_exist(params=None):
    """State: store bundles exist"""
    state_exam_session_bundles_exist()


def state_store_bundle_products_exist(params=None):
    """State: store bundle products exist"""
    state_exam_session_bundles_exist()


def state_store_prices_exist(params=None):
    """State: store prices exist"""
    setup_store_product()


# ---------------------------------------------------------------------------
# Admin / Staff state handlers
# ---------------------------------------------------------------------------

def _setup_superuser():
    """Create a superuser for admin endpoint testing.

    The pact verifier injects a JWT token for this user via
    add_custom_header, but the state handlers still need to create
    the users and objects that the endpoints will return.
    """
    user, created = User.objects.get_or_create(
        username='tutor1',
        defaults={
            'email': 'jsmith@example.com',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'is_active': True,
            'is_staff': True,
            'is_superuser': True,
        },
    )
    if created:
        user.set_password('AdminPass123!')
        user.save()
    return user


def state_staff_member_exists_and_requester_is_superuser(params=None):
    """State: staff member exists and requester is superuser

    Pact detail endpoint uses /api/users/staff/1/, so ensure id=1 exists.
    """
    from staff.models import Staff

    user = _setup_superuser()
    existing = Staff.objects.filter(user=user).first()

    if existing and existing.id == 1:
        return

    # Clear id=1 slot and any existing staff for this user
    Staff.objects.filter(id=1).exclude(user=user).delete()
    if existing:
        existing.delete()

    Staff.objects.create(id=1, user=user)


def state_staff_members_exist_and_requester_is_superuser(params=None):
    """State: staff members exist and requester is superuser"""
    state_staff_member_exists_and_requester_is_superuser()


def _setup_user_profile():
    """Create a user with a full profile for admin testing.

    Pact URLs hard-code /profiles/1/, so the profile must have id=1.
    The post_save signal auto-creates a profile when a User is first
    created; its auto-assigned id depends on insert order and may not
    be 1. This helper ensures the superuser's profile ends up at id=1.

    Returns (user, profile).
    """
    from userprofile.models import UserProfile

    user = _setup_superuser()

    # Get the signal-created profile (if any)
    existing = UserProfile.objects.filter(user=user).first()

    if existing and existing.id == 1:
        # Already at id=1 — just update fields
        existing.title = 'Dr.'
        existing.send_invoices_to = 'HOME'
        existing.send_study_material_to = 'HOME'
        existing.remarks = 'Test profile'
        existing.save()
        return user, existing

    # Clear the way: remove any other profile occupying id=1
    UserProfile.objects.filter(id=1).delete()

    # Remove the auto-created profile (has wrong id)
    if existing:
        existing.delete()

    # Create with the correct id
    profile = UserProfile.objects.create(
        id=1,
        user=user,
        title='Dr.',
        send_invoices_to='HOME',
        send_study_material_to='HOME',
        remarks='Test profile',
    )
    return user, profile


def state_user_profile_exists_and_requester_is_superuser(params=None):
    """State: user profile exists and requester is superuser"""
    _setup_user_profile()


def state_user_profiles_exist_and_requester_is_superuser(params=None):
    """State: user profiles exist and requester is superuser"""
    _setup_user_profile()


def state_user_profile_with_addresses_exists(params=None):
    """State: user profile with addresses exists and requester is superuser"""
    from userprofile.models import UserProfileAddress

    _user, profile = _setup_user_profile()
    UserProfileAddress.objects.get_or_create(
        user_profile=profile,
        address_type='HOME',
        defaults={
            'address_data': {
                'line1': '123 Main Street',
                'city': 'London',
                'postcode': 'SW1A 1AA',
            },
            'country': 'GB',
        },
    )


def state_user_profile_with_contacts_exists(params=None):
    """State: user profile with contacts exists and requester is superuser"""
    from userprofile.models import UserProfileContactNumber

    _user, profile = _setup_user_profile()
    UserProfileContactNumber.objects.get_or_create(
        user_profile=profile,
        contact_type='MOBILE',
        defaults={
            'number': '07700900123',
            'country_code': 'GB',
        },
    )


def state_user_profile_with_emails_exists(params=None):
    """State: user profile with emails exists and requester is superuser"""
    from userprofile.models import UserProfileEmail

    _user, profile = _setup_user_profile()
    UserProfileEmail.objects.get_or_create(
        user_profile=profile,
        email_type='WORK',
        defaults={'email': 'jane.smith@work.com'},
    )


# ---------------------------------------------------------------------------
# Session setup state handlers
# ---------------------------------------------------------------------------

def state_session_setup_data_exists_for_copy(params=None):
    """State: session setup data exists for copy

    Creates a 'previous' session with products/prices/bundles and a
    'new' session with ESS records but no products yet — so the
    copy-products endpoint can copy them across.

    The pact sends arbitrary integer IDs (type-matched), so we use
    whatever IDs get auto-generated. The view looks up by ID from
    the POST body, so we must ensure the actual IDs match.

    Strategy: create sessions, then update the pact request body IDs
    at runtime — except we can't change the pact body. Instead, we
    create sessions and let the copy endpoint handle whatever IDs
    arrive. If the pact sends IDs that don't exist, the view returns
    a 400 error which won't match the expected 201.

    The pact matching rules use 'integer' type matching on the
    request body, so the verifier sends the exact integers from the
    pact (42 and 41). We must create sessions with those IDs.
    """
    from catalog.models import (
        ExamSession, ExamSessionSubject,
        Subject, Product as CatalogProduct,
        ProductVariation, ProductProductVariation,
        ProductBundle,
    )
    from store.models import Product as StoreProduct, Price

    # Create subjects
    subject, _ = Subject.objects.get_or_create(
        code='CM2',
        defaults={'description': 'CM2 - Models', 'active': True},
    )
    subject2, _ = Subject.objects.get_or_create(
        code='SP9',
        defaults={'description': 'SP9 - Enterprise Risk', 'active': True},
    )

    # Previous session (id must match pact's previous_exam_session_id)
    prev_session, _ = ExamSession.objects.update_or_create(
        id=41,
        defaults={
            'session_code': '2026-04',
            'start_date': timezone.now(),
            'end_date': timezone.now() + timezone.timedelta(days=90),
        },
    )

    # New session (id must match pact's new_exam_session_id)
    new_session, _ = ExamSession.objects.update_or_create(
        id=42,
        defaults={
            'session_code': '2026-09',
            'start_date': timezone.now() + timezone.timedelta(days=180),
            'end_date': timezone.now() + timezone.timedelta(days=270),
        },
    )

    # ESS for previous session
    prev_ess, _ = ExamSessionSubject.objects.get_or_create(
        exam_session=prev_session,
        subject=subject,
        defaults={'is_active': True},
    )

    # ESS for new session (needed so copy-products has targets)
    ExamSessionSubject.objects.get_or_create(
        exam_session=new_session,
        subject=subject,
        defaults={'is_active': True},
    )
    # SP9 only in previous — will be a skipped subject
    sp9_prev_ess, _ = ExamSessionSubject.objects.get_or_create(
        exam_session=prev_session,
        subject=subject2,
        defaults={'is_active': True},
    )

    # Catalog product + variation
    cat_product, _ = CatalogProduct.objects.get_or_create(
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
        product=cat_product,
        product_variation=variation,
    )

    # Store product in previous session
    prev_store_product, _ = StoreProduct.objects.get_or_create(
        exam_session_subject=prev_ess,
        product_product_variation=ppv,
        defaults={'is_active': True},
    )
    Price.objects.get_or_create(
        product=prev_store_product,
        price_type='standard',
        defaults={'amount': Decimal('59.99'), 'currency': 'GBP'},
    )

    # Bundle template for the subject
    ProductBundle.objects.get_or_create(
        subject=subject,
        bundle_name='CM2 Study Pack',
        defaults={
            'bundle_description': 'Complete CM2 package',
            'is_active': True,
        },
    )

    # SP9 store product in previous session — needed so copy-products
    # reports SP9 as a skipped subject (no matching ESS in new session).
    sp9_cat_product, _ = CatalogProduct.objects.get_or_create(
        code='SP9SM01',
        defaults={
            'fullname': 'SP9 Study Material',
            'shortname': 'SP9',
            'is_active': True,
        },
    )
    sp9_variation, _ = ProductVariation.objects.get_or_create(
        code='SP9PCSM',
        defaults={
            'variation_type': 'Printed',
            'name': 'SP9 Printed Study Material',
            'description': 'SP9 printed material',
            'description_short': 'SP9 printed',
        },
    )
    sp9_ppv, _ = ProductProductVariation.objects.get_or_create(
        product=sp9_cat_product,
        product_variation=sp9_variation,
    )
    StoreProduct.objects.get_or_create(
        exam_session_subject=sp9_prev_ess,
        product_product_variation=sp9_ppv,
        defaults={'is_active': True},
    )


def state_session_exists_but_has_no_ess(params=None):
    """State: session exists but has no exam session subjects

    Creates session 99 with no ESS records, plus session 41 as the
    previous session (needed for the copy-products request body).
    """
    from catalog.models import ExamSession

    # Session 99 — no ESS records
    ExamSession.objects.update_or_create(
        id=99,
        defaults={
            'session_code': '2027-04',
            'start_date': timezone.now() + timezone.timedelta(days=365),
            'end_date': timezone.now() + timezone.timedelta(days=455),
        },
    )

    # Session 41 — previous session (just needs to exist)
    ExamSession.objects.update_or_create(
        id=41,
        defaults={
            'session_code': '2026-04',
            'start_date': timezone.now(),
            'end_date': timezone.now() + timezone.timedelta(days=90),
        },
    )


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
    'catalog exam session subjects exist': state_catalog_exam_session_subjects_exist,
    'catalog product variations exist': state_catalog_product_variations_exist,
    'catalog product product variations exist': state_catalog_product_product_variations_exist,
    'catalog product bundles exist': state_catalog_product_bundles_exist,
    'catalog bundle products exist': state_catalog_bundle_products_exist,
    'catalog recommendations exist': state_catalog_recommendations_exist,
    # Phase 3: Rules Engine
    'rules for home_page_mount exist': state_rules_for_home_page_mount_exist,
    'VAT configuration exists': state_vat_configuration_exists,
    'acted rules exist': state_acted_rules_exist,
    # Phase 3: Tutorials
    'tutorial events exist': state_tutorial_events_exist,
    'tutorial products exist': state_tutorial_products_exist,
    # Store detail
    'store product exists': state_store_product_exists,
    'store bundles exist': state_store_bundles_exist,
    'store bundle products exist': state_store_bundle_products_exist,
    'store prices exist': state_store_prices_exist,
    # Admin: Staff & User Profiles
    'staff member exists and requester is superuser': state_staff_member_exists_and_requester_is_superuser,
    'staff members exist and requester is superuser': state_staff_members_exist_and_requester_is_superuser,
    'user profile exists and requester is superuser': state_user_profile_exists_and_requester_is_superuser,
    'user profiles exist and requester is superuser': state_user_profiles_exist_and_requester_is_superuser,
    'user profile with addresses exists and requester is superuser': state_user_profile_with_addresses_exists,
    'user profile with contacts exists and requester is superuser': state_user_profile_with_contacts_exists,
    'user profile with emails exists and requester is superuser': state_user_profile_with_emails_exists,
    # Session setup
    'session setup data exists for copy': state_session_setup_data_exists_for_copy,
    'session exists but has no exam session subjects': state_session_exists_but_has_no_ess,
    # Phase 6: Email System
    'email settings exist': state_email_settings_exist,
    'email templates exist': state_email_templates_exist,
    'email template exists': state_email_template_exists,
    'email queue items exist': state_email_queue_items_exist,
    'email queue item exists': state_email_queue_item_exists,
    'email attachments exist': state_email_attachments_exist,
    'email content rules exist': state_email_content_rules_exist,
    'email placeholders exist': state_email_placeholders_exist,
}
