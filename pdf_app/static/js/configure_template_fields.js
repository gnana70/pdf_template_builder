// Field editing and deletion functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const inlineFieldForm = document.getElementById('inline-field-form');
    const inlineFormTitle = document.getElementById('inline-form-title');
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
    const saveFieldBtn = document.getElementById('save-field-btn');
    const extractedTextContainer = document.getElementById('extracted-text-container');
    const extractedTextEl = document.getElementById('extracted-text');
    const extractedTextInput = document.getElementById('extracted-text-input');
    const ocrRequiredInput = document.getElementById('ocr-required');
    const loadingStatus = document.getElementById('loading-status');
    const isTableField = document.getElementById('is-table-field');
    const tableControls = document.getElementById('table-controls');
    
    // Track if a selection was made
    let userMadeSelection = false;
    
    // Variable to track table field saving
    let savingTableField = false;
    
    // Edit field buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-field-btn')) {
            const btn = e.target.closest('.edit-field-btn');
            const fieldId = btn.dataset.fieldId;
            editField(fieldId);
        }
    });
    
    // Delete field buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-field-btn')) {
            const btn = e.target.closest('.delete-field-btn');
            const fieldId = btn.dataset.fieldId;
            deleteField(fieldId);
        }
    });
    
    // Check if this is a table field and update the save button
    if (isTableField) {
        // Original save button text
        const originalSaveText = saveFieldBtn.textContent || "Save Field";
        
        isTableField.addEventListener('change', function() {
            if (this.checked) {
                // Auto-fill with page dimensions always when the checkbox is checked
                autoFillTableDimensions();
                
                // Update coordinate display if available
                if (typeof updateCoordinateDisplay === 'function') {
                    updateCoordinateDisplay();
                }
                
                // Make sure the dimensions are visible
                userMadeSelection = true;
                
                tableControls.classList.remove('hidden');
                
                // Update save button text for table fields
                saveFieldBtn.textContent = "Save Table & Configure";
                saveFieldBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            } else {
                tableControls.classList.add('hidden');
                
                // Restore original save button text
                saveFieldBtn.textContent = originalSaveText;
                saveFieldBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            }
        });
    }
    
    // Listen for changes in the field name dropdown
    if (fieldNameInput) {
        fieldNameInput.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const selectedText = selectedOption ? selectedOption.textContent : '';
            
            console.log(`Field selected: "${selectedText}"`);
            
            // Check if the selected field is a table field based on field type attribute
            const isTableField = selectedOption && (
                selectedOption.dataset.fieldType === 'table' || 
                selectedOption.textContent.toLowerCase().includes('table')
            );
            
            console.log(`Is this a table field? ${isTableField ? 'YES' : 'NO'}`);
            
            // If it's a table field, check the table checkbox and auto-fill dimensions
            if (isTableField && window.isTableField) {
                console.log("TABLE FIELD SELECTED: Auto-filling dimensions based on current page");
                
                // Check the table field checkbox
                window.isTableField.checked = true;
                console.log("Table checkbox checked automatically");
                
                // Make the table controls visible
                if (tableControls) {
                    tableControls.classList.remove('hidden');
                    console.log("Table controls are now visible");
                }
                
                // Update save button text if needed
                if (saveFieldBtn) {
                    saveFieldBtn.textContent = "Save Table & Configure";
                    saveFieldBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    console.log("Save button updated for table configuration");
                }
                
                // Make sure dimensions are visible
                userMadeSelection = true;
                
                // Auto-fill the table dimensions based on the current page
                autoFillTableDimensions();
                
                // Small delay to ensure values are set
                setTimeout(() => {
                    // Update coordinate display if available
                    if (typeof updateCoordinateDisplay === 'function') {
                        updateCoordinateDisplay();
                    }
                    console.log("Table coordinates updated and displayed");
                }, 50);
            }
        });
    }
    
    // Function to auto-fill table dimensions with page dimensions
    function autoFillTableDimensions() {
        // Make sure page field is set to current page
        if (window.currentPage && fieldPageInput) {
            fieldPageInput.value = window.currentPage;
        } else if (fieldPageInput) {
            // Default to page 1 if no current page
            fieldPageInput.value = 1;
        }
        
        // First check if we can get dimensions directly from current page viewport
        let pageWidth, pageHeight;
        
        try {
            // Try to get the dimensions from the current page canvas for the most accurate dimensions
            const currentPageCanvas = document.querySelector(`#page-${window.currentPage} canvas`);
            if (currentPageCanvas) {
                // Get unscaled dimensions (divide by scale)
                pageWidth = currentPageCanvas.width / window.scale;
                pageHeight = currentPageCanvas.height / window.scale;
                console.log(`Got dimensions from canvas: ${pageWidth}x${pageHeight}`);
            } 
            // If canvas not available, use global variables set by updatePageDimensions
            else if (window.pageWidth && window.pageHeight) {
                pageWidth = window.pageWidth;
                pageHeight = window.pageHeight;
                console.log(`Got dimensions from global variables: ${pageWidth}x${pageHeight}`);
            } 
            // Fallback to default letter dimensions
            else {
                pageWidth = 612; // Default letter width in points
                pageHeight = 792; // Default letter height in points
                console.log(`Using default letter dimensions: ${pageWidth}x${pageHeight}`);
            }
            
            // Set field inputs to page dimensions
            fieldXInput.value = 0;
            fieldYInput.value = 0;
            fieldX1Input.value = pageWidth;
            fieldY1Input.value = pageHeight;
            
            // Trigger the change event manually so any listeners are notified
            const changeEvent = new Event('change', { bubbles: true });
            fieldXInput.dispatchEvent(changeEvent);
            fieldYInput.dispatchEvent(changeEvent);
            fieldX1Input.dispatchEvent(changeEvent);
            fieldY1Input.dispatchEvent(changeEvent);
            
            console.log(`Auto-filled table dimensions: ${pageWidth}x${pageHeight}`);
            
            // Update the coordinate display if available
            if (typeof updateCoordinateDisplay === 'function') {
                updateCoordinateDisplay();
            }
        } catch (error) {
            console.error("Error setting table dimensions:", error);
            // Fallback to defaults as a last resort
            fieldXInput.value = 0;
            fieldYInput.value = 0;
            fieldX1Input.value = 612;
            fieldY1Input.value = 792;
            
            // Trigger change events here too
            const changeEvent = new Event('change', { bubbles: true });
            fieldXInput.dispatchEvent(changeEvent);
            fieldYInput.dispatchEvent(changeEvent);
            fieldX1Input.dispatchEvent(changeEvent);
            fieldY1Input.dispatchEvent(changeEvent);
        }
    }
    
    // Add event listener for page selection changes to update table dimensions
    if (fieldPageInput) {
        fieldPageInput.addEventListener('change', function() {
            // If table field is checked, auto-update dimensions based on new page
            if (isTableField && isTableField.checked) {
                // Set current page to match the selected page
                if (window.currentPage !== parseInt(this.value) && typeof renderPage === 'function') {
                    // This will render the selected page and update pageWidth/pageHeight
                    renderPage(parseInt(this.value)).then(() => {
                        // After page render, update dimensions
                        autoFillTableDimensions();
                    });
                } else {
                    // Page already selected, just update dimensions
                    autoFillTableDimensions();
                }
            }
        });
    }
    
    // Function to update coordinate display
    function updateCoordinateDisplay() {
        const displayX = document.getElementById('display-x');
        const displayY = document.getElementById('display-y');
        const displayWidth = document.getElementById('display-width');
        const displayHeight = document.getElementById('display-height');
        
        if (displayX && displayY && displayWidth && displayHeight) {
            displayX.textContent = parseFloat(fieldXInput.value || 0).toFixed(2);
            displayY.textContent = parseFloat(fieldYInput.value || 0).toFixed(2);
            displayWidth.textContent = parseFloat(fieldX1Input.value || 0).toFixed(2);
            displayHeight.textContent = parseFloat(fieldY1Input.value || 0).toFixed(2);
        }
    }
    
    // Add listeners for coordinate changes
    if (fieldXInput) fieldXInput.addEventListener('input', updateCoordinateDisplay);
    if (fieldYInput) fieldYInput.addEventListener('input', updateCoordinateDisplay);
    if (fieldX1Input) fieldX1Input.addEventListener('input', updateCoordinateDisplay);
    if (fieldY1Input) fieldY1Input.addEventListener('input', updateCoordinateDisplay);
    
    // Initial update
    updateCoordinateDisplay();
    
    // Edit field function
    const editField = async (fieldId) => {
        editingField = fieldId;
        
        try {
            // Get template ID from URL
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const templateId = pathParts[pathParts.length - 2];
            
            // Fix the URL to use the correct pattern with template ID
            const response = await fetch(`/templates/${templateId}/fields/${fieldId}/`);
            if (!response.ok) throw new Error('Failed to fetch field data');
            
            const field = await response.json();
            
            // Populate the form
            fieldIdInput.value = field.id;
            
            // Make sure field name is properly selected in dropdown
            if (fieldNameInput.tagName.toLowerCase() === 'select') {
                // If it's a dropdown, find and select the option with matching value
                for (let i = 0; i < fieldNameInput.options.length; i++) {
                    if (fieldNameInput.options[i].value === field.name) {
                        fieldNameInput.selectedIndex = i;
                        break;
                    }
                }
            } else {
                // If it's a text input, just set the value
                fieldNameInput.value = field.name;
            }
            
            // Handle custom name if present
            if (field.custom_name) {
                customNameEnabled.checked = true;
                customNameContainer.classList.remove('hidden');
                customNameInput.value = field.custom_name;
            } else {
                customNameEnabled.checked = false;
                customNameContainer.classList.add('hidden');
                customNameInput.value = '';
            }
            
            // Basic field properties
            fieldPageInput.value = field.page;
            fieldXInput.value = field.x;
            fieldYInput.value = field.y;
            fieldX1Input.value = field.x1;
            fieldY1Input.value = field.y1;
            
            // OCR required checkbox
            if (field.ocr_required) {
                ocrRequiredInput.checked = true;
            } else {
                ocrRequiredInput.checked = false;
            }
            
            // Handle Python function if present
            const pythonFunctionSelect = document.getElementById('python-function');
            if (field.python_function) {
                pythonFunctionSelect.value = field.python_function;
            } else {
                pythonFunctionSelect.value = '';
            }
            
            // Handle table field properties
            const isTableField = document.getElementById('is-table-field');
            const tableControls = document.getElementById('table-controls');
            isTableField.checked = field.is_table || false;
            tableControls.classList.toggle('hidden', !isTableField.checked);
            
            // Load table settings if present
            if (field.table_settings) {
                try {
                    const settings = JSON.parse(field.table_settings);
                    window.tableSettings = settings;
                } catch (e) {
                    console.error('Error parsing table settings:', e);
                }
            }
            
            // Load drawn table cells if present
            if (field.table_drawn_cells) {
                try {
                    const drawnTableData = JSON.parse(field.table_drawn_cells);
                    // Could restore the drawn table here if needed
                } catch (e) {
                    console.error('Error parsing drawn table cells:', e);
                }
            }
            
            // Load line points if present
            if (field.line_points) {
                try {
                    const loadedLinePoints = JSON.parse(field.line_points);
                    // Clear any existing lines first
                    if (typeof clearLines === 'function') {
                        clearLines();
                    }
                    
                    // Create lines from saved points if we have the createLineElement function
                    if (typeof createLineElement === 'function') {
                        loadedLinePoints.forEach(point => {
                            if (point.length === 4) {
                                const [x1, y1, x2, y2] = point;
                                // Convert from PDF coordinates to screen coordinates
                                const screenX1 = x1 * window.scale;
                                const screenY1 = y1 * window.scale;
                                const screenX2 = x2 * window.scale;
                                const screenY2 = y2 * window.scale;
                                
                                // Determine if vertical or horizontal
                                const type = (screenX1 === screenX2) ? 'vertical' : 'horizontal';
                                
                                // Create the line element
                                if (type === 'vertical') {
                                    createLineElement(screenX1, screenY1, screenX1, screenY2, type);
                                } else {
                                    createLineElement(screenX1, screenY1, screenX2, screenY1, type);
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error parsing line points:', e);
                }
            }
            
            // Show extracted text if available
            if (field.extracted_text) {
                extractedTextEl.textContent = field.extracted_text;
                extractedTextInput.value = field.extracted_text;
                extractedTextContainer.classList.remove('hidden');
            } else {
                extractedTextContainer.classList.add('hidden');
            }
            
            // Update title and show form
            inlineFormTitle.textContent = 'Edit Field';
            inlineFieldForm.classList.remove('hidden');
            
            // Navigate to the field's page if not already there
            if (currentPage !== field.page && typeof renderPage === 'function') {
                await renderPage(field.page);
            }
            
            // Highlight the field on the PDF
            setTimeout(() => {
                const overlay = document.querySelector(`.field-overlay[data-field-id="${fieldId}"]`);
                if (overlay) {
                    // Remove active class from all other overlays
                    document.querySelectorAll('.field-overlay').forEach(o => o.classList.remove('active'));
                    // Add active class to this overlay
                    overlay.classList.add('active');
                }
            }, 500); // Small delay to ensure the page and overlays are rendered
            
        } catch (error) {
            console.error('Error editing field:', error);
            alert('Failed to load field data');
        }
    };
    
    // Delete field function
    const deleteField = async (fieldId) => {
        if (confirm('Are you sure you want to delete this field?')) {
            try {
                // Get template ID from URL path, using same logic as loadPDF
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                const templateId = pathParts[pathParts.length - 2];
                
                // Delete field
                const response = await fetch(`/templates/fields/${fieldId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    // Remove field from UI
                    const fieldItem = document.querySelector(`.field-item[data-field-id="${fieldId}"]`);
                    if (fieldItem) fieldItem.remove();
                    
                    // Remove field overlay
                    const fieldOverlay = document.querySelector(`.field-overlay[data-field-id="${fieldId}"]`);
                    if (fieldOverlay) fieldOverlay.remove();
                    
                    // Show success message
                    alert('Field deleted successfully');
                } else {
                    alert('Failed to delete field');
                }
            } catch (error) {
                console.error('Error deleting field:', error);
                alert('Error deleting field');
            }
        }
    };
    
    // Save field function
    if (saveFieldBtn) {
        saveFieldBtn.addEventListener('click', async () => {
            try {
                // Validate required fields
                const hasFieldName = !!fieldNameInput.value;
                const hasCustomName = customNameEnabled.checked && !!customNameInput.value;
                
                // Check if at least one name is provided (either field name or custom name)
                if (!hasFieldName && !hasCustomName) {
                    alert('Please provide either a Field Name or a Custom Name');
                    return;
                }
                
                if (!fieldPageInput.value || !fieldXInput.value || !fieldYInput.value || 
                    !fieldX1Input.value || !fieldY1Input.value) {
                    alert('All position fields (Page, X, Y, Width, Height) are required');
                    return;
                }
                
                // Get form data
                const formData = new FormData(fieldForm);
                
                // If custom name is enabled but field name is empty, use custom name as the field name
                if (customNameEnabled.checked && customNameInput.value && !fieldNameInput.value) {
                    formData.set('name', customNameInput.value);
                }
                
                // Add custom name if enabled
                if (customNameEnabled.checked) {
                    formData.set('custom_name', customNameInput.value);
                } else {
                    formData.set('custom_name', '');
                }
                
                // Add OCR required value
                if (ocrRequiredInput) {
                    formData.set('ocr_required', ocrRequiredInput.checked);
                }
                
                // Ensure is_table field is included
                const isTableField = document.getElementById('is-table-field');
                
                // Create or update hidden input for is_table
                let isTableHiddenInput = fieldForm.querySelector('input[name="is_table"][type="hidden"]');
                if (!isTableHiddenInput) {
                    isTableHiddenInput = document.createElement('input');
                    isTableHiddenInput.type = 'hidden';
                    isTableHiddenInput.name = 'is_table';
                    fieldForm.appendChild(isTableHiddenInput);
                }
                
                if (isTableField) {
                    // Set the value using Django's expected format for checkbox values
                    isTableHiddenInput.value = isTableField.checked ? "on" : "";
                    formData.set('is_table', isTableField.checked ? "on" : "");
                } else {
                    // Default to unchecked
                    isTableHiddenInput.value = "";
                    formData.set('is_table', "");
                }
                
                // Get template ID from URL path, using same logic as loadPDF
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                const templateId = pathParts[pathParts.length - 2];
                
                let url = `/templates/${templateId}/fields/create/`;
                let method = 'POST';
                
                // If editing existing field
                if (fieldIdInput.value) {
                    url = `/templates/fields/${fieldIdInput.value}/update/`;
                    method = 'POST';
                }
                
                // Show a saving indicator
                if (loadingStatus) {
                    loadingStatus.textContent = 'Saving field...';
                }
                
                // Submit form
                const response = await fetch(url, {
                    method: method,
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                });
                
                // Check if response is OK before trying to parse JSON
                if (!response.ok) {
                    const errorText = await response.text();
                    if (errorText.includes('<html') || errorText.includes('<!DOCTYPE')) {
                        // This is likely an HTML error page
                        throw new Error(`Server error: ${response.status} ${response.statusText}`);
                    } else {
                        throw new Error(`Server error: ${errorText}`);
                    }
                }
                
                // Try to parse the response as JSON
                let data;
                try {
                    data = await response.json();
                } catch (jsonError) {
                    console.error('JSON parsing error:', jsonError);
                    console.log('Response text:', await response.text());
                    throw new Error('Invalid response from server. Please try again.');
                }
                
                if (data.status === 'success') {
                    // Close form and reset
                    inlineFieldForm.classList.add('hidden');
                    extractedTextContainer.classList.add('hidden');
                    fieldForm.reset();
                    
                    // Remove table-related hidden inputs
                    const hiddenInputs = fieldForm.querySelectorAll('input[type="hidden"]');
                    hiddenInputs.forEach(input => {
                        if (input.name === 'table_settings' || input.name === 'table_drawn_cells' || input.name === 'line_points') {
                            input.remove();
                        }
                    });
                    
                    // Clear any overlay
                    if (window.selectionOverlay) {
                        window.selectionOverlay.remove();
                        window.selectionOverlay = null;
                    }
                    
                    // Refresh the page to show updated fields
                    window.location.reload();
                } else {
                    alert(data.message || 'Failed to save field');
                }
            } catch (error) {
                console.error('Error saving field:', error);
                if (loadingStatus) {
                    loadingStatus.textContent = 'Error saving field';
                }
                alert('Error saving field: ' + error.message);
            }
        });
    }
}); 