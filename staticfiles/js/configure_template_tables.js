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
    
    // Get page and zoom control elements
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInput = document.getElementById('page-input');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    // Line drawing controls (replacing table drawing controls)
    const addVerticalLineBtn = document.getElementById('add-vertical-line-btn');
    const addHorizontalLineBtn = document.getElementById('add-horizontal-line-btn');
    const clearLinesBtn = document.getElementById('clear-lines-btn');
    const saveLinesBtn = document.getElementById('save-lines-btn');
    
    // Table-related variables
    let extractedTables = [];
    let tableSettings = {
        strategy: 'lines_strict',              // Default overall strategy (changed from 'lines')
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
                <div>
                    <button class="view-table-btn text-indigo-600 hover:text-indigo-800 mr-2" data-table-index="${index}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="configure-table-btn text-blue-600 hover:text-blue-800 mr-2" data-table-index="${index}">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="highlight-table-btn text-green-600 hover:text-green-800" data-table-index="${index}">
                        <i class="fas fa-border-all"></i>
                    </button>
                </div>
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
        
        // Add event listeners to configure buttons
        document.querySelectorAll('.configure-table-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tableIndex = parseInt(e.currentTarget.dataset.tableIndex);
                const table = extractedTables[tableIndex];
                
                if (!table) {
                    console.error("Table not found");
                    return;
                }
                
                // Get template ID from the URL
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                const templateId = pathParts[pathParts.length - 2];
                
                // Get the field ID from the current form
                const fieldIdInput = document.getElementById('field-id');
                const fieldId = fieldIdInput ? fieldIdInput.value : '';
                
                if (!fieldId) {
                    console.error("Field ID not found");
                    return;
                }
                
                // Prepare BBox information
                const [x, y, width, height] = table.bbox || [0, 0, 0, 0];
                
                // Serialize the table data for passing to the configuration page
                const extractedTableData = {
                    rows: table.rows,
                    row_count: table.row_count,
                    col_count: table.col_count,
                    has_header: table.has_header
                };
                
                // Construct URL to the table configuration page with parameters
                const url = `/templates/${templateId}/fields/${fieldId}/table/?` + 
                    `bbox_x=${x}&bbox_y=${y}&bbox_width=${width}&bbox_height=${height}&` + 
                    `extracted_data=${encodeURIComponent(JSON.stringify(extractedTableData))}`;
                
                // Navigate to the table configuration page
                window.location.href = url;
            });
        });
        
        // Add event listeners to highlight buttons
        document.querySelectorAll('.highlight-table-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tableIndex = parseInt(e.currentTarget.dataset.tableIndex);
                highlightTableOnPdf(tableIndex);
            });
        });
        
        // Always draw tables on the PDF
        drawTablesOnPdf(tables);
    }
    
    // Function to draw all extracted tables on the PDF
    function drawTablesOnPdf(tables) {
        // Clear any existing table overlays
        clearTableOverlays();
        
        // Draw each table
        tables.forEach((table, index) => {
            drawTableOverlay(table, index);
        });
    }
    
    // Function to clear all table overlays
    function clearTableOverlays() {
        const existingOverlays = document.querySelectorAll('.table-overlay');
        existingOverlays.forEach(overlay => {
            overlay.remove();
        });
    }
    
    // Function to draw a single table overlay
    function drawTableOverlay(table, tableIndex) {
        if (!table || !table.bbox || !pdfContainer) return;
        
        // Detailed logging of table data
        console.log('=== TABLE OVERLAY DEBUG INFO ===');
        console.log('Table index:', tableIndex);
        console.log('Table bbox:', table.bbox);
        console.log('Row count:', table.row_count);
        console.log('Column count:', table.col_count);
        console.log('Has header:', table.has_header);
        console.log('Has rows_positions:', !!table.rows_positions);
        console.log('Has cols_positions:', !!table.cols_positions);
        console.log('Has table_rows:', !!table.table_rows);
        if (table.table_rows) {
            console.log('table_rows length:', table.table_rows.length);
            console.log('First table_row:', table.table_rows[0]);
        }
        console.log('Has cells array:', !!table.cells);
        if (table.cells) {
            console.log('cells length:', table.cells.length);
            console.log('First cell row length:', table.cells[0] ? table.cells[0].length : 0);
            console.log('First cell in first row:', table.cells[0] && table.cells[0][0] ? table.cells[0][0] : null);
        }
        console.log('Table data rows:', table.rows ? table.rows.length : 0);
        console.log('Full table object:', table);
        console.log('=== END DEBUG INFO ===');
        
        const [x0, y0, x1, y1] = table.bbox;
        
        // Apply scale to coordinates
        const scaledX0 = x0 * window.scale;
        const scaledY0 = y0 * window.scale;
        const scaledX1 = x1 * window.scale;
        const scaledY1 = y1 * window.scale;
        
        // Create the overlay element
        const overlay = document.createElement('div');
        overlay.className = 'table-overlay';
        overlay.dataset.tableIndex = tableIndex;
        overlay.style.position = 'absolute';
        overlay.style.left = `${scaledX0}px`;
        overlay.style.top = `${scaledY0}px`;
        overlay.style.width = `${scaledX1 - scaledX0}px`;
        overlay.style.height = `${scaledY1 - scaledY0}px`;
        overlay.style.border = '2px solid rgba(99, 102, 241, 0.7)';
        overlay.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        overlay.style.zIndex = '15'; // Changed from 100 to 15 (below modal z-index of 20)
        overlay.style.pointerEvents = 'none'; // Don't interfere with PDF interaction
        overlay.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        
        // Add a label
        const label = document.createElement('div');
        label.className = 'table-overlay-label';
        label.innerHTML = `Table ${tableIndex + 1}`;
        label.style.position = 'absolute';
        label.style.top = '-24px';
        label.style.left = '0';
        label.style.backgroundColor = 'rgba(99, 102, 241, 0.9)';
        label.style.color = 'white';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.zIndex = '15'; // Ensure label has same z-index as overlay
        overlay.appendChild(label);
        
        // Add the overlay to the PDF container
        pdfContainer.appendChild(overlay);
        
        // Draw cell grid if we have row and column data
        if (table.rows && table.rows.length > 0) {
            drawTableCellGrid(overlay, table);
        }
    }
    
    // Function to draw the cell grid within a table overlay
    function drawTableCellGrid(overlay, table) {
        console.log('=== DRAWING TABLE CELL GRID ===');
        
        if (!table.rows || table.rows.length === 0) {
            console.log('No rows data found, cannot draw grid');
            return;
        }
        
        const rows = table.row_count || table.rows.length;
        const cols = table.col_count || (table.rows[0] ? table.rows[0].length : 0);
        console.log(`Table dimensions: ${rows} rows × ${cols} columns`);
        
        if (rows <= 1 || cols <= 1) {
            console.log('Not enough rows/columns to draw grid');
            return;
        }
        
        const overlayWidth = parseFloat(overlay.style.width);
        const overlayHeight = parseFloat(overlay.style.height);
        console.log(`Overlay dimensions: ${overlayWidth}px × ${overlayHeight}px`);
        
        // Get table bbox to calculate relative positions
        const [tableX0, tableY0, tableX1, tableY1] = table.bbox;
        const tableWidth = tableX1 - tableX0;
        const tableHeight = tableY1 - tableY0;
        
        // Debug properties available for grid drawing
        console.log('GRID DRAWING METHOD DETECTION:');
        console.log('- rows_positions available:', !!table.rows_positions && table.rows_positions.length > 0);
        if (table.rows_positions) console.log('  rows_positions:', table.rows_positions);
        
        console.log('- cols_positions available:', !!table.cols_positions && table.cols_positions.length > 0);
        if (table.cols_positions) console.log('  cols_positions:', table.cols_positions);
        
        console.log('- table_rows available:', !!table.table_rows && Array.isArray(table.table_rows) && table.table_rows.length > 0);
        if (table.table_rows && table.table_rows.length > 0) {
            console.log('  table_rows length:', table.table_rows.length);
            console.log('  First table_row has bbox:', !!(table.table_rows[0] && table.table_rows[0].bbox));
            if (table.table_rows[0] && table.table_rows[0].bbox) console.log('  First table_row bbox:', table.table_rows[0].bbox);
            
            // Check for cells property in table_rows
            console.log('  First table_row has cells:', !!(table.table_rows[0] && table.table_rows[0].cells));
            if (table.table_rows[0] && table.table_rows[0].cells) {
                console.log('  First table_row cells length:', table.table_rows[0].cells.length);
                console.log('  First cell in first row has bbox:', !!(table.table_rows[0].cells[0] && table.table_rows[0].cells[0].bbox));
                if (table.table_rows[0].cells[0] && table.table_rows[0].cells[0].bbox) {
                    console.log('  First cell bbox:', table.table_rows[0].cells[0].bbox);
                }
            }
        }
        
        // If table has actual row and column coordinate data from PyMuPDF, use them
        if (table.rows_positions && table.rows_positions.length > 0 && 
            table.cols_positions && table.cols_positions.length > 0) {
            
            console.log('DRAWING METHOD: Using actual row and column positions from PyMuPDF');
            
            // Draw horizontal lines based on actual row positions
            for (let r = 1; r < table.rows_positions.length; r++) {
                const rowPosition = table.rows_positions[r];
                const rowY = (rowPosition - tableY0) * window.scale;
                
                const rowLine = document.createElement('div');
                rowLine.className = 'table-cell-line horizontal';
                rowLine.style.position = 'absolute';
                rowLine.style.left = '0';
                rowLine.style.top = `${rowY}px`;
                rowLine.style.width = '100%';
                rowLine.style.height = '1px';
                rowLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                rowLine.style.zIndex = '15';
                overlay.appendChild(rowLine);
            }
            
            // Draw vertical lines based on actual column positions
            for (let c = 1; c < table.cols_positions.length; c++) {
                const colPosition = table.cols_positions[c];
                const colX = (colPosition - tableX0) * window.scale;
                
                const colLine = document.createElement('div');
                colLine.className = 'table-cell-line vertical';
                colLine.style.position = 'absolute';
                colLine.style.left = `${colX}px`;
                colLine.style.top = '0';
                colLine.style.width = '1px';
                colLine.style.height = '100%';
                colLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                colLine.style.zIndex = '15';
                overlay.appendChild(colLine);
            }
            
            // If the table has a header, add a slightly thicker line below the header row
            if (table.has_header && table.rows_positions.length > 1) {
                const headerY = (table.rows_positions[1] - tableY0) * window.scale;
                
                const headerLine = document.createElement('div');
                headerLine.className = 'table-cell-line header-line';
                headerLine.style.position = 'absolute';
                headerLine.style.left = '0';
                headerLine.style.top = `${headerY}px`;
                headerLine.style.width = '100%';
                headerLine.style.height = '2px'; // Thicker line
                headerLine.style.backgroundColor = 'rgba(99, 102, 241, 0.8)'; // More visible
                headerLine.style.zIndex = '15';
                overlay.appendChild(headerLine);
            }
        }
        // If table rows have bbox information, use that
        else if (table.table_rows && Array.isArray(table.table_rows) && table.table_rows.length > 0 && 
                table.table_rows[0] && typeof table.table_rows[0] === 'object' && 
                table.table_rows[0].bbox) {
            
            // Check if we have cells with bbox information
            const hasCellData = table.table_rows[0].cells && 
                                Array.isArray(table.table_rows[0].cells) &&
                                table.table_rows[0].cells.length > 0 &&
                                table.table_rows[0].cells[0].bbox;
            
            if (hasCellData) {
                console.log('DRAWING METHOD: Using cell-level bbox data from table_rows');
                
                // Create maps to track unique row and column positions
                const rowPositions = new Set();
                const colPositions = new Set();
                
                // Extract all row and column positions from cell bboxes
                for (let r = 0; r < table.table_rows.length; r++) {
                    const row = table.table_rows[r];
                    if (!row || !row.cells || !Array.isArray(row.cells)) continue;
                    
                    // Add row bottom boundary
                    if (row.bbox) {
                        const [rowX0, rowY0, rowX1, rowY1] = row.bbox;
                        rowPositions.add(rowY1);  // Bottom of row
                    }
                    
                    // Process each cell in the row
                    for (let c = 0; c < row.cells.length; c++) {
                        const cell = row.cells[c];
                        if (!cell || !cell.bbox) continue;
                        
                        const [cellX0, cellY0, cellX1, cellY1] = cell.bbox;
                        
                        // Add right edge of cell to column positions
                        colPositions.add(cellX1);
                    }
                }
                
                // Sort positions
                const sortedRowPositions = [...rowPositions].sort((a, b) => a - b);
                const sortedColPositions = [...colPositions].sort((a, b) => a - b);
                
                // Draw horizontal lines based on row boundaries
                for (let i = 0; i < sortedRowPositions.length; i++) {
                    const rowPosition = sortedRowPositions[i];
                    if (rowPosition <= tableY0 || rowPosition >= tableY1) continue; // Skip out of bounds
                    
                    const rowY = (rowPosition - tableY0) * window.scale;
                    
                    const rowLine = document.createElement('div');
                    rowLine.className = 'table-cell-line horizontal';
                    rowLine.style.position = 'absolute';
                    rowLine.style.left = '0';
                    rowLine.style.top = `${rowY}px`;
                    rowLine.style.width = '100%';
                    rowLine.style.height = '1px';
                    rowLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                    rowLine.style.zIndex = '15';
                    overlay.appendChild(rowLine);
                }
                
                // Draw vertical lines based on column positions
                for (let i = 0; i < sortedColPositions.length; i++) {
                    const colPosition = sortedColPositions[i];
                    if (colPosition <= tableX0 || colPosition >= tableX1) continue; // Skip out of bounds
                    
                    const colX = (colPosition - tableX0) * window.scale;
                    
                    const colLine = document.createElement('div');
                    colLine.className = 'table-cell-line vertical';
                    colLine.style.position = 'absolute';
                    colLine.style.left = `${colX}px`;
                    colLine.style.top = '0';
                    colLine.style.width = '1px';
                    colLine.style.height = '100%';
                    colLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                    colLine.style.zIndex = '15';
                    overlay.appendChild(colLine);
                }
                
                // If the table has a header, add a slightly thicker line below the first row
                if (table.has_header && table.table_rows.length > 0 && table.table_rows[0] && 
                    table.table_rows[0].bbox) {
                    
                    const headerRowY1 = table.table_rows[0].bbox[3];
                    const headerY = (headerRowY1 - tableY0) * window.scale;
                    
                    const headerLine = document.createElement('div');
                    headerLine.className = 'table-cell-line header-line';
                    headerLine.style.position = 'absolute';
                    headerLine.style.left = '0';
                    headerLine.style.top = `${headerY}px`;
                    headerLine.style.width = '100%';
                    headerLine.style.height = '2px'; // Thicker line
                    headerLine.style.backgroundColor = 'rgba(99, 102, 241, 0.8)'; // More visible
                    headerLine.style.zIndex = '15';
                    overlay.appendChild(headerLine);
                }
            } else {
                console.log('DRAWING METHOD: Using table_rows bbox data to draw grid (no cell-level data)');
                
                // Create maps to track unique row positions
                const rowPositions = new Set();
                
                // Extract all row positions from row bboxes
                for (let r = 0; r < table.table_rows.length; r++) {
                    const row = table.table_rows[r];
                    if (row && typeof row === 'object' && row.bbox) {
                        // Get bottom edge of row
                        const [rowX0, rowY0, rowX1, rowY1] = row.bbox;
                        rowPositions.add(rowY1);
                    }
                }
                
                // Sort row positions
                const sortedRowPositions = [...rowPositions].sort((a, b) => a - b);
                
                // Draw horizontal lines based on row boundaries
                for (let i = 0; i < sortedRowPositions.length; i++) {
                    const rowPosition = sortedRowPositions[i];
                    if (rowPosition <= tableY0 || rowPosition >= tableY1) continue; // Skip out of bounds
                    
                    const rowY = (rowPosition - tableY0) * window.scale;
                    
                    const rowLine = document.createElement('div');
                    rowLine.className = 'table-cell-line horizontal';
                    rowLine.style.position = 'absolute';
                    rowLine.style.left = '0';
                    rowLine.style.top = `${rowY}px`;
                    rowLine.style.width = '100%';
                    rowLine.style.height = '1px';
                    rowLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                    rowLine.style.zIndex = '15';
                    overlay.appendChild(rowLine);
                }
                
                // Draw evenly spaced columns since we don't have cell-level bbox data
                for (let c = 1; c < cols; c++) {
                    const colLine = document.createElement('div');
                    colLine.className = 'table-cell-line vertical';
                    colLine.style.position = 'absolute';
                    colLine.style.left = `${(c / cols) * overlayWidth}px`;
                    colLine.style.top = '0';
                    colLine.style.width = '1px';
                    colLine.style.height = '100%';
                    colLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                    colLine.style.zIndex = '15';
                    overlay.appendChild(colLine);
                }
                
                // If the table has a header, add a slightly thicker line below the first row
                if (table.has_header && table.table_rows.length > 0 && table.table_rows[0] && 
                    table.table_rows[0].bbox) {
                    
                    const headerRowY1 = table.table_rows[0].bbox[3];
                    const headerY = (headerRowY1 - tableY0) * window.scale;
                    
                    const headerLine = document.createElement('div');
                    headerLine.className = 'table-cell-line header-line';
                    headerLine.style.position = 'absolute';
                    headerLine.style.left = '0';
                    headerLine.style.top = `${headerY}px`;
                    headerLine.style.width = '100%';
                    headerLine.style.height = '2px'; // Thicker line
                    headerLine.style.backgroundColor = 'rgba(99, 102, 241, 0.8)'; // More visible
                    headerLine.style.zIndex = '15';
                    overlay.appendChild(headerLine);
                }
            }
        }
        // If table has cell data with bbox information
        else if (table.cells && table.cells.length > 0 && table.cells[0].length > 0 && 
                 table.cells[0][0] && typeof table.cells[0][0] === 'object') {
            
            console.log('DRAWING METHOD: Using cell bbox data to draw grid');
            
            // Create maps to track unique row and column positions
            const rowPositions = new Set();
            const colPositions = new Set();
            
            // Extract all row and column positions from cell bboxes
            for (let r = 0; r < table.cells.length; r++) {
                if (!Array.isArray(table.cells[r])) continue;
                
                for (let c = 0; c < table.cells[r].length; c++) {
                    const cell = table.cells[r][c];
                    if (cell && typeof cell === 'object' && cell.bbox) {
                        const [cellX0, cellY0, cellX1, cellY1] = cell.bbox;
                        
                        // Add bottom edge of cell to row positions
                        rowPositions.add(cellY1);
                        
                        // Add right edge of cell to column positions
                        colPositions.add(cellX1);
                    }
                }
            }
            
            // Sort positions
            const sortedRowPositions = [...rowPositions].sort((a, b) => a - b);
            const sortedColPositions = [...colPositions].sort((a, b) => a - b);
            
            // Draw horizontal lines based on cell boundaries
            for (let i = 0; i < sortedRowPositions.length; i++) {
                const rowPosition = sortedRowPositions[i];
                if (rowPosition <= tableY0 || rowPosition >= tableY1) continue; // Skip out of bounds
                
                const rowY = (rowPosition - tableY0) * window.scale;
                
                const rowLine = document.createElement('div');
                rowLine.className = 'table-cell-line horizontal';
                rowLine.style.position = 'absolute';
                rowLine.style.left = '0';
                rowLine.style.top = `${rowY}px`;
                rowLine.style.width = '100%';
                rowLine.style.height = '1px';
                rowLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                rowLine.style.zIndex = '15';
                overlay.appendChild(rowLine);
            }
            
            // Draw vertical lines based on cell boundaries
            for (let i = 0; i < sortedColPositions.length; i++) {
                const colPosition = sortedColPositions[i];
                if (colPosition <= tableX0 || colPosition >= tableX1) continue; // Skip out of bounds
                
                const colX = (colPosition - tableX0) * window.scale;
                
                const colLine = document.createElement('div');
                colLine.className = 'table-cell-line vertical';
                colLine.style.position = 'absolute';
                colLine.style.left = `${colX}px`;
                colLine.style.top = '0';
                colLine.style.width = '1px';
                colLine.style.height = '100%';
                colLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                colLine.style.zIndex = '15';
                overlay.appendChild(colLine);
            }
            
            // If the table has a header, add a slightly thicker line below the first row
            if (table.has_header && table.cells.length > 0 && Array.isArray(table.cells[0]) && 
                table.cells[0].length > 0 && table.cells[0][0] && 
                typeof table.cells[0][0] === 'object' && table.cells[0][0].bbox) {
                
                const headerCellY1 = table.cells[0][0].bbox[3];
                const headerY = (headerCellY1 - tableY0) * window.scale;
                
                const headerLine = document.createElement('div');
                headerLine.className = 'table-cell-line header-line';
                headerLine.style.position = 'absolute';
                headerLine.style.left = '0';
                headerLine.style.top = `${headerY}px`;
                headerLine.style.width = '100%';
                headerLine.style.height = '2px'; // Thicker line
                headerLine.style.backgroundColor = 'rgba(99, 102, 241, 0.8)'; // More visible
                headerLine.style.zIndex = '15';
                overlay.appendChild(headerLine);
            }
        }
        // Fallback to evenly spaced grid if no detailed position data
        else {
            console.log('DRAWING METHOD: Using evenly spaced grid as fallback - detailed cell positions unavailable');
            console.log('REASON: None of the detailed positioning methods were available');
            
            // Add a message inside the overlay to inform the user
            const infoMessage = document.createElement('div');
            infoMessage.className = 'table-info-message';
            infoMessage.style.position = 'absolute';
            infoMessage.style.left = '50%';
            infoMessage.style.top = '50%';
            infoMessage.style.transform = 'translate(-50%, -50%)';
            infoMessage.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            infoMessage.style.color = '#4F46E5';
            infoMessage.style.padding = '5px 10px';
            infoMessage.style.borderRadius = '4px';
            infoMessage.style.fontSize = '12px';
            infoMessage.style.fontWeight = 'bold';
            infoMessage.style.whiteSpace = 'nowrap';
            infoMessage.style.zIndex = '16';
            infoMessage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            infoMessage.textContent = 'Approximate grid - exact cell positions unavailable';
            overlay.appendChild(infoMessage);
            
            // Draw horizontal lines (row dividers)
            for (let r = 1; r < rows; r++) {
                const rowLine = document.createElement('div');
                rowLine.className = 'table-cell-line horizontal';
                rowLine.style.position = 'absolute';
                rowLine.style.left = '0';
                rowLine.style.top = `${(r / rows) * overlayHeight}px`;
                rowLine.style.width = '100%';
                rowLine.style.height = '1px';
                rowLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                rowLine.style.zIndex = '15';
                overlay.appendChild(rowLine);
            }
            
            // Draw vertical lines (column dividers)
            for (let c = 1; c < cols; c++) {
                const colLine = document.createElement('div');
                colLine.className = 'table-cell-line vertical';
                colLine.style.position = 'absolute';
                colLine.style.left = `${(c / cols) * overlayWidth}px`;
                colLine.style.top = '0';
                colLine.style.width = '1px';
                colLine.style.height = '100%';
                colLine.style.backgroundColor = 'rgba(99, 102, 241, 0.5)';
                colLine.style.zIndex = '15';
                overlay.appendChild(colLine);
            }
            
            // If the table has a header, add a slightly thicker line below the header row
            if (table.has_header) {
                const headerLine = document.createElement('div');
                headerLine.className = 'table-cell-line header-line';
                headerLine.style.position = 'absolute';
                headerLine.style.left = '0';
                headerLine.style.top = `${overlayHeight / rows}px`;
                headerLine.style.width = '100%';
                headerLine.style.height = '2px'; // Thicker line
                headerLine.style.backgroundColor = 'rgba(99, 102, 241, 0.8)'; // More visible
                headerLine.style.zIndex = '15';
                overlay.appendChild(headerLine);
            }
        }
        
        console.log('=== END DRAWING TABLE CELL GRID ===');
    }
    
    // Function to highlight a specific table on the PDF
    function highlightTableOnPdf(tableIndex) {
        const table = extractedTables[tableIndex];
        if (!table) return;
        
        // Clear existing highlights
        clearTableOverlays();
        
        // Draw the selected table with a different color
        drawTableOverlay(table, tableIndex);
        
        // Update the highlight style to be more prominent
        const overlay = document.querySelector('.table-overlay');
        if (overlay) {
            overlay.style.border = '3px solid rgba(16, 185, 129, 0.9)'; // Green border
            overlay.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'; // Green background
            overlay.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            overlay.style.zIndex = '15'; // Ensure z-index is correct
            
            const label = overlay.querySelector('.table-overlay-label');
            if (label) {
                label.style.backgroundColor = 'rgba(16, 185, 129, 0.9)'; // Green label
                label.style.zIndex = '15'; // Ensure z-index is correct
            }
            
            // Update cell lines to be more visible
            const cellLines = overlay.querySelectorAll('.table-cell-line');
            cellLines.forEach(line => {
                line.style.backgroundColor = 'rgba(16, 185, 129, 0.7)';
                line.style.zIndex = '15'; // Ensure z-index is correct
            });
        }
    }
    
    // Function to view an extracted table in a modal
    function viewExtractedTable(tableIndex) {
        const table = extractedTables[tableIndex];
        if (!table) return;
        
        // Store the current table index in the modal's dataset for the download function
        viewTableModal.dataset.currentTableIndex = tableIndex;
        
        // Create HTML table from the extracted data
        let tableHtml = '<table class="min-w-full divide-y divide-gray-300 border">';
        
        // Get whether the table has a header
        const hasHeader = table.has_header !== undefined ? table.has_header : true;
        
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
        
        // Add table metadata
        const tableInfo = `
            <div class="mb-4 text-sm">
                <div class="font-medium text-gray-700 mb-1">Table Information:</div>
                <div class="grid grid-cols-2 gap-2">
                    <div><span class="text-gray-500">Size:</span> ${table.row_count} rows × ${table.col_count} columns</div>
                    <div><span class="text-gray-500">Position:</span> [${Math.round(table.bbox[0])}, ${Math.round(table.bbox[1])}, ${Math.round(table.bbox[2])}, ${Math.round(table.bbox[3])}]</div>
                    <div><span class="text-gray-500">Has Header:</span> ${hasHeader ? 'Yes' : 'No'}</div>
                </div>
            </div>
        `;
        
        // Set content and show modal
        tableContent.innerHTML = tableInfo + tableHtml;
        viewTableModal.classList.remove('hidden');
    }
    
    // Close table view modal
    if (closeTableViewBtn) {
        closeTableViewBtn.addEventListener('click', () => {
            viewTableModal.classList.add('hidden');
        });
    }
    
    // Download table as CSV
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', () => {
            // Get the currently viewed table
            const tableIndex = parseInt(viewTableModal.dataset.currentTableIndex);
            const table = extractedTables[tableIndex];
            if (!table) return;
            
            // Convert table data to CSV
            const csv = convertTableToCSV(table);
            
            // Create a download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `table_${tableIndex + 1}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    
    // Function to convert table data to CSV format
    function convertTableToCSV(table) {
        if (!table || !table.rows || table.rows.length === 0) return '';
        
        // Get whether the table has a header
        const hasHeader = table.has_header !== undefined ? table.has_header : true;
        
        // Process each row
        const csvRows = table.rows.map(row => {
            // Convert each cell value, handle empty cells and values with commas
            return row.map(cell => {
                // If cell is empty, return empty string
                if (cell === null || cell === undefined || cell === '') return '';
                
                // Convert to string and escape quotes
                const cellStr = String(cell).replace(/"/g, '""');
                
                // If the cell contains commas, quotes, or newlines, wrap in quotes
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr}"`;
                }
                
                return cellStr;
            }).join(',');
        });
        
        // Return the CSV content
        return csvRows.join('\n');
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
        line.style.zIndex = '15'; // Changed from 1000 to 15 to be below modal z-index of 20
        
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
        label.style.zIndex = '15'; // Changed from 1001 to 15 to be below modal z-index of 20
        
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
        line.style.zIndex = '15'; // Changed from 1000 to 15 to be below modal z-index of 20
        
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
    
    // Add event listeners for page changes to update table overlays
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            // Clear table overlays when changing pages
            clearTableOverlays();
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            // Clear table overlays when changing pages
            clearTableOverlays();
        });
    }
    
    if (pageInput) {
        pageInput.addEventListener('change', () => {
            // Clear table overlays when changing pages
            clearTableOverlays();
        });
    }
    
    // Add event listeners for zoom changes to update table overlays
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            // Wait for zoom to apply before redrawing tables
            setTimeout(() => {
                if (extractedTables.length > 0) {
                    drawTablesOnPdf(extractedTables);
                }
            }, 100);
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            // Wait for zoom to apply before redrawing tables
            setTimeout(() => {
                if (extractedTables.length > 0) {
                    drawTablesOnPdf(extractedTables);
                }
            }, 100);
        });
    }
    
    // Listen for custom scale change event if it exists
    document.addEventListener('pdfScaleChanged', () => {
        // Redraw tables when scale changes
        if (extractedTables.length > 0) {
            drawTablesOnPdf(extractedTables);
        }
    });
}); 