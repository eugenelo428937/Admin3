"""Tests for LegacyFilterURLAliasMiddleware (30-day deprecation shim)."""
import pytest
from django.http import HttpResponse, QueryDict
from django.test import RequestFactory

from filtering.middleware.legacy_url_alias import LegacyFilterURLAliasMiddleware


@pytest.fixture
def middleware():
    return LegacyFilterURLAliasMiddleware(get_response=lambda req: HttpResponse('ok'))


@pytest.fixture
def factory():
    return RequestFactory()


def test_rewrites_subject_code_to_subjects(middleware, factory):
    req = factory.get('/products', {'subject_code': 'CB1'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'subjects=CB1' in response['Location']
    assert 'subject_code' not in response['Location']


def test_merges_indexed_subjects(middleware, factory):
    req = factory.get('/products', {
        'subject_code': 'CB1', 'subject_1': 'CB2', 'subject_2': 'CB3',
    })
    response = middleware(req)
    assert response.status_code == 301
    assert 'subjects=CB1%2CCB2%2CCB3' in response['Location'] \
        or 'subjects=CB1,CB2,CB3' in response['Location']


def test_rewrites_group_to_product_types(middleware, factory):
    req = factory.get('/products', {'group': 'PRINTED,EBOOK'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'product_types=PRINTED' in response['Location']


def test_rewrites_category_code_to_categories(middleware, factory):
    req = factory.get('/products', {'category_code': 'MAT', 'category_1': 'TUT'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'categories=MAT' in response['Location']
    assert 'TUT' in response['Location']


def test_passes_through_canonical_url_unchanged(middleware, factory):
    """If the URL already uses canonical form, no redirect happens."""
    req = factory.get('/products', {'subjects': 'CB1,CB2'})
    response = middleware(req)
    assert response.status_code == 200  # falls through to get_response


def test_passes_through_non_products_paths(middleware, factory):
    """Requests to paths other than /products are not affected."""
    req = factory.get('/cart/', {'subject_code': 'CB1'})
    response = middleware(req)
    assert response.status_code == 200


def test_passes_through_when_no_query_string(middleware, factory):
    req = factory.get('/products')
    response = middleware(req)
    assert response.status_code == 200


def test_preserves_unknown_params(middleware, factory):
    """Foreign params (e.g., from analytics) are preserved."""
    req = factory.get('/products', {'subject_code': 'CB1', 'utm_source': 'email'})
    response = middleware(req)
    assert response.status_code == 301
    assert 'utm_source=email' in response['Location']


# Task 20: end-to-end smoke test through full middleware stack
@pytest.mark.django_db
def test_legacy_url_redirects_via_test_client(client):
    """End-to-end: Django test client follows the redirect chain."""
    response = client.get('/products?subject_code=CB1&group=PRINTED', follow=False)
    assert response.status_code == 301
    assert 'subjects=CB1' in response['Location']
    assert 'product_types=PRINTED' in response['Location']
