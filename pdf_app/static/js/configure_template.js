// Set the PDF.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', function() {
    // PDF viewer
    const pdfContainer = document.getElementById('pdf-container');
    const pageInput = document.getElementById('page-input');
    const pageCount = document.getElementById('page-count');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelEl = document.getElementById('zoom-level');
    const pageResolutionEl = document.getElementById('page-resolution');
    const loadingStatus = document.getElementById('loading-status');
    const pdfLoading = document.getElementById('pdf-loading');
    
    // Field form elements
    const inlineFieldForm = document.getElementById('inline-field-form');
    const inlineFormTitle = document.getElementById('inline-form-title');
    const closeInlineFormBtn = document.getElementById('close-inline-form-btn');
    const fieldForm = document.getElementById('field-form');
    const fieldIdInput = document.getElementById('field-id');
    const fieldNameInput = document.getElementById('field-name');
    const customNameEnabled = document.getElementById('custom-name-enabled');
    const customNameContainer = document.getElementById('custom-name-container');
    const customNameInput = document.getElementById('custom-name');
    const fieldPageInput = document.getElementById('field-page');
    const fieldXInput = document.getElementById('field-x');
    const fieldYInput = document.getElementById('field-y');
    const fieldX1Input = document.getElementById('field-x1');
    const fieldY1Input = document.getElementById('field-y1');
    const selectAreaBtn = document.getElementById('select-area-btn');
    const saveFieldBtn = document.getElementById('save-field-btn');
    const cancelFieldBtn = document.getElementById('cancel-field-btn');
    const addFieldBtn = document.getElementById('add-field-btn');
    const extractedTextContainer = document.getElementById('extracted-text-container');
    const extractedTextEl = document.getElementById('extracted-text');
    const extractedTextInput = document.getElementById('extracted-text-input');
    const ocrRequiredInput = document.getElementById('ocr-required');
    const tableControls = document.getElementById('table-controls');
    
    // PDF.js variables
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.0;
    let pdfRendering = false;
    
    // Expose variables to window for access by other scripts
    window.pdfDoc = pdfDoc;
    window.currentPage = currentPage;
    window.scale = scale;
    
    // Field selection variables
    let isSelecting = false;
    let selectionStart = null;
    let currentSelection = null;
    let selectionOverlay = null;
    let editingField = null;
    
    // Expose selection variables to window
    window.selectionOverlay = selectionOverlay;
    window.currentSelection = currentSelection;
    
    // Variables for storing configuration data
    let configData = {
        fields: [],
        tables: [],
        python_functions: []
    };
    
    // When first page is rendered, capture dimensions
    const updatePageDimensions = async (page) => {
        if (page && page.pageNumber === 1) {
            try {
                const viewport = page.getViewport({ scale: 1.0 });
                const width = viewport.width;
                const height = viewport.height;
                
                // Display dimensions in dedicated element
                const dimensionsEl = document.getElementById('page-dimensions');
                if (dimensionsEl) {
                    dimensionsEl.textContent = `Page dimensions: ${width.toFixed(2)}×${height.toFixed(2)} pts`;
                }
                
                // Save dimensions to the template
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                const templateId = pathParts[pathParts.length - 2];
                
                // Only save if dimensions are not already set
                const response = await fetch(`/templates/${templateId}/dimensions/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        width: width,
                        height: height
                    })
                });
                
                // No need to handle response - this is a background update
            } catch (err) {
                console.error('Error saving page dimensions:', err);
            }
        }
    };
    
    // Load PDF document
    const loadPDF = async () => {
        try {
            // Show loading indicator
            pdfLoading.classList.remove('hidden');
            loadingStatus.textContent = 'Loading PDF...';
            
            // Get template ID from URL path - fixes incorrect template ID extraction
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            // URL format is /templates/{id}/configure/ so we need the {id}
            const templateId = pathParts[pathParts.length - 2];
            
            // Check if we have authentication before loading PDF
            const pdfUrl = `/templates/${templateId}/pdf/`;
            
            // Try to fetch PDF metadata first to check authentication
            const response = await fetch(pdfUrl, {
                method: 'HEAD',
                credentials: 'include'
            });
            
            if (response.redirected || response.status === 401 || response.status === 403) {
                // Authentication issue - redirect to login page
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            if (response.status === 404) {
                loadingStatus.textContent = 'Error: PDF file not found';
                pdfLoading.classList.add('hidden');
                return;
            }
            
            // Load the PDF now that we've verified access
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            pdfDoc = await loadingTask.promise;
            window.pdfDoc = pdfDoc;
            
            pageCount.textContent = pdfDoc.numPages;
            
            // Get first page to determine original page dimensions
            const firstPage = await pdfDoc.getPage(1);
            const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
            
            // Store the original dimensions for use across all zoom levels
            if (pageResolutionEl) {
                pageResolutionEl.textContent = `${Math.round(unscaledViewport.width)} × ${Math.round(unscaledViewport.height)}`;
            }
            
            // After PDF is loaded, render the first page
            await renderPage(currentPage);
            
            loadingStatus.textContent = 'PDF loaded successfully';
            
            // Make sure loading indicator is hidden
            pdfLoading.classList.add('hidden');
            
            // Render field overlays after PDF is loaded
            renderFieldOverlays();
        } catch (error) {
            console.error('Error loading PDF:', error);
            
            // Handle specific PDF.js errors
            if (error.name === 'MissingPDFException') {
                loadingStatus.textContent = 'Error: PDF file not found or inaccessible';
            } else {
                loadingStatus.textContent = 'Error loading PDF: ' + error.message;
            }
            
            pdfLoading.classList.add('hidden');
        }
    };
    
    // Render PDF page
    const renderPage = async (pageNum) => {
        if (pdfRendering) return;
        
        pdfRendering = true;
        
        try {
            // Get page
            const page = await pdfDoc.getPage(pageNum);
            
            // Call updatePageDimensions for first page
            if (pageNum === 1) {
                await updatePageDimensions(page);
            }
            
            // Update page number input and display
            pageInput.value = pageNum;
            currentPage = pageNum;
            window.currentPage = pageNum;
            
            // Calculate viewport with scale
            const viewport = page.getViewport({ scale });
            
            // Create a canvas for the page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Create a wrapper div for the canvas with the page number as ID
            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.id = `page-${pageNum}`;
            pageDiv.style.position = 'relative';
            pageDiv.appendChild(canvas);
            
            // Clear all pages from the container
            pdfContainer.innerHTML = '';
            
            // Add the page to the container
            pdfContainer.appendChild(pageDiv);
            
            // Render the page
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Update current page display
            document.getElementById('page-input').value = pageNum;
            currentPage = pageNum;
            
            // Update buttons state
            prevPageBtn.disabled = pageNum <= 1;
            nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
            
            // Render field overlays for this page
            renderFieldOverlays();
            
            // Make sure loading indicator is hidden
            pdfLoading.classList.add('hidden');
            loadingStatus.textContent = 'PDF loaded successfully';
            
            await updatePageDimensions(page);
            
            pdfRendering = false;
        } catch (error) {
            console.error('Error rendering page:', error);
            pdfRendering = false;
            pdfLoading.classList.add('hidden');
        }
    };
    
    // Render field overlays
    const renderFieldOverlays = () => {
        // Remove existing overlays
        document.querySelectorAll('.field-overlay').forEach(overlay => overlay.remove());
        
        // Get fields for current page
        const fields = Array.from(document.querySelectorAll('.field-item'))
            .filter(item => {
                // Find the span containing "Page:" text
                const spans = Array.from(item.querySelectorAll('.text-gray-500'));
                const pageSpan = spans.find(span => span.textContent.includes('Page:'));
                if (!pageSpan) return false;
                
                const fieldPage = parseInt(pageSpan.nextSibling.textContent.trim());
                return fieldPage === currentPage;
            });
        
        fields.forEach(field => {
            const fieldId = field.dataset.fieldId;
            const fieldName = field.querySelector('h3').textContent;
            
            // Extract coordinates using the same approach
            const spans = Array.from(field.querySelectorAll('.text-gray-500'));
            const positionSpan = spans.find(span => span.textContent.includes('Position:'));
            const sizeSpan = spans.find(span => span.textContent.includes('Size:'));
            
            if (!positionSpan || !sizeSpan) return;
            
            const positionText = positionSpan.nextSibling.textContent.trim();
            const sizeText = sizeSpan.nextSibling.textContent.trim();
            
            const [x, y] = positionText.replace(/[()]/g, '').split(',').map(coord => parseFloat(coord.trim()));
            const [width, height] = sizeText.split('x').map(dim => parseFloat(dim.trim()));
            
            // Create overlay
            createFieldOverlay(fieldId, fieldName, x, y, width, height);
        });
    };
    
    // Create a field overlay
    const createFieldOverlay = (fieldId, fieldName, x, y, width, height) => {
        const pageCanvas = document.querySelector(`#page-${currentPage} canvas`);
        if (!pageCanvas) return;
        
        const pageDiv = document.getElementById(`page-${currentPage}`);
        const overlay = document.createElement('div');
        overlay.className = 'field-overlay';
        overlay.dataset.fieldId = fieldId;
        
        // Apply current scale to position the overlay correctly
        overlay.style.left = `${x * scale}px`;
        overlay.style.top = `${y * scale}px`;
        overlay.style.width = `${width * scale}px`;
        overlay.style.height = `${height * scale}px`;
        
        // Add field name label
        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = fieldName;
        overlay.appendChild(label);
        
        // Add click handler to highlight and open edit form
        overlay.addEventListener('click', () => {
            document.querySelectorAll('.field-overlay').forEach(o => o.classList.remove('active'));
            overlay.classList.add('active');
            
            // Open edit form
            const fieldItem = document.querySelector(`.field-item[data-field-id="${fieldId}"]`);
            if (fieldItem) {
                const editBtn = fieldItem.querySelector('.edit-field-btn');
                if (editBtn) editBtn.click();
            }
        });
        
        pageDiv.appendChild(overlay);
    };
    
    // Handle area selection for field
    const startAreaSelection = () => {
        // Completely reset the selection state
        isSelecting = true;
        
        // Don't preset any coordinates, let them be determined by user clicks
        selectionStart = null;
        currentSelection = null;
        
        // Remove any existing event listeners to prevent duplicates
        const pageElement = document.getElementById(`page-${currentPage}`);
        pageElement.removeEventListener('mousedown', handleMouseDown);
        pageElement.removeEventListener('mousemove', handleMouseMove);
        pageElement.removeEventListener('mouseup', handleMouseUp);
        
        // Remove existing selection overlay if it exists to start fresh
        if (selectionOverlay) {
            selectionOverlay.remove();
            selectionOverlay = null;
            window.selectionOverlay = null;
        }
        
        // Create a brand new selection overlay
        selectionOverlay = document.createElement('div');
        window.selectionOverlay = selectionOverlay;
        selectionOverlay.className = 'selection-overlay';
        selectionOverlay.style.display = 'none'; // Hide until user clicks
        document.getElementById(`page-${currentPage}`).appendChild(selectionOverlay);
        
        // Set page in the form
        fieldPageInput.value = currentPage;
        
        // Add mouse event listeners
        pageElement.addEventListener('mousedown', handleMouseDown);
        pageElement.addEventListener('mousemove', handleMouseMove);
        pageElement.addEventListener('mouseup', handleMouseUp);
        
        // Show instructions
        loadingStatus.textContent = 'Click and drag to select an area';
    };
    
    const handleMouseDown = (e) => {
        if (!isSelecting) return;
        
        // Get the mouse position relative to the element
        const rect = e.target.getBoundingClientRect();
        selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Initialize currentSelection with the start point
        currentSelection = {
            startX: selectionStart.x,
            startY: selectionStart.y,
            endX: selectionStart.x,
            endY: selectionStart.y
        };
        window.currentSelection = currentSelection;
        
        // Position the overlay exactly at the starting point with zero size
        selectionOverlay.style.left = `${selectionStart.x}px`;
        selectionOverlay.style.top = `${selectionStart.y}px`;
        selectionOverlay.style.width = '0px';
        selectionOverlay.style.height = '0px';
        selectionOverlay.style.display = 'block';
    };
    
    const handleMouseMove = (e) => {
        if (!isSelecting || !selectionStart || !selectionOverlay || !currentSelection) return;
        
        const rect = e.target.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update the end coordinates
        currentSelection.endX = mouseX;
        currentSelection.endY = mouseY;
        window.currentSelection = currentSelection;
        
        // Calculate the rectangle coordinates
        const left = Math.min(currentSelection.startX, currentSelection.endX);
        const top = Math.min(currentSelection.startY, currentSelection.endY);
        const width = Math.abs(currentSelection.endX - currentSelection.startX);
        const height = Math.abs(currentSelection.endY - currentSelection.startY);
        
        // Update overlay position and size
        selectionOverlay.style.left = `${left}px`;
        selectionOverlay.style.top = `${top}px`;
        selectionOverlay.style.width = `${width}px`;
        selectionOverlay.style.height = `${height}px`;
    };
    
    const handleMouseUp = async (e) => {
        if (!isSelecting || !currentSelection) return;
        
        // Cleanup event listeners
        const pageElement = document.getElementById(`page-${currentPage}`);
        pageElement.removeEventListener('mousedown', handleMouseDown);
        pageElement.removeEventListener('mousemove', handleMouseMove);
        pageElement.removeEventListener('mouseup', handleMouseUp);
        
        // Calculate the final rectangle coordinates
        const x = Math.min(currentSelection.startX, currentSelection.endX);
        const y = Math.min(currentSelection.startY, currentSelection.endY);
        const width = Math.abs(currentSelection.endX - currentSelection.startX);
        const height = Math.abs(currentSelection.endY - currentSelection.startY);
        
        // Store the coordinates normalized to 1.0 scale (for backend processing)
        const normalizedSelection = {
            x: x / scale,
            y: y / scale,
            x1: width / scale,
            y1: height / scale
        };
        
        // Update form with the normalized values (at 1.0 scale)
        fieldXInput.value = normalizedSelection.x.toFixed(2);
        fieldYInput.value = normalizedSelection.y.toFixed(2);
        fieldX1Input.value = normalizedSelection.x1.toFixed(2);
        fieldY1Input.value = normalizedSelection.y1.toFixed(2);
        
        // Extract text from the selected area using normalized coordinates
        await extractTextFromArea(normalizedSelection);
        
        // Show form after selection
        inlineFieldForm.classList.remove('hidden');
        isSelecting = false;
        
        // Completely reset selection state
        selectionStart = null;
        currentSelection = null;
        window.currentSelection = null;
        
        loadingStatus.textContent = 'Area selected';
        
        // Hide selection overlay after form is shown
        if (selectionOverlay) {
            selectionOverlay.style.display = 'none';
        }
    };
    
    // Extract text from selected area
    const extractTextFromArea = async (selection) => {
        try {
            // Get template ID from URL path, using same logic as loadPDF
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const templateId = pathParts[pathParts.length - 2];
            
            // Send the normalized coordinates (at 1.0 scale) to the backend
            const response = await fetch(`/templates/${templateId}/extract-text/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    x: selection.x,
                    y: selection.y,
                    x1: selection.x + selection.x1,
                    y1: selection.y + selection.y1,
                    page: currentPage
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.text) {
                extractedTextContainer.classList.remove('hidden');
                extractedTextEl.textContent = data.text;
                extractedTextInput.value = data.text;
            } else {
                extractedTextContainer.classList.add('hidden');
                extractedTextEl.textContent = '';
                extractedTextInput.value = '';
            }
        } catch (error) {
            console.error('Error extracting text:', error);
            extractedTextContainer.classList.add('hidden');
        }
    };
    
    // Load configuration data
    async function loadConfigurationData() {
        try {
            // Get template ID from URL path
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const templateId = pathParts[pathParts.length - 2];
            
            // Fetch configuration data
            const response = await fetch(`/templates/${templateId}/get-configuration-data/`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                console.error('Failed to load configuration data');
                return Promise.reject('Failed to load configuration data');
            }
            
            const data = await response.json();
            
            // Store data in global variable for later use
            configData = data;
            
            // Get the field name select element
            const fieldNameSelect = document.getElementById('field-name');
            
            // Completely clear the select element
            fieldNameSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select a field --';
            fieldNameSelect.appendChild(defaultOption);
            
            // Get all existing field names from the DOM
            const existingFieldNames = Array.from(document.querySelectorAll('.field-item h3'))
                .map(el => el.textContent.trim());
            
            // Get current editing field name (if any)
            const currentFieldId = fieldIdInput.value;
            let currentFieldName = '';
            
            if (currentFieldId) {
                const currentFieldElement = document.querySelector(`.field-item[data-field-id="${currentFieldId}"] h3`);
                if (currentFieldElement) {
                    currentFieldName = currentFieldElement.textContent.trim();
                }
            }
            
            // Add fields group
            if (data.fields && data.fields.length > 0) {
                const fieldsGroup = document.createElement('optgroup');
                fieldsGroup.label = 'Fields';
                
                data.fields.forEach(field => {
                    const option = document.createElement('option');
                    option.value = field.name;
                    option.textContent = field.name + (field.field_type ? ` (${field.field_type})` : '');
                    
                    // Disable the option if this field name is already used
                    // but allow the current field to keep its name
                    if (existingFieldNames.includes(field.name) && field.name !== currentFieldName) {
                        option.disabled = true;
                        option.textContent += ' - Already Added';
                        option.style.color = '#999';
                    }
                    
                    fieldsGroup.appendChild(option);
                });
                
                fieldNameSelect.appendChild(fieldsGroup);
            }
            
            // Add tables group
            if (data.tables && data.tables.length > 0) {
                const tablesGroup = document.createElement('optgroup');
                tablesGroup.label = 'Tables';
                
                data.tables.forEach(table => {
                    const option = document.createElement('option');
                    option.value = table.name;
                    option.textContent = table.name;
                    
                    // Disable the option if this table name is already used
                    // but allow the current field to keep its name
                    if (existingFieldNames.includes(table.name) && table.name !== currentFieldName) {
                        option.disabled = true;
                        option.textContent += ' - Already Added';
                        option.style.color = '#999';
                    }
                    
                    tablesGroup.appendChild(option);
                });
                
                fieldNameSelect.appendChild(tablesGroup);
            }
            
            // Populate Python functions dropdown
            const pythonFunctionSelect = document.getElementById('python-function');
            
            // Completely clear the select element
            pythonFunctionSelect.innerHTML = '';
            
            // Add default option
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = '-- None --';
            pythonFunctionSelect.appendChild(noneOption);
            
            // Add Python functions
            if (data.python_functions && data.python_functions.length > 0) {
                data.python_functions.forEach(func => {
                    const option = document.createElement('option');
                    // Ensure ID is a string for comparison in dropdown
                    option.value = String(func.id);
                    option.textContent = func.name;
                    if (func.description) {
                        option.title = func.description;
                    }
                    pythonFunctionSelect.appendChild(option);
                });
            }
            
            return Promise.resolve(); // Explicitly return a resolved promise
            
        } catch (error) {
            console.error('Error loading configuration data:', error);
            return Promise.reject(error);
        }
    }
    
    // Initialize
    loadPDF();
    loadConfigurationData();
    
    // Navigation controls
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            renderPage(currentPage - 1);
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < pdfDoc.numPages) {
            renderPage(currentPage + 1);
        }
    });
    
    // Page input control
    pageInput.addEventListener('change', () => {
        const pageNumber = parseInt(pageInput.value);
        if (!isNaN(pageNumber) && pageNumber >= 1 && pdfDoc && pageNumber <= pdfDoc.numPages) {
            renderPage(pageNumber);
        } else {
            // Reset to current page if invalid
            pageInput.value = currentPage;
        }
    });
    
    // Handle Enter key for page input
    pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pageNumber = parseInt(pageInput.value);
            if (!isNaN(pageNumber) && pageNumber >= 1 && pdfDoc && pageNumber <= pdfDoc.numPages) {
                renderPage(pageNumber);
            } else {
                // Reset to current page if invalid
                pageInput.value = currentPage;
            }
        }
    });
    
    // Zoom controls
    zoomInBtn.addEventListener('click', () => {
        scale += 0.25;
        window.scale = scale;
        zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
        renderPage(currentPage);
    });
    
    zoomOutBtn.addEventListener('click', () => {
        if (scale > 0.5) {
            scale -= 0.25;
            window.scale = scale;
            zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
            renderPage(currentPage);
        }
    });
    
    // Field form controls
    customNameEnabled.addEventListener('change', () => {
        customNameContainer.classList.toggle('hidden', !customNameEnabled.checked);
        
        // If custom name is enabled, focus on the custom name input
        if (customNameEnabled.checked) {
            setTimeout(() => customNameInput.focus(), 100);
        }
    });
    
    // Add field name change event listener to auto-check is_table
    fieldNameInput.addEventListener('change', () => {
        // Get selected field name
        const selectedFieldName = fieldNameInput.value;
        if (!selectedFieldName) return;
        
        // Check if selected field is a table using cached configData
        const isTable = configData.tables && configData.tables.some(table => table.name === selectedFieldName);
        
        // Update is_table checkbox and toggle table controls visibility
        const isTableField = document.getElementById('is-table-field');
        isTableField.checked = isTable;
        tableControls.classList.toggle('hidden', !isTableField.checked);
    });
    
    selectAreaBtn.addEventListener('click', startAreaSelection);
    
    // Form controls
    closeInlineFormBtn.addEventListener('click', () => {
        inlineFieldForm.classList.add('hidden');
        extractedTextContainer.classList.add('hidden');
        fieldForm.reset();
        fieldIdInput.value = '';
        extractedTextEl.textContent = '';
        extractedTextInput.value = '';
    });
    
    cancelFieldBtn.addEventListener('click', () => {
        inlineFieldForm.classList.add('hidden');
        extractedTextContainer.classList.add('hidden');
        fieldForm.reset();
        fieldIdInput.value = '';
        extractedTextEl.textContent = '';
        extractedTextInput.value = '';
    });
    
    // Refresh Python functions when returning from browse window
    window.addEventListener('focus', () => {
        // Only reload if the form is visible
        if (!inlineFieldForm.classList.contains('hidden')) {
            loadConfigurationData();
        }
    });
    
    // Add field button
    addFieldBtn.addEventListener('click', async () => {
        // Reset form for new field
        fieldForm.reset();
        fieldIdInput.value = '';
        customNameContainer.classList.add('hidden');
        extractedTextContainer.classList.add('hidden');
        fieldPageInput.value = currentPage;
        
        // Reload configuration data to update dropdown options
        await loadConfigurationData();
        
        // Reset Python function dropdown
        document.getElementById('python-function').selectedIndex = 0;
        
        // Scroll to the form
        inlineFieldForm.scrollIntoView({ behavior: 'smooth' });
        
        // Show form
        inlineFormTitle.textContent = 'Add Field';
        inlineFieldForm.classList.remove('hidden');
    });
}); 