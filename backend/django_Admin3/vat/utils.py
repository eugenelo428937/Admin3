"""
VAT Utility Functions - Epic 3

Helper functions for VAT calculations and data transformations.
"""

from decimal import Decimal


def decimal_to_string(obj):
    """
    Recursively convert Decimal values to strings for JSON serialization.

    Args:
        obj: Object to convert (can be Decimal, dict, list, or primitive)

    Returns:
        Object with all Decimal values converted to strings
    """
    if isinstance(obj, Decimal):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_string(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_string(item) for item in obj]
    return obj


def decimal_to_float(obj):
    """
    Recursively convert Decimal values to floats for JSON serialization.

    Args:
        obj: Object to convert (can be Decimal, dict, list, or primitive)

    Returns:
        Object with all Decimal values converted to floats
    """
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj
