// Table Field Initializer - This script ensures table fields automatically set dimensions
console.log('TABLE FIELD INITIALIZER LOADED');

// Execute after a delay to ensure the page is fully loaded
setTimeout(function() {
    console.log('CHECKING FOR TABLE FIELDS...');
    
    // Get the field name dropdown
    const fieldNameInput = document.getElementById('field-name');
    if (!fieldNameInput) {
        console.log('Field name dropdown not found');
        return;
    }
    
    console.log('Field name dropdown found, checking selection');
    
    // Function to handle table field selection
    function handleTableFieldSelection() {
        const selectedOption = fieldNameInput.options[fieldNameInput.selectedIndex];
        if (!selectedOption) {
            console.log('No option selected in dropdown');
            return false;
        }
        
        const selectedText = selectedOption.textContent;
        console.log(`Currently selected field: "${selectedText}"`);
        
        // Check if this is a table field
        const isTableField = selectedText.toLowerCase().includes('table');
        console.log(`Is this a table field? ${isTableField ? 'YES' : 'NO'}`);
        
        if (!isTableField) {
            return false;
        }
        
        console.log('** TABLE FIELD DETECTED - SETTING DIMENSIONS **');
        
        // Check the table field checkbox
        const tableCheckbox = document.getElementById('is-table-field');
        if (tableCheckbox) {
            console.log('Setting is-table-field checkbox to checked');
            tableCheckbox.checked = true;
        } else {
            console.log('Table checkbox not found');
        }
        
        // Set dimensions directly
        const fieldXInput = document.getElementById('field-x');
        const fieldYInput = document.getElementById('field-y');
        const fieldX1Input = document.getElementById('field-x1');
        const fieldY1Input = document.getElementById('field-y1');
        
        if (!fieldXInput || !fieldYInput || !fieldX1Input || !fieldY1Input) {
            console.log('Dimension fields not found');
            return false;
        }
        
        // Get the page and try to find canvas dimensions
        const fieldPageInput = document.getElementById('field-page');
        const currentPage = fieldPageInput ? parseInt(fieldPageInput.value) || 1 : 1;
        
        console.log(`Using page ${currentPage} for dimensions`);
        
        // Set X and Y to 0
        fieldXInput.value = 0;
        fieldYInput.value = 0;
        
        // Try to get page dimensions from canvas
        try {
            const canvas = document.querySelector(`#page-${currentPage} canvas`);
            if (canvas && window.scale) {
                const pageWidth = canvas.width / window.scale;
                const pageHeight = canvas.height / window.scale;
                
                console.log(`Got dimensions from canvas: ${pageWidth} x ${pageHeight}`);
                
                fieldX1Input.value = pageWidth;
                fieldY1Input.value = pageHeight;
            } else if (window.pageWidth && window.pageHeight) {
                console.log(`Got dimensions from global variables: ${window.pageWidth} x ${window.pageHeight}`);
                
                fieldX1Input.value = window.pageWidth;
                fieldY1Input.value = window.pageHeight;
            } else {
                console.log('Using default dimensions: 612 x 792');
                
                fieldX1Input.value = 612;
                fieldY1Input.value = 792;
            }
        } catch (error) {
            console.error('Error getting dimensions:', error);
            console.log('Using default dimensions: 612 x 792');
            
            fieldX1Input.value = 612;
            fieldY1Input.value = 792;
        }
        
        // Dispatch change events
        console.log(`TABLE DIMENSIONS SET: (${fieldXInput.value}, ${fieldYInput.value}) - ${fieldX1Input.value} x ${fieldY1Input.value}`);
        
        fieldXInput.dispatchEvent(new Event('change', { bubbles: true }));
        fieldYInput.dispatchEvent(new Event('change', { bubbles: true }));
        fieldX1Input.dispatchEvent(new Event('change', { bubbles: true }));
        fieldY1Input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Show table controls if present
        const tableControls = document.getElementById('table-controls');
        if (tableControls) {
            console.log('Showing table controls');
            tableControls.classList.remove('hidden');
        }
        
        // Update save button if present
        const saveFieldBtn = document.getElementById('save-field-btn');
        if (saveFieldBtn) {
            console.log('Updating save button for table configuration');
            saveFieldBtn.textContent = "Save Table & Configure";
            saveFieldBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
        
        return true;
    }
    
    // Add change event listener to field name dropdown
    console.log('Adding change event listener to field name dropdown');
    fieldNameInput.addEventListener('change', function() {
        console.log('Field name changed, checking if table field');
        handleTableFieldSelection();
    });
    
    // Check immediately if a table field is already selected
    console.log('Checking if table field is already selected');
    handleTableFieldSelection();
    
    // Also check when page field changes
    const fieldPageInput = document.getElementById('field-page');
    if (fieldPageInput) {
        console.log('Adding change event listener to page field');
        fieldPageInput.addEventListener('change', function() {
            console.log('Page field changed, checking table dimensions');
            
            // Check if table checkbox is checked
            const tableCheckbox = document.getElementById('is-table-field');
            if (tableCheckbox && tableCheckbox.checked) {
                console.log('Table checkbox is checked, updating dimensions for new page');
                
                setTimeout(function() {
                    handleTableFieldSelection();
                }, 500); // Delay to ensure page is rendered
            }
        });
    }
}, 1000); // Delay to ensure DOM is fully loaded 