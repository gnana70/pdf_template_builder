"""
Field model for template fields.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from .configuration import Configuration
from .python_function import PythonFunction


class Field(models.Model):
    """Model for template fields."""
    
    # Field types
    TEXT = 'text'
    NUMBER = 'number'
    DATE = 'date'
    CHECKBOX = 'checkbox'
    SELECTION = 'selection'
    
    FIELD_TYPE_CHOICES = [
        (TEXT, _('Text')),
        (NUMBER, _('Number')),
        (DATE, _('Date')),
        (CHECKBOX, _('Checkbox')),
        (SELECTION, _('Selection')),
    ]
    
    name = models.CharField(_('Name'), max_length=255)
    field_type = models.CharField(
        _('Field Type'),
        max_length=20,
        choices=FIELD_TYPE_CHOICES,
        default=TEXT
    )
    description = models.TextField(_('Description'), blank=True)
    
    # Configuration relationship
    configuration = models.ForeignKey(
        Configuration,
        on_delete=models.CASCADE,
        related_name='fields',
        verbose_name=_('Configuration'),
        null=True
    )
    
    # Field order in the template
    order = models.IntegerField(_('Order'), default=0)
    
    # Field coordinates on the PDF
    x1 = models.FloatField(_('X1 Coordinate'), blank=True, null=True)
    y1 = models.FloatField(_('Y1 Coordinate'), blank=True, null=True)
    x2 = models.FloatField(_('X2 Coordinate'), blank=True, null=True)
    y2 = models.FloatField(_('Y2 Coordinate'), blank=True, null=True)
    page = models.IntegerField(_('Page Number'), default=1)
    
    # Validation settings
    is_required = models.BooleanField(_('Required'), default=False)
    min_length = models.IntegerField(_('Minimum Length'), blank=True, null=True)
    max_length = models.IntegerField(_('Maximum Length'), blank=True, null=True)
    regex_pattern = models.CharField(_('Regex Pattern'), max_length=255, blank=True)
    
    # Additional settings
    options = models.JSONField(_('Options'), blank=True, null=True,
                              help_text=_('Options for selection fields'))
    default_value = models.CharField(_('Default Value'), max_length=255, blank=True)
    
    # Python function for custom processing
    python_function = models.ForeignKey(
        PythonFunction,
        on_delete=models.SET_NULL,
        related_name='fields',
        verbose_name=_('Python Function'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Field')
        verbose_name_plural = _('Fields')
        ordering = ['configuration', 'order']
        
    def __str__(self):
        return f"{self.configuration.name} - {self.name}"
    
    @property
    def coordinates(self):
        """Return the field coordinates as a dictionary."""
        return {
            'x1': self.x1,
            'y1': self.y1,
            'x2': self.x2,
            'y2': self.y2,
            'page': self.page
        }
    
    def set_coordinates(self, x1, y1, x2, y2, page=1):
        """Set the field coordinates."""
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        self.page = page
        self.save()  
