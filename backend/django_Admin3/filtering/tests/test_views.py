"""Tests for filtering API view endpoints."""
from rest_framework.test import APITestCase
from rest_framework import status
from filtering.models import FilterGroup, ProductGroupFilter


class TestProductCategoriesAllEndpoint(APITestCase):
    """Test the GET /api/products/product-categories/all/ endpoint."""

    def setUp(self):
        self.root = FilterGroup.objects.create(name='Root Category', code='ROOT')
        self.child = FilterGroup.objects.create(
            name='Child Category', code='CHILD', parent=self.root,
        )

    def test_product_categories_all(self):
        """GET /api/products/product-categories/all/ returns category tree."""
        response = self.client.get('/api/products/product-categories/all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestProductGroupsTreeEndpoint(APITestCase):
    """Test the GET /api/products/product-groups/tree/ endpoint."""

    def setUp(self):
        self.root = FilterGroup.objects.create(name='Group Root', code='GROOT')

    def test_product_groups_tree(self):
        """GET /api/products/product-groups/tree/ returns group tree."""
        response = self.client.get('/api/products/product-groups/tree/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestProductsByGroupEndpoint(APITestCase):
    """Test the GET /api/products/product-groups/{group_id}/products/ endpoint."""

    def setUp(self):
        self.group = FilterGroup.objects.create(name='Products Group', code='PGRP')

    def test_products_by_group(self):
        """GET /api/products/product-groups/1/products/ returns products for group."""
        response = self.client.get(
            f'/api/products/product-groups/{self.group.id}/products/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_products_by_group_literal_url(self):
        """GET /api/products/product-groups/999999/products/ with invalid group returns 404."""
        response = self.client.get('/api/products/product-groups/999999/products/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestProductGroupFiltersEndpoint(APITestCase):
    """Test the GET /api/products/product-group-filters/ endpoint."""

    def test_product_group_filters(self):
        """GET /api/products/product-group-filters/ returns filter definitions."""
        response = self.client.get('/api/products/product-group-filters/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestFilterConfigurationEndpoint(APITestCase):
    """Test the GET /api/products/filter-configuration/ endpoint."""

    def test_filter_configuration(self):
        """GET /api/products/filter-configuration/ returns filter config."""
        response = self.client.get('/api/products/filter-configuration/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
