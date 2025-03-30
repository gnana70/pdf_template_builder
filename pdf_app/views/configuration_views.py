"""
Views for handling configuration functionality.
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
import json
import csv
import io
import time
from datetime import datetime
from django.db.models import Q, Max

from pdf_app.models import Configuration, ConfigurationRun, Document, Field, Table, TableColumn
from pdf_app.forms.configuration_forms import (
    ConfigurationForm, ConfigurationRunForm, 
    FieldForm, TableForm, TableColumnForm
)


@login_required
def configuration_list(request):
    """View for listing configurations."""
    # Get filters from query parameters
    search_query = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')
    
    # Filter configurations
    configurations = Configuration.objects.filter(created_by=request.user)
    
    if search_query:
        configurations = configurations.filter(name__icontains=search_query)
    
    if status_filter:
        configurations = configurations.filter(status=status_filter)
    
    # Order by updated_at
    configurations = configurations.order_by('-updated_at')
    
    # Pagination
    paginator = Paginator(configurations, 10)  # Show 10 configurations per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'configurations': page_obj,
        'page_obj': page_obj,
        'is_paginated': paginator.num_pages > 1,
        'paginator': paginator,
        'search_query': search_query,
        'status_filter': status_filter
    }
    
    return render(request, 'configurations/list.html', context)


@login_required
def configuration_create(request):
    """View for creating a new configuration."""
    if request.method == 'POST':
        form = ConfigurationForm(request.POST, user=request.user)
        if form.is_valid():
            configuration = form.save(commit=False)
            configuration.created_by = request.user
            configuration.save()
            
            messages.success(request, 'Configuration created successfully.')
            return redirect('configuration_detail', configuration.id)
    else:
        form = ConfigurationForm(user=request.user)
    
    context = {
        'form': form,
    }
    
    return render(request, 'configurations/form.html', context)


@login_required
def configuration_edit(request, pk):
    """View for editing an existing configuration."""
    configuration = get_object_or_404(Configuration, id=pk, created_by=request.user)
    
    if request.method == 'POST':
        form = ConfigurationForm(request.POST, instance=configuration, user=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Configuration updated successfully.')
            return redirect('configuration_detail', configuration.id)
    else:
        form = ConfigurationForm(instance=configuration, user=request.user)
    
    context = {
        'form': form,
        'configuration': configuration
    }
    
    return render(request, 'configurations/form.html', context)


@login_required
def configuration_detail(request, pk):
    """View for viewing configuration details."""
    configuration = get_object_or_404(Configuration, id=pk, created_by=request.user)
    
    # Get all fields for this configuration
    fields = Field.objects.filter(configuration=configuration).order_by('order')
    
    # Get all tables for this configuration
    tables = Table.objects.filter(configuration=configuration).order_by('page')
    
    # Get recent runs for this configuration
    configuration_runs = ConfigurationRun.objects.filter(
        configuration=configuration
    ).order_by('-started_at')[:5]
    
    context = {
        'configuration': configuration,
        'fields': fields,
        'tables': tables,
        'configuration_runs': configuration_runs,
    }
    
    return render(request, 'configurations/detail.html', context)


@login_required
def configuration_delete(request, pk):
    """View for deleting a configuration."""
    configuration = get_object_or_404(Configuration, id=pk, created_by=request.user)
    
    if request.method == 'POST':
        configuration.delete()
        messages.success(request, 'Configuration deleted successfully.')
        return redirect('configuration_list')
    
    return redirect('configuration_detail', pk=pk)


@login_required
def field_create(request, config_pk):
    """View for creating a new field."""
    configuration = get_object_or_404(Configuration, id=config_pk, created_by=request.user)
    
    if request.method == 'POST':
        form = FieldForm(request.POST, configuration=configuration)
        if form.is_valid():
            field = form.save(commit=False)
            field.configuration = configuration
            
            # Set order to be the next available order
            max_order = Field.objects.filter(configuration=configuration).aggregate(
                max_order=Max('order')
            )['max_order'] or 0
            field.order = max_order + 1
            
            field.save()
            
            messages.success(request, 'Field created successfully.')
            return redirect('configuration_detail', configuration.id)
    else:
        form = FieldForm(configuration=configuration)
    
    context = {
        'form': form,
        'configuration': configuration,
        'is_new': True
    }
    
    return render(request, 'configurations/field_form.html', context)


@login_required
def field_edit(request, pk):
    """View for editing an existing field."""
    field = get_object_or_404(Field, id=pk)
    configuration = field.configuration
    
    # Check user has permission to edit this field
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to edit this field.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        form = FieldForm(request.POST, instance=field, configuration=configuration)
        if form.is_valid():
            form.save()
            messages.success(request, 'Field updated successfully.')
            return redirect('configuration_detail', configuration.id)
    else:
        form = FieldForm(instance=field, configuration=configuration)
    
    context = {
        'form': form,
        'configuration': configuration,
        'field': field,
        'is_new': False
    }
    
    return render(request, 'configurations/field_form.html', context)


@login_required
def field_delete(request, pk):
    """View for deleting a field."""
    field = get_object_or_404(Field, id=pk)
    configuration = field.configuration
    
    # Check user has permission to delete this field
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to delete this field.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        field.delete()
        messages.success(request, 'Field deleted successfully.')
    
    return redirect('configuration_detail', configuration.id)


@login_required
def table_create(request, config_pk):
    """View for creating a new table."""
    configuration = get_object_or_404(Configuration, id=config_pk, created_by=request.user)
    
    if request.method == 'POST':
        form = TableForm(request.POST, configuration=configuration)
        if form.is_valid():
            table = form.save(commit=False)
            table.configuration = configuration
            table.save()
            
            # Process any columns that were created during table creation
            column_count = request.POST.get('column_count')
            if column_count and column_count.isdigit():
                count = int(column_count)
                for i in range(count):
                    column_name = request.POST.get(f'column_name_{i}')
                    if column_name:  # Only process if name exists
                        column_type = request.POST.get(f'column_type_{i}')
                        column_description = request.POST.get(f'column_description_{i}')
                        column_required = request.POST.get(f'column_required_{i}') == 'on'
                        column_regex = request.POST.get(f'column_regex_{i}')
                        
                        # Create the column
                        column = TableColumn(
                            table=table,
                            name=column_name,
                            description=column_description,
                            data_type=column_type,
                            is_required=column_required,
                            regex_pattern=column_regex,
                            order=i+1  # Set order based on position
                        )
                        column.save()
            
            messages.success(request, 'Table created successfully.')
            return redirect('table_detail', table.id)
    else:
        form = TableForm(configuration=configuration)
    
    context = {
        'form': form,
        'configuration': configuration,
        'is_new': True
    }
    
    return render(request, 'configurations/table_form.html', context)


@login_required
def table_edit(request, pk):
    """View for editing an existing table."""
    table = get_object_or_404(Table, id=pk)
    configuration = table.configuration
    
    # Check user has permission to edit this table
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to edit this table.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        form = TableForm(request.POST, instance=table, configuration=configuration)
        if form.is_valid():
            form.save()
            messages.success(request, 'Table updated successfully.')
            return redirect('table_detail', table.id)
    else:
        form = TableForm(instance=table, configuration=configuration)
    
    # Get columns for this table
    columns = TableColumn.objects.filter(table=table).order_by('order')
    
    context = {
        'form': form,
        'configuration': configuration,
        'table': table,
        'columns': columns,
        'is_new': False
    }
    
    return render(request, 'configurations/table_form.html', context)


@login_required
def table_delete(request, pk):
    """View for deleting a table."""
    table = get_object_or_404(Table, id=pk)
    configuration = table.configuration
    
    # Check user has permission to delete this table
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to delete this table.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        table.delete()
        messages.success(request, 'Table deleted successfully.')
    
    return redirect('configuration_detail', configuration.id)


@login_required
def table_detail(request, pk):
    """View for viewing table details with columns."""
    table = get_object_or_404(Table, id=pk)
    configuration = table.configuration
    
    # Check user has permission to view this table
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to view this table.")
        return redirect('configuration_list')
    
    # Get columns for this table
    columns = TableColumn.objects.filter(table=table).order_by('order')
    
    context = {
        'table': table,
        'configuration': configuration,
        'columns': columns
    }
    
    return render(request, 'configurations/table_detail.html', context)


@login_required
def table_column_create(request, table_pk):
    """View for creating a new table column."""
    table = get_object_or_404(Table, id=table_pk)
    configuration = table.configuration
    
    # Check user has permission
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to add columns to this table.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        form = TableColumnForm(request.POST, table=table)
        if form.is_valid():
            column = form.save(commit=False)
            column.table = table
            
            # Set order to be the next available order
            max_order = TableColumn.objects.filter(table=table).aggregate(
                max_order=Max('order')
            )['max_order'] or 0
            column.order = max_order + 1
            
            column.save()
            
            messages.success(request, 'Column added successfully.')
            return redirect('table_detail', table.id)
    else:
        form = TableColumnForm(table=table)
    
    context = {
        'form': form,
        'table': table,
        'configuration': configuration,
        'is_new': True
    }
    
    return render(request, 'configurations/column_form.html', context)


@login_required
def table_column_edit(request, pk):
    """View for editing an existing table column."""
    column = get_object_or_404(TableColumn, id=pk)
    table = column.table
    configuration = table.configuration
    
    # Check user has permission
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to edit this column.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        form = TableColumnForm(request.POST, instance=column, table=table)
        if form.is_valid():
            form.save()
            messages.success(request, 'Column updated successfully.')
            return redirect('table_detail', table.id)
    else:
        form = TableColumnForm(instance=column, table=table)
    
    context = {
        'form': form,
        'column': column,
        'table': table,
        'configuration': configuration,
        'is_new': False
    }
    
    return render(request, 'configurations/column_form.html', context)


@login_required
def table_column_delete(request, pk):
    """View for deleting a table column."""
    column = get_object_or_404(TableColumn, id=pk)
    table = column.table
    configuration = table.configuration
    
    # Check user has permission
    if configuration.created_by != request.user:
        messages.error(request, "You don't have permission to delete this column.")
        return redirect('configuration_list')
    
    if request.method == 'POST':
        column.delete()
        messages.success(request, 'Column deleted successfully.')
    
    return redirect('table_detail', table.id)


@login_required
def configuration_run(request, pk):
    """View for running a configuration."""
    configuration = get_object_or_404(Configuration, id=pk, created_by=request.user)
    
    if request.method == 'POST':
        form = ConfigurationRunForm(request.POST, request.FILES, configuration=configuration)
        if form.is_valid():
            document_file = form.cleaned_data.get('document')
            
            # Create a new document
            document = Document.objects.create(
                title=document_file.name,
                created_by=request.user,
                file=document_file
            )
            
            # Create a new configuration run
            run = ConfigurationRun.objects.create(
                configuration=configuration,
                document=document,
                status='pending'
            )
            
            # In a real-world application, you would start an asynchronous task here
            # For simplicity, we'll simulate the execution synchronously
            try:
                # Update status to running
                run.status = 'running'
                run.save()
                
                # Simulate extraction process
                # In a real app, this would be handled by a background task
                time.sleep(1)  # Simulate processing
                
                # Sample results (in a real app, this would be actual extraction results)
                sample_results = {
                    "fields": {
                        "invoice_number": "INV-2023-001",
                        "date": "2023-03-15",
                        "customer": "ACME Corporation",
                        "total": 1250.00
                    },
                    "tables": [
                        {
                            "header": ["Item", "Quantity", "Price", "Total"],
                            "rows": [
                                ["Widget A", "5", "$50.00", "$250.00"],
                                ["Widget B", "2", "$100.00", "$200.00"],
                                ["Service X", "8", "$100.00", "$800.00"]
                            ]
                        }
                    ]
                }
                
                # Update run with results
                run.status = 'completed'
                run.completed_at = timezone.now()
                run.results = sample_results
                run.save()
                
                return redirect('configuration_run_detail', run.id)
                
            except Exception as e:
                # Handle errors
                run.status = 'failed'
                run.completed_at = timezone.now()
                run.error_message = str(e)
                run.save()
                
                messages.error(request, f'Error processing document: {str(e)}')
                return redirect('configuration_run_detail', run.id)
    else:
        form = ConfigurationRunForm(configuration=configuration)
    
    context = {
        'configuration': configuration,
        'form': form,
    }
    
    return render(request, 'configurations/run.html', context)


@login_required
def configuration_run_detail(request, pk):
    """View for viewing configuration run details."""
    run = get_object_or_404(
        ConfigurationRun, 
        id=pk, 
        configuration__created_by=request.user
    )
    
    context = {
        'run': run,
    }
    
    return render(request, 'configurations/run_detail.html', context)


@login_required
def configuration_run_download(request, pk):
    """Download run results as JSON."""
    run = get_object_or_404(ConfigurationRun, pk=pk)
    
    # Check that the user has permission to download these results
    if run.configuration.created_by != request.user and not request.user.is_staff:
        messages.error(request, "You don't have permission to download these results.")
        return redirect('configuration_list')
    
    # Prepare the results data
    if not run.results:
        messages.error(request, "No results available for download.")
        return redirect('configuration_run_detail', pk=pk)
    
    # Create JSON response
    response = HttpResponse(
        json.dumps(run.results, indent=2),
        content_type='application/json'
    )
    
    # Set filename
    filename = f"extraction_{run.configuration.name}_{run.id}.json"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@login_required
def configuration_run_download_csv(request, pk):
    """Download run results as CSV."""
    run = get_object_or_404(ConfigurationRun, pk=pk)
    
    # Check that the user has permission to download these results
    if run.configuration.created_by != request.user and not request.user.is_staff:
        messages.error(request, "You don't have permission to download these results.")
        return redirect('configuration_list')
    
    # Prepare the results data
    if not run.results:
        messages.error(request, "No results available for download.")
        return redirect('configuration_run_detail', pk=pk)
    
    # Create CSV file in memory
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    
    # Write field results
    writer.writerow(['Field', 'Value'])
    if 'fields' in run.results:
        for field_name, field_value in run.results['fields'].items():
            writer.writerow([field_name, field_value])
    
    # Add a blank row
    writer.writerow([])
    
    # Write table results
    if 'tables' in run.results:
        for i, table in enumerate(run.results['tables']):
            writer.writerow([f'Table {i+1}'])
            
            if 'header' in table:
                writer.writerow(table['header'])
            
            if 'rows' in table:
                for row in table['rows']:
                    writer.writerow(row)
            
            # Add a blank row after each table
            writer.writerow([])
    
    # Create HTTP response with CSV
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='text/csv')
    
    # Set filename
    filename = f"extraction_{run.configuration.name}_{run.id}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response 
