// Table functionality for template configuration
document.addEventListener('DOMContentLoaded', function() {
    // Get table-related DOM elements
    const isTableField = document.getElementById('is-table-field');
    const tableControls = document.getElementById('table-controls');
    const extractTableBtn = document.getElementById('extract-table-btn');
    const drawTableBtn = document.getElementById('draw-table-btn');
    const tableAdvancedSettingsBtn = document.getElementById('table-advanced-settings-btn');
    const extractedTablesContainer = document.getElementById('extracted-tables-container');
    const extractedTablesList = document.getElementById('extracted-tables-list');
    const tableDrawingControls = document.getElementById('table-drawing-controls');
    const tableSettingsModal = document.getElementById('table-settings-modal');
    const closeTableSettingsBtn = document.getElementById('close-table-settings-btn');
    const saveTableSettingsBtn = document.getElementById('save-table-settings-btn');
    const viewTableModal = document.getElementById('view-table-modal');
    const closeTableViewBtn = document.getElementById('close-table-view-btn');
    const tableContent = document.getElementById('table-content');
    const pdfContainer = document.getElementById('pdf-container');
    const loadingStatus = document.getElementById('loading-status');
    
    // Line drawing controls (replacing table drawing controls)
    const addVerticalLineBtn = document.getElementById('add-vertical-line-btn');
    const addHorizontalLineBtn = document.getElementById('add-horizontal-line-btn');
    const clearLinesBtn = document.getElementById('clear-lines-btn');
    const saveLinesBtn = document.getElementById('save-lines-btn');
    
    // Table-related variables
    let extractedTables = [];
    let tableSettings = {
        strategy: 'lines',              // Default overall strategy
        horizontal_strategy: 'lines_strict', // Default strategy for horizontal
        vertical_strategy: 'lines_strict',   // Default strategy for vertical
        snap_tolerance: 3,
        snap_x_tolerance: 3,
        snap_y_tolerance: 3,
        join_tolerance: 3,
        join_x_tolerance: 3,
        join_y_tolerance: 3,
        edge_min_length: 3,
        min_words_vertical: 3,
        min_words_horizontal: 1,
        intersection_tolerance: 3,
        intersection_x_tolerance: 3,
        intersection_y_tolerance: 3,
        text_tolerance: 3,
        text_x_tolerance: 3,
        text_y_tolerance: 3
    };
    
    // Expose tableSettings to window object
    window.tableSettings = tableSettings;
    
    // Line drawing variables
    let isDrawingLine = false;
    let lineType = null; // 'vertical' or 'horizontal'
    let verticalLines = []; // Array to store vertical line positions
    let horizontalLines = []; // Array to store horizontal line positions
    let linePoints = []; // Array to store line endpoints for table extraction
    
    // Share drawing state with window
    window.isDrawingLine = isDrawingLine;
    
    // Toggle table controls visibility when is-table checkbox is clicked
    if (isTableField) {
        isTableField.addEventListener('change', () => {
            tableControls.classList.toggle('hidden', !isTableField.checked);
        });
    }
    
    // Extract Table Button Click
    if (extractTableBtn) {
        extractTableBtn.addEventListener('click', async () => {
            if (!window.pdfDoc) return;
            
            try {
                // Get the selected area or use the full page
                const clip = window.currentSelection || null;
                
                // Create CSRF token header for fetch request
                const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
                if (!csrfToken) {
                    console.error('CSRF token not found');
                    alert('Error: CSRF token not found');
                    return;
                }
                
                const headers = {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                };
                
                // Get template ID from URL
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                const templateId = pathParts[pathParts.length - 2];
                console.log('Extracting tables for template ID:', templateId);
                
                // Prepare the request body
                const requestBody = {
                    page: window.currentPage,
                    x0: clip ? clip.x0 / window.scale : null,
                    y0: clip ? clip.y0 / window.scale : null,
                    x1: clip ? clip.x1 / window.scale : null,
                    y1: clip ? clip.y1 / window.scale : null,
                    settings: tableSettings,
                    line_points: linePoints.length > 0 ? linePoints : null
                };
                
                console.log('Extract table request body:', JSON.stringify(requestBody));
                
                // Make API call to extract tables
                if (loadingStatus) {
                    loadingStatus.textContent = 'Extracting tables...';
                }
                
                const response = await fetch(`/api/templates/${templateId}/extract_tables/`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });
                
                // Check the status first
                console.log('Response status:', response.status);
                
                // Get the response text for debugging
                const responseText = await response.text();
                console.log('Response text:', responseText);
                
                // Try to parse the response as JSON if possible
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (jsonError) {
                    throw new Error(`Failed to parse JSON response: ${responseText}`);
                }
                
                if (!response.ok) {
                    throw new Error(`Failed to extract tables: ${data.error || response.statusText}`);
                }
                
                // Clear previous tables
                extractedTables = data.tables || [];
                if (loadingStatus) {
                    loadingStatus.textContent = 'Tables extracted';
                }
                
                // Show extracted tables
                if (extractedTables.length > 0) {
                    // Display the list of tables
                    displayExtractedTables(extractedTables);
                    extractedTablesContainer.classList.remove('hidden');
                } else {
                    alert('No tables were found in the selected area.');
                }
            } catch (error) {
                console.error('Error extracting tables:', error);
                if (loadingStatus) {
                    loadingStatus.textContent = 'Error extracting tables';
                }
                alert(`Failed to extract tables: ${error.message}`);
            }
        });
    }
    
    // Function to display extracted tables in the UI
    function displayExtractedTables(tables) {
        extractedTablesList.innerHTML = '';
        
        tables.forEach((table, index) => {
            const tableItem = document.createElement('div');
            tableItem.className = 'p-3 hover:bg-gray-50 flex justify-between items-center';
            tableItem.innerHTML = `
                <div>
                    <div class="font-medium">Table ${index + 1}</div>
                    <div class="text-xs text-gray-500">
                        ${table.rows.length} rows × ${table.rows[0]?.length || 0} columns
                    </div>
                </div>
                <button class="view-table-btn text-indigo-600 hover:text-indigo-800" data-table-index="${index}">
                    <i class="fas fa-eye"></i>
                </button>
            `;
            
            extractedTablesList.appendChild(tableItem);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-table-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default button behavior
                const tableIndex = parseInt(e.currentTarget.dataset.tableIndex);
                viewExtractedTable(tableIndex);
            });
        });
    }
    
    // Function to view an extracted table in a modal
    function viewExtractedTable(tableIndex) {
        const table = extractedTables[tableIndex];
        if (!table) return;
        
        // Create HTML table from the extracted data
        let tableHtml = '<table class="min-w-full divide-y divide-gray-300 border">';
        
        // Add header row if present
        const hasHeader = true; // You can make this configurable
        
        if (hasHeader && table.rows.length > 0) {
            tableHtml += '<thead class="bg-gray-50"><tr>';
            table.rows[0].forEach(cell => {
                tableHtml += `<th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 border">${cell || ''}</th>`;
            });
            tableHtml += '</tr></thead>';
        }
        
        // Add body rows
        tableHtml += '<tbody class="divide-y divide-gray-200 bg-white">';
        
        // Skip the first row if it's considered a header
        const startRow = hasHeader ? 1 : 0;
        
        for (let i = startRow; i < table.rows.length; i++) {
            tableHtml += '<tr>';
            table.rows[i].forEach(cell => {
                tableHtml += `<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 border">${cell || ''}</td>`;
            });
            tableHtml += '</tr>';
        }
        
        tableHtml += '</tbody></table>';
        
        // Set content and show modal
        tableContent.innerHTML = tableHtml;
        viewTableModal.classList.remove('hidden');
    }
    
    // Close table view modal
    if (closeTableViewBtn) {
        closeTableViewBtn.addEventListener('click', () => {
            viewTableModal.classList.add('hidden');
        });
    }
    
    // Draw Table Button Click - Renamed to Draw Lines
    if (drawTableBtn) {
        drawTableBtn.addEventListener('click', () => {
            if (!window.pdfDoc) return;
            
            // Clear any existing selection
            if (window.selectionOverlay) {
                window.selectionOverlay.remove();
                window.selectionOverlay = null;
            }
            
            // Hide extracted tables list
            extractedTablesContainer.classList.add('hidden');
            
            // Show line drawing controls
            tableDrawingControls.classList.remove('hidden');
            
            // Clear existing lines
            clearLines();
        });
    }
    
    // Function to check if we're in field selection mode
    function checkSelectionMode() {
        // If the main file has set isSelecting to true, we should respect that
        if (window.isSelecting) {
            console.log("Field selection mode is active, disabling line drawing");
            isDrawingLine = false;
            window.isDrawingLine = false;
            lineType = null;
            pdfContainer.style.cursor = 'default';
            return true;
        }
        return false;
    }
    
    // Function to start drawing a vertical line
    function startDrawingVerticalLine() {
        // Check if we're in field selection mode
        if (checkSelectionMode()) return;
        
        // If already in vertical line mode, turn it off
        if (isDrawingLine && lineType === 'vertical') {
            isDrawingLine = false;
            window.isDrawingLine = false;
            lineType = null;
            pdfContainer.style.cursor = 'default';
            return;
        }
        
        // If in horizontal line mode, turn it off first
        if (isDrawingLine && lineType === 'horizontal') {
            isDrawingLine = false;
        }
        
        isDrawingLine = true;
        window.isDrawingLine = true;
        lineType = 'vertical';
        pdfContainer.style.cursor = 'col-resize';
        console.log("Vertical line drawing mode activated");
        // Change the button style to indicate it's active
        if (addVerticalLineBtn) {
            addVerticalLineBtn.classList.add('bg-indigo-100');
            addHorizontalLineBtn.classList.remove('bg-indigo-100');
        }
    }
    
    // Function to start drawing a horizontal line
    function startDrawingHorizontalLine() {
        // Check if we're in field selection mode
        if (checkSelectionMode()) return;
        
        // If already in horizontal line mode, turn it off
        if (isDrawingLine && lineType === 'horizontal') {
            isDrawingLine = false;
            window.isDrawingLine = false;
            lineType = null;
            pdfContainer.style.cursor = 'default';
            return;
        }
        
        // If in vertical line mode, turn it off first
        if (isDrawingLine && lineType === 'vertical') {
            isDrawingLine = false;
        }
        
        isDrawingLine = true;
        window.isDrawingLine = true;
        lineType = 'horizontal';
        pdfContainer.style.cursor = 'row-resize';
        console.log("Horizontal line drawing mode activated");
        // Change the button style to indicate it's active
        if (addHorizontalLineBtn) {
            addHorizontalLineBtn.classList.add('bg-indigo-100');
            addVerticalLineBtn.classList.remove('bg-indigo-100');
        }
    }
    
    // Function to create a line element
    function createLineElement(x1, y1, x2, y2, type) {
        const pageDiv = document.getElementById(`page-${window.currentPage}`);
        if (!pageDiv) {
            console.error("Page div not found for page:", window.currentPage);
            return null;
        }
        
        // Create line element with direct styling
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.zIndex = '1000';
        
        if (type === 'vertical') {
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.width = '4px'; // Thicker for visibility
            line.style.height = `${y2 - y1}px`;
            line.style.backgroundColor = '#4F46E5'; // Indigo color
            line.style.boxShadow = '0 0 5px rgba(79, 70, 229, 0.7)'; // Glow effect
        } else { // horizontal
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.width = `${x2 - x1}px`;
            line.style.height = '4px'; // Thicker for visibility
            line.style.backgroundColor = '#4F46E5'; // Indigo color
            line.style.boxShadow = '0 0 5px rgba(79, 70, 229, 0.7)'; // Glow effect
        }
        
        // Add class name for identification
        line.className = type === 'vertical' ? 'vertical-line' : 'horizontal-line';
        
        // Add a label showing the position
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.backgroundColor = '#4F46E5';
        label.style.color = 'white';
        label.style.padding = '2px 4px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '10px';
        label.style.zIndex = '1001';
        
        if (type === 'vertical') {
            // Position at the top of the line
            label.style.left = `${x1}px`;
            label.style.top = `${y1}px`;
            label.style.transform = 'translateX(-50%) translateY(-100%)';
            
            const pdfX = x1 / window.scale;
            label.textContent = `x: ${Math.round(pdfX)}`;
        } else {
            // Position at the left of the line
            label.style.left = `${x1}px`;
            label.style.top = `${y1}px`;
            label.style.transform = 'translateX(-100%) translateY(-50%)';
            
            const pdfY = y1 / window.scale;
            label.textContent = `y: ${Math.round(pdfY)}`;
        }
        
        // Log the creation of the line
        console.log(`Created ${type} line at ${type === 'vertical' ? x1 : y1}`);
        
        // Add elements to page
        pageDiv.appendChild(line);
        pageDiv.appendChild(label);
        
        // Store line information
        const pdfX1 = x1 / window.scale;
        const pdfY1 = y1 / window.scale;
        const pdfX2 = x2 / window.scale;
        const pdfY2 = y2 / window.scale;
        
        // Add to the appropriate array
        if (type === 'vertical') {
            verticalLines.push(pdfX1);
            // Add points to linePoints array
            linePoints.push([pdfX1, pdfY1, pdfX1, pdfY2]);
        } else {
            horizontalLines.push(pdfY1);
            // Add points to linePoints array
            linePoints.push([pdfX1, pdfY1, pdfX2, pdfY1]);
        }
        
        return { line, label };
    }
    
    // Clear all lines
    function clearLines() {
        const pageDiv = document.getElementById(`page-${window.currentPage}`);
        if (!pageDiv) return;
        
        // Remove all line elements
        const lines = pageDiv.querySelectorAll('.vertical-line, .horizontal-line');
        lines.forEach(line => {
            if (line && line.parentNode) {
                line.parentNode.removeChild(line);
            }
        });
        
        // Remove all line labels
        const labels = pageDiv.querySelectorAll('.bg-indigo-600.text-white.text-xs');
        labels.forEach(label => {
            if (label && label.parentNode) {
                label.parentNode.removeChild(label);
            }
        });
        
        // Clear arrays
        verticalLines = [];
        horizontalLines = [];
        linePoints = [];
    }
    
    // Expose the clearLines function to window for use in other scripts
    window.clearLines = clearLines;
    window.createLineElement = createLineElement;
    
    // Attach click event listeners for line drawing buttons
    if (addVerticalLineBtn) {
        addVerticalLineBtn.addEventListener('click', startDrawingVerticalLine);
    }
    
    if (addHorizontalLineBtn) {
        addHorizontalLineBtn.addEventListener('click', startDrawingHorizontalLine);
    }
    
    if (clearLinesBtn) {
        clearLinesBtn.addEventListener('click', clearLines);
    }
    
    // Add test draw button handler
    const testDrawBtn = document.getElementById('test-draw-btn');
    if (testDrawBtn) {
        testDrawBtn.addEventListener('click', () => {
            console.log("Test draw button clicked");
            const pageDiv = document.getElementById(`page-${window.currentPage}`);
            if (!pageDiv) {
                alert("Page div not found!");
                return;
            }
            
            // Get page dimensions
            const pageRect = pageDiv.getBoundingClientRect();
            const pageWidth = pageRect.width;
            const pageHeight = pageRect.height;
            
            // Draw a vertical line at 1/3 of page width
            createTestLine(pageWidth/3, 0, pageWidth/3, pageHeight, 'vertical', pageDiv);
            
            // Draw a horizontal line at 1/3 of page height
            createTestLine(0, pageHeight/3, pageWidth, pageHeight/3, 'horizontal', pageDiv);
            
            alert("Test lines drawn. Check console for details.");
        });
    }
    
    // Function to directly create a test line without any calculations
    function createTestLine(x1, y1, x2, y2, type, parentElement) {
        console.log(`Creating test ${type} line at (${x1},${y1}) to (${x2},${y2})`);
        
        // Create line element
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.zIndex = '1000';
        
        if (type === 'vertical') {
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.width = '5px'; // Make it extra thick for visibility
            line.style.height = `${y2 - y1}px`;
            line.style.backgroundColor = 'red'; // Use a different color for test lines
        } else {
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.width = `${x2 - x1}px`;
            line.style.height = '5px'; // Make it extra thick for visibility
            line.style.backgroundColor = 'red'; // Use a different color for test lines
        }
        
        // Add to the page
        parentElement.appendChild(line);
        console.log("Test line appended to:", parentElement);
        
        // Also store in linePoints for extraction
        const pdfX1 = x1 / window.scale;
        const pdfY1 = y1 / window.scale;
        const pdfX2 = x2 / window.scale;
        const pdfY2 = y2 / window.scale;
        
        linePoints.push([pdfX1, pdfY1, pdfX2, pdfY2]);
        console.log("Line points added:", [pdfX1, pdfY1, pdfX2, pdfY2]);
        
        return line;
    }
    
    // Save lines button click
    if (saveLinesBtn) {
        saveLinesBtn.addEventListener('click', () => {
            // Update form to save line data
            const lineDataInput = document.createElement('input');
            lineDataInput.type = 'hidden';
            lineDataInput.name = 'line_points';
            lineDataInput.value = JSON.stringify(linePoints);
            document.getElementById('field-form').appendChild(lineDataInput);
            
            // Set the table flag
            isTableField.checked = true;
            
            // Close the controls
            tableDrawingControls.classList.add('hidden');
            
            // Reset cursor
            pdfContainer.style.cursor = 'default';
            
            // Show message
            alert('Line points saved for table extraction');
        });
    }
    
    // Add event listeners for drawing lines on the PDF
    if (pdfContainer) {
        pdfContainer.addEventListener('click', function(e) {
            // Check if we're in field selection mode
            if (window.isSelecting) {
                console.log("Field selection mode is active, ignoring line drawing clicks");
                return;
            }
            
            if (!isDrawingLine) {
                console.log("Not in drawing mode, ignoring click");
                return;
            }
            
            console.log("Drawing line clicked, type:", lineType);
            
            // Calculate position relative to the PDF container
            const pdfRect = pdfContainer.getBoundingClientRect();
            const clickX = e.clientX - pdfRect.left;
            const clickY = e.clientY - pdfRect.top;
            
            console.log(`Click position: (${clickX}, ${clickY})`);
            console.log(`PDF container bounds: left=${pdfRect.left}, top=${pdfRect.top}, width=${pdfRect.width}, height=${pdfRect.height}`);
            
            // Make sure we're clicking on the actual canvas/page
            const pageDiv = document.getElementById(`page-${window.currentPage}`);
            if (!pageDiv) {
                console.error("Page div not found, cannot create line");
                return;
            }
            
            console.log(`Current page: ${window.currentPage}, Page div:`, pageDiv);
            
            const pageDivRect = pageDiv.getBoundingClientRect();
            console.log(`Page div bounds: left=${pageDivRect.left}, top=${pageDivRect.top}, width=${pageDivRect.width}, height=${pageDivRect.height}`);
            
            // Calculate position relative to page div - this is more accurate
            const relativeX = e.clientX - pageDivRect.left;
            const relativeY = e.clientY - pageDivRect.top;
            
            console.log(`Position relative to page div: (${relativeX}, ${relativeY})`);
            
            if (lineType === 'vertical') {
                console.log("Creating vertical line at x:", relativeX);
                // Create a vertical line spanning the height of the container
                createLineElement(relativeX, 0, relativeX, pageDivRect.height, 'vertical');
            } else if (lineType === 'horizontal') {
                console.log("Creating horizontal line at y:", relativeY);
                // Create a horizontal line spanning the width of the container
                createLineElement(0, relativeY, pageDivRect.width, relativeY, 'horizontal');
            }
        });
    }
    
    // Table Advanced Settings Button Click
    if (tableAdvancedSettingsBtn) {
        tableAdvancedSettingsBtn.addEventListener('click', () => {
            // Populate form with current settings
            document.getElementById('table-strategy').value = tableSettings.strategy || 'lines';
            document.getElementById('table-horizontal-strategy').value = tableSettings.horizontal_strategy || 'lines_strict';
            document.getElementById('table-vertical-strategy').value = tableSettings.vertical_strategy || 'lines_strict';
            document.getElementById('table-snap-tolerance').value = tableSettings.snap_tolerance || 3;
            document.getElementById('table-snap-x-tolerance').value = tableSettings.snap_x_tolerance || 3;
            document.getElementById('table-snap-y-tolerance').value = tableSettings.snap_y_tolerance || 3;
            document.getElementById('table-join-tolerance').value = tableSettings.join_tolerance || 3;
            document.getElementById('table-join-x-tolerance').value = tableSettings.join_x_tolerance || 3;
            document.getElementById('table-join-y-tolerance').value = tableSettings.join_y_tolerance || 3;
            document.getElementById('table-edge-min-length').value = tableSettings.edge_min_length || 3;
            document.getElementById('table-min-words-vertical').value = tableSettings.min_words_vertical || 3;
            document.getElementById('table-min-words-horizontal').value = tableSettings.min_words_horizontal || 1;
            document.getElementById('table-intersection-tolerance').value = tableSettings.intersection_tolerance || 3;
            document.getElementById('table-intersection-x-tolerance').value = tableSettings.intersection_x_tolerance || 3;
            document.getElementById('table-intersection-y-tolerance').value = tableSettings.intersection_y_tolerance || 3;
            document.getElementById('table-text-tolerance').value = tableSettings.text_tolerance || 3;
            document.getElementById('table-text-x-tolerance').value = tableSettings.text_x_tolerance || 3;
            document.getElementById('table-text-y-tolerance').value = tableSettings.text_y_tolerance || 3;
            
            // Show the modal
            tableSettingsModal.classList.remove('hidden');
        });
    }
    
    // Close Table Settings Modal
    if (closeTableSettingsBtn) {
        closeTableSettingsBtn.addEventListener('click', () => {
            tableSettingsModal.classList.add('hidden');
        });
    }
    
    // Save Table Settings Button Click
    if (saveTableSettingsBtn) {
        saveTableSettingsBtn.addEventListener('click', () => {
            // Update settings object
            tableSettings = {
                strategy: document.getElementById('table-strategy').value,
                horizontal_strategy: document.getElementById('table-horizontal-strategy').value,
                vertical_strategy: document.getElementById('table-vertical-strategy').value,
                snap_tolerance: parseInt(document.getElementById('table-snap-tolerance').value),
                snap_x_tolerance: parseInt(document.getElementById('table-snap-x-tolerance').value),
                snap_y_tolerance: parseInt(document.getElementById('table-snap-y-tolerance').value),
                join_tolerance: parseInt(document.getElementById('table-join-tolerance').value),
                join_x_tolerance: parseInt(document.getElementById('table-join-x-tolerance').value),
                join_y_tolerance: parseInt(document.getElementById('table-join-y-tolerance').value),
                edge_min_length: parseInt(document.getElementById('table-edge-min-length').value),
                min_words_vertical: parseInt(document.getElementById('table-min-words-vertical').value),
                min_words_horizontal: parseInt(document.getElementById('table-min-words-horizontal').value),
                intersection_tolerance: parseInt(document.getElementById('table-intersection-tolerance').value),
                intersection_x_tolerance: parseInt(document.getElementById('table-intersection-x-tolerance').value),
                intersection_y_tolerance: parseInt(document.getElementById('table-intersection-y-tolerance').value),
                text_tolerance: parseInt(document.getElementById('table-text-tolerance').value),
                text_x_tolerance: parseInt(document.getElementById('table-text-x-tolerance').value),
                text_y_tolerance: parseInt(document.getElementById('table-text-y-tolerance').value)
            };
            
            // Store settings in a hidden input to be saved with the field
            const tableSettingsInput = document.createElement('input');
            tableSettingsInput.type = 'hidden';
            tableSettingsInput.name = 'table_settings';
            tableSettingsInput.value = JSON.stringify(tableSettings);
            document.getElementById('field-form').appendChild(tableSettingsInput);
            
            // Close the modal
            tableSettingsModal.classList.add('hidden');
            
            // Show confirmation
            alert('Table settings saved.');
        });
    }
}); 