from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User
from .models import Product
from .serializers import ProductSerializer
import json

class ProductModelTests(TestCase):
    """Tests for the Product model"""

    def setUp(self):
        # Create test product
        self.product = Product.objects.create(
            code="TEST001",
            fullname="Test Product Full Name",
            shortname="Test Product",
            description="Test product description"
        )

    def test_product_creation(self):
        """Test that a product can be created successfully"""
        self.assertEqual(self.product.code, "TEST001")
        self.assertEqual(self.product.fullname, "Test Product Full Name")
        self.assertEqual(self.product.shortname, "Test Product")
        self.assertEqual(self.product.description, "Test product description")
        self.assertTrue(self.product.is_active)
        self.assertIsNotNone(self.product.created_at)
        self.assertIsNotNone(self.product.updated_at)

    def test_product_str_representation(self):
        """Test the string representation of the product"""
        self.assertEqual(str(self.product), "TEST001 - Test Product")

    def test_product_ordering(self):
        """Test that products are ordered by code"""
        Product.objects.create(code="TEST003", fullname="Product 3", shortname="P3")
        Product.objects.create(code="TEST002", fullname="Product 2", shortname="P2")
        
        products = Product.objects.all()
        self.assertEqual(products[0].code, "TEST001")
        self.assertEqual(products[1].code, "TEST002")
        self.assertEqual(products[2].code, "TEST003")


class ProductAPITests(APITestCase):
    """Tests for the Product API endpoints"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Set up authenticated client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test product
        self.product = Product.objects.create(
            code="TEST001",
            fullname="Test Product Full Name",
            shortname="Test Product",
            description="Test product description"
        )
        
        # Define API URLs
        self.list_url = reverse('product-list')
        self.detail_url = reverse('product-detail', kwargs={'pk': self.product.pk})
        self.bulk_import_url = reverse('product-bulk-import-products')
        
    def test_get_all_products(self):
        """Test retrieving all products"""
        response = self.client.get(self.list_url)
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], serializer.data)
        
    def test_get_single_product(self):
        """Test retrieving a single product"""
        response = self.client.get(self.detail_url)
        serializer = ProductSerializer(self.product)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)
        
    def test_create_product(self):
        """Test creating a new product"""
        data = {
            'code': 'TEST002',
            'fullname': 'New Test Product Full Name',
            'shortname': 'New Test Product',
            'description': 'New test product description',
            'is_active': True
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        
        new_product = Product.objects.get(code='TEST002')
        self.assertEqual(new_product.fullname, 'New Test Product Full Name')
        
    def test_update_product(self):
        """Test updating an existing product"""
        data = {
            'code': 'TEST001',
            'fullname': 'Updated Test Product Full Name',
            'shortname': 'Updated Test Product',
            'description': 'Updated test product description',
            'is_active': True
        }
        
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        updated_product = Product.objects.get(pk=self.product.pk)
        self.assertEqual(updated_product.fullname, 'Updated Test Product Full Name')
        self.assertEqual(updated_product.shortname, 'Updated Test Product')
        
    def test_delete_product(self):
        """Test deleting a product"""
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 0)
        
    def test_bulk_import_products(self):
        """Test bulk importing products"""
        data = {
            'products': [
                {
                    'code': 'BULK001',
                    'fullname': 'Bulk Product 1 Full Name',
                    'shortname': 'Bulk Product 1',
                    'description': 'Bulk product 1 description',
                    'is_active': True
                },
                {
                    'code': 'BULK002',
                    'fullname': 'Bulk Product 2 Full Name',
                    'shortname': 'Bulk Product 2',
                    'description': 'Bulk product 2 description',
                    'is_active': True
                }
            ]
        }
        
        response = self.client.post(self.bulk_import_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 3)  # original + 2 new products
        
        # Check that the products were created properly
        self.assertTrue(Product.objects.filter(code='BULK001').exists())
        self.assertTrue(Product.objects.filter(code='BULK002').exists())
        
    def test_bulk_import_with_invalid_data(self):
        """Test bulk importing with invalid product data"""
        data = {
            'products': [
                {
                    # Missing required 'code' field
                    'fullname': 'Invalid Product Full Name',
                    'shortname': 'Invalid Product'
                },
                {
                    'code': 'VALID001',
                    'fullname': 'Valid Product Full Name',
                    'shortname': 'Valid Product'
                }
            ]
        }
        
        response = self.client.post(self.bulk_import_url, data, format='json')
        
        # Should still create the valid product
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(response.data['created']), 1)
        self.assertEqual(len(response.data['errors']), 1)
        
        # Verify only the valid product was created
        self.assertEqual(Product.objects.count(), 2)  # original + 1 new valid product
        self.assertTrue(Product.objects.filter(code='VALID001').exists())
