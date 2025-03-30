"""
Python function model for storing user-defined Python functions.
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class PythonFunction(models.Model):
    """Python function model for storing user-defined Python functions"""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    function_code = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Function creator
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='python_functions',
        verbose_name=_('Created By'),
        null=True,  # Allow null for existing records
    )
    
    class Meta:
        ordering = ['-updated_at', 'name']
        verbose_name = _('Python Function')
        verbose_name_plural = _('Python Functions')
    
    def __str__(self):
        return self.name 