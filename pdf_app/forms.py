from django import forms
from pdf_app.models import Configuration, PythonFunction, Template, TemplateField

class ConfigurationForm(forms.ModelForm):
    """Form for creating and editing configurations"""
    
    class Meta:
        model = Configuration
        fields = ['name', 'description', 'status']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class PythonFunctionForm(forms.ModelForm):
    class Meta:
        model = PythonFunction
        fields = ['name', 'description', 'function_code']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
            'function_code': forms.Textarea(attrs={'rows': 10, 'class': 'font-mono shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
        }

class TemplateForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if self.user:
            self.fields['configuration'].queryset = Configuration.objects.filter(created_by=self.user, status='active')
            
        # Ensure first_page_width and first_page_height are properly initialized with default values
        self.fields['first_page_width'].required = False  # Will be populated from PDF
        self.fields['first_page_height'].required = False  # Will be populated from PDF
            
    class Meta:
        model = Template
        fields = ['name', 'configuration', 'description', 'pdf_file', 'status', 
                 'unique_identifier_text', 'identifier_page', 'first_page_width', 'first_page_height',
                 'has_watermarks', 'is_multi_account', 'is_dot_matrix', 'is_encoded_text',
                 'has_invisible_text', 'has_page_numbers', 'account_text']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'configuration': forms.Select(attrs={'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'}),
            'description': forms.Textarea(attrs={'class': 'form-textarea rounded-md shadow-sm border-gray-300 w-full', 'rows': '3'}),
            'pdf_file': forms.FileInput(attrs={'class': 'form-control', 'accept': 'application/pdf'}),
            'status': forms.Select(attrs={'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'}),
            'unique_identifier_text': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'identifier_page': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'min': '1'}),
            'first_page_width': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'min': '0'}),
            'first_page_height': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'min': '0'}),
            'account_text': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
        }
        
    def clean(self):
        cleaned_data = super().clean()
        
        # For new templates, PDF is required
        if not self.instance.pk and not cleaned_data.get('pdf_file'):
            self.add_error('pdf_file', 'PDF file is required when creating a new template')
        
        # Validate dimensions are properly set if PDF is present
        if cleaned_data.get('pdf_file') or (self.instance.pk and self.instance.pdf_file):
            width = cleaned_data.get('first_page_width')
            height = cleaned_data.get('first_page_height')
            
            # For numeric validation
            if width is not None and width <= 0:
                self.add_error('first_page_width', 'Width must be greater than 0')
                
            if height is not None and height <= 0:
                self.add_error('first_page_height', 'Height must be greater than 0')
                
        return cleaned_data

class TemplateFieldForm(forms.ModelForm):
    """Form for template fields"""
    
    class Meta:
        model = TemplateField
        fields = [
            'name', 'custom_name', 'page', 'x', 'y', 'x1', 'y1', 
            'extracted_text', 'ocr_required', 'python_function',
            'is_table', 'table_settings', 'table_drawn_cells', 'line_points'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'custom_name': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'page': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'min': '1'}),
            'x': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'step': '0.01'}),
            'y': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'step': '0.01'}),
            'x1': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'step': '0.01'}),
            'y1': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full', 'step': '0.01'}),
            'extracted_text': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'python_function': forms.Select(attrs={'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'}),
            'is_table': forms.CheckboxInput(attrs={'class': 'form-checkbox'}),
            'table_settings': forms.HiddenInput(),
            'table_drawn_cells': forms.HiddenInput(),
            'line_points': forms.HiddenInput(),
        } 