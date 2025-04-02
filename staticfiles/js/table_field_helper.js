// Direct table field handling script
document.addEventListener("DOMContentLoaded", function() {
    console.log("Table field helper script loaded");
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