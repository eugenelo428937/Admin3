"""
Django Management Command: Test Tutorial Filtering
================================================
Test tutorial format filtering functionality after recent location fix.

Usage: python manage.py test_tutorial_filtering
"""

from django.core.management.base import BaseCommand
from django.test import Client
from products.models import Product, FilterGroup


class Command(BaseCommand):
    help = 'Test tutorial filtering functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Verbose output',
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        self.client = Client()
        
        self.stdout.write(self.style.SUCCESS("TUTORIAL FILTERING TEST SUITE"))
        self.stdout.write("=" * 50)
        
        self.test_filter_groups_exist()
        self.test_products_viewset_bug()
        self.test_exam_session_products_viewset()
        self.test_tutorial_locations()
        self.recommend_fix()

    def test_filter_groups_exist(self):
        """Test that required filter groups exist in database"""
        self.stdout.write("\n=== Testing Filter Groups Existence ===")
        
        required_groups = [
            'Face-to-face Tutorial',
            'Live Online Tutorial', 
            'Tutorial',
            'Online Classroom'
        ]
        
        for group_name in required_groups:
            try:
                group = FilterGroup.objects.get(name=group_name)
                self.stdout.write(f"[OK] {group_name} (ID: {group.id})")
            except FilterGroup.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"[MISSING] {group_name} - NOT FOUND"))

    def test_products_viewset_bug(self):
        """Test the ProductViewSet group filtering bug"""
        self.stdout.write("\n=== Testing ProductViewSet Group Filtering Bug ===")
        
        # Test with group name (should fail with current implementation)
        response = self.client.get('/api/products/', {'group': 'Face-to-face Tutorial'})
        self.stdout.write(f"ProductViewSet with group name: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else data.get('count', 0)
            self.stdout.write(f"Products returned: {count}")
            if count == 0:
                self.stdout.write(self.style.WARNING("[WARNING] No products returned - likely due to group name vs ID bug"))
        
        # Test with group ID (should work with current implementation)
        try:
            group = FilterGroup.objects.get(name='Face-to-face Tutorial')
            response = self.client.get('/api/products/', {'group': str(group.id)})
            self.stdout.write(f"ProductViewSet with group ID ({group.id}): Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else data.get('count', 0)
                self.stdout.write(f"Products returned: {count}")
                if count > 0:
                    self.stdout.write(self.style.SUCCESS("[SUCCESS] Group ID filtering works correctly"))
        except FilterGroup.DoesNotExist:
            self.stdout.write(self.style.ERROR("Face-to-face Tutorial group not found - cannot test ID filtering"))

    def test_exam_session_products_viewset(self):
        """Test the ExamSessionSubjectsProductsViewSet group filtering (should work)"""
        self.stdout.write("\n=== Testing ExamSessionSubjectsProductsViewSet Group Filtering ===")
        
        # This should work correctly with group names
        response = self.client.get('/api/exam-session-subjects-products/', {'group': 'Face-to-face Tutorial'})
        self.stdout.write(f"ExamSessionSubjectsProductsViewSet with group name: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 'Unknown count')
            self.stdout.write(f"Products returned: {count}")
            if count and count > 0:
                self.stdout.write(self.style.SUCCESS("[SUCCESS] Group name filtering works correctly in ExamSessionSubjectsProductsViewSet"))

    def test_tutorial_locations(self):
        """Test tutorial location filtering (should work via product ID)"""
        self.stdout.write("\n=== Testing Tutorial Location Filtering ===")
        
        # Get tutorial products to test with
        try:
            tutorial_group = FilterGroup.objects.get(name='Tutorial')
            tutorial_products = Product.objects.filter(groups=tutorial_group)[:3]
            
            if not tutorial_products:
                self.stdout.write(self.style.WARNING("No tutorial products found"))
                return
            
            for product in tutorial_products:
                response = self.client.get('/api/exam-session-subjects-products/', {'product': str(product.id)})
                self.stdout.write(f"Product '{product.shortname}' (ID: {product.id}): Status {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    count = data.get('count', 0)
                    self.stdout.write(f"  Products returned: {count}")
                    if count > 0:
                        self.stdout.write("  [SUCCESS] Location filtering works")
                        
        except FilterGroup.DoesNotExist:
            self.stdout.write(self.style.ERROR("Tutorial group not found"))

    def recommend_fix(self):
        """Provide fix recommendation"""
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("RECOMMENDED FIX"))
        self.stdout.write("=" * 50)
        
        self.stdout.write("""
CRITICAL BUG IDENTIFIED:
   ProductViewSet handles group filtering by ID but frontend sends group names.
   
File to fix: backend/django_Admin3/products/views.py (line ~142)

Current BROKEN code:
    group_ids = self.request.query_params.getlist('group')
    if group_ids:
        queryset = queryset.filter(groups__id__in=group_ids).distinct()

Should be FIXED to match ExamSessionSubjectsProductsViewSet pattern:
    group_filter = self.request.query_params.get('group')
    if group_filter:
        try:
            # Try to parse as integer ID first
            if group_filter.isdigit():
                queryset = queryset.filter(groups__id=int(group_filter)).distinct()
            else:
                # Handle as group name
                group = FilterGroup.objects.get(name=group_filter)
                queryset = queryset.filter(groups=group).distinct()
        except (FilterGroup.DoesNotExist, ValueError):
            queryset = queryset.none()

This will fix navbar tutorial format filtering:
   - "Face-to-face Tutorial" → works via group name lookup
   - "Live Online Tutorial" → works via group name lookup
   - Maintains backward compatibility with group IDs
        """)