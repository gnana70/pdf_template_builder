"""
Forms for managing Python functions.
"""
from django import forms
from pdf_app.models import PythonFunction


class PythonFunctionForm(forms.ModelForm):
    """Form for creating and editing Python functions."""
    
    class Meta:
        model = PythonFunction
        fields = ['name', 'description', 'function_code']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
            'function_code': forms.Textarea(attrs={'rows': 10, 'class': 'font-mono shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'}),
        }
    
    def clean_name(self):
        """Validate that the name is unique."""
        name = self.cleaned_data.get('name')
        
        # If we're editing an existing function, exclude it from the uniqueness check
        if self.instance and self.instance.pk:
            qs = PythonFunction.objects.filter(name=name).exclude(pk=self.instance.pk)
        else:
            qs = PythonFunction.objects.filter(name=name)
            
        if qs.exists():
            raise forms.ValidationError("A Python function with this name already exists. Please choose a unique name.")
            
        return name 