"""
DBF Export Service

A utility service for exporting Django model data to FoxPro DBF files.
This service provides a programmatic interface for DBF export operations.

Example Usage:
    from utils.services.dbf_export_service import DbfExportService
    
    # Export products
    service = DbfExportService()
    service.export_model_to_dbf(
        model_path='products.Product',
        output_file='exports/products.dbf',
        filters={'is_active': True}
    )
    
    # Export custom query
    service.export_query_to_dbf(
        sql="SELECT id, name, price FROM products_product WHERE is_active = 1",
        output_file='exports/active_products.dbf'
    )
"""

import os
import sys
import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from django.apps import apps
from django.db import connection, models
from django.core.exceptions import ValidationError

try:
    # Workaround for ydbf Python 3.13 compatibility
    # ydbf tries to import from ydbf.six.moves but its vendored six is broken
    import six
    sys.modules['ydbf.six'] = six
    sys.modules['ydbf.six.moves'] = six.moves

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


class DbfExportError(Exception):
    """Custom exception for DBF export errors"""
    pass


class DbfExportService:
    """Service class for exporting Django data to DBF files"""
    
    def __init__(self, encoding: str = 'cp1252', debug: bool = False):
        """
        Initialize the DBF export service
        
        Args:
            encoding: Character encoding for DBF files (default: cp1252)
            debug: Enable debug output
        """
        if not YDBF_AVAILABLE:
            raise DbfExportError(
                "ydbf library is required. Install with: pip install ydbf"
            )
        
        self.encoding = encoding
        self.debug = debug
    
    def export_model_to_dbf(
        self, 
        model_path: str, 
        output_file: str,
        filters: Optional[Dict[str, Any]] = None,
        exclude_fields: Optional[List[str]] = None,
        limit: Optional[int] = None
    ) -> int:
        """
        Export Django model data to DBF file
        
        Args:
            model_path: Model path in format 'app_label.ModelName'
            output_file: Output DBF file path
            filters: Django filter expressions
            exclude_fields: List of field names to exclude
            limit: Maximum number of records to export
            
        Returns:
            Number of records exported
            
        Raises:
            DbfExportError: If export fails
        """
        try:
            # Get model
            app_label, model_name = model_path.split('.')
            model = apps.get_model(app_label, model_name)
            
            # Build queryset
            queryset = model.objects.all()
            
            if filters:
                queryset = queryset.filter(**filters)
                
            if limit:
                queryset = queryset[:limit]
            
            # Get data and field definitions
            data = list(queryset.values())
            field_definitions = self._get_model_field_definitions(
                model, exclude_fields or []
            )
            
            # Export to DBF
            return self._export_data_to_dbf(data, field_definitions, output_file)
            
        except Exception as e:
            raise DbfExportError(f"Model export failed: {str(e)}") from e
    
    def export_query_to_dbf(
        self, 
        sql: str, 
        output_file: str,
        params: Optional[List[Any]] = None
    ) -> int:
        """
        Export SQL query results to DBF file
        
        Args:
            sql: SQL query string
            output_file: Output DBF file path
            params: SQL query parameters
            
        Returns:
            Number of records exported
            
        Raises:
            DbfExportError: If export fails
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, params or [])
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            data = [dict(zip(columns, row)) for row in rows]
            
            # Generate field definitions
            field_definitions = self._get_sql_field_definitions(sql, params)
            
            # Export to DBF
            return self._export_data_to_dbf(data, field_definitions, output_file)
            
        except Exception as e:
            raise DbfExportError(f"SQL export failed: {str(e)}") from e
    
    def export_queryset_to_dbf(
        self,
        queryset,
        output_file: str,
        exclude_fields: Optional[List[str]] = None
    ) -> int:
        """
        Export Django QuerySet to DBF file
        
        Args:
            queryset: Django QuerySet instance
            output_file: Output DBF file path
            exclude_fields: List of field names to exclude
            
        Returns:
            Number of records exported
        """
        try:
            # Get data
            data = list(queryset.values())
            
            # Get field definitions from model
            model = queryset.model
            field_definitions = self._get_model_field_definitions(
                model, exclude_fields or []
            )
            
            # Export to DBF
            return self._export_data_to_dbf(data, field_definitions, output_file)
            
        except Exception as e:
            raise DbfExportError(f"QuerySet export failed: {str(e)}") from e
    
    def validate_dbf_file(self, file_path: str) -> Dict[str, Any]:
        """
        Validate a DBF file and return information about it
        
        Args:
            file_path: Path to DBF file
            
        Returns:
            Dictionary with file information
        """
        if not DBFREAD_AVAILABLE:
            return {"validation": "dbfread not available for validation"}
        
        try:
            with dbfread.DBF(file_path) as dbf:
                records = list(dbf)
                return {
                    "valid": True,
                    "record_count": len(records),
                    "field_names": dbf.field_names if hasattr(dbf, 'field_names') else [],
                    "encoding": dbf.encoding if hasattr(dbf, 'encoding') else 'unknown',
                    "file_size": os.path.getsize(file_path)
                }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }
    
    def _export_data_to_dbf(
        self, 
        data: List[Dict[str, Any]], 
        field_definitions: List[Tuple],
        output_file: str
    ) -> int:
        """Internal method to export data to DBF"""
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
        
        # Prepare data for DBF format
        prepared_data = self._prepare_data_for_dbf(data, field_definitions)
        
        if self.debug:
            print(f"Field definitions: {field_definitions}")
            if prepared_data:
                print(f"Sample record: {prepared_data[0]}")
        
        # Write DBF file
        with ydbf.open(output_file, YDBF_WRITE, field_definitions, encoding=self.encoding) as dbf:
            dbf.write(prepared_data)
        
        return len(prepared_data)
    
    def _get_model_field_definitions(
        self, 
        model, 
        exclude_fields: List[str]
    ) -> List[Tuple]:
        """Generate DBF field definitions from Django model"""
        field_definitions = []
        exclude_fields_lower = [f.lower() for f in exclude_fields]
        
        for field in model._meta.get_fields():
            if (hasattr(field, 'column') and 
                field.name.lower() not in exclude_fields_lower):
                
                dbf_field = self._django_field_to_dbf(field)
                if dbf_field:
                    if isinstance(dbf_field, list):
                        field_definitions.extend(dbf_field)
                    else:
                        field_definitions.append(dbf_field)
        
        return field_definitions
    
    def _get_sql_field_definitions(self, sql: str, params: Optional[List[Any]] = None) -> List[Tuple]:
        """Generate DBF field definitions from SQL query"""
        field_definitions = []
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            for col_desc in cursor.description:
                field_name = col_desc[0].upper()[:10]
                dbf_field = self._sql_column_to_dbf(col_desc)
                field_definitions.append(dbf_field)
        
        return field_definitions
    
    def _django_field_to_dbf(self, field) -> Tuple:
        """Convert Django field to DBF field definition"""
        field_name = field.name.upper()[:10]
        
        # Handle different Django field types
        if isinstance(field, models.CharField):
            max_length = getattr(field, 'max_length', 254)
            return (field_name, YDBF_CHAR, min(max_length, 254), 0)
            
        elif isinstance(field, models.TextField):
            return (field_name, YDBF_CHAR, 254, 0)
            
        elif isinstance(field, models.IntegerField):
            return (field_name, YDBF_NUMERAL, 10, 0)
            
        elif isinstance(field, models.BigIntegerField):
            return (field_name, YDBF_NUMERAL, 18, 0)
            
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
            # Split datetime into separate date and time fields
            return [
                (field_name, YDBF_DATE, 8, 0),
                (field_name + '_T', YDBF_CHAR, 8, 0)  # Time as HH:MM:SS
            ]
            
        elif isinstance(field, models.ForeignKey):
            return (field_name + '_ID', YDBF_NUMERAL, 10, 0)
            
        elif isinstance(field, models.EmailField):
            return (field_name, YDBF_CHAR, 100, 0)
            
        elif isinstance(field, models.URLField):
            return (field_name, YDBF_CHAR, 200, 0)
            
        elif isinstance(field, models.UUIDField):
            return (field_name, YDBF_CHAR, 36, 0)
            
        elif isinstance(field, models.JSONField):
            return (field_name, YDBF_CHAR, 254, 0)
            
        else:
            # Default to character field
            return (field_name, YDBF_CHAR, 50, 0)
    
    def _sql_column_to_dbf(self, col_desc) -> Tuple:
        """Convert SQL column description to DBF field definition"""
        field_name = col_desc[0].upper()[:10]
        type_code = col_desc[1]
        size = col_desc[2] or 50
        precision = col_desc[4] or 0
        scale = col_desc[5] or 0
        
        # Map SQL types to DBF (PostgreSQL type codes)
        if type_code in [16]:  # Boolean
            return (field_name, YDBF_LOGICAL, 1, 0)
        elif type_code in [20, 21, 23]:  # Integer types
            return (field_name, YDBF_NUMERAL, min(size, 10), 0)
        elif type_code in [700, 701, 1700]:  # Float/Numeric types
            if scale and scale > 0:
                return (field_name, YDBF_NUMERAL, min(size, 18), scale)
            else:
                return (field_name, YDBF_NUMERAL, min(size, 15), 5)
        elif type_code in [1082]:  # Date
            return (field_name, YDBF_DATE, 8, 0)
        elif type_code in [25, 1043]:  # Text/Varchar
            return (field_name, YDBF_CHAR, min(size, 254), 0)
        else:
            # Default to character
            return (field_name, YDBF_CHAR, min(size, 50), 0)
    
    def _prepare_data_for_dbf(
        self, 
        data: List[Dict[str, Any]], 
        field_definitions: List[Tuple]
    ) -> List[Dict[str, Any]]:
        """Prepare data for DBF export by converting types"""
        prepared_data = []
        
        for record in data:
            prepared_record = {}
            
            for field_def in field_definitions:
                field_name = field_def[0]
                field_type = field_def[1]
                field_size = field_def[2] if len(field_def) > 2 else 0
                
                # Find corresponding value (case-insensitive)
                value = None
                original_key = None
                for key, val in record.items():
                    if key.upper() == field_name or key.upper() == field_name.replace('_ID', ''):
                        value = val
                        original_key = key
                        break
                
                # Handle datetime fields that were split
                if field_name.endswith('_T') and value is None:
                    # This is a time component of a datetime field
                    datetime_field = field_name[:-2]
                    for key, val in record.items():
                        if key.upper() == datetime_field:
                            if isinstance(val, datetime.datetime):
                                value = val.strftime('%H:%M:%S')
                            break
                
                # Convert value based on DBF field type
                prepared_record[field_name] = self._convert_value_for_dbf(
                    value, field_type, field_size
                )
            
            prepared_data.append(prepared_record)
        
        return prepared_data
    
    def _convert_value_for_dbf(self, value: Any, field_type: str, field_size: int = 0) -> Any:
        """Convert Python value to DBF-compatible format"""
        if value is None:
            if field_type == YDBF_CHAR:
                return ''
            elif field_type == YDBF_NUMERAL:
                return 0
            elif field_type == YDBF_LOGICAL:
                return False
            elif field_type == YDBF_DATE:
                return datetime.date(1900, 1, 1)
            else:
                return ''
        
        if field_type == YDBF_CHAR:
            result = str(value)
            if field_size > 0:
                result = result[:field_size]
            return result
            
        elif field_type == YDBF_NUMERAL:
            if isinstance(value, (int, float, Decimal)):
                return value
            else:
                try:
                    return float(str(value))
                except (ValueError, TypeError):
                    return 0
                    
        elif field_type == YDBF_LOGICAL:
            return bool(value)
            
        elif field_type == YDBF_DATE:
            if isinstance(value, datetime.datetime):
                return value.date()
            elif isinstance(value, datetime.date):
                return value
            elif isinstance(value, str):
                try:
                    # Try to parse date string
                    return datetime.datetime.strptime(value[:10], '%Y-%m-%d').date()
                except ValueError:
                    return datetime.date(1900, 1, 1)
            else:
                return datetime.date(1900, 1, 1)
        
        return str(value)