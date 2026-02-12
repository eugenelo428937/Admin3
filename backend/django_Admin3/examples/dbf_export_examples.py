"""
DBF Export Examples for Admin3 Project

This script demonstrates various ways to export Django model data to FoxPro DBF files
using both the management command and the programmatic service interface.

Usage:
    python manage.py shell < examples/dbf_export_examples.py

Or run individual functions from Django shell:
    from examples.dbf_export_examples import *
    export_products_example()
"""

import os
import datetime
from django.conf import settings
from django.core.management import call_command
from utils.services.dbf_export_service import DbfExportService, DbfExportError


def create_export_directory():
    """Create exports directory if it doesn't exist"""
    export_dir = os.path.join(settings.BASE_DIR, 'exports')
    os.makedirs(export_dir, exist_ok=True)
    return export_dir


def export_products_example():
    """Export products to DBF using management command"""
    print("=== Exporting Products to DBF ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'products.dbf')
    
    try:
        call_command(
            'export_to_dbf',
            '--model', 'products.Product',
            '--output', output_file,
            '--debug'
        )
        print(f"Products exported to: {output_file}")
    except Exception as e:
        print(f"Export failed: {e}")


def export_active_cart_items():
    """Export cart items with filters using service"""
    print("\n=== Exporting Active Cart Items ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'cart_items.dbf')
    
    try:
        service = DbfExportService(debug=True)
        
        # Export cart items (assuming CartItem model exists)
        count = service.export_model_to_dbf(
            model_path='cart.CartItem',
            output_file=output_file,
            exclude_fields=['created_at', 'updated_at']  # Exclude timestamps
        )
        
        print(f"Exported {count} cart items to: {output_file}")
        
        # Validate the file
        validation = service.validate_dbf_file(output_file)
        print(f"Validation result: {validation}")
        
    except DbfExportError as e:
        print(f"DBF Export failed: {e}")
    except Exception as e:
        print(f"Export failed: {e}")


def export_orders_with_sql():
    """Export orders using custom SQL query"""
    print("\n=== Exporting Orders with Custom SQL ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'orders_summary.dbf')
    
    try:
        service = DbfExportService(debug=True)
        
        # Custom SQL to get order summary
        sql = """
        SELECT 
            o.id as order_id,
            o.order_number,
            o.total_amount,
            o.order_date,
            o.status,
            u.first_name || ' ' || u.last_name as customer_name,
            u.email as customer_email
        FROM orders_order o
        JOIN auth_user u ON o.user_id = u.id
        WHERE o.order_date >= %s
        ORDER BY o.order_date DESC
        """
        
        # Orders from last 30 days
        thirty_days_ago = datetime.datetime.now() - datetime.timedelta(days=30)
        
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=output_file,
            params=[thirty_days_ago]
        )
        
        print(f"Exported {count} recent orders to: {output_file}")
        
    except DbfExportError as e:
        print(f"DBF Export failed: {e}")
    except Exception as e:
        print(f"Export failed: {e}")


def export_exam_sessions_subjects():
    """Export exam sessions subjects data"""
    print("\n=== Exporting Exam Sessions Subjects ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'exam_sessions_subjects.dbf')
    
    try:
        # Using management command with filter
        call_command(
            'export_to_dbf',
            '--model', 'exam_sessions_subjects.ExamSessionSubject',
            '--output', output_file,
            '--encoding', 'cp1252',
            '--debug'
        )
        print(f"Exam sessions subjects exported to: {output_file}")
        
    except Exception as e:
        print(f"Export failed: {e}")


def export_users_filtered():
    """Export filtered users using management command"""
    print("\n=== Exporting Active Users ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'active_users.dbf')
    
    try:
        call_command(
            'export_to_dbf',
            '--model', 'auth.User',
            '--output', output_file,
            '--filter', 'is_active=True,date_joined__year=2024',
            '--limit', '1000',
            '--debug'
        )
        print(f"Active users exported to: {output_file}")
        
    except Exception as e:
        print(f"Export failed: {e}")


def export_products_with_variations():
    """Export products with their variations using SQL"""
    print("\n=== Exporting Products with Variations ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'products_variations.dbf')
    
    try:
        service = DbfExportService(debug=True)
        
        sql = """
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description,
            pv.id as variation_id,
            pv.variation_type,
            pv.price,
            pv.is_active
        FROM products_product p
        LEFT JOIN products_productvariation pv ON p.id = pv.product_id
        WHERE p.is_active = true
        ORDER BY p.name, pv.variation_type
        """
        
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=output_file
        )
        
        print(f"Exported {count} product-variation records to: {output_file}")
        
    except DbfExportError as e:
        print(f"DBF Export failed: {e}")
    except Exception as e:
        print(f"Export failed: {e}")


def export_tutorial_events():
    """Export tutorial events for FoxPro integration"""
    print("\n=== Exporting Tutorial Events ===")
    
    export_dir = create_export_directory()
    output_file = os.path.join(export_dir, 'tutorial_events.dbf')
    
    try:
        service = DbfExportService(encoding='cp1252', debug=True)
        
        # Using QuerySet approach
        from tutorials.models import TutorialEvents
        
        queryset = TutorialEvents.objects.filter(
            is_active=True
        ).select_related('location', 'subject')
        
        count = service.export_queryset_to_dbf(
            queryset=queryset,
            output_file=output_file,
            exclude_fields=['created_at', 'updated_at', 'metadata']
        )
        
        print(f"Exported {count} tutorial events to: {output_file}")
        
        # Show file info
        file_info = service.validate_dbf_file(output_file)
        print(f"File validation: {file_info}")
        
    except DbfExportError as e:
        print(f"DBF Export failed: {e}")
    except Exception as e:
        print(f"Export failed: {e}")


def batch_export_all_models():
    """Export multiple models in batch"""
    print("\n=== Batch Export All Models ===")
    
    export_dir = create_export_directory()
    
    models_to_export = [
        ('products.Product', 'products.dbf'),
        ('subjects.Subject', 'subjects.dbf'),
        ('exam_sessions.ExamSession', 'exam_sessions.dbf'),
        ('auth.User', 'users.dbf'),
    ]
    
    service = DbfExportService(debug=False)  # Less verbose for batch
    
    for model_path, filename in models_to_export:
        output_file = os.path.join(export_dir, filename)
        
        try:
            count = service.export_model_to_dbf(
                model_path=model_path,
                output_file=output_file,
                limit=10000  # Reasonable limit for each export
            )
            print(f"✓ {model_path}: {count} records -> {filename}")
            
        except Exception as e:
            print(f"✗ {model_path}: Failed - {e}")


def show_available_models():
    """Show available Django models for export"""
    print("\n=== Available Django Models ===")
    
    from django.apps import apps
    
    for app_config in apps.get_app_configs():
        app_label = app_config.label
        models = app_config.get_models()
        
        if models:
            print(f"\n{app_label}:")
            for model in models:
                model_name = model.__name__
                try:
                    count = model.objects.count()
                    print(f"  - {app_label}.{model_name} ({count} records)")
                except Exception as e:
                    print(f"  - {app_label}.{model_name} (error: {e})")


def main():
    """Run all examples"""
    print("DBF Export Examples for Admin3 Project")
    print("=" * 50)
    
    # Show available models first
    show_available_models()
    
    # Run export examples
    try:
        export_products_example()
        export_active_cart_items()
        export_orders_with_sql()
        export_exam_sessions_subjects()
        export_users_filtered()
        export_products_with_variations()
        export_tutorial_events()
        
        # Batch export last
        batch_export_all_models()
        
        print("\n" + "=" * 50)
        print("All examples completed!")
        print("Check the 'exports/' directory for generated DBF files.")
        
    except Exception as e:
        print(f"Examples failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()


# Individual utility functions for specific use cases

def export_legacy_data_for_foxpro():
    """
    Specialized function for exporting data in FoxPro-compatible format
    This function demonstrates best practices for legacy system integration
    """
    print("\n=== Legacy FoxPro Export ===")
    
    export_dir = create_export_directory()
    
    # Use cp1252 encoding for Windows compatibility
    service = DbfExportService(encoding='cp1252')
    
    # Export with FoxPro-friendly field names (max 10 chars, no special chars)
    sql = """
    SELECT 
        p.id as PROD_ID,
        LEFT(p.name, 30) as PROD_NAME,
        p.price as PRICE,
        p.is_active as ACTIVE,
        p.created_at::date as CREATE_DT
    FROM products_product p
    WHERE p.is_active = true
    ORDER BY p.id
    """
    
    try:
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=os.path.join(export_dir, 'LEGACY.DBF')
        )
        print(f"Exported {count} records for legacy system")
        
    except Exception as e:
        print(f"Legacy export failed: {e}")


def export_financial_data():
    """Export financial data with proper decimal handling"""
    print("\n=== Financial Data Export ===")
    
    export_dir = create_export_directory()
    service = DbfExportService()
    
    # SQL with explicit decimal formatting for financial accuracy
    sql = """
    SELECT 
        o.id as ORDER_ID,
        o.order_number as ORDER_NO,
        CAST(o.total_amount AS DECIMAL(10,2)) as TOTAL_AMT,
        CAST(o.tax_amount AS DECIMAL(8,2)) as TAX_AMT,
        o.order_date as ORDER_DT,
        o.status as STATUS
    FROM orders_order o
    WHERE o.total_amount > 0
    ORDER BY o.order_date DESC
    """
    
    try:
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=os.path.join(export_dir, 'FINANCE.DBF')
        )
        print(f"Exported {count} financial records")
        
    except Exception as e:
        print(f"Financial export failed: {e}")


# Convenience functions for common Admin3 exports

def quick_export_products():
    """Quick export of all active products"""
    service = DbfExportService()
    export_dir = create_export_directory()
    
    return service.export_model_to_dbf(
        'products.Product',
        os.path.join(export_dir, 'products_quick.dbf'),
        filters={'is_active': True}
    )


def quick_export_users():
    """Quick export of all active users"""
    service = DbfExportService()
    export_dir = create_export_directory()
    
    return service.export_model_to_dbf(
        'auth.User',
        os.path.join(export_dir, 'users_quick.dbf'),
        filters={'is_active': True},
        exclude_fields=['password', 'last_login']
    )


# Usage instructions when script is imported
print("""
DBF Export Examples Loaded!

Available functions:
- main(): Run all examples
- export_products_example(): Export products using management command
- export_active_cart_items(): Export cart items using service
- export_orders_with_sql(): Export with custom SQL
- export_legacy_data_for_foxpro(): FoxPro-compatible export
- export_financial_data(): Financial data with decimal precision
- quick_export_products(): Quick product export
- quick_export_users(): Quick user export
- show_available_models(): List all available Django models

To install required dependencies:
pip install ydbf dbfread

To run all examples:
main()
""")