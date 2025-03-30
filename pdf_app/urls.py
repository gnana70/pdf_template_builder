"""
URL configuration for pdf_app application.
"""
from django.urls import path, include
from django.contrib.auth import views as auth_views
from rest_framework.routers import DefaultRouter

from pdf_app.views import auth_views as custom_auth_views
from pdf_app.views import template_views, field_views, table_views, configuration_views
from .views.python_function_views import (
    PythonFunctionListView, PythonFunctionCreateView, PythonFunctionUpdateView,
    PythonFunctionDeleteView, PythonFunctionDetailView, execute_python_function,
    execute_raw_python_code, PythonFunctionViewSet, attach_python_function
)
from pdf_app.views.template_views import (
    template_list, template_create, template_update, template_delete,
    template_configure, template_field_create, template_field_update, 
    template_field_delete, extract_text_from_area, get_pdf_file, get_configuration_data
)

# Create a router for our API viewsets
router = DefaultRouter()
# Add routes as they are implemented
router.register(r'python-functions', PythonFunctionViewSet)

urlpatterns = [
    # Home page
    path('', custom_auth_views.home_view, name='home'),
    
    # Authentication URLs
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(http_method_names=['get', 'post']), name='logout'),
    path('login/success/', custom_auth_views.login_success, name='login_success'),
    path('logout/success/', custom_auth_views.logout_success, name='logout_success'),
    
    # Configuration URLs
    path('configurations/', configuration_views.configuration_list, name='configuration_list'),
    path('configurations/create/', configuration_views.configuration_create, name='configuration_create'),
    path('configurations/<int:pk>/', configuration_views.configuration_detail, name='configuration_detail'),
    path('configurations/<int:pk>/edit/', configuration_views.configuration_edit, name='configuration_edit'),
    path('configurations/<int:pk>/delete/', configuration_views.configuration_delete, name='configuration_delete'),
    path('configurations/<int:pk>/run/', configuration_views.configuration_run, name='configuration_run'),
    path('configuration-runs/<int:pk>/', configuration_views.configuration_run_detail, name='configuration_run_detail'),
    path('configuration-runs/<int:pk>/download/', configuration_views.configuration_run_download, name='configuration_run_download'),
    path('configuration-runs/<int:pk>/download-csv/', configuration_views.configuration_run_download_csv, name='configuration_run_download_csv'),
    
    # Field URLs
    path('configurations/<int:config_pk>/fields/create/', configuration_views.field_create, name='field_create'),
    path('fields/<int:pk>/edit/', configuration_views.field_edit, name='field_edit'),
    path('fields/<int:pk>/delete/', configuration_views.field_delete, name='field_delete'),
    
    # Table URLs
    path('configurations/<int:config_pk>/tables/create/', configuration_views.table_create, name='table_create'),
    path('tables/<int:pk>/', configuration_views.table_detail, name='table_detail'),
    path('tables/<int:pk>/edit/', configuration_views.table_edit, name='table_edit'),
    path('tables/<int:pk>/delete/', configuration_views.table_delete, name='table_delete'),
    
    # Table Column URLs
    path('tables/<int:table_pk>/columns/create/', configuration_views.table_column_create, name='table_column_create'),
    path('columns/<int:pk>/edit/', configuration_views.table_column_edit, name='table_column_edit'),
    path('columns/<int:pk>/delete/', configuration_views.table_column_delete, name='table_column_delete'),
    
    # Python Function URLs
    path('python-functions/', PythonFunctionListView.as_view(), name='python_function_list'),
    path('python-functions/create/', PythonFunctionCreateView.as_view(), name='python_function_create'),
    path('python-functions/<int:pk>/', PythonFunctionDetailView.as_view(), name='python_function_detail'),
    path('python-functions/<int:pk>/edit/', PythonFunctionUpdateView.as_view(), name='python_function_update'),
    path('python-functions/<int:pk>/delete/', PythonFunctionDeleteView.as_view(), name='python_function_delete'),
    path('python-functions/<int:pk>/execute/', execute_python_function, name='python_function_execute'),
    path('python-functions/execute-raw/', execute_raw_python_code, name='execute_raw_python_code'),
    path('python-functions/attach/', attach_python_function, name='attach_python_function'),
    
    # Template URL patterns
    path('templates/', template_list, name='template_list'),
    path('templates/create/', template_create, name='template_create'),
    path('templates/<int:pk>/update/', template_update, name='template_update'),
    path('templates/<int:pk>/delete/', template_delete, name='template_delete'),
    path('templates/<int:pk>/configure/', template_configure, name='template_configure'),
    path('templates/<int:template_pk>/fields/create/', template_field_create, name='template_field_create'),
    path('templates/fields/<int:pk>/update/', template_field_update, name='template_field_update'),
    path('templates/fields/<int:pk>/delete/', template_field_delete, name='template_field_delete'),
    path('templates/<int:template_pk>/extract-text/', extract_text_from_area, name='extract_text_from_area'),
    path('templates/<int:template_pk>/pdf/', get_pdf_file, name='get_template_pdf'),
    path('templates/<int:template_pk>/get-configuration-data/', get_configuration_data, name='get_configuration_data'),
    
    # API urls
    path('api/', include(router.urls)),
    
    # Include additional paths as they are implemented
    # For example, path('templates/', template_views.template_list, name='template-list'),
] 