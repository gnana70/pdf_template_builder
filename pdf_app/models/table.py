"""
Table model for template tables.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from .configuration import Configuration
from .python_function import PythonFunction


class Table(models.Model):
    """Model for tables in templates."""
    
    name = models.CharField(_('Name'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    
    # Configuration relationship
    configuration = models.ForeignKey(
        Configuration,
        on_delete=models.CASCADE,
        related_name='tables',
        verbose_name=_('Configuration')
    )
    
    # Table coordinates on the PDF
    x1 = models.FloatField(_('X1 Coordinate'), blank=True, null=True)
    y1 = models.FloatField(_('Y1 Coordinate'), blank=True, null=True)
    x2 = models.FloatField(_('X2 Coordinate'), blank=True, null=True)
    y2 = models.FloatField(_('Y2 Coordinate'), blank=True, null=True)
    page = models.IntegerField(_('Page Number'), default=1)
    
    # Table detection settings
    has_header = models.BooleanField(_('Has Header'), default=True)
    has_borders = models.BooleanField(_('Has Borders'), default=True)
    
    class Meta:
        verbose_name = _('Table')
        verbose_name_plural = _('Tables')
        ordering = ['configuration', 'page']
        unique_together = [('configuration', 'name')]
        
    def __str__(self):
        return f"{self.configuration.name} - {self.name}"
    
    @property
    def coordinates(self):
        """Return the table coordinates as a dictionary."""
        return {
            'x1': self.x1,
            'y1': self.y1,
            'x2': self.x2,
            'y2': self.y2,
            'page': self.page
        }
    
    def set_coordinates(self, x1, y1, x2, y2, page=1):
        """Set the table coordinates."""
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        self.page = page
        self.save()


class TableColumn(models.Model):
    """Model for columns in a table."""
    
    name = models.CharField(_('Name'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    
    # Table relationship
    table = models.ForeignKey(
        Table,
        on_delete=models.CASCADE,
        related_name='columns',
        verbose_name=_('Table')
    )
    
    # Column order in the table
    order = models.IntegerField(_('Order'), default=0)
    
    # Column coordinates
    x1 = models.FloatField(_('X1 Coordinate'), blank=True, null=True)
    x2 = models.FloatField(_('X2 Coordinate'), blank=True, null=True)
    
    # Column data type
    DATA_TYPE_CHOICES = [
        ('text', _('Text')),
        ('number', _('Number')),
        ('date', _('Date')),
        ('boolean', _('Boolean')),
    ]
    data_type = models.CharField(
        _('Data Type'),
        max_length=20,
        choices=DATA_TYPE_CHOICES,
        default='text'
    )
    
    # Validation settings
    is_required = models.BooleanField(_('Required'), default=False)
    regex_pattern = models.CharField(_('Regex Pattern'), max_length=255, blank=True)
    
    # Python function for custom processing
    python_function = models.ForeignKey(
        PythonFunction,
        on_delete=models.SET_NULL,
        related_name='table_columns',
        verbose_name=_('Python Function'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Table Column')
        verbose_name_plural = _('Table Columns')
        ordering = ['table', 'order']
        unique_together = [('table', 'name')]
        
    def __str__(self):
        return f"{self.table.name} - {self.name}"  
