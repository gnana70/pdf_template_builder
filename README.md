# PDF Template Builder

A Django-based application for creating and managing PDF templates for data extraction.

## Features

- PDF upload and storage
- Template editor interface
- Field selection and configuration
- Table detection and extraction
- Project configuration management
- Python code execution for data processing

## Setup

1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate.bat`
   - Unix/MacOS: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements/development.txt`
5. Run migrations: `python manage.py migrate`
6. Create a superuser: `python manage.py createsuperuser`
7. Run the development server: `python manage.py runserver`

## Project Structure

The project follows a standard Django structure with additional organization:

- `pdf_app/` - Main application
  - `models/` - Database models
  - `views/` - View controllers
  - `services/` - Business logic services
  - `forms/` - Form definitions
  - `templates/` - HTML templates
  - `static/` - Static assets (CSS, JS, etc.)
- `config/` - Project configuration
  - `settings/` - Environment-specific settings

## License

This project is licensed under the MIT License. 