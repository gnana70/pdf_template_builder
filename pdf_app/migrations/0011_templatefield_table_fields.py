# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pdf_app', '0010_template_account_text_template_first_page_height_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='templatefield',
            name='is_table',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='templatefield',
            name='table_settings',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='templatefield',
            name='table_drawn_cells',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='templatefield',
            name='line_points',
            field=models.JSONField(blank=True, null=True),
        ),
    ] 