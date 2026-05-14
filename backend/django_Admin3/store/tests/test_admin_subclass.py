"""Phase 3.1 admin: per-subclass admins are registered and reachable.

These are smoke tests, not behavior tests — Django's admin framework is
trusted. We assert:
  1. Each MTI subclass has a ModelAdmin registered.
  2. The changelist URL resolves and returns 200 for a superuser.
"""
from django.contrib import admin as django_admin
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class SubclassAdminRegistrationTests(TestCase):
    def setUp(self):
        from store.models import MaterialProduct, TutorialProduct, MarkingProduct
        self.MaterialProduct = MaterialProduct
        self.TutorialProduct = TutorialProduct
        self.MarkingProduct = MarkingProduct

    def test_material_product_admin_is_registered(self):
        self.assertIn(self.MaterialProduct, django_admin.site._registry)

    def test_tutorial_product_admin_is_registered(self):
        self.assertIn(self.TutorialProduct, django_admin.site._registry)

    def test_marking_product_admin_is_registered(self):
        self.assertIn(self.MarkingProduct, django_admin.site._registry)


class SubclassAdminChangelistTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.staff = User.objects.create_superuser(
            username='phase3admin', email='p3@example.com', password='x',
        )

    def setUp(self):
        self.client = Client()
        self.client.force_login(self.staff)

    def test_material_product_changelist_200(self):
        url = reverse('admin:store_materialproduct_changelist')
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_tutorial_product_changelist_200(self):
        url = reverse('admin:store_tutorialproduct_changelist')
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_marking_product_changelist_200(self):
        url = reverse('admin:store_markingproduct_changelist')
        self.assertEqual(self.client.get(url).status_code, 200)
