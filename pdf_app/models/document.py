"""
Document model for PDF files.
"""
import os
from django.db import models
from django.utils.translation import gettext_lazy as _


def document_upload_path(instance, filename):
    """Generate the upload path for document files."""
    # File will be uploaded to MEDIA_ROOT/documents/{id}/{filename}
    return os.path.join('documents', str(instance.id), filename)


class Document(models.Model):
    """Model for storing PDF documents."""
    
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    file = models.FileField(_('PDF File'), upload_to=document_upload_path)
    uploaded_at = models.DateTimeField(_('Uploaded At'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Updated At'), auto_now=True)
    
    # Additional metadata
    num_pages = models.IntegerField(_('Number of Pages'), blank=True, null=True)
    file_size = models.IntegerField(_('File Size (bytes)'), blank=True, null=True)
    
    # Filter status
    STATUS_CHOICES = [
        ('new', _('New')),
        ('processing', _('Processing')),
        ('processed', _('Processed')),
        ('error', _('Error')),
    ]
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='new'
    )
    
    # Error message if processing failed
    error_message = models.TextField(_('Error Message'), blank=True)
    
    class Meta:
        verbose_name = _('Document')
        verbose_name_plural = _('Documents')
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        # Create an ID first if this is a new document
        if not self.id:
            super().save(*args, **kwargs)
            # Update the file path with the new ID
            if self.file:
                filename = os.path.basename(self.file.name)
                self.file.name = os.path.join('documents', str(self.id), filename)
            # Save again with the updated file path
            super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)  
