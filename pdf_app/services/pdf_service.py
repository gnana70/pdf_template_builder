"""
Service for PDF operations.
"""
import os
import fitz  # PyMuPDF
from django.conf import settings
from pdf_app.models import Document


class PDFService:
    """Service for handling PDF operations."""
    
    @staticmethod
    def extract_text(document):
        """
        Extract text from a PDF document.
        
        Args:
            document: Document model instance
            
        Returns:
            dict: Dictionary with page numbers as keys and extracted text as values
        """
        if not document.file:
            return {}
        
        text_by_page = {}
        file_path = os.path.join(settings.MEDIA_ROOT, document.file.name)
        
        try:
            pdf_document = fitz.open(file_path)
            
            # Update document metadata
            document.num_pages = len(pdf_document)
            document.file_size = os.path.getsize(file_path)
            document.save()
            
            # Extract text from each page
            for page_num, page in enumerate(pdf_document):
                text = page.get_text()
                text_by_page[page_num + 1] = text
                
            return text_by_page
            
        except Exception as e:
            document.status = 'error'
            document.error_message = str(e)
            document.save()
            return {}
    
    @staticmethod
    def extract_text_from_area(document, page_num, x1, y1, x2, y2):
        """
        Extract text from a specific area of a PDF page.
        
        Args:
            document: Document model instance
            page_num: Page number (1-based)
            x1, y1, x2, y2: Coordinates defining the rectangle
            
        Returns:
            str: Extracted text from the specified area
        """
        if not document.file:
            return ""
        
        file_path = os.path.join(settings.MEDIA_ROOT, document.file.name)
        
        try:
            pdf_document = fitz.open(file_path)
            
            # Adjust for 1-based page numbering
            page = pdf_document[page_num - 1]
            
            # Create rectangle
            rect = fitz.Rect(x1, y1, x2, y2)
            
            # Extract text from rectangle
            text = page.get_text("text", clip=rect)
            
            return text
            
        except Exception as e:
            return ""
    
    @staticmethod
    def get_page_image(document, page_num, scale=1.0):
        """
        Get an image of a PDF page.
        
        Args:
            document: Document model instance
            page_num: Page number (1-based)
            scale: Scaling factor for the image
            
        Returns:
            bytes: PNG image data
        """
        if not document.file:
            return None
        
        file_path = os.path.join(settings.MEDIA_ROOT, document.file.name)
        
        try:
            pdf_document = fitz.open(file_path)
            
            # Adjust for 1-based page numbering
            page = pdf_document[page_num - 1]
            
            # Render page to pixmap
            matrix = fitz.Matrix(scale, scale)
            pixmap = page.get_pixmap(matrix=matrix)
            
            # Convert to PNG
            png_data = pixmap.tobytes("png")
            
            return png_data
            
        except Exception as e:
            return None  
