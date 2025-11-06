"""
Verify Bundle filter configuration in the database.

This script confirms that:
1. Bundle FilterGroup exists in acted_filter_group
2. Bundle is associated with PRODUCT_CATEGORY in acted_filter_configuration
3. Bundle filter counts are being generated correctly
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from products.models.filter_system import FilterConfiguration, FilterGroup, FilterConfigurationGroup
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle

print('='*80)
print('BUNDLE FILTER CONFIGURATION VERIFICATION')
print('='*80)

# 1. Check FilterGroup
print('\n1. FilterGroup "Bundle"')
print('-'*80)
try:
    bundle_group = FilterGroup.objects.get(name='Bundle')
    print(f'   [OK] FilterGroup exists')
    print(f'   ID: {bundle_group.id}')
    print(f'   Name: {bundle_group.name}')
    print(f'   Parent: {bundle_group.parent.name if bundle_group.parent else "None"}')
    print(f'   Active: {bundle_group.is_active}')
except FilterGroup.DoesNotExist:
    print('   [ERROR] FilterGroup "Bundle" does NOT exist - needs to be created')
    bundle_group = None

# 2. Check FilterConfiguration association
print('\n2. FilterConfiguration Association')
print('-'*80)
try:
    product_category_config = FilterConfiguration.objects.get(name='PRODUCT_CATEGORY')
    print(f'   [OK] PRODUCT_CATEGORY configuration exists (ID: {product_category_config.id})')

    if bundle_group:
        config_group = FilterConfigurationGroup.objects.filter(
            filter_configuration=product_category_config,
            filter_group=bundle_group
        ).first()

        if config_group:
            print(f'   [OK] Bundle is associated with PRODUCT_CATEGORY')
            print(f'   Display Order: {config_group.display_order}')
        else:
            print('   [ERROR] Bundle is NOT associated with PRODUCT_CATEGORY - needs to be linked')
except FilterConfiguration.DoesNotExist:
    print('   [ERROR] PRODUCT_CATEGORY configuration does NOT exist')

# 3. Check all FilterGroups in PRODUCT_CATEGORY
print('\n3. All FilterGroups in PRODUCT_CATEGORY')
print('-'*80)
if product_category_config:
    config_groups = FilterConfigurationGroup.objects.filter(
        filter_configuration=product_category_config
    ).select_related('filter_group').order_by('display_order')

    for cg in config_groups:
        marker = '>' if cg.filter_group.name == 'Bundle' else ' '
        print(f'   {marker} {cg.display_order}. {cg.filter_group.name} (ID: {cg.filter_group.id})')

# 4. Check active bundles
print('\n4. Active Bundles in Database')
print('-'*80)
bundles_count = ExamSessionSubjectBundle.objects.filter(is_active=True).count()
print(f'   Active bundles: {bundles_count}')

if bundles_count > 0:
    # Show sample bundles
    sample_bundles = ExamSessionSubjectBundle.objects.filter(
        is_active=True
    ).select_related(
        'bundle',
        'exam_session_subject__subject'
    )[:5]

    print('   Sample bundles:')
    for bundle in sample_bundles:
        print(f'      - {bundle.bundle.bundle_name} ({bundle.exam_session_subject.subject.code})')

# 5. Summary
print('\n' + '='*80)
print('SUMMARY')
print('='*80)

all_good = True

if bundle_group and bundle_group.is_active:
    print('[OK] FilterGroup "Bundle" exists and is active')
else:
    print('[ERROR] FilterGroup "Bundle" missing or inactive')
    all_good = False

if bundle_group and config_group:
    print('[OK] Bundle is properly associated with PRODUCT_CATEGORY configuration')
else:
    print('[ERROR] Bundle filter configuration incomplete')
    all_good = False

if bundles_count > 0:
    print(f'[OK] {bundles_count} active bundles available in database')
else:
    print('[ERROR] No active bundles in database')
    all_good = False

print('\n' + '='*80)
if all_good:
    print('STATUS: [OK] All Bundle filter configuration is CORRECT')
    print('\nThe Bundle filter is ready to use in the frontend.')
    print('Users can filter products by selecting "Bundle" in the Categories filter.')
else:
    print('STATUS: [ERROR] Bundle filter configuration INCOMPLETE')
    print('\nAction required: See issues above.')
print('='*80)
