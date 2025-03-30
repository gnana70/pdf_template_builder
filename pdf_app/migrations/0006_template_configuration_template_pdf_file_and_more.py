# Generated by Django 5.1.7 on 2025-03-29 17:54

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pdf_app', '0005_field_python_function_tablecolumn_python_function'),
    ]

    operations = [
        migrations.AddField(
            model_name='template',
            name='configuration',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='templates', to='pdf_app.configuration', verbose_name='Configuration'),
        ),
        migrations.AddField(
            model_name='template',
            name='pdf_file',
            field=models.FileField(blank=True, null=True, upload_to='templates/', verbose_name='PDF File'),
        ),
        migrations.AlterField(
            model_name='template',
            name='name',
            field=models.CharField(max_length=255, unique=True, verbose_name='Name'),
        ),
        migrations.CreateModel(
            name='TemplateField',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Field Name')),
                ('custom_name', models.CharField(blank=True, max_length=255, verbose_name='Custom Name')),
                ('x', models.FloatField(verbose_name='X Coordinate')),
                ('y', models.FloatField(verbose_name='Y Coordinate')),
                ('x1', models.FloatField(verbose_name='Width')),
                ('y1', models.FloatField(verbose_name='Height')),
                ('page', models.IntegerField(default=1, verbose_name='Page')),
                ('extracted_text', models.TextField(blank=True, verbose_name='Extracted Text')),
                ('template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fields', to='pdf_app.template', verbose_name='Template')),
            ],
            options={
                'verbose_name': 'Template Field',
                'verbose_name_plural': 'Template Fields',
                'ordering': ['template', 'name'],
            },
        ),
    ]
