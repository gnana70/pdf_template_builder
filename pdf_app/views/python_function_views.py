import json
import traceback
import io
import sys
import ast
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView
from django.http import JsonResponse
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from pdf_app.models import PythonFunction, Configuration
from pdf_app.forms import PythonFunctionForm
from pdf_app.serializers import PythonFunctionSerializer
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from urllib.parse import urlencode


class PythonFunctionListView(LoginRequiredMixin, ListView):
    model = PythonFunction
    template_name = 'configurations/python_function_list.html'
    context_object_name = 'python_functions'
    paginate_by = 10  # Add pagination with 10 items per page
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Check if we're in selection mode
        mode = self.request.GET.get('mode')
        return_url = self.request.GET.get('return_url')
        target = self.request.GET.get('target')
        config_id = self.request.GET.get('config_id')
        template_id = self.request.GET.get('template_id')
        
        if mode == 'select' and return_url:
            context['select_mode'] = True
            context['return_url'] = return_url
            
            if target == 'configuration' and config_id:
                context['target'] = 'configuration'
                context['config_id'] = config_id
            
            elif target == 'template_field' and template_id:
                context['target'] = 'template_field'
                context['template_id'] = template_id
        
        return context


class PythonFunctionCreateView(LoginRequiredMixin, CreateView):
    model = PythonFunction
    form_class = PythonFunctionForm
    template_name = 'configurations/python_function_form.html'
    success_url = reverse_lazy('python_function_list')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Pass selection mode parameters if they exist
        if self.request.GET.get('mode') == 'select':
            context['select_mode'] = True
            context['return_url'] = self.request.GET.get('return_url', '')
            context['target'] = self.request.GET.get('target', '')
            context['template_id'] = self.request.GET.get('template_id', '')
            context['config_id'] = self.request.GET.get('config_id', '')
        return context

    def form_valid(self, form):
        # Set the current user as the creator
        form.instance.created_by = self.request.user
        
        # Run linting before saving
        function_code = form.cleaned_data['function_code']
        lint_errors = run_pylint(function_code)
        
        if lint_errors:
            # If there are lint errors, add them to the form as errors
            form.add_error('function_code', f'Linting errors: {lint_errors}')
            return self.form_invalid(form)
        
        # Verify that the code is valid Python syntax
        try:
            ast.parse(function_code)
        except SyntaxError as e:
            form.add_error('function_code', f'Python syntax error: {str(e)}')
            return self.form_invalid(form)
        
        # Save the form
        response = super().form_valid(form)
        
        # Check if we're in selection mode
        if self.request.GET.get('mode') == 'select':
            target = self.request.GET.get('target')
            return_url = self.request.GET.get('return_url')
            
            # If we have a return URL and we're in selection mode, redirect to the selection page
            if return_url:
                # Construct the selection URL with the newly created function
                url_params = {
                    'mode': 'select',
                    'return_url': return_url,
                    'target': target,
                }
                
                if target == 'template_field':
                    url_params['template_id'] = self.request.GET.get('template_id', '')
                elif target == 'configuration':
                    url_params['config_id'] = self.request.GET.get('config_id', '')
                
                select_url = f"{reverse_lazy('python_function_list')}?{urlencode(url_params)}"
                return redirect(select_url)
        
        messages.success(self.request, 'Python function created successfully!')
        return response


class PythonFunctionUpdateView(LoginRequiredMixin, UpdateView):
    model = PythonFunction
    form_class = PythonFunctionForm
    template_name = 'configurations/python_function_form.html'
    success_url = reverse_lazy('python_function_list')

    def form_valid(self, form):
        # Run linting before saving
        function_code = form.cleaned_data['function_code']
        lint_errors = run_pylint(function_code)
        
        if lint_errors:
            # If there are lint errors, add them to the form as errors
            form.add_error('function_code', f'Linting errors: {lint_errors}')
            return self.form_invalid(form)
        
        # Verify that the code is valid Python syntax
        try:
            ast.parse(function_code)
        except SyntaxError as e:
            form.add_error('function_code', f'Python syntax error: {str(e)}')
            return self.form_invalid(form)
        
        messages.success(self.request, 'Python function updated successfully!')
        return super().form_valid(form)


class PythonFunctionDeleteView(LoginRequiredMixin, DeleteView):
    model = PythonFunction
    template_name = 'configurations/python_function_delete.html'
    success_url = reverse_lazy('python_function_list')
    context_object_name = 'python_function'

    def get_object(self, queryset=None):
        """Get the specific python function to delete"""
        # Get the python function or 404 if not found
        obj = get_object_or_404(PythonFunction, pk=self.kwargs['pk'])
        return obj

    def delete(self, request, *args, **kwargs):
        messages.success(request, 'Python function deleted successfully!')
        return super().delete(request, *args, **kwargs)


class PythonFunctionDetailView(LoginRequiredMixin, DetailView):
    model = PythonFunction
    template_name = 'configurations/python_function_detail.html'
    context_object_name = 'python_function'


def execute_python_function(request, pk):
    """Execute a python function and return the results"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    try:
        python_function = get_object_or_404(PythonFunction, pk=pk)
        function_code = python_function.function_code
        
        # Get the arguments code from the POST request
        args_code = request.POST.get('args_code', '')
        
        # Create a safe namespace for execution
        namespace = {}
        
        # Execute the function code in the namespace
        try:
            # Combine function code and parameter code into one block
            combined_code = function_code + "\n\n# Execute function with parameters\n" + args_code
            
            # Capture stdout
            old_stdout = sys.stdout
            redirected_output = io.StringIO()
            sys.stdout = redirected_output
            
            # Execute the combined code in the namespace
            exec(combined_code, namespace)
            
            # Get the stdout content
            output = redirected_output.getvalue()
            
            # Restore stdout
            sys.stdout = old_stdout
            
            # Extract result from the namespace if possible
            result = namespace.get('result', 'No result variable found')
            
            return JsonResponse({
                'success': True,
                'output': output,
                'result': str(result),
                'combined_code': combined_code  # Return the combined code for debugging
            })
            
        except Exception as e:
            # Restore stdout if exception occurred
            if 'old_stdout' in locals():
                sys.stdout = old_stdout
                
            error_traceback = traceback.format_exc()
            return JsonResponse({
                'success': False,
                'output': '',
                'error': str(e),
                'traceback': error_traceback
            })
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def run_pylint(code):
    """Run basic syntax checking instead of full pylint"""
    # Instead of running full pylint, just check for basic syntax errors
    errors = []
    
    # Check basic syntax by parsing the code
    try:
        ast.parse(code)
    except SyntaxError as e:
        return [f"Syntax error at line {e.lineno}: {e.msg}"]
    
    # Basic security and best practice checks
    if "import os" in code or "import sys" in code:
        errors.append("Security warning: Importing system modules like 'os' and 'sys' is restricted")
    
    if "open(" in code:
        errors.append("Security warning: File operations using 'open()' are restricted")
    
    if "__import__" in code:
        errors.append("Security warning: Dynamic imports using '__import__' are restricted")
    
    return errors


def execute_raw_python_code(request):
    """Execute raw Python code provided in the request body"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    try:
        # Get the code and arguments from the POST request
        data = json.loads(request.body)
        function_code = data.get('code', '')
        args_code = data.get('args_code', '')
        
        if not function_code:
            return JsonResponse({
                'success': False,
                'error': 'No code provided'
            })
        
        # Create a safe namespace for execution
        namespace = {}
        
        # Execute the function code in the namespace
        try:
            # Combine function code and parameter code into one block
            combined_code = function_code + "\n\n# Execute function with parameters\n" + args_code
            
            # Capture stdout
            old_stdout = sys.stdout
            redirected_output = io.StringIO()
            sys.stdout = redirected_output
            
            # Execute the combined code in the namespace
            exec(combined_code, namespace)
            
            # Get the stdout content
            output = redirected_output.getvalue()
            
            # Restore stdout
            sys.stdout = old_stdout
            
            # Extract result from the namespace if possible
            result = namespace.get('result', 'No result variable found')
            
            return JsonResponse({
                'success': True,
                'output': output,
                'result': str(result),
                'combined_code': combined_code  # Return the combined code for debugging
            })
            
        except Exception as e:
            # Restore stdout if exception occurred
            if 'old_stdout' in locals():
                sys.stdout = old_stdout
                
            error_traceback = traceback.format_exc()
            return JsonResponse({
                'success': False,
                'output': '',
                'error': str(e),
                'traceback': error_traceback
            })
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


class PythonFunctionViewSet(viewsets.ModelViewSet):
    """API endpoint for Python functions."""
    queryset = PythonFunction.objects.all().order_by('-updated_at')
    serializer_class = PythonFunctionSerializer
    permission_classes = [IsAuthenticated]


@login_required
@require_POST
def attach_python_function(request):
    """Attach a Python function to a configuration"""
    try:
        data = json.loads(request.body)
        function_id = data.get('function_id')
        config_id = data.get('config_id')
        
        if not function_id or not config_id:
            return JsonResponse({'success': False, 'error': 'Missing function_id or config_id'})
        
        # Get the configuration
        try:
            configuration = Configuration.objects.get(id=config_id, created_by=request.user)
        except Configuration.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Configuration not found'})
        
        # Get the Python function
        try:
            python_function = PythonFunction.objects.get(id=function_id)
        except PythonFunction.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Python function not found'})
        
        # Set the function code to the configuration's code field
        configuration.code = python_function.function_code
        configuration.save()
        
        return JsonResponse({'success': True})
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}) 