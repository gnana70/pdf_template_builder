"""
Template model for PDF templates.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from .configuration import Configuration


class Template(models.Model):
    """Model for PDF templates."""
    
    name = models.CharField(_('Name'), max_length=255, unique=True)
    description = models.TextField(_('Description'), blank=True)
    created_at = models.DateTimeField(_('Created At'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Updated At'), auto_now=True)
    
    # Template owner
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='templates',
        verbose_name=_('Created By')
    )
    
    # Project configuration
    configuration = models.ForeignKey(
        Configuration,
        on_delete=models.CASCADE,
        related_name='templates',
        verbose_name=_('Configuration'),
        null=True,
        blank=True
    )
    
    # PDF file for template
    pdf_file = models.FileField(_('PDF File'), upload_to='templates/', null=True, blank=True)
    
    # Unique identifier information
    unique_identifier_text = models.CharField(_('Unique Identifier Text'), max_length=255, blank=True, null=True)
    identifier_page = models.IntegerField(_('Identifier Page'), default=1)
    
    # Template status
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('active', _('Active')),
        ('archived', _('Archived')),
    ]
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    
    # Additional template settings
    is_public = models.BooleanField(_('Public Template'), default=False)
    version = models.IntegerField(_('Version'), default=1)
    
    # Advertisement/Unnecessary page options
    UNNECESSARY_PAGE_CHOICES = [
        ('first', _('First')),
        ('last', _('Last')),
    ]
    unnecessary_page_position = models.CharField(
        _('Unnecessary Page Position'),
        max_length=5,
        choices=UNNECESSARY_PAGE_CHOICES,
        blank=True,
        null=True
    )
    unnecessary_page_delta = models.IntegerField(_('Unnecessary Page Delta'), default=0)
    
    # Watermark and multi-account options
    has_watermarks = models.BooleanField(_('Contains Watermarks'), default=False)
    is_multi_account = models.BooleanField(_('Multi Account Statement'), default=False)
    account_text = models.CharField(_('Account Text'), max_length=255, blank=True)
    
    # Page dimensions
    first_page_width = models.FloatField(_('First Page Width'), default=0)
    first_page_height = models.FloatField(_('First Page Height'), default=0)
    
    class Meta:
        verbose_name = _('Template')
        verbose_name_plural = _('Templates')
        ordering = ['-updated_at']
        permissions = [
            ('can_use_template', _('Can use template')),
            ('can_share_template', _('Can share template')),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Trim whitespace from name before saving
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)
    
    def clone(self, user=None):
        """Create a copy of this template."""
        if user is None:
            user = self.created_by
            
        new_template = Template.objects.create(
            name=f"Copy of {self.name}",
            description=self.description,
            created_by=user,
            configuration=self.configuration,
            pdf_file=self.pdf_file,
            status='draft',
            is_public=False,
            version=1
        )
        
        # Clone related fields - implementation will be added
        # when field model is created
        
        return new_template


class TemplateField(models.Model):
    """Field model for template fields with coordinates"""
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='fields', verbose_name=_('Template'))
    name = models.CharField(_('Field Name'), max_length=255)
    custom_name = models.CharField(_('Custom Name'), max_length=255, blank=True)
    x = models.FloatField(_('X Coordinate'))
    y = models.FloatField(_('Y Coordinate'))
    x1 = models.FloatField(_('Width'))
    y1 = models.FloatField(_('Height'))
    page = models.IntegerField(_('Page'), default=1)
    extracted_text = models.TextField(_('Extracted Text'), blank=True)
    ocr_required = models.BooleanField(_('OCR Required'), default=False)
    # Table extraction fields
    is_table = models.BooleanField(_('Is Table'), default=False)
    table_settings = models.JSONField(_('Table Settings'), null=True, blank=True)
    table_drawn_cells = models.JSONField(_('Table Drawn Cells'), null=True, blank=True)
    line_points = models.JSONField(_('Line Points'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('Template Field')
        verbose_name_plural = _('Template Fields')
        ordering = ['template', 'name']
    
    def __str__(self):
        return f"{self.template.name} - {self.name}"


class TemplateImage(models.Model):
    """Model for storing PDF template extracted images"""
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='images', verbose_name=_('Template'))
    name = models.CharField(_('Image Name'), max_length=255)
    page = models.IntegerField(_('Page Number'))
    image_data = models.TextField(_('Image Data'))  # Base64 encoded image
    width = models.IntegerField(_('Width'), default=0)
    height = models.IntegerField(_('Height'), default=0)
    format = models.CharField(_('Format'), max_length=10)
    is_logo = models.BooleanField(_('Is Logo'), default=False)
    is_signature = models.BooleanField(_('Is Signature'), default=False)
    created_at = models.DateTimeField(_('Created At'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Template Image')
        verbose_name_plural = _('Template Images')
        ordering = ['template', 'page', 'name']
    
    def __str__(self):
        return f"{self.template.name} - {self.name} (Page {self.page})"  
