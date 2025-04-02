// Field editing and deletion functionality
console.log('==================== TEMPLATE FIELDS SCRIPT LOADED ====================');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOCUMENT READY - Template Fields Script Initialized');
    
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
    
    console.log('DOM elements found:', {
        fieldNameInput: !!fieldNameInput,
        isTableField: !!isTableField,
        tableControls: !!tableControls,
        fieldXInput: !!fieldXInput,
        fieldYInput: !!fieldYInput,
        fieldX1Input: !!fieldX1Input,
        fieldY1Input: !!fieldY1Input
    });
    
    // Track if a selection was made
    let userMadeSelection = false;
    
    // Variable to track table field saving
    let savingTableField = false;
    
    // Check field name dropdown once on page load
    if (fieldNameInput) {
        const selectedOption = fieldNameInput.options[fieldNameInput.selectedIndex];
        if (selectedOption && selectedOption.textContent.toLowerCase().includes('table')) {
            console.log('!!!!! TABLE FIELD DETECTED ON PAGE LOAD !!!!');
            
            // If there's a table field checkbox, check it
            if (isTableField) {
                console.log('CHECKING TABLE FIELD CHECKBOX');
                isTableField.checked = true;
                
                // And trigger its change event to set dimensions
                isTableField.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }
    
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
            console.log(`Table field checkbox changed: ${this.checked ? 'CHECKED' : 'UNCHECKED'}`);
            
            if (this.checked) {
                console.log("Table checkbox checked - auto-filling dimensions and showing controls");
                
                // Auto-fill with page dimensions always when the checkbox is checked
                autoFillTableDimensions();
                
                // Update coordinate display
                updateCoordinateDisplay();
                
                // Make sure the dimensions are visible
                userMadeSelection = true;
                
                tableControls.classList.remove('hidden');
                console.log("Table controls are now visible");
                
                // Update save button text for table fields
                saveFieldBtn.textContent = "Save Table & Configure";
                saveFieldBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                console.log("Save button text updated for table configuration");
            } else {
                console.log("Table checkbox unchecked - hiding controls and restoring button");
                
                tableControls.classList.add('hidden');
                console.log("Table controls are now hidden");
                
                // Restore original save button text
                saveFieldBtn.textContent = originalSaveText;
                saveFieldBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                console.log("Save button restored to original state");
            }
        });
    }
    
    // Listen for changes in the field name dropdown
    if (fieldNameInput) {
        console.log('Adding event listener to field name dropdown:', fieldNameInput);
        
        // Create a global helper function to detect and handle table fields
        window.handleTableFieldSelection = function() {
            console.log('CHECKING FOR TABLE FIELD SELECTION...');
            const selectedOption = fieldNameInput.options[fieldNameInput.selectedIndex];
            const selectedText = selectedOption ? selectedOption.textContent : '';
            
            console.log(`Field currently selected: "${selectedText}"`);
            
            // Check if the selected field is a table field based on field type attribute or name
            const isTableFieldSelected = selectedOption && (
                selectedOption.dataset.fieldType === 'table' || 
                selectedOption.textContent.toLowerCase().includes('table')
            );
            
            console.log(`Is this a table field? ${isTableFieldSelected ? 'YES' : 'NO'}`);
            
            // If it's a table field and the table checkbox exists, update everything
            if (isTableFieldSelected && window.isTableField) {
                console.log("************ TABLE FIELD SELECTED ************");
                console.log("************ AUTO-FILLING DIMENSIONS ************");
                
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
                    // Update coordinate display
                    updateCoordinateDisplay();
                    console.log("Table coordinates updated and displayed");
                }, 50);
                
                return true;
            }
            
            return false;
        };
        
        // Add change event listener to the field name dropdown
        fieldNameInput.addEventListener('change', function() {
            console.log("Field name dropdown changed!");
            window.handleTableFieldSelection();
        });
        
        // Execute immediately if a table field is already selected
        setTimeout(() => {
            console.log("Checking if a table field is already selected...");
            window.handleTableFieldSelection();
        }, 500);
    } else {
        console.log('Field name dropdown not found!');
    }
    
    // Add event listener for page selection changes to update table dimensions
    if (fieldPageInput) {
        fieldPageInput.addEventListener('change', function() {
            console.log(`Page field changed to: ${this.value}`);
            
            // If table field is checked, auto-update dimensions based on new page
            if (isTableField && isTableField.checked) {
                console.log("Table field is checked - updating dimensions for new page");
                
                // Set current page to match the selected page
                if (window.currentPage !== parseInt(this.value) && typeof renderPage === 'function') {
                    console.log(`Rendering new page ${this.value} (current: ${window.currentPage})`);
                    
                    // This will render the selected page and update pageWidth/pageHeight
                    renderPage(parseInt(this.value)).then(() => {
                        console.log(`Page ${this.value} rendered, now updating table dimensions`);
                        // After page render, update dimensions
                        autoFillTableDimensions();
                    });
                } else {
                    // Page already selected, just update dimensions
                    console.log(`Page ${this.value} already selected or render function not available`);
                    console.log("Updating table dimensions for current page");
                    autoFillTableDimensions();
                }
            } else {
                console.log("Table field is not checked - dimensions not auto-updated");
            }
        });
    }
    
    // Hook into the select area functionality to track when user makes a selection
    const originalSelectAreaBtn = document.getElementById('select-area-btn');
    if (originalSelectAreaBtn) {
        const originalClickHandler = originalSelectAreaBtn.onclick;
        originalSelectAreaBtn.onclick = function(e) {
            // Call the original handler if it exists
            if (originalClickHandler) {
                originalClickHandler.call(this, e);
            }
            
            // Track that user initiated a selection
            userMadeSelection = true;
        };
    }
    
    // Hook into the selection completion to update our tracking
    if (window.addEventListener) {
        window.addEventListener('selectionComplete', function(e) {
            // Selection was completed
            userMadeSelection = true;
        });
    }
    
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
            isTableField.checked = field.is_table || false;
            tableControls.classList.toggle('hidden', !isTableField.checked);
            
            // Reset the user selection flag when editing a field
            userMadeSelection = field.x > 0 || field.y > 0 || field.x1 > 0 || field.y1 > 0;
            
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
    
    // Function to navigate to table configuration page
    const navigateToTableConfig = (fieldId) => {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const templateId = pathParts[pathParts.length - 2];
        window.location.href = `/templates/${templateId}/fields/${fieldId}/table/`;
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
                
                // Check if this is a table field
                savingTableField = isTableField && isTableField.checked;
                
                // For table fields, auto-fill dimensions BEFORE validation
                if (savingTableField) {
                    // Always auto-fill table dimensions for safety
                    autoFillTableDimensions();
                    // Small delay to ensure values are set
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                // Now validate dimensions after they've been possibly auto-filled
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
                    
                    // If this is a table field, navigate to the table configuration page
                    if (savingTableField) {
                        const fieldId = data.field_id || fieldIdInput.value;
                        if (fieldId) {
                            // Navigate to table configuration
                            const pathParts = window.location.pathname.split('/').filter(Boolean);
                            const templateId = pathParts[pathParts.length - 2];
                            window.location.href = `/templates/${templateId}/fields/${fieldId}/table/`;
                            return;
                        }
                    }
                    
                    // For regular fields, just refresh the page
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
    
    // Add field button handler
    const addFieldBtn = document.getElementById('add-field-btn');
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', () => {
            // Reset the form
            fieldForm.reset();
            fieldIdInput.value = '';
            extractedTextContainer.classList.add('hidden');
            
            // Reset the user selection flag
            userMadeSelection = false;
            
            // Remove active class from field overlays
            document.querySelectorAll('.field-overlay').forEach(o => o.classList.remove('active'));
            
            // Update title and show form
            inlineFormTitle.textContent = 'Add Field';
            inlineFieldForm.classList.remove('hidden');
        });
    }
    
    // Update coordinate display
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
    
    // Function to auto-fill table dimensions with page dimensions
    function autoFillTableDimensions() {
        console.log("========== AUTO-FILLING TABLE DIMENSIONS ==========");
        
        // Make sure page field is set to current page
        if (window.currentPage && fieldPageInput) {
            fieldPageInput.value = window.currentPage;
            console.log(`Setting table to current page: ${window.currentPage}`);
        } else if (fieldPageInput) {
            // Default to page 1 if no current page
            fieldPageInput.value = 1;
            console.log("No current page detected, defaulting to page 1");
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
                console.log(`Got dimensions from canvas: ${pageWidth}x${pageHeight} (scale: ${window.scale})`);
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
            
            console.log(`TABLE DIMENSIONS SET: X: ${fieldXInput.value}, Y: ${fieldYInput.value}, Width: ${fieldX1Input.value}, Height: ${fieldY1Input.value}`);
            
            // Trigger the change event manually so any listeners are notified
            const changeEvent = new Event('change', { bubbles: true });
            fieldXInput.dispatchEvent(changeEvent);
            fieldYInput.dispatchEvent(changeEvent);
            fieldX1Input.dispatchEvent(changeEvent);
            fieldY1Input.dispatchEvent(changeEvent);
            
            console.log(`Auto-filled table dimensions: ${pageWidth}x${pageHeight}`);
            
            // Update the coordinate display
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
            
            console.log("ERROR - Using fallback dimensions: 612x792");
            
            // Trigger change events here too
            const changeEvent = new Event('change', { bubbles: true });
            fieldXInput.dispatchEvent(changeEvent);
            fieldYInput.dispatchEvent(changeEvent);
            fieldX1Input.dispatchEvent(changeEvent);
            fieldY1Input.dispatchEvent(changeEvent);
            
            // Update the coordinate display
            if (typeof updateCoordinateDisplay === 'function') {
                updateCoordinateDisplay();
            }
        }
        
        console.log("=========== TABLE DIMENSIONS UPDATED ===========");
    }
}); 