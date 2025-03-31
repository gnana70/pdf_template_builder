from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Configuration(models.Model):
    """Configuration model for template extraction settings"""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='configurations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
        
    def save(self, *args, **kwargs):
        # Trim whitespace from name before saving
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

class Field(models.Model):
    """Field model for individual data extraction fields"""
    TYPE_CHOICES = (
        ('string', 'Text'),
        ('number', 'Number'),
        ('float', 'Float'),
        ('date', 'Date'),
    )
    
    configuration = models.ForeignKey(Configuration, on_delete=models.CASCADE, related_name='fields')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='string')
    min_length = models.IntegerField(null=True, blank=True)
    max_length = models.IntegerField(null=True, blank=True)
    pattern = models.CharField(max_length=500, blank=True)
    required = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.configuration.name} - {self.name}"

class Table(models.Model):
    """Table model for tabular data extraction"""
    configuration = models.ForeignKey(Configuration, on_delete=models.CASCADE, related_name='tables')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    x1 = models.FloatField(null=True, blank=True)
    y1 = models.FloatField(null=True, blank=True)
    x2 = models.FloatField(null=True, blank=True)
    y2 = models.FloatField(null=True, blank=True)
    page = models.IntegerField(null=True, blank=True)
    has_header = models.BooleanField(default=True)
    has_borders = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.configuration.name} - {self.name}"

class TableColumn(models.Model):
    """Column model for table columns"""
    DATA_TYPE_CHOICES = (
        ('string', 'Text'),
        ('number', 'Number'),
        ('float', 'Float'),
        ('date', 'Date'),
    )
    
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, default='string')
    is_required = models.BooleanField(default=False)
    regex_pattern = models.CharField(max_length=500, blank=True)
    order = models.IntegerField(default=0)
    python_function = models.ForeignKey('PythonFunction', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.table.name} - {self.name}"

class PythonFunction(models.Model):
    """Python function model for storing user-defined Python functions"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    function_code = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class Template(models.Model):
    """Template model for PDF templates with configuration"""
    name = models.CharField(max_length=255, unique=True)
    configuration = models.ForeignKey(Configuration, on_delete=models.CASCADE, related_name='templates')
    description = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to='templates/')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
        
    def save(self, *args, **kwargs):
        # Trim whitespace from name before saving
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)
        
class TemplateField(models.Model):
    """Field model for template fields with coordinates"""
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='fields')
    name = models.CharField(max_length=255)
    custom_name = models.CharField(max_length=255, blank=True)
    x = models.FloatField()
    y = models.FloatField()
    x1 = models.FloatField()
    y1 = models.FloatField()
    page = models.IntegerField(default=1)
    extracted_text = models.TextField(blank=True)
    python_function = models.ForeignKey('PythonFunction', on_delete=models.SET_NULL, null=True, blank=True)
    # New fields for table extraction
    is_table = models.BooleanField(default=False)
    table_settings = models.JSONField(null=True, blank=True)
    table_drawn_cells = models.JSONField(null=True, blank=True)  # For storing drawn table cell coordinates
    line_points = models.JSONField(null=True, blank=True)  # For storing line points for table extraction
    
    def __str__(self):
        return f"{self.template.name} - {self.name}"
