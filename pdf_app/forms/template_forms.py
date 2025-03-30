"""
Template forms for PDF Template Builder.
"""
from django import forms
from pdf_app.models import Template, TemplateField, Configuration

class TemplateForm(forms.ModelForm):
    """Form for Template model."""
    
    class Meta:
        model = Template
        fields = ['name', 'configuration', 'description', 'pdf_file']
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
        fields = ['name', 'custom_name', 'page', 'x', 'y', 'x1', 'y1', 'extracted_text']
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
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # If the field already has a custom name, set the checkbox as checked
        if self.instance and self.instance.pk and self.instance.custom_name:
            self.initial['custom_name_enabled'] = True 