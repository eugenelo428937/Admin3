"""
Generic Template Variable Processing System
Supports multiple ways to generate context variables programmatically
"""
import re
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime

logger = logging.getLogger(__name__)


class TemplateProcessor:
    """Processes template variables with multiple resolution strategies"""

    def __init__(self):
        self.functions = {
            'format_date': self._format_date,
            'current_timestamp': self._current_timestamp,
            'array_first': self._array_first,
            'array_length': self._array_length,
            'join': self._join,
            'generate_expired_deadlines_list': self._generate_expired_deadlines_list,
        }

    def process_variables(self, content: str, title: str, context_mapping: Dict[str, Any], context: Dict[str, Any]) -> tuple:
        """
        Process all template variables in content and title

        Args:
            content: Template content with {{variable}} placeholders
            title: Template title with {{variable}} placeholders
            context_mapping: Variable definitions from rule action
            context: Full context data from request

        Returns:
            tuple: (processed_content, processed_title)
        """
        processed_content = content
        processed_title = title

        # Find all variables in content and title
        variables = set()
        variables.update(re.findall(r'\{\{(\w+)\}\}', content or ''))
        variables.update(re.findall(r'\{\{(\w+)\}\}', title or ''))

        # Resolve each variable
        for var_name in variables:
            try:
                value = self._resolve_variable(var_name, context_mapping, context)
                if value is not None:
                    placeholder = f"{{{{{var_name}}}}}"
                    processed_content = processed_content.replace(placeholder, str(value))
                    if processed_title:
                        processed_title = processed_title.replace(placeholder, str(value))
            except Exception as e:
                logger.warning(f"Error resolving variable '{var_name}': {e}")
                # Leave placeholder as-is if resolution fails

        return processed_content, processed_title

    def _resolve_variable(self, var_name: str, context_mapping: Dict[str, Any], context: Dict[str, Any]) -> Optional[Any]:
        """
        Resolve a single variable using multiple strategies

        Priority order:
        1. context_mapping definition (if present)
        2. direct context lookup
        3. dot notation context lookup
        """
        # Strategy 1: Check context_mapping for explicit definition
        if var_name in context_mapping:
            mapping_def = context_mapping[var_name]
            return self._resolve_mapping_definition(mapping_def, context)

        # Strategy 2: Direct context lookup
        if var_name in context:
            return context[var_name]

        # Strategy 3: Dot notation lookup (e.g., user_name -> user.name)
        dot_notation_value = self._resolve_dot_notation(var_name, context)
        if dot_notation_value is not None:
            return dot_notation_value

        # Strategy 4: Special variable handlers
        return self._resolve_special_variable(var_name, context)

    def _resolve_mapping_definition(self, mapping_def: Any, context: Dict[str, Any]) -> Optional[Any]:
        """Resolve variable definition from context_mapping"""

        # Simple string value - return as-is
        if isinstance(mapping_def, (str, int, float, bool)):
            return mapping_def

        # Dictionary definition with type
        if isinstance(mapping_def, dict):
            mapping_type = mapping_def.get('type', 'static')

            if mapping_type == 'static':
                return mapping_def.get('value')

            elif mapping_type == 'context':
                # Extract from context using path
                path = mapping_def.get('path', '')
                return self._get_nested_value(context, path)

            elif mapping_type == 'function':
                # Call predefined function
                func_name = mapping_def.get('function')
                args = mapping_def.get('args', [])
                return self._call_function(func_name, args, context)

            elif mapping_type == 'expression':
                # Handle expression functions
                expr = mapping_def.get('expression', '')
                if expr in self.functions:
                    # Call function with full context
                    return self.functions[expr](context)
                else:
                    # Fallback to simple path evaluation
                    return self._evaluate_expression(expr, context)

            elif mapping_type == 'filter':
                # Filter and extract from arrays
                source = mapping_def.get('source', '')  # e.g., "cart.items"
                condition = mapping_def.get('condition', {})  # e.g., {"product_id": {"in": [72, 73]}}
                extract = mapping_def.get('extract', '')  # e.g., "subject_code"
                return self._filter_and_extract(source, condition, extract, context)

        return mapping_def

    def _resolve_dot_notation(self, var_name: str, context: Dict[str, Any]) -> Optional[Any]:
        """Resolve variables using dot notation (user_name -> user.name)"""
        # Convert underscore to dot notation
        if '_' in var_name:
            dot_path = var_name.replace('_', '.')
            return self._get_nested_value(context, dot_path)
        return None

    def _resolve_special_variable(self, var_name: str, context: Dict[str, Any]) -> Optional[Any]:
        """Handle special built-in variables"""
        if var_name == 'current_date':
            return datetime.now().strftime('%Y-%m-%d')
        elif var_name == 'current_timestamp':
            return datetime.now().isoformat()
        # Add more special variables as needed
        return None

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Optional[Any]:
        """Get nested value using dot notation"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif isinstance(value, list) and key.isdigit():
                    index = int(key)
                    if 0 <= index < len(value):
                        value = value[index]
                    else:
                        return None
                else:
                    return None
            return value
        except Exception:
            return None

    def _filter_and_extract(self, source: str, condition: Dict, extract: str, context: Dict[str, Any]) -> Optional[Any]:
        """Filter array data and extract specific field"""
        try:
            # Get source array
            source_data = self._get_nested_value(context, source)
            if not isinstance(source_data, list):
                return None

            # Apply condition filter
            filtered_items = []
            for item in source_data:
                if self._matches_condition(item, condition):
                    filtered_items.append(item)

            if not filtered_items:
                return None

            # Extract field from first match
            first_match = filtered_items[0]
            if extract and isinstance(first_match, dict):
                return first_match.get(extract)
            else:
                return first_match

        except Exception as e:
            logger.warning(f"Error in filter_and_extract: {e}")
            return None

    def _matches_condition(self, item: Dict, condition: Dict) -> bool:
        """Check if item matches condition"""
        for field, criteria in condition.items():
            item_value = item.get(field)

            if isinstance(criteria, dict):
                if 'in' in criteria:
                    if item_value not in criteria['in']:
                        return False
                elif 'eq' in criteria:
                    if item_value != criteria['eq']:
                        return False
                # Add more operators as needed
            else:
                # Direct equality check
                if item_value != criteria:
                    return False

        return True

    def _call_function(self, func_name: str, args: List[str], context: Dict[str, Any]) -> Optional[Any]:
        """Call predefined function with context values"""
        if func_name not in self.functions:
            logger.warning(f"Unknown function: {func_name}")
            return None

        try:
            func = self.functions[func_name]
            resolved_args = []
            for arg in args:
                # Resolve argument from context
                if isinstance(arg, str) and arg.startswith('$'):
                    # Context reference like "$current_date"
                    resolved_args.append(self._get_nested_value(context, arg[1:]))
                else:
                    resolved_args.append(arg)

            return func(*resolved_args)
        except Exception as e:
            logger.warning(f"Error calling function {func_name}: {e}")
            return None

    def _evaluate_expression(self, expr: str, context: Dict[str, Any]) -> Optional[Any]:
        """Evaluate simple expressions (could be extended to support JSONPath)"""
        # For now, treat as dot notation
        return self._get_nested_value(context, expr)

    # Built-in functions
    def _format_date(self, date_str: str, format_str: str = '%d/%m/%Y') -> str:
        """Format date string"""
        try:
            if isinstance(date_str, str):
                # Try to parse ISO format first
                if 'T' in date_str or len(date_str) == 10:
                    dt = datetime.fromisoformat(date_str.replace('T', ' ').split('.')[0])
                else:
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                return dt.strftime(format_str)
        except Exception:
            pass
        return str(date_str)

    def _current_timestamp(self) -> str:
        """Get current timestamp"""
        return datetime.now().isoformat()

    def _array_first(self, arr: List) -> Optional[Any]:
        """Get first element of array"""
        return arr[0] if arr and isinstance(arr, list) else None

    def _array_length(self, arr: List) -> int:
        """Get length of array"""
        return len(arr) if isinstance(arr, list) else 0

    def _join(self, arr: List, separator: str = ', ') -> str:
        """Join array elements"""
        if isinstance(arr, list):
            return separator.join(str(x) for x in arr)
        return str(arr)

    def _generate_expired_deadlines_list(self, context: Dict[str, Any]) -> str:
        """
        Generate list of expired marking deadlines as a formatted string
        Format: - Product Name (X/Y deadlines expired)
        """
        try:
            cart_items = context.get('cart', {}).get('items', [])

            # Generate list items for products with expired deadlines
            result = []

            for item in cart_items:
                if not item.get('is_marking', False):
                    continue

                # Check if this item has expired deadlines
                expired_count = item.get('expired_deadlines_count', 0)
                if expired_count <= 0:
                    continue

                product_name = item.get('product_name', 'Unknown Product')

                # Use actual marking paper count instead of quantity
                total_papers = item.get('marking_paper_count', 1)

                # Format: "- Product Name (X/Y deadlines expired)"
                result.append(f"- {product_name} ({expired_count}/{total_papers} deadlines expired)")

            # Join with newlines to create a formatted list
            return '\n'.join(result) if result else 'No expired deadlines found'

        except Exception as e:
            logger.warning(f"Error generating expired deadlines list: {e}")
            return "Error generating expired deadlines list"