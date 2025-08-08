"""
Django Management Command to Export Query Results to FoxPro DBF Files

This command provides functionality to export Django model data to DBF format
for compatibility with FoxPro and other legacy database systems.

Usage:
    python manage.py export_to_dbf --model products.Product --output products.dbf
    python manage.py export_to_dbf --model cart.CartItem --output cart_items.dbf --filter user__id=123
    python manage.py export_to_dbf --sql "SELECT * FROM users_user WHERE is_active=1" --output active_users.dbf

Dependencies:
    - dbfread: For reading DBF files (optional, for validation)
    - ydbf: For writing DBF files (recommended - pure Python, cross-platform)
    
Install dependencies:
    pip install dbfread ydbf
"""

import os
import sys
import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.apps import apps
from django.db import connection
from django.conf import settings

try:
    import ydbf
    YDBF_AVAILABLE = True
    # ydbf uses string constants for field types
    YDBF_CHAR = 'C'
    YDBF_NUMERAL = 'N'
    YDBF_LOGICAL = 'L'
    YDBF_DATE = 'D'
    YDBF_WRITE = 'w'
except ImportError:
    YDBF_AVAILABLE = False
    YDBF_CHAR = 'C'
    YDBF_NUMERAL = 'N'
    YDBF_LOGICAL = 'L'
    YDBF_DATE = 'D'
    YDBF_WRITE = 'w'

try:
    import dbfread
    DBFREAD_AVAILABLE = True
except ImportError:
    DBFREAD_AVAILABLE = False


class Command(BaseCommand):
    help = """
    Export Django model data or SQL query results to FoxPro DBF format.
    
    Examples:
        Export all products:
        python manage.py export_to_dbf --model products.Product --output products.dbf
        
        Export filtered data:
        python manage.py export_to_dbf --model cart.CartItem --output cart_items.dbf --filter user__id=123
        
        Export custom SQL query:
        python manage.py export_to_dbf --sql "SELECT id, name, price FROM products_product" --output custom.dbf
        
        Export with specific encoding:
        python manage.py export_to_dbf --model users.User --output users.dbf --encoding cp1252
    """

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            help='Django model to export (format: app_label.ModelName)'
        )
        
        parser.add_argument(
            '--sql',
            type=str,
            help='Custom SQL query to execute'
        )
        
        parser.add_argument(
            '--output',
            type=str,
            required=True,
            help='Output DBF file path'
        )
        
        parser.add_argument(
            '--filter',
            type=str,
            help='Django filter expression (e.g., "user__id=123,is_active=True")'
        )
        
        parser.add_argument(
            '--encoding',
            type=str,
            default='cp1252',
            help='Character encoding for DBF file (default: cp1252)'
        )
        
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit number of records to export'
        )
        
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug output'
        )

    def handle(self, *args, **options):
        if not YDBF_AVAILABLE:
            raise CommandError(
                "ydbf library is required for DBF export. Install with: pip install ydbf"
            )

        # Validate arguments
        if not options['model'] and not options['sql']:
            raise CommandError("Either --model or --sql must be specified")
            
        if options['model'] and options['sql']:
            raise CommandError("Cannot specify both --model and --sql")

        try:
            if options['model']:
                data, field_definitions = self.get_model_data(options)
            else:
                data, field_definitions = self.get_sql_data(options)

            self.export_to_dbf(data, field_definitions, options)
            
        except Exception as e:
            if options['debug']:
                import traceback
                traceback.print_exc()
            raise CommandError(f"Export failed: {str(e)}")

    def get_model_data(self, options):
        """Get data from Django model"""
        model_path = options['model']
        app_label, model_name = model_path.split('.')
        
        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            raise CommandError(f"Model {model_path} not found")

        # Build queryset
        queryset = model.objects.all()
        
        # Apply filters if specified
        if options['filter']:
            filters = {}
            for filter_expr in options['filter'].split(','):
                key, value = filter_expr.split('=', 1)
                # Convert value to appropriate type
                if value.lower() == 'true':
                    value = True
                elif value.lower() == 'false':
                    value = False
                elif value.isdigit():
                    value = int(value)
                filters[key.strip()] = value
            queryset = queryset.filter(**filters)

        # Apply limit
        if options['limit']:
            queryset = queryset[:options['limit']]

        # Convert to list of dictionaries
        data = list(queryset.values())
        
        if options['debug']:
            self.stdout.write(f"Retrieved {len(data)} records from {model_path}")

        # Generate field definitions from model
        field_definitions = self.get_model_field_definitions(model)
        
        return data, field_definitions

    def get_sql_data(self, options):
        """Get data from raw SQL query"""
        sql_query = options['sql']
        
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        # Convert to list of dictionaries
        data = [dict(zip(columns, row)) for row in rows]
        
        if options['debug']:
            self.stdout.write(f"Retrieved {len(data)} records from SQL query")

        # Generate field definitions from cursor description
        field_definitions = self.get_sql_field_definitions(connection.cursor(), sql_query)
        
        return data, field_definitions

    def get_model_field_definitions(self, model):
        """Generate DBF field definitions from Django model fields"""
        field_definitions = []
        
        for field in model._meta.get_fields():
            if hasattr(field, 'column'):  # Regular model fields
                dbf_field = self.django_field_to_dbf(field)
                if dbf_field:
                    field_definitions.append(dbf_field)
        
        return field_definitions

    def get_sql_field_definitions(self, cursor, sql_query):
        """Generate DBF field definitions from SQL cursor description"""
        field_definitions = []
        
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            for col_desc in cursor.description:
                field_name = col_desc[0].upper()[:10]  # DBF field names max 10 chars
                dbf_field = self.sql_column_to_dbf(col_desc)
                field_definitions.append(dbf_field)
        
        return field_definitions

    def django_field_to_dbf(self, field):
        """Convert Django field to DBF field definition"""
        from django.db import models
        
        field_name = field.name.upper()[:10]  # DBF field names max 10 chars
        
        # Map Django field types to DBF types
        if isinstance(field, models.CharField):
            max_length = getattr(field, 'max_length', 254)
            return (field_name, YDBF_CHAR, min(max_length, 254), 0)
            
        elif isinstance(field, models.TextField):
            return (field_name, YDBF_CHAR, 254, 0)  # Use max char for text fields
            
        elif isinstance(field, models.IntegerField):
            return (field_name, YDBF_NUMERAL, 10, 0)
            
        elif isinstance(field, models.DecimalField):
            max_digits = getattr(field, 'max_digits', 10)
            decimal_places = getattr(field, 'decimal_places', 2)
            return (field_name, YDBF_NUMERAL, max_digits, decimal_places)
            
        elif isinstance(field, models.FloatField):
            return (field_name, YDBF_NUMERAL, 15, 5)
            
        elif isinstance(field, models.BooleanField):
            return (field_name, YDBF_LOGICAL, 1, 0)
            
        elif isinstance(field, models.DateField):
            return (field_name, YDBF_DATE, 8, 0)
            
        elif isinstance(field, models.DateTimeField):
            # DBF doesn't have datetime, split into date and time
            return [(field_name, YDBF_DATE, 8, 0)]
            
        elif isinstance(field, models.ForeignKey):
            return (field_name + '_ID', YDBF_NUMERAL, 10, 0)
            
        else:
            # Default to character field
            return (field_name, YDBF_CHAR, 50, 0)

    def sql_column_to_dbf(self, col_desc):
        """Convert SQL column description to DBF field definition"""
        field_name = col_desc[0].upper()[:10]
        
        # col_desc format: (name, type_code, display_size, internal_size, precision, scale, null_ok)
        type_code = col_desc[1]
        size = col_desc[2] or 50
        precision = col_desc[4] or 0
        scale = col_desc[5] or 0
        
        # Map common SQL types to DBF
        # Note: type codes vary by database backend
        if type_code in [1, 2, 3, 4, 5, 8]:  # Numeric types
            if scale and scale > 0:
                return (field_name, YDBF_NUMERAL, min(size, 18), scale)
            else:
                return (field_name, YDBF_NUMERAL, min(size, 10), 0)
        elif type_code in [12, 13, 14]:  # String types
            return (field_name, YDBF_CHAR, min(size, 254), 0)
        elif type_code in [9, 10, 11]:  # Date/Time types
            return (field_name, YDBF_DATE, 8, 0)
        else:
            # Default to character
            return (field_name, YDBF_CHAR, min(size, 50), 0)

    def prepare_data_for_dbf(self, data, field_definitions):
        """Prepare data for DBF export by converting Python types"""
        prepared_data = []
        
        for record in data:
            prepared_record = {}
            
            for field_def in field_definitions:
                field_name = field_def[0]
                field_type = field_def[1]
                
                # Find corresponding value (case-insensitive)
                value = None
                for key, val in record.items():
                    if key.upper() == field_name:
                        value = val
                        break
                
                # Convert value based on DBF field type
                if value is None:
                    if field_type == YDBF_CHAR:
                        prepared_record[field_name] = ''
                    elif field_type == YDBF_NUMERAL:
                        prepared_record[field_name] = 0
                    elif field_type == YDBF_LOGICAL:
                        prepared_record[field_name] = False
                    elif field_type == YDBF_DATE:
                        prepared_record[field_name] = datetime.date(1900, 1, 1)
                        
                elif field_type == YDBF_CHAR:
                    prepared_record[field_name] = str(value)[:field_def[2]]
                    
                elif field_type == YDBF_NUMERAL:
                    if isinstance(value, (int, float, Decimal)):
                        prepared_record[field_name] = value
                    else:
                        try:
                            prepared_record[field_name] = float(str(value))
                        except (ValueError, TypeError):
                            prepared_record[field_name] = 0
                            
                elif field_type == YDBF_LOGICAL:
                    prepared_record[field_name] = bool(value)
                    
                elif field_type == YDBF_DATE:
                    if isinstance(value, datetime.datetime):
                        prepared_record[field_name] = value.date()
                    elif isinstance(value, datetime.date):
                        prepared_record[field_name] = value
                    else:
                        prepared_record[field_name] = datetime.date(1900, 1, 1)
                        
                else:
                    prepared_record[field_name] = str(value)
            
            prepared_data.append(prepared_record)
        
        return prepared_data

    def export_to_dbf(self, data, field_definitions, options):
        """Export data to DBF file"""
        output_path = options['output']
        encoding = options['encoding']
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Prepare data
        prepared_data = self.prepare_data_for_dbf(data, field_definitions)
        
        if options['debug']:
            self.stdout.write(f"Field definitions: {field_definitions}")
            if prepared_data:
                self.stdout.write(f"Sample record: {prepared_data[0]}")

        try:
            # Create DBF file
            with ydbf.open(output_path, YDBF_WRITE, field_definitions, encoding=encoding) as dbf:
                dbf.write(prepared_data)
                
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully exported {len(prepared_data)} records to {output_path}"
                )
            )
            
            # Validate the created file if dbfread is available
            if DBFREAD_AVAILABLE:
                try:
                    with dbfread.DBF(output_path) as dbf_reader:
                        record_count = len(list(dbf_reader))
                        self.stdout.write(f"Validation: DBF file contains {record_count} records")
                except Exception as e:
                    self.stdout.write(f"Warning: Could not validate DBF file: {e}")
                    
        except Exception as e:
            raise CommandError(f"Failed to create DBF file: {str(e)}")