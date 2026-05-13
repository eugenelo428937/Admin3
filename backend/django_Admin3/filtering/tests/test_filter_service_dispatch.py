"""Integration tests for the new filter_type dispatcher in ProductFilterService."""
import pytest
from filtering.models import FilterConfiguration, FilterGroup, FilterConfigurationGroup
from filtering.services.filter_service import ProductFilterService


@pytest.mark.django_db
def test_get_filter_configuration_keys_are_filter_keys():
    """Top-level keys in the response are now FilterConfiguration.filter_key,
    not .name (was 'SUBJECT_FILTER', now 'subjects')."""
    FilterConfiguration.objects.create(
        name='X_FILTER', filter_key='x_key',
        filter_type='subject', display_label='X', display_order=1,
    )
    service = ProductFilterService()
    cfg = service.get_filter_configuration()

    assert 'x_key' in cfg
    assert 'X_FILTER' not in cfg


@pytest.mark.django_db
def test_get_filter_configuration_skips_unknown_filter_type(caplog):
    """A FilterConfiguration with an unhandled filter_type produces a
    warning and is omitted from the response (instead of crashing)."""
    FilterConfiguration.objects.create(
        name='WEIRD', filter_key='weird',
        filter_type='date_range',  # no handler registered
        display_label='Weird', display_order=99,
    )
    service = ProductFilterService()
    with caplog.at_level('WARNING'):
        cfg = service.get_filter_configuration()
    assert 'weird' not in cfg
    assert any('No handler for filter_type' in r.message for r in caplog.records)


@pytest.mark.django_db
def test_get_filter_configuration_response_shape():
    """Each entry has filter_key, filter_type, label, options, display_order,
    ui_component, allow_multiple, is_collapsible, is_expanded_by_default."""
    FilterConfiguration.objects.create(
        name='X', filter_key='x', filter_type='subject',
        display_label='Test', display_order=5, allow_multiple=True,
    )
    service = ProductFilterService()
    cfg = service.get_filter_configuration()

    entry = cfg['x']
    assert entry['filter_key'] == 'x'
    assert entry['filter_type'] == 'subject'
    assert entry['label'] == 'Test'
    assert entry['display_order'] == 5
    assert entry['allow_multiple'] is True
    assert 'options' in entry
    # The removed fields must not appear
    assert 'validation_rules' not in entry
    assert 'dependency_rules' not in entry
    assert 'filter_groups' not in entry  # junction array no longer needed


@pytest.mark.django_db
def test_apply_filters_dispatches_on_filter_type():
    """apply_filters loops through active FilterConfigurations and calls
    each handler's build_q for the corresponding filter_key in input."""
    from catalog.models import (
        Subject, ExamSession, ExamSessionSubject, Product as CatalogProduct,
        ProductVariation, ProductProductVariation,
    )
    from store.models import Product as StoreProduct

    subj1 = Subject.objects.create(code='CB1', description='Test 1', active=True)
    subj2 = Subject.objects.create(code='CB2', description='Test 2', active=True)
    sess = ExamSession.objects.create(
        session_code='2026-04', start_date='2026-04-01', end_date='2026-04-30',
    )
    ess1 = ExamSessionSubject.objects.create(exam_session=sess, subject=subj1)
    ess2 = ExamSessionSubject.objects.create(exam_session=sess, subject=subj2)
    cprod = CatalogProduct.objects.create(shortname='X', fullname='X', code='X', is_active=True)
    pvar = ProductVariation.objects.create(
        code='P', name='Printed', variation_type='Material',
    )
    ppv = ProductProductVariation.objects.create(product=cprod, product_variation=pvar)
    StoreProduct.objects.create(
        exam_session_subject=ess1, product_product_variation=ppv, product_code='P1',
    )
    StoreProduct.objects.create(
        exam_session_subject=ess2, product_product_variation=ppv, product_code='P2',
    )

    FilterConfiguration.objects.create(
        name='SUBJ', filter_key='subjects', filter_type='subject',
        display_label='Subject',
    )

    service = ProductFilterService()
    qs = StoreProduct.objects.all()
    filtered = service.apply_filters(qs, {'subjects': ['CB1']})

    assert filtered.count() == 1
    assert filtered.first().product_code == 'P1'


@pytest.mark.django_db
def test_apply_filters_empty_or_no_handler_returns_unfiltered():
    """Empty filters dict or unmatched keys → unfiltered queryset."""
    from store.models import Product as StoreProduct

    service = ProductFilterService()
    qs = StoreProduct.objects.all()
    assert service.apply_filters(qs, {}).count() == qs.count()
    # Unknown filter_key is silently ignored
    assert service.apply_filters(qs, {'nonexistent_key': ['x']}).count() == qs.count()
