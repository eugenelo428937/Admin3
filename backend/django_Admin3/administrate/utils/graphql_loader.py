import os
from django.template.loader import render_to_string

def load_graphql_query(template_name):
    """
    Load a GraphQL query from a template file.
    
    Args:
        template_name (str): The name of the template file without the .graphql extension
        
    Returns:
        str: The contents of the GraphQL query file
    """
    template_path = f"graphql/queries/{template_name}.graphql"
    return render_to_string(template_path)

def load_graphql_mutation(template_name):
    """
    Load a GraphQL mutation from a template file.
    
    Args:
        template_name (str): The name of the template file without the .graphql extension
        
    Returns:
        str: The contents of the GraphQL mutation file
    """
    template_path = f"graphql/mutations/{template_name}.graphql"
    return render_to_string(template_path)
