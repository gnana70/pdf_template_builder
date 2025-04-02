import os
import json
try:
    import fitz  # PyMuPDF
except ImportError:
    # Log error or handle the missing dependency
    fitz = None
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, FileResponse
from pdf_app.models import Template, TemplateField, Configuration, PythonFunction, Field, Table, TableColumn, TemplateImage, TemplatePagePosition
from pdf_app.forms import TemplateForm, TemplateFieldForm
from django.conf import settings
import tempfile
from django.core.paginator import Paginator
from django.db.models import Q
import logging
from django.db import transaction

# Set up logger
logger = logging.getLogger(__name__)

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
    # Direct print message that will appear in the console no matter what
    print("\n\nTEMPLATE CREATE VIEW CALLED - DIRECT PRINT\n\n")
    
    if request.method == 'POST':
        # Add a very visible console log message for testing
        logger.info("="*50)
        logger.info("TEMPLATE CREATE REQUEST RECEIVED")
        logger.info("="*50)
        
        # Print the form data for debugging
        print("\nFORM DATA:")
        for key, value in request.POST.items():
            print(f"{key}: {value}")
        print("\nFILES:")
        for key, value in request.FILES.items():
            print(f"{key}: {value}")
        
        form = TemplateForm(request.POST, request.FILES, user=request.user)
        print(f"\nFORM IS BOUND: {form.is_bound}")
        
        # Check if form is valid and print errors if not
        form_valid = form.is_valid()
        print(f"FORM IS VALID: {form_valid}")
        
        if not form_valid:
            print("FORM ERRORS:")
            for field, errors in form.errors.items():
                print(f"  {field}: {errors}")
                # Check specifically for duplicate name error and make it more visible
                if field == 'name' and 'unique' in str(errors).lower():
                    error_msg = f"A template with the name '{form.data.get('name')}' already exists. Please use a different name."
                    print(f"DUPLICATE NAME ERROR: {error_msg}")
                    messages.error(request, error_msg)
            
            # Return the form with visible errors
            configurations = Configuration.objects.filter(created_by=request.user, status='active')
            return render(request, 'templates/form.html', {'form': form, 'configurations': configurations})
        
        if form_valid:
            try:
                print("ATTEMPTING TO SAVE TEMPLATE")
                # Use transaction.atomic to ensure all operations are completed or none
                with transaction.atomic():
                    # Create and save the template
                    template = form.save(commit=False)
                    template.created_by = request.user
                    
                    # Ensure dimensions are saved as integers
                    if 'first_page_width' in request.POST and request.POST['first_page_width']:
                        try:
                            template.first_page_width = int(float(request.POST['first_page_width']))
                            print(f"Setting width to: {template.first_page_width}")
                        except (ValueError, TypeError):
                            print(f"Error converting width: {request.POST['first_page_width']}")
                    
                    if 'first_page_height' in request.POST and request.POST['first_page_height']:
                        try:
                            template.first_page_height = int(float(request.POST['first_page_height']))
                            print(f"Setting height to: {template.first_page_height}")
                        except (ValueError, TypeError):
                            print(f"Error converting height: {request.POST['first_page_height']}")
                    
                    print(f"SAVING TEMPLATE: {template.name} with dimensions: {template.first_page_width}x{template.first_page_height}")
                    template.save()
                    print(f"TEMPLATE SAVED WITH ID: {template.pk}")
                    
                    # Log template creation with ID and details - with visible markers
                    logger.info("="*30 + " TEMPLATE CREATED SUCCESSFULLY " + "="*30)
                    logger.info(f"Template ID: {template.pk}")
                    logger.info(f"Template Name: {template.name}")
                    logger.info(f"Created By: {request.user.username}")
                    logger.info(f"Configuration: {template.configuration.name if template.configuration else 'None'}")
                    logger.info(f"Dimensions: {template.first_page_width}x{template.first_page_height}")
                    logger.info("="*85)
                    
                    # Handle page positions if provided
                    if 'page_positions_json' in request.POST:
                        print(f"PROCESSING PAGE POSITIONS: {request.POST.get('page_positions_json')}")
                        try:
                            page_positions_data = json.loads(request.POST.get('page_positions_json'))
                            
                            # If at least one position exists, update the legacy fields with the first one
                            # for backward compatibility
                            if page_positions_data:
                                first_position = page_positions_data[0]
                                position = first_position.get('position')
                                if position in ['first', 'last']:
                                    template.unnecessary_page_position = position
                                    template.unnecessary_page_delta = first_position.get('delta', 0)
                                    template.save(update_fields=['unnecessary_page_position', 'unnecessary_page_delta'])
                                    
                                    logger.info(f"Template {template.pk} updated with legacy page position: {position}, delta: {template.unnecessary_page_delta}")
                            
                            # Create all positions
                            created_positions = []
                            for pos_data in page_positions_data:
                                position = pos_data.get('position')
                                delta = pos_data.get('delta')
                                page_number = pos_data.get('page_number')
                                
                                # Create page position
                                page_position = TemplatePagePosition.objects.create(
                                    template=template,
                                    position=position,
                                    delta=delta,
                                    page_number=page_number if position == 'custom' else None
                                )
                                created_positions.append(f"Position {page_position.pk}: {position}, delta: {delta}, page: {page_number}")
                            
                            if created_positions:
                                logger.info(f"Created {len(created_positions)} page positions for template {template.pk}: {', '.join(created_positions)}")
                        except json.JSONDecodeError:
                            logger.warning(f"Could not parse page positions data for template {template.pk}")
                            messages.warning(request, "Could not parse page positions data")
                        except Exception as e:
                            logger.error(f"Error saving page positions for template {template.pk}: {str(e)}")
                            messages.warning(request, f"Error saving page positions: {str(e)}")
                    
                    # Make sure messages are visible to the user
                    messages.success(request, f"Template '{template.name}' created successfully with ID: {template.pk}")
                    
                    # Get the action from the form
                    action = request.POST.get('action')
                    print(f"ACTION BUTTON: {action}")
                    
                    # Add debug logging before redirect
                    if action == 'save_configure':
                        print(f"ABOUT TO REDIRECT TO CONFIGURE PAGE FOR TEMPLATE {template.pk}")
                        logger.info(f"Redirecting to configure page for template {template.pk}")
                        return redirect('template_configure', pk=template.pk)
                    else:
                        print(f"ABOUT TO REDIRECT TO UPDATE PAGE FOR TEMPLATE {template.pk}")
                        logger.info(f"Redirecting to update page for template {template.pk}")
                        return redirect('template_update', pk=template.pk)
                        
            except Exception as e:
                # Log the error and display a message
                print(f"ERROR CREATING TEMPLATE: {str(e)}")
                logger.error(f"Error creating template: {str(e)}")
                messages.error(request, f"Error creating template: {str(e)}")
                # Return the form with errors
                configurations = Configuration.objects.filter(created_by=request.user, status='active')
                return render(request, 'templates/form.html', {'form': form, 'configurations': configurations, 'error': str(e)})
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
            try:
                # Save the main template data, but commit=False to handle dimensions
                template = form.save(commit=False)
                
                # Ensure dimensions are saved as integers
                if 'first_page_width' in request.POST and request.POST['first_page_width']:
                    try:
                        template.first_page_width = int(float(request.POST['first_page_width']))
                        print(f"Updating width to: {template.first_page_width}")
                    except (ValueError, TypeError):
                        print(f"Error converting width: {request.POST['first_page_width']}")
                
                if 'first_page_height' in request.POST and request.POST['first_page_height']:
                    try:
                        template.first_page_height = int(float(request.POST['first_page_height']))
                        print(f"Updating height to: {template.first_page_height}")
                    except (ValueError, TypeError):
                        print(f"Error converting height: {request.POST['first_page_height']}")
                
                # Save the template with updated dimensions
                template.save()
                
                # Log template update with ID and details
                logger.info(f"Template updated successfully - ID: {template.pk}, Name: {template.name}, "
                           f"User: {request.user.username}, Configuration: {template.configuration.name if template.configuration else 'None'}, "
                           f"Dimensions: {template.first_page_width}x{template.first_page_height}")
                
                # Handle page positions if provided
                if 'page_positions_json' in request.POST:
                    try:
                        # Remove existing page positions
                        previous_position_count = template.page_positions.count()
                        template.page_positions.all().delete()
                        logger.info(f"Deleted {previous_position_count} previous page positions for template {template.pk}")
                        
                        # Add new page positions
                        page_positions_data = json.loads(request.POST.get('page_positions_json'))
                        
                        # If at least one position exists, update the legacy fields with the first one
                        # for backward compatibility
                        if page_positions_data:
                            first_position = page_positions_data[0]
                            position = first_position.get('position')
                            if position in ['first', 'last']:
                                template.unnecessary_page_position = position
                                template.unnecessary_page_delta = first_position.get('delta', 0)
                                template.save(update_fields=['unnecessary_page_position', 'unnecessary_page_delta'])
                                logger.info(f"Template {template.pk} updated with legacy page position: {position}, delta: {template.unnecessary_page_delta}")
                        else:
                            # If no positions, clear the legacy fields
                            template.unnecessary_page_position = None
                            template.unnecessary_page_delta = 0
                            template.save(update_fields=['unnecessary_page_position', 'unnecessary_page_delta'])
                            logger.info(f"Cleared legacy page position fields for template {template.pk}")
                        
                        # Create all new positions
                        created_positions = []
                        for pos_data in page_positions_data:
                            position = pos_data.get('position')
                            delta = pos_data.get('delta')
                            page_number = pos_data.get('page_number')
                            
                            # Create page position
                            page_position = TemplatePagePosition.objects.create(
                                template=template,
                                position=position,
                                delta=delta,
                                page_number=page_number if position == 'custom' else None
                            )
                            created_positions.append(f"Position {page_position.pk}: {position}, delta: {delta}, page: {page_number}")
                        
                        if created_positions:
                            logger.info(f"Created {len(created_positions)} new page positions for template {template.pk}: {', '.join(created_positions)}")
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse page positions data for template {template.pk}")
                        messages.warning(request, "Could not parse page positions data")
                    except Exception as e:
                        logger.error(f"Error saving page positions for template {template.pk}: {str(e)}")
                        messages.warning(request, f"Error saving page positions: {str(e)}")
                
                messages.success(request, "Template updated successfully!")
                
                # Get the action from the form
                action = request.POST.get('action')
                logger.info(f"Action button clicked: {action}")
                
                if action == 'save_configure':
                    # Redirect to configure page
                    return redirect('template_configure', pk=template.pk)
                else:
                    # Redirect to template update page
                    return redirect('template_update', pk=template.pk)
                    
            except Exception as e:
                # Log the error and display a message
                logger.error(f"Error updating template {template.pk}: {str(e)}")
                messages.error(request, f"Error updating template: {str(e)}")
                # Return to the form with the error
                configurations = Configuration.objects.filter(created_by=request.user, status='active')
                return render(request, 'templates/form.html', {'form': form, 'template': template, 'configurations': configurations, 'error': str(e)})
    else:
        form = TemplateForm(instance=template, user=request.user)
        
        # If we have legacy data but no TemplatePagePosition entries, create them for backward compatibility
        if not template.page_positions.exists() and template.unnecessary_page_position:
            position = TemplatePagePosition.objects.create(
                template=template,
                position=template.unnecessary_page_position,
                delta=template.unnecessary_page_delta
            )
            logger.info(f"Created legacy page position entry for template {template.pk}: Position {position.pk}: {position.position}, delta: {position.delta}")
    
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
            
            # Handle is_table, table_settings, table_drawn_cells fields
            field.is_table = form.cleaned_data.get('is_table', False)
            field.table_settings = form.cleaned_data.get('table_settings')
            field.table_drawn_cells = form.cleaned_data.get('table_drawn_cells')
            
            # Handle line_points for table extraction
            if 'line_points' in request.POST:
                field.line_points = json.loads(request.POST.get('line_points'))
            
            # Handle extracted_text and ocr_required fields
            field.extracted_text = form.cleaned_data.get('extracted_text', '')
            field.ocr_required = form.cleaned_data.get('ocr_required', False)
            
            # Save the field
            field.save()
            
            # Log field creation details
            field_type = "Table" if field.is_table else "Standard"
            logger.info(f"Created {field_type} field for template {template.pk} - Field ID: {field.pk}, Name: {field.name}, "
                       f"Position: ({field.x}, {field.y}), Size: {field.x1}x{field.y1}, Page: {field.page}, "
                       f"OCR Required: {field.ocr_required}")
            
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
            field = form.save(commit=False)
            
            # Handle is_table, table_settings, table_drawn_cells fields
            field.is_table = form.cleaned_data.get('is_table', False)
            field.table_settings = form.cleaned_data.get('table_settings')
            field.table_drawn_cells = form.cleaned_data.get('table_drawn_cells')
            
            # Handle line_points for table extraction
            if 'line_points' in request.POST:
                field.line_points = json.loads(request.POST.get('line_points'))
            
            # Handle extracted_text and ocr_required fields
            field.extracted_text = form.cleaned_data.get('extracted_text', '')
            field.ocr_required = form.cleaned_data.get('ocr_required', False)
            
            # Save the field updates
            field.save()
            
            # Log field update details
            field_type = "Table" if field.is_table else "Standard"
            logger.info(f"Updated {field_type} field for template {field.template.pk} - Field ID: {field.pk}, Name: {field.name}, "
                       f"Position: ({field.x}, {field.y}), Size: {field.x1}x{field.y1}, Page: {field.page}, "
                       f"OCR Required: {field.ocr_required}")
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'status': 'success', 'field_id': field.id})
            messages.success(request, "Field updated successfully!")
            return redirect('template_configure', pk=field.template.pk)
    else:
        form = TemplateFieldForm(instance=field)
    
    return render(request, 'templates/field_form.html', {'form': form, 'field': field, 'template': field.template})

@login_required
def template_field_delete(request, pk):
    field = get_object_or_404(TemplateField, pk=pk, template__created_by=request.user)
    template_pk = field.template.pk
    template_name = field.template.name
    field_name = field.name
    field_id = field.pk
    
    if request.method == 'POST':
        field.delete()
        
        # Log field deletion
        logger.info(f"Deleted field ID: {field_id}, Name: {field_name} from template {template_pk} ({template_name})")
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'status': 'success'})
        messages.success(request, "Field deleted successfully!")
        return redirect('template_configure', pk=template_pk)
    
    return render(request, 'templates/field_delete.html', {'field': field})

@login_required
def template_update_status(request, pk):
    """API endpoint to update template status"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    template = get_object_or_404(Template, pk=pk, created_by=request.user)
    
    try:
        data = json.loads(request.body)
        new_status = data.get('status')
        
        if new_status not in ['draft', 'active', 'archived']:
            return JsonResponse({'error': 'Invalid status value'}, status=400)
        
        template.status = new_status
        template.save()
        
        return JsonResponse({
            'status': 'success',
            'template_status': template.status,
            'template_id': template.id
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def template_field_api(request, template_pk, pk):
    """API endpoint to get field data for AJAX requests"""
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    field = get_object_or_404(TemplateField, pk=pk, template=template)
    
    data = {
        'id': field.id,
        'name': field.name,
        'custom_name': field.custom_name or '',
        'page': field.page,
        'x': field.x,
        'y': field.y,
        'x1': field.x1,
        'y1': field.y1,
        'extracted_text': getattr(field, 'extracted_text', ''),
        'ocr_required': getattr(field, 'ocr_required', False),
        'python_function': getattr(field, 'python_function', None).id if hasattr(field, 'python_function') and field.python_function else None,
        'is_table': getattr(field, 'is_table', False),
        'table_settings': getattr(field, 'table_settings', None),
        'table_drawn_cells': getattr(field, 'table_drawn_cells', None),
        'line_points': getattr(field, 'line_points', None)
    }
    
    return JsonResponse(data)

@login_required
def extract_tables_api(request, pk):
    """API endpoint to extract tables from a PDF page"""
    print(f"Received request to extract tables for template {pk}, method: {request.method}")
    
    # For debugging
    print(f"Request headers: {request.headers}")
    print(f"Request body: {request.body}")
    
    template = get_object_or_404(Template, pk=pk, created_by=request.user)
    
    if request.method != 'POST':
        print(f"Method not allowed: {request.method}")
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    try:
        # If body is empty, return error
        if not request.body:
            print("Request body is empty")
            return JsonResponse({'error': 'Request body is empty'}, status=400)
        
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            return JsonResponse({'error': f'Invalid JSON: {str(e)}'}, status=400)
        
        print(f"Parsed data: {data}")
        
        page_num = data.get('page', 1)
        print(f"Page number: {page_num}")
        
        # Get coordinates if provided (for clip area)
        x0 = data.get('x0')
        y0 = data.get('y0')
        x1 = data.get('x1')
        y1 = data.get('y1')
        clip = None
        if all(coord is not None for coord in [x0, y0, x1, y1]):
            clip = (x0, y0, x1, y1)
            print(f"Clip area: {clip}")
        
        # Get table settings
        settings = data.get('settings', {})
        print(f"Table settings: {settings}")
        
        # Check if line points are provided
        line_points = data.get('line_points', None)
        print(f"Line points: {line_points}")
        
        # Open the PDF file using PyMuPDF
        pdf_path = template.pdf_file.path
        print(f"PDF path: {pdf_path}")
        
        if not os.path.exists(pdf_path):
            print(f"PDF file not found: {pdf_path}")
            return JsonResponse({'error': 'PDF file not found'}, status=404)
        
        doc = fitz.open(pdf_path)
        
        if page_num < 1 or page_num > len(doc):
            print(f"Invalid page number: {page_num}, PDF has {len(doc)} pages")
            return JsonResponse({'error': f'Invalid page number. PDF has {len(doc)} pages.'}, status=400)
        
        # Use 0-based index for PyMuPDF
        page = doc[page_num - 1]
        
        # If line_points are provided, we need to draw them on the page
        # since external_lines is not supported in this version
        if line_points and len(line_points) > 0:
            print(f"Using {len(line_points)} line points for table extraction")
            
            # Create a temporary copy of the page to draw lines on
            temp_doc = fitz.open()
            temp_page = temp_doc.new_page(width=page.rect.width, height=page.rect.height)
            
            # Copy content from original page to temporary page
            temp_page.show_pdf_page(temp_page.rect, doc, page_num - 1)
            
            # Draw lines on the temporary page
            for point in line_points:
                if len(point) == 4:  # [x1, y1, x2, y2]
                    x1, y1, x2, y2 = point
                    # Draw the line with a thick stroke for better detection
                    temp_page.draw_line((x1, y1), (x2, y2), color=(0, 0, 0), width=2.0)
            
            print("Lines drawn on temporary page")
            
            # Now find tables on the temporary page with the drawn lines
            tables_finder = temp_page.find_tables(
                clip=clip, 
                strategy=settings.get('strategy', 'lines_strict'),
                horizontal_strategy=settings.get('horizontal_strategy', 'lines_strict'),
                vertical_strategy=settings.get('vertical_strategy', 'lines_strict'),
                snap_tolerance=settings.get('snap_tolerance', 3),
                snap_x_tolerance=settings.get('snap_x_tolerance', 3),
                snap_y_tolerance=settings.get('snap_y_tolerance', 3),
                join_tolerance=settings.get('join_tolerance', 3),
                join_x_tolerance=settings.get('join_x_tolerance', 3),
                join_y_tolerance=settings.get('join_y_tolerance', 3),
                edge_min_length=settings.get('edge_min_length', 3),
                min_words_vertical=settings.get('min_words_vertical', 3),
                min_words_horizontal=settings.get('min_words_horizontal', 1),
                intersection_tolerance=settings.get('intersection_tolerance', 3),
                intersection_x_tolerance=settings.get('intersection_x_tolerance', 3),
                intersection_y_tolerance=settings.get('intersection_y_tolerance', 3),
                text_tolerance=settings.get('text_tolerance', 3),
                text_x_tolerance=settings.get('text_x_tolerance', 3),
                text_y_tolerance=settings.get('text_y_tolerance', 3)
            )
            
            # We need to extract text content for the tables from the original page
            # because the temporary page might not have the text information
            original_page = page
        else:
            print("No line points provided, using standard find_tables")
            # Standard find_tables call without external_lines
            tables_finder = page.find_tables(
                clip=clip, 
                strategy=settings.get('strategy', 'lines_strict'),
                horizontal_strategy=settings.get('horizontal_strategy', 'lines_strict'),
                vertical_strategy=settings.get('vertical_strategy', 'lines_strict'),
                snap_tolerance=settings.get('snap_tolerance', 3),
                snap_x_tolerance=settings.get('snap_x_tolerance', 3),
                snap_y_tolerance=settings.get('snap_y_tolerance', 3),
                join_tolerance=settings.get('join_tolerance', 3),
                join_x_tolerance=settings.get('join_x_tolerance', 3),
                join_y_tolerance=settings.get('join_y_tolerance', 3),
                edge_min_length=settings.get('edge_min_length', 3),
                min_words_vertical=settings.get('min_words_vertical', 3),
                min_words_horizontal=settings.get('min_words_horizontal', 1),
                intersection_tolerance=settings.get('intersection_tolerance', 3),
                intersection_x_tolerance=settings.get('intersection_x_tolerance', 3),
                intersection_y_tolerance=settings.get('intersection_y_tolerance', 3),
                text_tolerance=settings.get('text_tolerance', 3),
                text_x_tolerance=settings.get('text_x_tolerance', 3),
                text_y_tolerance=settings.get('text_y_tolerance', 3)
            )
            original_page = page
        
        # Convert tables to a serializable format
        tables_data = []
        for table in tables_finder:
            # Use the built-in extract method to get table content directly
            try:
                table_content = table.extract()
            except Exception as extract_error:
                print(f"Error extracting table content: {extract_error}")
                table_content = []
            
            # Inspect all attributes of the table object
            print("Available table attributes:", [attr for attr in dir(table) if not attr.startswith('__')])
            
            # Try to get additional potential attributes that might help with drawing
            for attr_name in ['rect', 'horizontal_lines', 'vertical_lines', 'grid_lines', 'borders', 'columns', 'spans']:
                if hasattr(table, attr_name):
                    attr_value = getattr(table, attr_name)
                    print(f"Table.{attr_name}:", attr_value)
                    
            print("table bbox: ", table.bbox)
            
            # Add table information
            if hasattr(table, 'rows'):
                print(f"Table has {len(table.rows)} TableRow objects")
                if len(table.rows) > 0:
                    first_row = table.rows[0]
                    print("First row bbox:", first_row.bbox if hasattr(first_row, 'bbox') else "No bbox")
                    print("First row cells:", len(first_row.cells) if hasattr(first_row, 'cells') else "No cells")
                    
                    if hasattr(first_row, 'cells') and len(first_row.cells) > 0:
                        first_cell = first_row.cells[0]
                        print("First cell in first row bbox:", first_cell.bbox if hasattr(first_cell, 'bbox') else "No bbox")
            else:
                print("Table has no TableRow objects")
                
            # Check for rows_positions and cols_positions
            if hasattr(table, 'rows_positions'):
                print("rows_positions:", table.rows_positions)
            else:
                print("No rows_positions attribute")
                
            if hasattr(table, 'cols_positions'):
                print("cols_positions:", table.cols_positions)
            else:
                print("No cols_positions attribute")
                
            # Check for cells array
            if hasattr(table, 'cells'):
                print(f"Table has cells array with {len(table.cells)} rows")
                if len(table.cells) > 0:
                    print(f"First row of cells has {len(table.cells[0]) if len(table.cells) > 0 and hasattr(table.cells[0], '__len__') else 'unknown'} cells")
            else:
                print("No cells array found")
            
            tables_data.append({
                'bbox': list(table.bbox),  # Convert tuple to list for JSON serialization
                'rows': table_content,
                'row_count': table.row_count,
                'col_count': table.col_count,
                'has_header': table.header.external if hasattr(table.header, 'external') else False,
                'rows_positions': table.rows_positions if hasattr(table, 'rows_positions') else None,
                'cols_positions': table.cols_positions if hasattr(table, 'cols_positions') else None,
                'cells': [[{'bbox': list(cell.bbox) if hasattr(cell, 'bbox') and cell.bbox else None} 
                          for cell in row if hasattr(cell, '__iter__')] 
                          for row in table.cells] if hasattr(table, 'cells') else None,
                # Include TableRow objects info from table.rows property with detailed cell information
                'table_rows': [
                    {
                        'bbox': list(row.bbox) if hasattr(row, 'bbox') and row.bbox else None,
                        'cells': [
                            {
                                'bbox': list(cell) if cell is not None else []
                            } 
                            for cell in row.cells
                        ] if hasattr(row, 'cells') else []
                    } 
                    for row in table.rows
                ] if hasattr(table, 'rows') else None
            })
        
        print(f"Found {len(tables_data)} tables")
        
        # Clean up temporary document if it was created
        if 'temp_doc' in locals():
            temp_doc.close()
        
        response_data = {
            'tables': tables_data,
            'count': len(tables_data)
        }
        
        return JsonResponse(response_data)
    
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return JsonResponse({'error': f'Invalid JSON: {str(e)}'}, status=400)
    except Exception as e:
        print(f"Exception during table extraction: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)
    finally:
        if 'doc' in locals():
            doc.close()

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
def extract_pdf_images(request, template_pk):
    """Extract images from the first and last page of a PDF file"""
    import fitz  # PyMuPDF
    import base64
    from io import BytesIO
    
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    
    if not template.pdf_file:
        return JsonResponse({'error': 'No PDF file available'}, status=400)
    
    pdf_path = os.path.join(settings.MEDIA_ROOT, template.pdf_file.name)
    
    try:
        # Open the PDF document
        doc = fitz.open(pdf_path)
        
        images = []
        pages_to_process = []
        
        # Always process the first page
        pages_to_process.append(0)
        
        # Process the last page if it's different from the first page
        if doc.page_count > 1:
            pages_to_process.append(doc.page_count - 1)
        
        # Extract images from selected pages
        for page_num in pages_to_process:
            page = doc[page_num]
            
            # Get images from the page
            image_list = page.get_images(full=True)
            
            # Process each image
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Convert image to base64
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                
                # Add the image to our collection
                images.append({
                    'page': page_num + 1,  # 1-indexed for display
                    'index': img_index,
                    'format': image_ext,
                    'base64': f'data:image/{image_ext};base64,{base64_image}',
                    'width': base_image.get('width', 0),
                    'height': base_image.get('height', 0),
                })
        
        return JsonResponse({
            'success': True,
            'images': images,
            'total_pages': doc.page_count
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def save_template_image(request, template_pk):
    """Save a selected image to the database"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['image_data', 'name', 'page', 'format', 'width', 'height']
        for field in required_fields:
            if field not in data:
                logger.warning(f"Missing required field '{field}' when saving image for template {template_pk}")
                return JsonResponse({'error': f'Missing required field: {field}'}, status=400)
        
        # Check if an image with this name already exists for this template
        existing_image = TemplateImage.objects.filter(template=template, name=data['name']).first()
        if existing_image:
            # Update the existing image
            existing_image.image_data = data['image_data']
            existing_image.page = data['page']
            existing_image.format = data['format']
            existing_image.width = data['width']
            existing_image.height = data['height']
            existing_image.is_logo = data.get('is_logo', False)
            existing_image.is_signature = data.get('is_signature', False)
            existing_image.save()
            
            image_type = "logo" if existing_image.is_logo else "signature" if existing_image.is_signature else "standard"
            logger.info(f"Updated {image_type} image for template {template_pk} - Image ID: {existing_image.id}, "
                       f"Name: {existing_image.name}, Page: {existing_image.page}, "
                       f"Size: {existing_image.width}x{existing_image.height}")
            
            return JsonResponse({
                'success': True,
                'message': 'Image updated successfully',
                'image_id': existing_image.id
            })
        else:
            # Create a new image
            new_image = TemplateImage(
                template=template,
                name=data['name'],
                page=data['page'],
                image_data=data['image_data'],
                format=data['format'],
                width=data['width'],
                height=data['height'],
                is_logo=data.get('is_logo', False),
                is_signature=data.get('is_signature', False)
            )
            new_image.save()
            
            image_type = "logo" if new_image.is_logo else "signature" if new_image.is_signature else "standard"
            logger.info(f"Created new {image_type} image for template {template_pk} - Image ID: {new_image.id}, "
                       f"Name: {new_image.name}, Page: {new_image.page}, "
                       f"Size: {new_image.width}x{new_image.height}")
            
            return JsonResponse({
                'success': True,
                'message': 'Image saved successfully',
                'image_id': new_image.id
            })
            
    except json.JSONDecodeError:
        logger.warning(f"Invalid JSON received when saving image for template {template_pk}")
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.error(f"Error saving image for template {template_pk}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def get_template_images(request, template_pk):
    """Get all images for a template"""
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    
    images = TemplateImage.objects.filter(template=template)
    
    image_list = []
    for img in images:
        image_list.append({
            'id': img.id,
            'name': img.name,
            'page': img.page,
            'image_data': img.image_data,
            'format': img.format,
            'width': img.width,
            'height': img.height,
            'is_logo': img.is_logo,
            'is_signature': img.is_signature,
            'created_at': img.created_at.isoformat()
        })
    
    return JsonResponse({
        'success': True,
        'images': image_list
    })

@login_required
def delete_template_image(request, template_pk, image_id):
    """Delete a saved image"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    image = get_object_or_404(TemplateImage, pk=image_id, template=template)
    
    try:
        image_name = image.name
        image_id = image.id
        image_type = "logo" if image.is_logo else "signature" if image.is_signature else "standard"
        
        image.delete()
        
        logger.info(f"Deleted {image_type} image from template {template_pk} - Image ID: {image_id}, Name: {image_name}")
        
        return JsonResponse({
            'success': True,
            'message': 'Image deleted successfully',
        })
    except Exception as e:
        logger.error(f"Error deleting image {image_id} from template {template_pk}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

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

@login_required
def template_page_position_api(request, template_pk, position_id=None):
    """API for template page positions"""
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    
    # Create a new position
    if request.method == 'POST' and position_id == 'new':
        try:
            data = json.loads(request.body)
            position = data.get('position')
            delta = data.get('delta', 0)
            page_number = data.get('page_number')
            
            if position not in ['first', 'last', 'custom']:
                logger.warning(f"Invalid position value '{position}' for template {template_pk}")
                return JsonResponse({'error': 'Invalid position value'}, status=400)
            
            if position == 'custom' and not page_number:
                logger.warning(f"Missing page number for custom position for template {template_pk}")
                return JsonResponse({'error': 'Page number is required for custom positions'}, status=400)
            
            page_position = TemplatePagePosition.objects.create(
                template=template,
                position=position,
                delta=delta,
                page_number=page_number if position == 'custom' else None
            )
            
            logger.info(f"Created page position for template {template_pk} - "
                      f"Position ID: {page_position.id}, Type: {position}, "
                      f"Delta: {delta}" + (f", Page: {page_number}" if position == 'custom' else ""))
            
            return JsonResponse({
                'id': page_position.id,
                'message': 'Position created successfully'
            })
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON for new page position for template {template_pk}")
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            logger.error(f"Error creating page position for template {template_pk}: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    # Update an existing position
    elif request.method == 'POST' and position_id:
        try:
            page_position = get_object_or_404(TemplatePagePosition, pk=position_id, template=template)
            data = json.loads(request.body)
            
            # Store old values for logging
            old_position = page_position.position
            old_delta = page_position.delta
            old_page = page_position.page_number
            
            # Update fields
            page_position.position = data.get('position', page_position.position)
            page_position.delta = data.get('delta', page_position.delta)
            
            if page_position.position == 'custom':
                page_position.page_number = data.get('page_number')
                if not page_position.page_number:
                    logger.warning(f"Missing page number for custom position update for template {template_pk}")
                    return JsonResponse({'error': 'Page number is required for custom positions'}, status=400)
            else:
                page_position.page_number = None
            
            page_position.save()
            
            logger.info(f"Updated page position {position_id} for template {template_pk} - "
                      f"Position changed: {old_position} → {page_position.position}, "
                      f"Delta changed: {old_delta} → {page_position.delta}" + 
                      (f", Page changed: {old_page} → {page_position.page_number}" 
                       if page_position.position == 'custom' or old_position == 'custom' else ""))
            
            return JsonResponse({
                'id': page_position.id,
                'message': 'Position updated successfully'
            })
        except TemplatePagePosition.DoesNotExist:
            logger.warning(f"Page position {position_id} not found for template {template_pk}")
            return JsonResponse({'error': 'Position not found'}, status=404)
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON for updating page position {position_id} for template {template_pk}")
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            logger.error(f"Error updating page position {position_id} for template {template_pk}: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    # Delete a position
    elif request.method == 'DELETE' and position_id:
        try:
            page_position = get_object_or_404(TemplatePagePosition, pk=position_id, template=template)
            position_type = page_position.position
            delta = page_position.delta
            page = page_position.page_number
            
            page_position.delete()
            
            logger.info(f"Deleted page position {position_id} from template {template_pk} - "
                      f"Type: {position_type}, Delta: {delta}" + 
                      (f", Page: {page}" if position_type == 'custom' else ""))
            
            return JsonResponse({
                'message': 'Position deleted successfully'
            })
        except TemplatePagePosition.DoesNotExist:
            logger.warning(f"Page position {position_id} not found for template {template_pk} during deletion")
            return JsonResponse({'error': 'Position not found'}, status=404)
        except Exception as e:
            logger.error(f"Error deleting page position {position_id} for template {template_pk}: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)  
