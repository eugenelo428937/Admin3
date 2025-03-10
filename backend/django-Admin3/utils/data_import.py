# utils/data_import.py

import pandas as pd
from typing import List, Dict, Tuple, Optional
from django.db import transaction
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

class DataImportError(Exception):
    """Custom exception for data import errors."""
    pass

def validate_file_extension(file_path: str) -> bool:
    """
    Validate if the file extension is supported.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        bool: True if valid, False otherwise
    """
    return file_path.lower().endswith(('.xlsx', '.xls', '.csv'))

def read_file(file_path: str) -> pd.DataFrame:
    """
    Read data from Excel or CSV file.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        pd.DataFrame: DataFrame containing the file data
        
    Raises:
        DataImportError: If file cannot be read or is invalid
    """
    try:
        if file_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
        
        return df
    except Exception as e:
        raise DataImportError(f"Error reading file: {str(e)}")

def validate_required_columns(df: pd.DataFrame, required_columns: List[str]) -> Tuple[bool, List[str]]:
    """
    Validate if all required columns are present in the DataFrame.
    
    Args:
        df (pd.DataFrame): DataFrame to validate
        required_columns (List[str]): List of required column names
        
    Returns:
        Tuple[bool, List[str]]: (is_valid, missing_columns)
    """
    missing_columns = [col for col in required_columns if col not in df.columns]
    return len(missing_columns) == 0, missing_columns

def clean_dataframe(df: pd.DataFrame, required_columns: List[str]) -> pd.DataFrame:
    """
    Clean and prepare DataFrame for import.
    
    Args:
        df (pd.DataFrame): DataFrame to clean
        required_columns (List[str]): List of required column names
        
    Returns:
        pd.DataFrame: Cleaned DataFrame
    """
    # Remove any empty rows
    df = df.dropna(subset=required_columns, how='all')
    
    # Strip whitespace from string columns
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].str.strip()
    
    return df

def bulk_create_subjects(
    file_path: str,
    model_class,
    batch_size: int = 1000,
    update_existing: bool = False
) -> Dict[str, int]:
    """
    Bulk create subjects from a file.
    
    Args:
        file_path (str): Path to the input file (CSV or Excel)
        model_class: The Django model class to use
        batch_size (int): Number of records to create in each batch
        update_existing (bool): Whether to update existing records
        
    Returns:
        Dict[str, int]: Statistics about the import process
        
    Raises:
        DataImportError: If there are issues with the import process
    """
    if not validate_file_extension(file_path):
        raise DataImportError("Invalid file format. Supported formats: .xlsx, .xls, .csv")

    required_columns = ['code', 'description']
    stats = {
        'total': 0,
        'created': 0,
        'updated': 0,
        'failed': 0,
        'skipped': 0
    }

    try:
        # Read the file
        df = read_file(file_path)
        
        # Validate required columns
        is_valid, missing_columns = validate_required_columns(df, required_columns)
        if not is_valid:
            raise DataImportError(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Clean the data
        df = clean_dataframe(df, required_columns)
        stats['total'] = len(df)

        # Process in batches
        with transaction.atomic():
            for i in range(0, len(df), batch_size):
                batch_df = df.iloc[i:i + batch_size]
                
                for _, row in batch_df.iterrows():
                    try:
                        subject_data = {
                            'code': row['code'],
                            'description': row['description'],
                            'active': row.get('active', True)  # Default to True if not specified
                        }
                        
                        if update_existing:
                            obj, created = model_class.objects.update_or_create(
                                code=subject_data['code'],
                                defaults=subject_data
                            )
                            if created:
                                stats['created'] += 1
                            else:
                                stats['updated'] += 1
                        else:
                            if not model_class.objects.filter(code=subject_data['code']).exists():
                                model_class.objects.create(**subject_data)
                                stats['created'] += 1
                            else:
                                stats['skipped'] += 1
                                
                    except ValidationError as e:
                        logger.error(f"Validation error for row {row['code']}: {str(e)}")
                        stats['failed'] += 1
                    except Exception as e:
                        logger.error(f"Error processing row {row['code']}: {str(e)}")
                        stats['failed'] += 1

        return stats

    except Exception as e:
        raise DataImportError(f"Error during import: {str(e)}")
