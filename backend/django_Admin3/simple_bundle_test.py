#!/usr/bin/env python
"""
Simple test to verify Bundle filter implementation
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from products.models.filter_system import FilterConfiguration
from products.services.filter_service import get_filter_service

def test_bundle_filter_config():
    """Test the Bundle filter configuration"""
    
    print("=== Testing Bundle Filter Configuration ===\n")
    
    # Check if bundle filter configuration exists
    try:
        bundle_config = FilterConfiguration.objects.get(name='bundle')
        print(f"✓ Bundle filter configuration found:")
        print(f"  - Name: {bundle_config.name}")
        print(f"  - Display Label: {bundle_config.display_label}")
        print(f"  - Filter Type: {bundle_config.filter_type}")
        print(f"  - UI Component: {bundle_config.ui_component}")
        print(f"  - Is Active: {bundle_config.is_active}")
        print()
    except FilterConfiguration.DoesNotExist:
        print("✗ Bundle filter configuration not found")
        return False
    
    # Test filter service
    print("Testing filter service...")
    try:
        filter_service = get_filter_service()
        print(f"✓ Filter service loaded successfully")
        
        # Check if bundle strategy is loaded
        if 'bundle' in filter_service.strategies:
            print(f"✓ Bundle filter strategy loaded")
            strategy = filter_service.strategies['bundle']
            print(f"  - Strategy type: {type(strategy).__name__}")
            
            # Test getting options
            options = strategy.get_options()
            print(f"  - Options: {options}")
            
        else:
            print("✗ Bundle filter strategy not loaded")
            print(f"Available strategies: {list(filter_service.strategies.keys())}")
        
    except Exception as e:
        print(f"✗ Error testing filter service: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # Test filter configuration endpoint
    print("Testing filter configuration...")
    try:
        config = filter_service.get_filter_configuration()
        if 'bundle' in config:
            print(f"✓ Bundle filter in configuration")
            bundle_config = config['bundle']
            print(f"  - Type: {bundle_config.get('type')}")
            print(f"  - Label: {bundle_config.get('label')}")
            print(f"  - Options: {bundle_config.get('options')}")
        else:
            print("✗ Bundle filter not in configuration")
            print(f"Available filters: {list(config.keys())}")
    except Exception as e:
        print(f"✗ Error testing filter configuration: {e}")
    
    print()
    print("=== Bundle Filter Configuration Test Complete ===")
    
    return True

if __name__ == '__main__':
    test_bundle_filter_config()