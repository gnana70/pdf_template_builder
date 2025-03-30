from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, FileResponse
from pdf_app.models import Template, TemplateField, Configuration, PythonFunction
from pdf_app.forms import TemplateForm, TemplateFieldForm
import json
import os
import fitz  # PyMuPDF
from django.conf import settings
import tempfile
from django.core.paginator import Paginator
from django.db.models import Q

@login_required
def template_list(request):
    # Get filters from query parameters
    search_query = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')
    
    # Base queryset
    templates = Template.objects.filter(created_by=request.user)
    
    # Apply filters
    if search_query:
        templates = templates.filter(
            Q(name__icontains=search_query) | 
            Q(description__icontains=search_query)
        )
    
    if status_filter:
        templates = templates.filter(status=status_filter)
    
    # Order by updated_at
    templates = templates.order_by('-updated_at')
    
    # Pagination
    paginator = Paginator(templates, 10)  # Show 10 templates per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'templates': page_obj,
        'page_obj': page_obj,
        'is_paginated': paginator.num_pages > 1,
        'paginator': paginator,
        'search_query': search_query,
        'status_filter': status_filter
    }
    
    return render(request, 'templates/list.html', context)

@login_required
def template_create(request):
    if request.method == 'POST':
        form = TemplateForm(request.POST, request.FILES, user=request.user)
        if form.is_valid():
            template = form.save(commit=False)
            template.created_by = request.user
            template.save()
            messages.success(request, "Template created successfully!")
            return redirect('template_configure', pk=template.pk)
    else:
        form = TemplateForm(user=request.user)

    configurations = Configuration.objects.filter(created_by=request.user, status='active')
    return render(request, 'templates/form.html', {'form': form, 'configurations': configurations})

@login_required
def template_update(request, pk):
    template = get_object_or_404(Template, pk=pk, created_by=request.user)
    
    if request.method == 'POST':
        form = TemplateForm(request.POST, request.FILES, instance=template, user=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Template updated successfully!")
            return redirect('template_list')
    else:
        form = TemplateForm(instance=template, user=request.user)
    
    configurations = Configuration.objects.filter(created_by=request.user, status='active')
    return render(request, 'templates/form.html', {'form': form, 'template': template, 'configurations': configurations})

@login_required
def template_delete(request, pk):
    template = get_object_or_404(Template, pk=pk, created_by=request.user)
    
    if request.method == 'POST':
        template.delete()
        messages.success(request, "Template deleted successfully!")
        return redirect('template_list')
    
    return render(request, 'templates/delete.html', {'template': template})

@login_required
def template_configure(request, pk):
    template = get_object_or_404(Template, pk=pk, created_by=request.user)
    fields = TemplateField.objects.filter(template=template)
    
    return render(request, 'templates/configure.html', {
        'template': template, 
        'fields': fields,
    })

@login_required
def template_field_create(request, template_pk):
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    
    if request.method == 'POST':
        form = TemplateFieldForm(request.POST)
        if form.is_valid():
            field = form.save(commit=False)
            field.template = template
            field.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'status': 'success', 'field_id': field.id})
            messages.success(request, "Field added successfully!")
            return redirect('template_configure', pk=template.pk)
    else:
        form = TemplateFieldForm()
    
    return render(request, 'templates/field_form.html', {'form': form, 'template': template})

@login_required
def template_field_update(request, pk):
    field = get_object_or_404(TemplateField, pk=pk, template__created_by=request.user)
    
    if request.method == 'POST':
        form = TemplateFieldForm(request.POST, instance=field)
        if form.is_valid():
            form.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'status': 'success'})
            messages.success(request, "Field updated successfully!")
            return redirect('template_configure', pk=field.template.pk)
    else:
        form = TemplateFieldForm(instance=field)
    
    return render(request, 'templates/field_form.html', {'form': form, 'field': field, 'template': field.template})

@login_required
def template_field_delete(request, pk):
    field = get_object_or_404(TemplateField, pk=pk, template__created_by=request.user)
    template_pk = field.template.pk
    
    if request.method == 'POST':
        field.delete()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'status': 'success'})
        messages.success(request, "Field deleted successfully!")
        return redirect('template_configure', pk=template_pk)
    
    return render(request, 'templates/field_delete.html', {'field': field})

@login_required
def extract_text_from_area(request, template_pk):
    """Extract text from a selected area in the PDF using PyMuPDF"""
    if request.method == 'POST':
        data = json.loads(request.body)
        x = data.get('x')
        y = data.get('y')
        x1 = data.get('x1')
        y1 = data.get('y1')
        page_num = data.get('page', 1) - 1  # PyMuPDF uses 0-based indexing
        
        template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
        
        # Get the PDF file path
        pdf_path = os.path.join(settings.MEDIA_ROOT, template.pdf_file.name)
        
        # Extract text using PyMuPDF
        try:
            doc = fitz.open(pdf_path)
            page = doc[page_num]
            rect = fitz.Rect(x, y, x1, y1)
            text = page.get_text("text", clip=rect).strip()
            doc.close()
            
            return JsonResponse({'status': 'success', 'text': text})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request'})

@login_required
def get_pdf_file(request, template_pk):
    """Serve the PDF file for the template viewer"""
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    pdf_path = os.path.join(settings.MEDIA_ROOT, template.pdf_file.name)
    
    with open(pdf_path, 'rb') as pdf:
        response = HttpResponse(pdf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(template.pdf_file.name)}"'
        return response  

@login_required
def get_configuration_data(request, template_pk):
    """Get configuration data (fields and tables) for a template"""
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    configuration = template.configuration
    
    # Get fields from the configuration - use field_type (not type)
    fields = configuration.fields.all().values('id', 'name', 'field_type')
    
    # Get tables from the configuration
    tables = configuration.tables.all().values('id', 'name')
    
    # Get Python functions
    python_functions = PythonFunction.objects.all().values('id', 'name', 'description')
    
    # Return the data as JSON
    return JsonResponse({
        'status': 'success',
        'fields': list(fields),
        'tables': list(tables),
        'python_functions': list(python_functions)
    })  

@login_required
def template_dimensions(request, pk):
    """Save first page dimensions from PDF."""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Only POST method is allowed'}, status=405)
    
    template = get_object_or_404(Template, pk=pk, created_by=request.user)
    
    try:
        data = json.loads(request.body)
        template.first_page_width = data.get('width', 0)
        template.first_page_height = data.get('height', 0)
        template.save(update_fields=['first_page_width', 'first_page_height'])
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)  
