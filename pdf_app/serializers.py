from rest_framework import serializers
from pdf_app.models import PythonFunction

class PythonFunctionSerializer(serializers.ModelSerializer):
    """Serializer for the PythonFunction model."""
    
    class Meta:
        model = PythonFunction
        fields = ['id', 'name', 'description', 'function_code', 'created_at', 'updated_at'] 