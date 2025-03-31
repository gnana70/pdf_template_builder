from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from pdf_app.models import Template, Configuration, PythonFunction, TemplateField
from django.db.models import Count, Max
from django.utils import timezone
import datetime


def home_view(request):
    """
    Home page view with metrics for authenticated users.
    """
    # Only fetch additional data for authenticated users
    if request.user.is_authenticated:
        # Get counts for different models
        template_count = Template.objects.filter(created_by=request.user).count()
        config_count = Configuration.objects.filter(created_by=request.user).count()
        function_count = PythonFunction.objects.count()
        
        # Get last updated dates
        last_template_update = Template.objects.filter(created_by=request.user).aggregate(Max('updated_at'))['updated_at__max']
        last_config_update = Configuration.objects.filter(created_by=request.user).aggregate(Max('updated_at'))['updated_at__max']
        last_function_update = PythonFunction.objects.aggregate(Max('updated_at'))['updated_at__max']
        
        # Calculate time since last update for templates
        if last_template_update:
            now = timezone.now()
            time_since_template_update = now - last_template_update
            days_since_template_update = time_since_template_update.days
            hours_since_template_update = time_since_template_update.seconds // 3600
            
            if days_since_template_update > 0:
                template_last_updated = f"{days_since_template_update} days ago"
            else:
                template_last_updated = f"{hours_since_template_update} hours ago"
        else:
            template_last_updated = "Never"
            
        # Get active configurations (with status='active')
        active_config_count = Configuration.objects.filter(created_by=request.user, status='active').count()
        
        # Get recent activity (last 5 actions)
        # For simplicity, just showing last 3 templates updated
        recent_templates = Template.objects.filter(created_by=request.user).order_by('-updated_at')[:3]
        
        context = {
            'template_count': template_count,
            'config_count': config_count,
            'function_count': function_count,
            'template_last_updated': template_last_updated,
            'active_config_count': active_config_count,
            'recent_templates': recent_templates,
        }
        
        return render(request, 'home.html', context)
    
    # For non-authenticated users, just render the template without additional context
    return render(request, 'home.html')


@require_http_methods(["GET"])
def login_success(request):
    """
    Redirect to appropriate page after successful login.
    """
    messages.success(request, "Login successful.")
    return redirect('home')


@require_http_methods(["GET"])
def logout_success(request):
    """
    Redirect to appropriate page after successful logout.
    """
    messages.success(request, "You have been logged out successfully.")
    return redirect('home')  
