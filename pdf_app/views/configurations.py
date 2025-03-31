import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.urls import reverse
from pdf_app.models import Configuration, Field, Table, Column, PythonFunction
from pdf_app.forms import ConfigurationForm

def configuration_list(request):
    """View for listing all configurations"""
    configurations = Configuration.objects.all().order_by('-created_at')
    return render(request, 'configurations/list.html', {'configurations': configurations})

def configuration_create(request):
    """View for creating a new configuration"""
    if request.method == 'POST':
        form = ConfigurationForm(request.POST)
        if form.is_valid():
            configuration = form.save()
            
            # Process fields
            if 'fields' in request.POST:
                process_fields(request.POST.get('fields'), configuration)
            
            # Process tables
            if 'tables' in request.POST:
                process_tables(request.POST.get('tables'), configuration)
                
            messages.success(request, 'Configuration created successfully.')
            return redirect('configuration_detail', pk=configuration.id)
    else:
        form = ConfigurationForm()
    
    return render(request, 'configurations/form.html', {'form': form})

def configuration_edit(request, pk):
    """View for editing an existing configuration"""
    configuration = get_object_or_404(Configuration, pk=pk)
    
    if request.method == 'POST':
        form = ConfigurationForm(request.POST, instance=configuration)
        if form.is_valid():
            configuration = form.save()
            
            # Clear existing fields and tables
            Field.objects.filter(configuration=configuration).delete()
            Table.objects.filter(configuration=configuration).delete()
            
            # Process fields
            if 'fields' in request.POST:
                process_fields(request.POST.get('fields'), configuration)
            
            # Process tables
            if 'tables' in request.POST:
                process_tables(request.POST.get('tables'), configuration)
                
            messages.success(request, 'Configuration updated successfully.')
            return redirect('configuration_detail', pk=configuration.id)
    else:
        form = ConfigurationForm(instance=configuration)
        
        # Prepare fields and tables JSON for the template
        fields = configuration.fields.all()
        tables = configuration.tables.all()
        
        fields_json = []
        for field in fields:
            field_data = {
                'name': field.name,
                'type': field.type,
                'min_length': field.min_length,
                'max_length': field.max_length,
                'pattern': field.pattern,
                'required': field.required
            }
            
            # Add Python function ID if it exists
            if field.python_function:
                field_data['python_function'] = field.python_function.id
                
            fields_json.append(field_data)
        
        tables_json = []
        for table in tables:
            columns = []
            for column in table.columns.all():
                column_data = {
                    'name': column.name,
                    'type': column.type,
                    'min_length': column.min_length,
                    'max_length': column.max_length,
                    'pattern': column.pattern,
                    'required': column.required
                }
                
                # Add Python function ID if it exists
                if column.python_function:
                    column_data['python_function'] = column.python_function.id
                    
                columns.append(column_data)
            
            tables_json.append({
                'name': table.name,
                'columns': columns
            })
    
    context = {
        'form': form,
        'fields_json': json.dumps(fields_json) if 'fields_json' in locals() else '[]',
        'tables_json': json.dumps(tables_json) if 'tables_json' in locals() else '[]'
    }
    
    return render(request, 'configurations/form.html', context)

def configuration_detail(request, pk):
    """View for displaying configuration details"""
    configuration = get_object_or_404(Configuration, pk=pk)
    return render(request, 'configurations/detail.html', {'configuration': configuration})

def configuration_delete(request, pk):
    """View for deleting a configuration"""
    configuration = get_object_or_404(Configuration, pk=pk)
    
    if request.method == 'POST':
        configuration.delete()
        messages.success(request, 'Configuration deleted successfully.')
        return redirect('configuration_list')
    
    return render(request, 'configurations/confirm_delete.html', {'configuration': configuration})

def process_fields(fields_data, configuration):
    """Process and save field data from the form"""
    if isinstance(fields_data, str):
        try:
            fields_data = json.loads(fields_data)
        except json.JSONDecodeError:
            return
    
    # Track field names to ensure uniqueness within this configuration
    field_names = set()
    
    for field_data in fields_data:
        field_name = field_data.get('name', '').strip()
        
        # Skip if name is empty or already used
        if not field_name or field_name.lower() in field_names:
            continue
        
        # Add name to the set to track it
        field_names.add(field_name.lower())
        
        # Get the Python function if selected
        python_function = None
        if field_data.get('python_function'):
            try:
                python_function_id = int(field_data.get('python_function'))
                python_function = PythonFunction.objects.get(id=python_function_id)
            except (ValueError, PythonFunction.DoesNotExist):
                pass
        
        Field.objects.create(
            configuration=configuration,
            name=field_name,
            type=field_data.get('type', 'string'),
            min_length=field_data.get('min_length'),
            max_length=field_data.get('max_length'),
            pattern=field_data.get('pattern'),
            required=field_data.get('required', False),
            python_function=python_function
        )

def process_tables(tables_data, configuration):
    """Process and save table data from the form"""
    if isinstance(tables_data, str):
        try:
            tables_data = json.loads(tables_data)
        except json.JSONDecodeError:
            return
    
    # Track table names to ensure uniqueness within this configuration
    table_names = set()
    
    for table_data in tables_data:
        table_name = table_data.get('name', '').strip()
        
        # Skip if name is empty or already used
        if not table_name or table_name.lower() in table_names:
            continue
            
        # Add name to the set to track it
        table_names.add(table_name.lower())
        
        table = Table.objects.create(
            configuration=configuration,
            name=table_name
        )
        
        # Process columns
        columns_data = table_data.get('columns', [])
        
        # Track column names to ensure uniqueness within this table
        column_names = set()
        
        for column_data in columns_data:
            column_name = column_data.get('name', '').strip()
            
            # Skip if name is empty or already used
            if not column_name or column_name.lower() in column_names:
                continue
                
            # Add name to the set to track it
            column_names.add(column_name.lower())
            
            # Get the Python function if selected
            python_function = None
            if column_data.get('python_function'):
                try:
                    python_function_id = int(column_data.get('python_function'))
                    python_function = PythonFunction.objects.get(id=python_function_id)
                except (ValueError, PythonFunction.DoesNotExist):
                    pass
            
            Column.objects.create(
                table=table,
                name=column_name,
                type=column_data.get('type', 'string'),
                min_length=column_data.get('min_length'),
                max_length=column_data.get('max_length'),
                pattern=column_data.get('pattern'),
                required=column_data.get('required', False),
                python_function=python_function
            ) 