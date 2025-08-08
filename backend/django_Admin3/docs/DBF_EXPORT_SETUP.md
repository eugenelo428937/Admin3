# DBF Export Setup and Usage Guide

This guide explains how to export Django database query results to FoxPro DBF files in the Admin3 project.

## Overview

The DBF export functionality allows you to:
- Export Django model data to DBF format
- Execute custom SQL queries and export results
- Create FoxPro-compatible files for legacy system integration
- Handle proper field type mapping and data conversion

## Installation

### Required Dependencies

Install the required Python libraries:

```powershell
# Activate virtual environment first
.\.venv\Scripts\activate

# Install DBF libraries
pip install ydbf dbfread
```

### Library Details

- **ydbf**: Pure Python library for creating DBF files (recommended)
- **dbfread**: For reading and validating DBF files (optional)

## Available Tools

### 1. Management Command

The `export_to_dbf` management command provides a command-line interface:

```powershell
# Basic usage - export model to DBF
python manage.py export_to_dbf --model products.Product --output exports/products.dbf

# With filters
python manage.py export_to_dbf --model cart.CartItem --output exports/cart.dbf --filter "user__id=123"

# Custom SQL query
python manage.py export_to_dbf --sql "SELECT * FROM auth_user WHERE is_active=1" --output exports/users.dbf

# With encoding and limits
python manage.py export_to_dbf --model products.Product --output exports/products.dbf --encoding cp1252 --limit 1000
```

### 2. Programmatic Service

The `DbfExportService` class provides a Python API:

```python
from utils.services.dbf_export_service import DbfExportService

# Initialize service
service = DbfExportService(encoding='cp1252', debug=True)

# Export model data
count = service.export_model_to_dbf(
    model_path='products.Product',
    output_file='exports/products.dbf',
    filters={'is_active': True}
)

# Export custom query
count = service.export_query_to_dbf(
    sql="SELECT id, name, price FROM products_product",
    output_file='exports/custom.dbf'
)

# Export QuerySet
from products.models import Product
queryset = Product.objects.filter(is_active=True)
count = service.export_queryset_to_dbf(
    queryset=queryset,
    output_file='exports/active_products.dbf'
)
```

## Field Type Mapping

Django fields are automatically mapped to DBF field types:

| Django Field | DBF Type | Notes |
|--------------|----------|-------|
| CharField | Character | Max 254 characters |
| TextField | Character | Truncated to 254 chars |
| IntegerField | Numeric | 10 digits |
| DecimalField | Numeric | Preserves precision |
| FloatField | Numeric | 15 digits, 5 decimals |
| BooleanField | Logical | True/False |
| DateField | Date | YYYY-MM-DD format |
| DateTimeField | Date + Character | Split into date and time fields |
| ForeignKey | Numeric | Exports as `FIELD_ID` |
| EmailField | Character | 100 characters |
| URLField | Character | 200 characters |
| UUIDField | Character | 36 characters |
| JSONField | Character | JSON as string |

## Examples

### Export Products

```powershell
cd backend/django_Admin3
python manage.py export_to_dbf --model products.Product --output exports/products.dbf --debug
```

### Export Orders from Last Month

```python
from utils.services.dbf_export_service import DbfExportService
import datetime

service = DbfExportService()

sql = """
SELECT 
    o.id,
    o.order_number,
    o.total_amount,
    o.order_date,
    u.first_name || ' ' || u.last_name as customer
FROM orders_order o
JOIN auth_user u ON o.user_id = u.id
WHERE o.order_date >= %s
"""

last_month = datetime.datetime.now() - datetime.timedelta(days=30)
count = service.export_query_to_dbf(
    sql=sql,
    output_file='exports/recent_orders.dbf',
    params=[last_month]
)
```

### Export for Legacy FoxPro System

```python
from utils.services.dbf_export_service import DbfExportService

# Use cp1252 encoding for Windows compatibility
service = DbfExportService(encoding='cp1252')

# SQL with FoxPro-friendly field names (max 10 chars)
sql = """
SELECT 
    p.id as PROD_ID,
    LEFT(p.name, 30) as PROD_NAME,
    p.price as PRICE,
    p.is_active as ACTIVE
FROM products_product p
WHERE p.is_active = true
"""

service.export_query_to_dbf(
    sql=sql,
    output_file='exports/LEGACY.DBF'
)
```

## Running Examples

Use the provided examples script:

```powershell
cd backend/django_Admin3
python manage.py shell < examples/dbf_export_examples.py
```

Or import individual functions:

```python
from examples.dbf_export_examples import *

# Show available models
show_available_models()

# Quick exports
quick_export_products()
quick_export_users()

# Run all examples
main()
```

## File Validation

Validate created DBF files:

```python
from utils.services.dbf_export_service import DbfExportService

service = DbfExportService()
validation = service.validate_dbf_file('exports/products.dbf')
print(validation)
```

## Best Practices

### 1. Field Names
- DBF field names are limited to 10 characters
- Use uppercase for consistency
- Avoid special characters

### 2. Data Types
- Use appropriate field sizes for your data
- Be careful with decimal precision for financial data
- Consider date format requirements

### 3. Encoding
- Use `cp1252` for Windows/FoxPro compatibility
- Use `utf-8` for modern applications (if supported)

### 4. Performance
- Use filters to limit data export
- Consider batch processing for large datasets
- Use SQL queries for complex data transformations

### 5. Error Handling
- Always wrap exports in try-catch blocks
- Enable debug mode during development
- Validate files after creation

## Common Use Cases

### 1. Daily Product Export
```python
def daily_product_export():
    service = DbfExportService(encoding='cp1252')
    today = datetime.date.today()
    
    return service.export_model_to_dbf(
        'products.Product',
        f'exports/products_{today.strftime("%Y%m%d")}.dbf',
        filters={'is_active': True, 'updated_at__date': today}
    )
```

### 2. Customer Data for CRM
```python
def export_customer_data():
    service = DbfExportService()
    
    sql = """
    SELECT 
        u.id as CUST_ID,
        u.first_name as FNAME,
        u.last_name as LNAME,
        u.email as EMAIL,
        u.date_joined as JOIN_DATE
    FROM auth_user u
    WHERE u.is_active = true
    """
    
    return service.export_query_to_dbf(
        sql=sql,
        output_file='exports/customers.dbf'
    )
```

### 3. Financial Data Export
```python
def export_financial_summary():
    service = DbfExportService()
    
    sql = """
    SELECT 
        DATE_TRUNC('month', order_date) as MONTH,
        COUNT(*) as ORDER_CNT,
        SUM(total_amount) as TOTAL_AMT,
        AVG(total_amount) as AVG_AMT
    FROM orders_order
    WHERE order_date >= %s
    GROUP BY DATE_TRUNC('month', order_date)
    ORDER BY MONTH
    """
    
    six_months_ago = datetime.datetime.now() - datetime.timedelta(days=180)
    
    return service.export_query_to_dbf(
        sql=sql,
        output_file='exports/financial_summary.dbf',
        params=[six_months_ago]
    )
```

## Troubleshooting

### Common Issues

1. **Library Not Found**
   ```
   ModuleNotFoundError: No module named 'ydbf'
   ```
   Solution: Install dependencies with `pip install ydbf dbfread`

2. **Field Name Too Long**
   ```
   DBF field names must be 10 characters or less
   ```
   Solution: Use aliases in SQL or modify field names

3. **Encoding Issues**
   ```
   UnicodeEncodeError: 'charmap' codec can't encode character
   ```
   Solution: Use appropriate encoding (cp1252 for Windows)

4. **File Path Not Found**
   ```
   FileNotFoundError: [Errno 2] No such file or directory
   ```
   Solution: Ensure output directory exists or use absolute paths

### Debug Mode

Enable debug mode for troubleshooting:

```python
service = DbfExportService(debug=True)
# or
python manage.py export_to_dbf --debug
```

## Advanced Configuration

### Custom Field Mapping

Extend the service for custom field types:

```python
class CustomDbfExportService(DbfExportService):
    def _django_field_to_dbf(self, field):
        # Custom mapping logic
        if isinstance(field, MyCustomField):
            return ('CUSTOM', ydbf.CHAR, 50, 0)
        return super()._django_field_to_dbf(field)
```

### Batch Processing

For large datasets:

```python
def batch_export_large_table():
    service = DbfExportService()
    batch_size = 10000
    offset = 0
    
    while True:
        sql = f"""
        SELECT * FROM large_table
        ORDER BY id
        LIMIT {batch_size} OFFSET {offset}
        """
        
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=f'exports/large_table_{offset}.dbf'
        )
        
        if count < batch_size:
            break
            
        offset += batch_size
```

## Integration with Existing Systems

This DBF export functionality is designed to integrate with:
- FoxPro applications
- Legacy database systems
- Excel and Access imports
- Third-party tools that read DBF format

The exported files maintain compatibility with Visual FoxPro table locking and can be used in multi-user environments.