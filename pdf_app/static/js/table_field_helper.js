// Direct table field handling script
document.addEventListener("DOMContentLoaded", function() {
    console.log("Table field helper script loaded");
    
    // Add a hidden input field to track if the current field is a table
    const fieldTypeTracker = document.createElement('input');
    fieldTypeTracker.id = 'field-type-tracker';
    fieldTypeTracker.type = 'hidden';
    fieldTypeTracker.value = 'standard';
    
    // Also add a visual indicator for debugging
    const fieldTypeIndicator = document.createElement('div');
    fieldTypeIndicator.id = 'field-type-indicator';
    fieldTypeIndicator.style.padding = '5px';
    fieldTypeIndicator.style.marginTop = '10px';
    fieldTypeIndicator.style.marginBottom = '10px';
    fieldTypeIndicator.style.borderRadius = '4px';
    fieldTypeIndicator.style.fontWeight = 'bold';
    fieldTypeIndicator.style.textAlign = 'center';
    fieldTypeIndicator.style.display = 'none';
    
    // Add these elements to the form
    setTimeout(function() {
        const fieldForm = document.querySelector('form#field-form') || document.querySelector('form') || document.body;
        if (fieldForm) {
            fieldForm.appendChild(fieldTypeTracker);
            fieldForm.appendChild(fieldTypeIndicator);
            console.log("Added field type tracker to the form");
        }
    }, 500);
    
    // Function to update the field type and related UI
    function updateFieldType(isTableField) {
        fieldTypeTracker.value = isTableField ? 'table' : 'standard';
        
        // Update the visual indicator
        fieldTypeIndicator.textContent = isTableField ? "TABLE FIELD" : "STANDARD FIELD";
        fieldTypeIndicator.style.backgroundColor = isTableField ? "#3b82f6" : "#6b7280";
        fieldTypeIndicator.style.color = "white";
        fieldTypeIndicator.style.display = "block";
        
        console.log(`Field type set to: ${fieldTypeTracker.value}`);
        
        // Update save button text based on field type
        const saveFieldBtn = document.getElementById("save-field-btn");
        if (saveFieldBtn) {
            if (isTableField) {
                console.log("Changing save button text to 'Save Table & Configure'");
                saveFieldBtn.textContent = "Save Table & Configure";
                saveFieldBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            } else {
                console.log("Resetting save button text to 'Save Field'");
                saveFieldBtn.textContent = "Save Field";
                saveFieldBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            }
        }
    }
    
    setTimeout(function() {
        console.log("Checking for field name dropdown and table fields");
        const fieldNameInput = document.getElementById("field-name");
        if (fieldNameInput) {
            console.log("Found field name dropdown, adding change handler");
            fieldNameInput.addEventListener("change", function() {
                console.log("Field name changed to: " + this.value);
                const selectedOption = this.options[this.selectedIndex];
                const isTableField = selectedOption && (
                    selectedOption.dataset.fieldType === "table" || 
                    selectedOption.textContent.toLowerCase().includes("table")
                );
                console.log("Is this a table field? " + (isTableField ? "YES" : "NO"));
                
                // Update field type tracker and UI
                updateFieldType(isTableField);
                
                if (isTableField) {
                    console.log("TABLE FIELD SELECTED - updating dimensions");
                    // Check if global handler exists and use it
                    if (window.handleTableFieldSelection && typeof window.handleTableFieldSelection === "function") {
                        window.handleTableFieldSelection();
                    } else {
                        console.log("No global handler found, using inline handler");
                        // Set is-table-field checkbox
                        const tableCheckbox = document.getElementById("is-table-field");
                        if (tableCheckbox) {
                            tableCheckbox.checked = true;
                            console.log("Table checkbox checked");
                            
                            // Fire its change event
                            const event = new Event("change", { bubbles: true });
                            tableCheckbox.dispatchEvent(event);
                            
                            // Get dimension fields
                            const fieldXInput = document.getElementById("field-x");
                            const fieldYInput = document.getElementById("field-y");
                            const fieldX1Input = document.getElementById("field-x1");
                            const fieldY1Input = document.getElementById("field-y1");
                            
                            // If we have a canvas, get dimensions from it
                            const currentPage = parseInt(document.getElementById("field-page").value) || 1;
                            const currentPageCanvas = document.querySelector(`#page-${currentPage} canvas`);
                            
                            if (currentPageCanvas && window.scale) {
                                const pageWidth = currentPageCanvas.width / window.scale;
                                const pageHeight = currentPageCanvas.height / window.scale;
                                
                                console.log(`Setting table dimensions from canvas: ${pageWidth}x${pageHeight}`);
                                
                                // Set field inputs to page dimensions
                                fieldXInput.value = 0;
                                fieldYInput.value = 0;
                                fieldX1Input.value = pageWidth;
                                fieldY1Input.value = pageHeight;
                                
                                // Trigger change events
                                fieldXInput.dispatchEvent(new Event("change", { bubbles: true }));
                                fieldYInput.dispatchEvent(new Event("change", { bubbles: true }));
                                fieldX1Input.dispatchEvent(new Event("change", { bubbles: true }));
                                fieldY1Input.dispatchEvent(new Event("change", { bubbles: true }));
                            } else {
                                console.log("Could not get canvas dimensions, using defaults");
                                // Set default dimensions
                                fieldXInput.value = 0;
                                fieldYInput.value = 0;
                                fieldX1Input.value = 612;
                                fieldY1Input.value = 792;
                            }
                        }
                    }
                }
            });
            
            // Check for table checkbox to detect an already existing table field being edited
            const tableCheckbox = document.getElementById("is-table-field");
            if (tableCheckbox) {
                console.log("Found table checkbox, adding observer");
                // Check immediately
                if (tableCheckbox.checked) {
                    console.log("Table checkbox is already checked - this is an edit of a table field");
                    updateFieldType(true);
                }
                
                // Add change listener
                tableCheckbox.addEventListener("change", function() {
                    console.log("Table checkbox changed to: " + this.checked);
                    updateFieldType(this.checked);
                });
            }
            
            // Trigger the change event immediately if a table is already selected
            setTimeout(function() {
                console.log("Checking if table is already selected");
                const event = new Event("change", { bubbles: true });
                fieldNameInput.dispatchEvent(event);
            }, 500);
        } else {
            console.log("Field name dropdown not found");
        }
    }, 1000); // Delay to ensure all other scripts have loaded
}); 