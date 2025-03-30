"""
Script to register string processing functions into the database.
Run this script with:
python manage.py shell < pdf_app/scripts/register_string_functions.py
"""
import os
import django
import inspect

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pdf_app.models import PythonFunction
from pdf_app.utils import string_processing_functions


def register_functions():
    """Register all string processing functions from the utils module."""
    # Get all functions in the string_processing_functions module
    functions = inspect.getmembers(string_processing_functions, inspect.isfunction)
    
    # Track how many functions were added
    added_count = 0
    updated_count = 0
    
    for name, func in functions:
        # Get the function source code
        source_code = inspect.getsource(func)
        
        # Get the docstring
        doc = inspect.getdoc(func)
        
        # Create a description from the docstring's first line
        description = doc.split('\n')[0] if doc else f"Function to {name.replace('_', ' ')}"
        
        # Check if function already exists
        function_obj, created = PythonFunction.objects.update_or_create(
            name=name,
            defaults={
                'description': description,
                'function_code': source_code
            }
        )
        
        if created:
            print(f"Added function: {name}")
            added_count += 1
        else:
            print(f"Updated function: {name}")
            updated_count += 1
    
    print(f"\nSummary: Added {added_count} new functions, updated {updated_count} existing functions.")


if __name__ == "__main__":
    print("Registering string processing functions...")
    register_functions()
    print("Done.") 