"""
Configuration model for project settings.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User


class Configuration(models.Model):
    """Model for project configurations."""
    
    name = models.CharField(_('Name'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    created_at = models.DateTimeField(_('Created At'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Updated At'), auto_now=True)
    
    # Configuration owner
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='configurations',
        verbose_name=_('Created By')
    )
    
    # Status
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
    
    # Python code for custom data processing
    code = models.TextField(_('Python Code'), blank=True)
    
    class Meta:
        verbose_name = _('Configuration')
        verbose_name_plural = _('Configurations')
        ordering = ['-updated_at']
        
    def __str__(self):
        return self.name


class ConfigurationRun(models.Model):
    """Model for tracking configuration runs."""
    
    configuration = models.ForeignKey(
        Configuration,
        on_delete=models.CASCADE,
        related_name='runs',
        verbose_name=_('Configuration')
    )
    
    # Document being processed
    document = models.ForeignKey(
        'Document',  # Using string to avoid circular import
        on_delete=models.CASCADE,
        related_name='configuration_runs',
        verbose_name=_('Document')
    )
    
    # Run details
    started_at = models.DateTimeField(_('Started At'), auto_now_add=True)
    completed_at = models.DateTimeField(_('Completed At'), blank=True, null=True)
    
    # Status and results
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('running', _('Running')),
        ('completed', _('Completed')),
        ('failed', _('Failed')),
    ]
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Results and error messages
    results = models.JSONField(_('Results'), blank=True, null=True)
    error_message = models.TextField(_('Error Message'), blank=True)
    
    class Meta:
        verbose_name = _('Configuration Run')
        verbose_name_plural = _('Configuration Runs')
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.configuration.name} - {self.document.title}"  
