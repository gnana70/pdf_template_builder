from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.views.decorators.http import require_http_methods


def home_view(request):
    """
    Home page view.
    """
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
