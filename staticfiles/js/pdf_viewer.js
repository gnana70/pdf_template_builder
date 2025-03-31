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
    document.getElementById('loading-status').textContent = 'Rendering page...';
    
    // Remove any existing canvas
    const pdfContainer = document.getElementById('pdf-container');
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
            document.getElementById('loading-status').textContent = 'Page rendered.';
            
            // Hide loading spinner
            document.getElementById('pdf-loading').style.display = 'none';
            
            // If another page is pending, render it
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
    
    // Update page counters
    document.getElementById('page-input').value = num;
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
}

// Function to load PDF
function loadPDF(url) {
    document.getElementById('pdf-loading').style.display = 'flex';
    document.getElementById('loading-status').textContent = 'Loading PDF...';
    
    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdfDoc = pdf;
        document.getElementById('page-count').textContent = pdf.numPages;
        
        // Initial page rendering
        renderPage(pageNum);
        
        // Enable navigation buttons
        document.getElementById('prev-page').disabled = pageNum <= 1;
        document.getElementById('next-page').disabled = pageNum >= pdfDoc.numPages;
    }).catch(function(error) {
        console.error('Error loading PDF:', error);
        document.getElementById('loading-status').textContent = 'Error loading PDF.';
        document.getElementById('pdf-loading').style.display = 'none';
    });
}

// Initialize PDF viewer controls
function initPdfViewer() {
    // Go to previous page
    document.getElementById('prev-page').addEventListener('click', function() {
        if (pageNum <= 1) return;
        pageNum--;
        renderPage(pageNum);
        this.disabled = pageNum <= 1;
        document.getElementById('next-page').disabled = pageNum >= pdfDoc.numPages;
    });
    
    // Go to next page
    document.getElementById('next-page').addEventListener('click', function() {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
        pageNum++;
        renderPage(pageNum);
        this.disabled = pageNum >= pdfDoc.numPages;
        document.getElementById('prev-page').disabled = pageNum <= 1;
    });
    
    // Handle page input
    document.getElementById('page-input').addEventListener('change', function() {
        const num = parseInt(this.value);
        if (num > 0 && num <= pdfDoc.numPages) {
            pageNum = num;
            renderPage(pageNum);
            document.getElementById('prev-page').disabled = pageNum <= 1;
            document.getElementById('next-page').disabled = pageNum >= pdfDoc.numPages;
        } else {
            this.value = pageNum;
        }
    });
    
    // Zoom in
    document.getElementById('zoom-in').addEventListener('click', function() {
        if (scale >= 3.0) return;
        scale += 0.25;
        renderPage(pageNum);
    });
    
    // Zoom out
    document.getElementById('zoom-out').addEventListener('click', function() {
        if (scale <= 0.25) return;
        scale -= 0.25;
        renderPage(pageNum);
    });
} 