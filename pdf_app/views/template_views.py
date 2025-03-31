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
from pdf_app.models import Template, TemplateField, Configuration, PythonFunction, Field, Table, TableColumn, TemplateImage
from pdf_app.forms import TemplateForm, TemplateFieldForm
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
            
            field.save()
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
                strategy=settings.get('strategy', 'lines'),
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
                strategy=settings.get('strategy', 'lines'),
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
            # Extract table content from the original page using the table's bbox
            # Get the same area from the original page
            table_rect = fitz.Rect(table.bbox)
            
            # Extract using the original content for better text accuracy
            words = original_page.get_text("words", clip=table_rect)
            
            # Organize words into rows and columns based on their positions
            table_content = []
            if words:
                # Sort words by their y-coordinate (to group by rows)
                words.sort(key=lambda w: w[3])  # Sort by y1 coordinate
                
                # Simple row detection (group words with similar y-coordinates)
                y_tolerance = 5  # pixels tolerance for same row
                current_y = words[0][3]
                current_row = []
                rows = []
                
                for word in words:
                    if abs(word[3] - current_y) > y_tolerance:
                        # New row detected
                        if current_row:
                            # Sort words in the row by x-coordinate
                            current_row.sort(key=lambda w: w[0])
                            rows.append(current_row)
                        current_row = [word]
                        current_y = word[3]
                    else:
                        current_row.append(word)
                
                # Don't forget the last row
                if current_row:
                    current_row.sort(key=lambda w: w[0])
                    rows.append(current_row)
                
                # Convert rows to text
                for row in rows:
                    row_text = [word[4] for word in row]
                    table_content.append(row_text)
            
            # If table_content is empty or couldn't be properly extracted,
            # fall back to the table's extract method
            if not table_content:
                try:
                    table_content = table.extract()
                except Exception as extract_error:
                    print(f"Error extracting table content: {extract_error}")
                    table_content = []
            
            # Add table information
            tables_data.append({
                'bbox': list(table.bbox),  # Convert tuple to list for JSON serialization
                'rows': table_content,
                'row_count': len(table_content),
                'col_count': len(table_content[0]) if table_content and len(table_content) > 0 else 0
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
            
            return JsonResponse({
                'success': True,
                'message': 'Image saved successfully',
                'image_id': new_image.id
            })
            
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
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
    """Delete a template image"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    template = get_object_or_404(Template, pk=template_pk, created_by=request.user)
    image = get_object_or_404(TemplateImage, pk=image_id, template=template)
    
    image.delete()
    
    return JsonResponse({
        'success': True,
        'message': 'Image deleted successfully'
    })

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
