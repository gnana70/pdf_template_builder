"""
Template forms for PDF Template Builder.
"""
from django import forms
from pdf_app.models import Template, TemplateField, Configuration, TemplatePagePosition

class TemplateForm(forms.ModelForm):
    """Form for Template model."""
    
    class Meta:
        model = Template
        fields = [
            'name', 'configuration', 'description', 'pdf_file',
            'unique_identifier_text', 'identifier_page',
            'unnecessary_page_position', 'unnecessary_page_delta',  # Legacy fields kept for data integrity
            'has_watermarks', 'is_multi_account', 'account_text',
            'is_dot_matrix', 'is_encoded_text', 'has_invisible_text', 'has_page_numbers',
            'first_page_width', 'first_page_height', 'status'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'placeholder': 'Enter template name'
            }),
            'configuration': forms.Select(attrs={
                'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea rounded-md shadow-sm border-gray-300 w-full',
                'rows': '3',
                'placeholder': 'Template description (optional)'
            }),
            'pdf_file': forms.FileInput(attrs={
                'class': 'form-control', 
                'accept': 'application/pdf'
            }),
            'unique_identifier_text': forms.TextInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'placeholder': 'Text used to uniquely identify this template'
            }),
            'identifier_page': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'min': '1'
            }),
            # Legacy fields - hidden in UI but kept in form
            'unnecessary_page_position': forms.Select(attrs={
                'class': 'form-select rounded-md shadow-sm border-gray-300 w-full',
                'style': 'display: none;'
            }),
            'unnecessary_page_delta': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'min': '0',
                'style': 'display: none;'
            }),
            'has_watermarks': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'is_multi_account': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'account_text': forms.TextInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'placeholder': 'Enter account text'
            }),
            'is_dot_matrix': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'is_encoded_text': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'has_invisible_text': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'has_page_numbers': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'first_page_width': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'step': '0.01'
            }),
            'first_page_height': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'step': '0.01'
            }),
            'status': forms.Select(attrs={
                'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            # Filter configurations by user and active status
            self.fields['configuration'].queryset = Configuration.objects.filter(
                created_by=user,
                status='active'
            )


class TemplateFieldForm(forms.ModelForm):
    """Form for TemplateField model."""
    
    custom_name_enabled = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-checkbox'})
    )
    
    class Meta:
        model = TemplateField
        fields = [
            'name', 'custom_name', 'page', 'x', 'y', 'x1', 'y1', 
            'extracted_text', 'ocr_required', 
            'is_table', 'table_settings', 'table_drawn_cells', 'line_points'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'placeholder': 'Field name'
            }),
            'custom_name': forms.TextInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'placeholder': 'Custom field name (optional)'
            }),
            'page': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300',
                'min': '1'
            }),
            'x': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300',
                'step': '0.01'
            }),
            'y': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300',
                'step': '0.01'
            }),
            'x1': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300',
                'step': '0.01'
            }),
            'y1': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300',
                'step': '0.01'
            }),
            'extracted_text': forms.HiddenInput(),
            'ocr_required': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'is_table': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'table_settings': forms.Textarea(attrs={
                'class': 'form-textarea rounded-md shadow-sm border-gray-300 w-full',
                'rows': '3',
                'placeholder': 'Table settings (optional)'
            }),
            'table_drawn_cells': forms.Textarea(attrs={
                'class': 'form-textarea rounded-md shadow-sm border-gray-300 w-full',
                'rows': '3',
                'placeholder': 'Table drawn cells (optional)'
            }),
            'line_points': forms.Textarea(attrs={
                'class': 'form-textarea rounded-md shadow-sm border-gray-300 w-full',
                'rows': '3',
                'placeholder': 'Line points (optional)'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # If the field already has a custom name, set the checkbox as checked
        if self.instance and self.instance.pk and self.instance.custom_name:
            self.initial['custom_name_enabled'] = True


class TemplatePagePositionForm(forms.ModelForm):
    """Form for TemplatePagePosition model."""
    
    class Meta:
        model = TemplatePagePosition
        fields = ['position', 'delta', 'page_number']
        widgets = {
            'position': forms.Select(attrs={
                'class': 'form-select rounded-md shadow-sm border-gray-300 w-full',
            }),
            'delta': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'min': '0'
            }),
            'page_number': forms.NumberInput(attrs={
                'class': 'form-input rounded-md shadow-sm border-gray-300 w-full',
                'min': '1'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add help texts
        self.fields['position'].help_text = 'Select the page position (first, last, or custom page)'
        self.fields['delta'].help_text = 'Enter the delta value for this page position'
        self.fields['page_number'].help_text = 'Enter the page number (only if position is custom)' 