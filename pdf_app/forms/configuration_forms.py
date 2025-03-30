from django import forms
from django.core.exceptions import ValidationError
import json

from pdf_app.models import Configuration, Document, Field, Table, TableColumn, PythonFunction

class ConfigurationForm(forms.ModelForm):
    """Form for creating and editing configurations."""
    
    name = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                      'placeholder': 'Enter configuration name'}),
        max_length=255,
        required=True
    )
    
    description = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                     'placeholder': 'Enter description', 
                                     'rows': 3}),
        required=False
    )
    
    status = forms.ChoiceField(
        choices=Configuration.STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'}),
        required=True,
        initial='draft'
    )
    
    class Meta:
        model = Configuration
        fields = ['name', 'description', 'status']
        
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
    def clean_name(self):
        # Get the cleaned name value (trimmed whitespace)
        name = self.cleaned_data.get('name', '').strip()
        
        if not name:
            raise ValidationError("Configuration name cannot be empty.")
        
        # Check if a configuration with this name (case insensitive) already exists for ANY user
        query_filter = {'name__iexact': name}
            
        existing_configs = Configuration.objects.filter(**query_filter)
        
        # If we're editing an existing configuration, exclude it from the check
        if self.instance and self.instance.pk:
            existing_configs = existing_configs.exclude(pk=self.instance.pk)
        
        if existing_configs.exists():
            raise ValidationError("A configuration with this name already exists. Please choose a different name.")
        
        return name


class FieldForm(forms.ModelForm):
    """Form for creating and editing field definitions."""
    
    name = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                      'placeholder': 'Enter field name'}),
        max_length=255,
        required=True
    )
    
    field_type = forms.ChoiceField(
        choices=Field.FIELD_TYPE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'}),
        required=True
    )
    
    description = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                     'placeholder': 'Enter description', 
                                     'rows': 2}),
        required=False
    )
    
    is_required = forms.BooleanField(
        widget=forms.CheckboxInput(attrs={'class': 'focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded'}),
        required=False
    )
    
    min_length = forms.IntegerField(
        widget=forms.NumberInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
        required=False
    )
    
    max_length = forms.IntegerField(
        widget=forms.NumberInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
        required=False
    )
    
    regex_pattern = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md',
                                      'placeholder': 'Regular expression pattern'}),
        required=False
    )
    
    default_value = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md',
                                      'placeholder': 'Default value'}),
        required=False
    )
    
    python_function = forms.ModelChoiceField(
        queryset=PythonFunction.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'}),
        required=False,
        empty_label="No Python function"
    )
    
    class Meta:
        model = Field
        fields = ['name', 'field_type', 'description', 'is_required', 'min_length', 
                  'max_length', 'regex_pattern', 'default_value', 'python_function']
        
    def __init__(self, *args, **kwargs):
        self.configuration = kwargs.pop('configuration', None)
        super().__init__(*args, **kwargs)


class TableForm(forms.ModelForm):
    """Form for creating and editing table definitions."""
    
    name = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                      'placeholder': 'Enter table name'}),
        max_length=255,
        required=True
    )
    
    description = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                     'placeholder': 'Enter description', 
                                     'rows': 2}),
        required=False
    )
    
    has_header = forms.BooleanField(
        widget=forms.HiddenInput(),
        required=False,
        initial=True
    )
    
    has_borders = forms.BooleanField(
        widget=forms.HiddenInput(),
        required=False,
        initial=True
    )
    
    class Meta:
        model = Table
        fields = ['name', 'description', 'has_header', 'has_borders']
        
    def __init__(self, *args, **kwargs):
        self.configuration = kwargs.pop('configuration', None)
        super().__init__(*args, **kwargs)


class TableColumnForm(forms.ModelForm):
    """Form for creating and editing table column definitions."""
    
    name = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                      'placeholder': 'Enter column name'}),
        max_length=255,
        required=True
    )
    
    description = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md', 
                                     'placeholder': 'Enter description', 
                                     'rows': 2}),
        required=False
    )
    
    data_type = forms.ChoiceField(
        choices=TableColumn.DATA_TYPE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'}),
        required=True
    )
    
    is_required = forms.BooleanField(
        widget=forms.CheckboxInput(attrs={'class': 'focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded'}),
        required=False
    )
    
    regex_pattern = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md',
                                      'placeholder': 'Regular expression pattern'}),
        required=False
    )
    
    python_function = forms.ModelChoiceField(
        queryset=PythonFunction.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'}),
        required=False,
        empty_label="No Python function"
    )
    
    class Meta:
        model = TableColumn
        fields = ['name', 'description', 'data_type', 'is_required', 'regex_pattern', 'python_function']
        
    def __init__(self, *args, **kwargs):
        self.table = kwargs.pop('table', None)
        super().__init__(*args, **kwargs)


class ConfigurationRunForm(forms.Form):
    """Form for running configurations on documents."""
    
    document = forms.FileField(
        widget=forms.FileInput(attrs={
            'class': 'sr-only',
            'id': 'document-upload',
            'accept': 'application/pdf'
        }),
        required=True,
        help_text="Upload a PDF document to process"
    )
    
    def __init__(self, *args, **kwargs):
        self.configuration = kwargs.pop('configuration', None)
        super().__init__(*args, **kwargs)

    def clean_document(self):
        document = self.cleaned_data.get('document')
        
        # Validate file type is PDF
        if document and not document.name.lower().endswith('.pdf'):
            raise forms.ValidationError("Only PDF files are allowed.")
            
        # Check file size (max 10MB)
        if document and document.size > 10 * 1024 * 1024:
            raise forms.ValidationError("File size cannot exceed 10MB.")
            
        return document 