// Template Images Handler

let extractedImages = []; // Store extracted images
let savedImages = []; // Store saved images

// Function to extract images from the PDF
function extractImagesFromPDF(templateId) {
    // Show loading indicator
    toggleImageLoading(true);
    
    fetch(`/templates/${templateId}/extract-images/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                extractedImages = data.images;
                displayExtractedImages(extractedImages);
            } else {
                showErrorMessage(data.error || 'Failed to extract images');
            }
        })
        .catch(error => {
            console.error('Error extracting images:', error);
            showErrorMessage('Error extracting images. Please try again.');
        })
        .finally(() => {
            toggleImageLoading(false);
        });
}

// Function to display extracted images
function displayExtractedImages(images) {
    const container = document.getElementById('extracted-images-container');
    
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (images.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 p-4">No images found in the PDF</p>';
        return;
    }
    
    // Create grid for images
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-4 mt-4';
    
    // Group images by page
    const pageGroups = {};
    images.forEach(img => {
        if (!pageGroups[img.page]) {
            pageGroups[img.page] = [];
        }
        pageGroups[img.page].push(img);
    });
    
    // Process each page group
    Object.keys(pageGroups).forEach(page => {
        const pageSection = document.createElement('div');
        pageSection.className = 'mb-6 col-span-2';
        
        // Add page header
        const pageHeader = document.createElement('h3');
        pageHeader.className = 'text-md font-medium text-gray-900 mb-2 border-b pb-1';
        pageHeader.textContent = `Page ${page} Images`;
        pageSection.appendChild(pageHeader);
        
        // Create image grid for this page
        const pageGrid = document.createElement('div');
        pageGrid.className = 'grid grid-cols-2 gap-4';
        
        // Add images from this page
        pageGroups[page].forEach(img => {
            const imageCard = createImageCard(img);
            pageGrid.appendChild(imageCard);
        });
        
        pageSection.appendChild(pageGrid);
        grid.appendChild(pageSection);
    });
    
    container.appendChild(grid);
}

// Create an image card element
function createImageCard(imageData) {
    const card = document.createElement('div');
    card.className = 'border rounded-md p-3 bg-white shadow-sm';
    card.dataset.imageIndex = imageData.index;
    card.dataset.page = imageData.page;
    
    // Image container with max height
    const imgContainer = document.createElement('div');
    imgContainer.className = 'flex justify-center items-center h-40 overflow-hidden mb-2';
    
    // The image itself
    const img = document.createElement('img');
    img.src = imageData.base64;
    img.className = 'max-h-full max-w-full object-contain';
    img.alt = `Image ${imageData.index} from page ${imageData.page}`;
    imgContainer.appendChild(img);
    
    // Image info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'text-xs text-gray-600 mb-2';
    infoDiv.innerHTML = `
        <div>Format: ${imageData.format}</div>
        <div>Size: ${imageData.width}×${imageData.height}px</div>
    `;
    
    // Save form
    const form = document.createElement('div');
    form.className = 'mt-2';
    
    // Name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input rounded-md shadow-sm border-gray-300 w-full text-sm mb-2';
    nameInput.placeholder = 'Image name';
    nameInput.value = `Image_p${imageData.page}_${imageData.index}`;
    
    // Type selection
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-select rounded-md shadow-sm border-gray-300 w-full text-sm mb-2';
    
    // Add options
    const options = [
        { value: 'image', text: 'Regular Image' },
        { value: 'logo', text: 'Logo' },
        { value: 'signature', text: 'Signature' }
    ];
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        typeSelect.appendChild(opt);
    });
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
    saveBtn.innerHTML = '<i class="fas fa-save mr-1"></i> Save Image';
    
    // Add click event
    saveBtn.addEventListener('click', function() {
        saveImage(
            imageData,
            nameInput.value,
            typeSelect.value === 'logo',
            typeSelect.value === 'signature'
        );
    });
    
    // Append all elements
    form.appendChild(nameInput);
    form.appendChild(typeSelect);
    form.appendChild(saveBtn);
    
    // Append to card
    card.appendChild(imgContainer);
    card.appendChild(infoDiv);
    card.appendChild(form);
    
    return card;
}

// Function to save an image
function saveImage(imageData, name, isLogo, isSignature) {
    // Get template ID from URL
    const urlParts = window.location.pathname.split('/');
    let templateId;
    
    if (window.location.pathname.includes('/update/')) {
        // For update template page
        templateId = urlParts[urlParts.indexOf('templates') + 1];
    } else {
        // For create template page - use from hidden field
        const hiddenTemplateId = document.getElementById('template-id');
        if (hiddenTemplateId) {
            templateId = hiddenTemplateId.value;
        }
    }
    
    if (!templateId) {
        showErrorMessage('Template ID not found. Please save the template first.');
        return;
    }
    
    // Show loading
    toggleImageLoading(true);
    
    // Prepare data
    const data = {
        name: name,
        page: imageData.page,
        format: imageData.format,
        image_data: imageData.base64,
        width: imageData.width,
        height: imageData.height,
        is_logo: isLogo,
        is_signature: isSignature
    };
    
    // Send to server
    fetch(`/templates/${templateId}/save-image/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage(data.message || 'Image saved successfully');
            loadSavedImages(templateId);
        } else {
            showErrorMessage(data.error || 'Failed to save image');
        }
    })
    .catch(error => {
        console.error('Error saving image:', error);
        showErrorMessage('Error saving image. Please try again.');
    })
    .finally(() => {
        toggleImageLoading(false);
    });
}

// Function to load saved images
function loadSavedImages(templateId) {
    if (!templateId) return;
    
    fetch(`/templates/${templateId}/images/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                savedImages = data.images;
                displaySavedImages(savedImages);
            }
        })
        .catch(error => {
            console.error('Error loading saved images:', error);
        });
}

// Function to display saved images
function displaySavedImages(images) {
    const container = document.getElementById('saved-images-container');
    
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (images.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 p-4">No saved images</p>';
        return;
    }
    
    // Create grid for images
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-4 mt-3';
    
    // Add each image
    images.forEach(img => {
        const card = document.createElement('div');
        card.className = 'border rounded-md p-3 bg-white shadow-sm';
        
        // Image container
        const imgContainer = document.createElement('div');
        imgContainer.className = 'flex justify-center items-center h-32 overflow-hidden mb-2';
        
        // Image
        const imgEl = document.createElement('img');
        imgEl.src = img.image_data;
        imgEl.className = 'max-h-full max-w-full object-contain';
        imgEl.alt = img.name;
        imgContainer.appendChild(imgEl);
        
        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'text-sm';
        
        // Image type badge
        let typeBadge = '';
        if (img.is_logo) {
            typeBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">Logo</span>';
        } else if (img.is_signature) {
            typeBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1">Signature</span>';
        }
        
        infoDiv.innerHTML = `
            <div class="font-medium text-gray-900">${img.name}</div>
            <div class="text-xs text-gray-600 mb-1">
                ${typeBadge}
                Page ${img.page} • ${img.format.toUpperCase()} • ${img.width}×${img.height}px
            </div>
        `;
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'mt-2 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt mr-1"></i> Remove';
        
        // Add click event
        deleteBtn.addEventListener('click', function() {
            deleteImage(img.id);
        });
        
        // Append to card
        card.appendChild(imgContainer);
        card.appendChild(infoDiv);
        card.appendChild(deleteBtn);
        
        // Add to grid
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
}

// Function to delete an image
function deleteImage(imageId) {
    // Get template ID from URL
    const urlParts = window.location.pathname.split('/');
    let templateId;
    
    if (window.location.pathname.includes('/update/')) {
        // For update template page
        templateId = urlParts[urlParts.indexOf('templates') + 1];
    } else {
        // For create template page - use from hidden field
        const hiddenTemplateId = document.getElementById('template-id');
        if (hiddenTemplateId) {
            templateId = hiddenTemplateId.value;
        }
    }
    
    if (!templateId) return;
    
    if (!confirm('Are you sure you want to delete this image?')) {
        return;
    }
    
    // Show loading
    toggleImageLoading(true);
    
    fetch(`/templates/${templateId}/images/${imageId}/delete/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage(data.message || 'Image deleted successfully');
            loadSavedImages(templateId);
        } else {
            showErrorMessage(data.error || 'Failed to delete image');
        }
    })
    .catch(error => {
        console.error('Error deleting image:', error);
        showErrorMessage('Error deleting image. Please try again.');
    })
    .finally(() => {
        toggleImageLoading(false);
    });
}

// Helper function to get CSRF token
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

// Toggle image section loading state
function toggleImageLoading(show) {
    const loader = document.getElementById('image-section-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// Show success message
function showSuccessMessage(message) {
    const container = document.getElementById('image-message-container');
    if (container) {
        container.innerHTML = `
            <div class="rounded-md bg-green-50 p-4 mb-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-check-circle text-green-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-green-800">${message}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <div class="-mx-1.5 -my-1.5">
                            <button type="button" onclick="this.parentNode.parentNode.parentNode.parentNode.remove()" class="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Show error message
function showErrorMessage(message) {
    const container = document.getElementById('image-message-container');
    if (container) {
        container.innerHTML = `
            <div class="rounded-md bg-red-50 p-4 mb-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-circle text-red-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-red-800">${message}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <div class="-mx-1.5 -my-1.5">
                            <button type="button" onclick="this.parentNode.parentNode.parentNode.parentNode.remove()" class="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
} 