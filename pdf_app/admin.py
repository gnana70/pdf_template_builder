"""
Admin interface configuration.
"""
from django.contrib import admin
from pdf_app.models import (
    Document, 
    Template, 
    Field, 
    Table, 
    TableColumn, 
    Configuration, 
    ConfigurationRun,
    PythonFunction,
    TemplateField
)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'num_pages', 'uploaded_at')
    list_filter = ('status',)
    search_fields = ('title', 'description')
    readonly_fields = ('uploaded_at', 'updated_at', 'num_pages', 'file_size')


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'configuration', 'created_by', 'created_at', 'has_watermarks', 'is_multi_account')
    list_filter = ('configuration', 'has_watermarks', 'is_multi_account', 'unnecessary_page_position')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'configuration', 'pdf_file', 'status', 'created_by')
        }),
        ('Template Options', {
            'fields': ('unnecessary_page_position', 'unnecessary_page_delta', 
                       'has_watermarks', 'is_multi_account', 'account_text')
        }),
        ('Page Dimensions', {
            'fields': ('first_page_width', 'first_page_height')
        }),
        ('Additional Settings', {
            'fields': ('is_public', 'version')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


class FieldInline(admin.TabularInline):
    model = Field
    extra = 1


@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
    list_display = ('name', 'configuration', 'field_type', 'order')
    list_filter = ('field_type', 'is_required')
    search_fields = ('name', 'configuration__name')


class TableColumnInline(admin.TabularInline):
    model = TableColumn
    extra = 1


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('name', 'configuration', 'page', 'has_header')
    list_filter = ('has_header', 'has_borders')
    search_fields = ('name', 'configuration__name')
    inlines = [TableColumnInline]


@admin.register(TableColumn)
class TableColumnAdmin(admin.ModelAdmin):
    list_display = ('name', 'table', 'data_type', 'order')
    list_filter = ('data_type', 'is_required')
    search_fields = ('name', 'table__name')


@admin.register(Configuration)
class ConfigurationAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'created_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ConfigurationRun)
class ConfigurationRunAdmin(admin.ModelAdmin):
    list_display = ('configuration', 'document', 'status', 'started_at', 'completed_at')
    list_filter = ('status',)
    search_fields = ('configuration__name', 'document__title')
    readonly_fields = ('started_at', 'completed_at')


@admin.register(PythonFunction)
class PythonFunctionAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name', 'description', 'function_code')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'function_code')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class TemplateFieldInline(admin.TabularInline):
    model = TemplateField
    extra = 1


@admin.register(TemplateField)
class TemplateFieldAdmin(admin.ModelAdmin):
    list_display = ('name', 'template', 'custom_name', 'page', 'ocr_required')
    list_filter = ('template', 'page', 'ocr_required')
    search_fields = ('name', 'template__name', 'custom_name')
