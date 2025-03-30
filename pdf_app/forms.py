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
    class Meta:
        model = Template
        fields = ['name', 'configuration', 'description', 'pdf_file']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'configuration': forms.Select(attrs={'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'}),
            'description': forms.Textarea(attrs={'class': 'form-textarea rounded-md shadow-sm border-gray-300 w-full', 'rows': '3'}),
            'pdf_file': forms.FileInput(attrs={'class': 'form-control', 'accept': 'application/pdf'}),
        }

class TemplateFieldForm(forms.ModelForm):
    custom_name_enabled = forms.BooleanField(required=False, widget=forms.CheckboxInput(attrs={'class': 'form-checkbox'}))
    
    class Meta:
        model = TemplateField
        fields = ['name', 'custom_name', 'page', 'x', 'y', 'x1', 'y1', 'python_function']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'custom_name': forms.TextInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300 w-full'}),
            'page': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300', 'min': '1'}),
            'x': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300', 'step': '0.01'}),
            'y': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300', 'step': '0.01'}),
            'x1': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300', 'step': '0.01'}),
            'y1': forms.NumberInput(attrs={'class': 'form-input rounded-md shadow-sm border-gray-300', 'step': '0.01'}),
            'python_function': forms.Select(attrs={'class': 'form-select rounded-md shadow-sm border-gray-300 w-full'}),
        } 