// PDF.js initialization
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;

// Set workerSrc property
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Function to render a page
function renderPage(num) {
    pageRendering = true;
    
    // Get required elements 
    const loadingStatus = document.getElementById('loading-status');
    const pdfContainer = document.getElementById('pdf-container');
    const pageInputElement = document.getElementById('page-input');
    const zoomLevelElement = document.getElementById('zoom-level');
    
    // Check if essential elements exist
    if (!pdfContainer) {
        console.error('PDF container not found');
        return;
    }
    
    // Update loading status if element exists
    if (loadingStatus) {
        loadingStatus.textContent = 'Rendering page...';
    }
    
    // Remove any existing canvas
    const existingCanvas = pdfContainer.querySelector('canvas');
    if (existingCanvas) {
        pdfContainer.removeChild(existingCanvas);
    }
    
    // Create a new canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    pdfContainer.appendChild(canvas);
    
    // Get the page
    pdfDoc.getPage(num).then(function(page) {
        // Calculate viewport
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        
        // Wait for rendering to finish
        renderTask.promise.then(function() {
            pageRendering = false;
            
            // Update status if element exists
            if (loadingStatus) {
                loadingStatus.textContent = 'Page rendered.';
            }
            
            // Hide loading spinner if element exists
            const pdfLoading = document.getElementById('pdf-loading');
            if (pdfLoading) {
                pdfLoading.style.display = 'none';
            }
            
            // If another page is pending, render it
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
    
    // Update page counters if they exist
    if (pageInputElement) {
        pageInputElement.value = num;
    }
    
    if (zoomLevelElement) {
        zoomLevelElement.textContent = Math.round(scale * 100) + '%';
    }
}

// Function to load PDF
function loadPDF(url, updateDimensions = false) {
    // Get required elements
    const pdfLoading = document.getElementById('pdf-loading');
    const loadingStatus = document.getElementById('loading-status');
    const pageCountElement = document.getElementById('page-count');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    // Show loading indicator if element exists
    if (pdfLoading) {
        pdfLoading.style.display = 'flex';
    }
    
    // Update loading status if element exists
    if (loadingStatus) {
        loadingStatus.textContent = 'Loading PDF...';
    }
    
    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdfDoc = pdf;
        
        // Update page count if element exists
        if (pageCountElement) {
            pageCountElement.textContent = pdf.numPages;
        }
        
        // If we need to update dimensions, get first page dimensions
        if (updateDimensions) {
            // Get first page to extract dimensions
            pdf.getPage(1).then(function(page) {
                const viewport = page.getViewport({ scale: 1.0 });
                const width = Math.round(viewport.width);
                const height = Math.round(viewport.height);
                
                // Update width and height input fields if they exist
                const firstPageWidthInput = document.getElementById('id_first_page_width');
                const firstPageHeightInput = document.getElementById('id_first_page_height');
                
                if (firstPageWidthInput) {
                    firstPageWidthInput.value = width;
                    // Trigger change event to ensure form validation recognizes the change
                    const changeEvent = new Event('change', { bubbles: true });
                    firstPageWidthInput.dispatchEvent(changeEvent);
                    
                    // Highlight the input field
                    firstPageWidthInput.classList.add('border-green-500');
                    setTimeout(() => {
                        firstPageWidthInput.classList.remove('border-green-500');
                    }, 3000);
                }
                
                if (firstPageHeightInput) {
                    firstPageHeightInput.value = height;
                    // Trigger change event to ensure form validation recognizes the change
                    const changeEvent = new Event('change', { bubbles: true });
                    firstPageHeightInput.dispatchEvent(changeEvent);
                    
                    // Highlight the input field
                    firstPageHeightInput.classList.add('border-green-500');
                    setTimeout(() => {
                        firstPageHeightInput.classList.remove('border-green-500');
                    }, 3000);
                }
                
                // Show dimensions status message
                const dimensionsStatus = document.getElementById('dimensions-status');
                if (dimensionsStatus) {
                    dimensionsStatus.textContent = `Dimensions automatically extracted from PDF: ${width} × ${height} px`;
                    dimensionsStatus.classList.remove('hidden');
                    dimensionsStatus.classList.add('text-green-600');
                }
                
                // Update page dimensions display if it exists
                const pageDimensionsElement = document.getElementById('page-dimensions');
                if (pageDimensionsElement) {
                    pageDimensionsElement.textContent = `${width} × ${height} px`;
                    pageDimensionsElement.classList.add('font-bold');
                }
                
                // Log dimensions
                console.log(`First page dimensions: ${width} × ${height} px`);
            });
        }
        
        // Initial page rendering
        renderPage(pageNum);
        
        // Enable navigation buttons if they exist
        if (prevPageBtn) {
            prevPageBtn.disabled = pageNum <= 1;
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
        }
    }).catch(function(error) {
        console.error('Error loading PDF:', error);
        
        // Update error messages if elements exist
        if (loadingStatus) {
            loadingStatus.textContent = 'Error loading PDF.';
        }
        
        if (pdfLoading) {
            pdfLoading.style.display = 'none';
        }
    });
}

// Initialize PDF viewer controls
function initPdfViewer() {
    // Check if PDF viewer controls exist before initializing them
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInput = document.getElementById('page-input');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    // Only initialize controls if they exist
    if (!prevPageBtn || !nextPageBtn || !pageInput || !zoomInBtn || !zoomOutBtn) {
        console.log('PDF viewer controls not found. Skipping PDF viewer initialization.');
        return;
    }
    
    // Go to previous page
    prevPageBtn.addEventListener('click', function() {
        if (pageNum <= 1) return;
        pageNum--;
        renderPage(pageNum);
        this.disabled = pageNum <= 1;
        nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
    });
    
    // Go to next page
    nextPageBtn.addEventListener('click', function() {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
        pageNum++;
        renderPage(pageNum);
        this.disabled = pageNum >= pdfDoc.numPages;
        prevPageBtn.disabled = pageNum <= 1;
    });
    
    // Handle page input
    pageInput.addEventListener('change', function() {
        const num = parseInt(this.value);
        if (num > 0 && num <= pdfDoc.numPages) {
            pageNum = num;
            renderPage(pageNum);
            prevPageBtn.disabled = pageNum <= 1;
            nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
        } else {
            this.value = pageNum;
        }
    });
    
    // Zoom in
    zoomInBtn.addEventListener('click', function() {
        if (scale >= 3.0) return;
        scale += 0.25;
        renderPage(pageNum);
    });
    
    // Zoom out
    zoomOutBtn.addEventListener('click', function() {
        if (scale <= 0.25) return;
        scale -= 0.25;
        renderPage(pageNum);
    });
} 