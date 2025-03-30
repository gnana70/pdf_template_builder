# PDF Template Builder - Product Requirements Document

## 1. Overview

The PDF Template Builder is a Django-based web application designed to extract, process, and template data from PDF documents. The system enables users to create templates that define specific regions of interest within PDF documents, extract data based on those templates, and apply validation and post-processing rules.

## 2. Database Architecture

### 2.1 Core Models

- **PDFDocument**: Stores uploaded PDF files with metadata
- **ExtractedContent**: Stores text and images extracted from PDFs
- **PDFTemplate**: Defines templates with field coordinates and processing rules
- **TemplateField**: Stores field definitions within a template with precise coordinates
- **ProjectConfiguration**: Defines project-level settings and field definitions
- **FieldDefinition**: Defines field types, validation rules, and processing settings
- **TableConfiguration**: Defines table extraction settings for structured data
- **TableColumnDefinition**: Defines column specifications for extracted tables
- **TableSettings**: Stores user-specific table extraction settings
- **PythonFunction**: Stores reusable Python functions with name, description, and code

### 2.2 User and Access Models

- **UserRole**: Defines role-based permissions
- **CustomUser**: Extended user model with role-based access controls

## 3. Access Controls

### 3.1 Role-Based Permission System

The application implements a fine-grained role-based permission system:

- **UserRole**: Defines section-specific permissions:
  - can_view_templates
  - can_edit_templates
  - can_view_sandbox
  - can_edit_sandbox
  - can_view_hitl
  - can_edit_hitl
  - is_admin

- **CustomUser**: Extends Django's AbstractUser with role-based permissions
  - has_section_permission() method to check permissions for specific sections
  - Integration with Django's built-in authentication system

### 3.2 Permission Enforcement

- LoginRequiredMixin applied to all views requiring authentication
- Permission checks in view dispatch methods:
  ```python
  def dispatch(self, request, *args, **kwargs):
      if not request.user.has_section_permission('templates', 'view'):
          messages.error(request, "You don't have permission to view this template.")
          return redirect('pdf_app:home')
      return super().dispatch(request, *args, **kwargs)
  ```

### 3.3 Authentication Flow

- Custom login view (CustomLoginView) with styled form
- Redirect to login page for unauthorized access
- Login form with username/password authentication
- Session-based authentication with token validation

## 4. Template Management

### 4.1 Template Create/Edit Flow

1. **Template Creation**:
   - Navigate to Template List → "Create Template"
   - Upload a PDF document for templating (required)
   - Provide template name and description
   - Select project configuration
   - Add first and last page identifier (both image and text-based) with coordinates
   - Save template to create the initial record

2. **Template Editing**:
   - Access via Template List → "Edit" or direct URL
   - Split-screen interface with 60% for PDF viewer and 40% for field configuration panel
   - Visual editor for adding/updating fields using rectangle selection
   - Dropdown selection of fields from associated project configuration
   - Field properties automatically populated based on project configuration
   - Option to extract text from PDF using rectangle selection tool
   - Code editor for defining Python post-processing
   - Coordinates automatically captured during rectangle selection

3. **Template Deletion**:
   - Access via Template List → "Delete"
   - Confirmation dialog to prevent accidental deletion
   - Cascading delete for related records

### 4.2 Template Editor Features

- PDF viewer with navigation controls (zoom, rotate, page navigation)
- Rectangle selection tool for defining field coordinates
- Field properties panel for configuration
- Coordinate conversion between screen and PDF coordinate systems
- Preview capability for extracted data
- Integration with project configuration for field definitions
- Side-by-side display of PDF and field configuration panel

## 5. Form Field Management

### 5.1 Field Definition Flow

1. **Adding Fields**:
   - Select field from project configuration dropdown
   - Field type automatically populated based on configuration
   - Draw a selection rectangle on the PDF
   - Extract text from selection or manually enter text
   - Add Python code for processing (optional)
   - Save field to template

2. **Editing Fields**:
   - Select existing field from sidebar
   - Update field properties
   - Redraw selection rectangle if needed
   - Edit extracted text if needed
   - Update Python code if needed
   - Save changes to template

3. **Field Properties**:
   - Name: Selected from project configuration dropdown
   - Type: Automatically set based on project configuration (number, float, string)
   - Text: Extracted from PDF or manually entered
   - Coordinates: Precise position on the PDF page (automatically captured)
   - Page number: The PDF page containing the field
   - Python code: For field-specific processing

### 5.2 Field Types Supported

- Text: General text input
- Number: Numeric input with validation
- Date: Date format with validation
- Checkbox: Binary selection
- Signature: Special field for signatures

## 6. Table Identification and Extraction

### 6.1 Table Detection Flow

1. **Table Region Selection**:
   - Navigate to the Table Extract tool from template editor
   - Select a page containing tables
   - Draw a selection rectangle around the table
   - Configure extraction settings

2. **Table Extraction Settings**:
   - Column detection method:
     - Automatic detection
     - Manual column specification
   - Table borders: with or without borders
   - Text alignment and spacing options
   - Advanced extraction settings based on PyMuPDF capabilities

3. **Advanced Settings**:
   - Header row detection
   - Cell merging options
   - Text cleanup strategies
   - All settings saved against the template

4. **Navigation**:
   - Back button returns to template edit screen
   - All extracted table data and settings are preserved

### 6.2 Extraction Algorithms

The system employs multiple extraction strategies:
- PyMuPDF's built-in table detection (find_tables)
- Table structure analysis based on text positioning
- Character position analysis for column detection
- Fallback methods for hard-to-detect tables

### 6.3 Table Drawing and Visualization

- Visual overlay of detected table structure
- Column boundary visualization
- Interactive adjustment of column boundaries
- Preview of extracted data in tabular format

### 6.4 Error Handling

- Graceful degradation when primary extraction methods fail
- Multiple fallback methods for different table types
- Detailed logging for debugging extraction issues

## 7. Project Configuration

### 7.1 Project Configuration Creation Flow

1. **Creating a Configuration**:
   - Navigate to Project Configurations → "Create New"
   - Provide name and description
   - Save to create the initial record
   - Redirect to the configuration detail page

2. **Adding Field Definitions**:
   - On the configuration detail page, add field definitions
   - Specify field name, field type (number, float, string)
   - Set validation rules (min length, max length, regex syntax)
   - Mark field as required if needed
   - Add Python code for field processing
   - Save to add the field definition to the configuration
   - Options to add, update, and delete field definitions

3. **Adding Table Configurations**:
   - On the configuration detail page, add table configurations
   - Define table name and structure
   - Add column definitions with:
     - Column name
     - Field type (number, float, string)
     - Validation rules (min length, max length, regex syntax)
     - Required field flag
     - Python code for column processing
   - User can add any number of columns to the table configuration
   - Save to add the table configuration

### 7.2 Project Configuration Update Flow

1. **Editing Configuration Properties**:
   - Navigate to Project Configurations → select configuration → "Edit"
   - Update name and description
   - Save changes

2. **Updating Field Definitions**:
   - Select field definition from the list
   - Modify field type, validation rules, required status, or Python code
   - Save changes to update the definition

3. **Updating Table Configurations**:
   - Select table configuration from the list
   - Modify table properties
   - Update column definitions (name, type, validation, required status, Python code)
   - Add or remove columns as needed
   - Save changes to update the configuration

### 7.3 Project Configuration Delete Flow

1. **Deleting a Configuration**:
   - Navigate to Project Configurations → select configuration → "Delete"
   - Confirmation dialog to prevent accidental deletion
   - Cascading delete for related records (field definitions, table configurations)

### 7.4 Project Configuration Usage

- Templates can be associated with project configurations
- Field definitions determine validation rules for template fields
- Table configurations provide structure for table extraction
- Processing rules defined in the configuration are applied during extraction

## 8. Python Code Execution

### 8.1 Code Editor Interface

- Three-panel interface:
  - Function section: CodeMirror-based editor for writing code
  - Run section: Area to call and test functions
  - Output section: Display execution results
- Syntax highlighting and code completion
- Error highlighting and linting
- Each function has unique name and description fields

### 8.2 Execution Flow

1. **Writing Code**:
   - Write Python function definitions in the function section
   - Add detailed description for each function
   - Name functions uniquely for easy reference

2. **Testing Code**:
   - Write test code in the run section to call functions
   - Click "Run Code" to execute on the server
   - Real-time feedback in the output section
   - Linter errors displayed in a separate panel

3. **Saving Code**:
   - Click "Save Code" to store in the database
   - Code is saved with unique name and description
   - Can be referenced in templates and field definitions
   - Applied during data extraction process

### 8.3 Security Considerations

- Server-side execution in controlled environment
- Restricted variable scope
- Error handling and logging
- No access to sensitive system functions

### 8.4 Code Integration

The Python code can be used for:
- Custom data validation
- Field value transformation
- Cross-field validations
- Complex business rules implementation

## 9. PDF Coordinate System

### 9.1 Coordinate Systems

The application manages two coordinate systems:
1. **Screen Coordinates**: Pixel-based coordinates in the browser view
2. **PDF Coordinates**: Point-based coordinates in the PDF document

### 9.2 Conversion Functions

- **convertCoordinates()**: Converts between screen and PDF coordinates
- **convertScreenToPdfCoordinate()**: Specialized function for table extraction

### 9.3 Conversion Process

1. Get the original PDF viewport dimensions
2. Calculate scale factors between PDF and screen
3. Apply scale transformation to coordinates
4. Handle special cases (rotation, negative coordinates)

### 9.4 PDF Controls

- Zoom controls with consistent coordinate conversion
- Page navigation with state persistence
- Rotation controls with coordinate adjustment
- Selection tools with coordinate tracking

## 10. Authentication and Session Management

### 10.1 Login Flow

1. User navigates to login page
2. Enters username and password
3. System validates credentials
4. On success, redirects to home page
5. On failure, displays error message

### 10.2 Logout Flow

1. User clicks logout button
2. System invalidates session
3. Redirects to login page

### 10.3 Session Security

- Django's built-in session security
- CSRF protection for all forms
- Secure cookie handling
- Session timeout configuration

## 11. User Interface Components

### 11.1 Layout Structure

- Clean, modern responsive design with Bootstrap framework
- Sidebar navigation for primary sections
- Card-based content organization
- Modal dialogs for complex interactions
- Consistent spacing and alignment throughout the application

### 11.2 Key UI Components

- PDF viewer with drawing capabilities
- Form editors for configuration
- CodeMirror integration for Python editing
- Toast notifications for system messages
- Progress indicators for long-running operations
- Modern UI elements with subtle animations for better user experience

### 11.3 Themes and Styling

- Comprehensive support for both light and dark modes
- Theme preference stored in user settings
- Automatic detection of system theme preference
- Theme toggle accessible from all pages
- Global CSS variables for consistent theming
- Central color scheme definition that propagates throughout the application
- Animation effects for interactions
- Clear visual hierarchy with consistent typography

### 11.4 UI Design Principles

- Clean, minimal interface that prioritizes content
- Consistent UI patterns across all pages
- Intuitive navigation and clear user flows
- Mobile-friendly design with appropriate touch targets
- Accessible design following WCAG guidelines
- No unnecessary duplication of information or UI elements
- Consistent spacing, typography, and color use

## 12. API Endpoints

The application provides several API endpoints for client-side interactions:

### 12.1 Template API Endpoints

- GET/POST `/api/templates/<id>/`: Get template data or update template
- POST `/api/templates/<id>/fields/save/`: Save template field
- POST `/api/templates/<id>/coordinates/save/`: Save template coordinates
- PUT `/api/fields/<id>/update/`: Update field properties
- DELETE `/api/fields/<id>/delete/`: Delete field

### 12.2 Project Configuration API Endpoints

- GET `/api/project-configurations/<id>/`: Get configuration data
- POST `/api/project-configurations/<id>/fields/`: Add field definition
- GET/PUT/DELETE `/api/field-definitions/<id>/`: Manage field definitions
- POST `/api/project-configurations/<id>/tables/`: Add table configuration
- GET/PUT/DELETE `/api/table-configurations/<id>/`: Manage table configurations

### 12.3 Extraction API Endpoints

- POST `/api/extract-text-from-coordinates/`: Extract text from PDF coordinates
- POST `/api/extract-table-from-coordinates/`: Extract table from PDF coordinates
- POST `/api/detect-images/`: Detect images in PDF

### 12.4 Python Execution API Endpoints

- POST `/execute-python/`: Execute Python code and return output
- POST `/lint-python/`: Lint Python code and return errors
- POST `/save-python-code/`: Save Python code to template

## 13. Technical Architecture

### 13.1 Backend Components

- Django web framework
- SQLite database (can be configured for other databases)
- PyMuPDF for PDF processing
- Python standard library
- Comprehensive code documentation using docstrings and comments

### 13.2 Frontend Components

- HTML5, CSS3, JavaScript with clear separation:
  - HTML files for structure
  - CSS files for styling
  - JavaScript files for behavior
- No inline CSS or JavaScript in templates
- Bootstrap for responsive design
- PDF.js for PDF rendering
- CodeMirror for code editing
- Custom JavaScript organized in modules
- File size limit of 2000 lines per file to maintain readability

### 13.3 Code Organization

- Modular architecture with clear separation of concerns
- Consistent directory structure
- Comprehensive code documentation with docstrings
- Style guides enforced for Python, HTML, CSS, and JavaScript
- Component-based approach for frontend development
- DRY (Don't Repeat Yourself) principles to avoid duplication
- Clear naming conventions across all files

### 13.4 Deployment Architecture

- Standard Django deployment model
- Static files for production environments
- Media storage for uploaded files
- Logging configuration for error tracking
- Environment-specific configuration 

## 14. Application Flow

### 14.1 Complete Application Flow

1. **Project Configuration Flow**:
   - Create Project Configuration with name and description
   - Add fields with detailed properties:
     - Name
     - Field type (number, float, string)
     - Min/max length
     - Regex pattern
     - Required flag
     - Python code
   - Add table configurations with columns, each having:
     - Column name
     - Field type (number, float, string)
     - Min/max length
     - Regex pattern
     - Required flag
     - Python code
   - Save all information to database
   - Users can add any number of fields and tables to a project configuration

2. **Template Creation and Management Flow**:
   - Create template by uploading PDF
   - Select project configuration
   - Add first and last page identifiers (text and image-based) with coordinates
   - Split-screen interface (60% PDF viewer, 40% field configuration panel)
   - Add fields from project configuration dropdown
   - Extract text using rectangle selection or manual entry
   - Capture coordinates automatically
   - Add Python code for each field
   - Access table extraction through separate interface
   - Configure advanced table extraction settings
   - Return to template edit screen after table configuration
   - Save all information to database

3. **Python Function Creation and Testing Flow**:
   - Three-section interface:
     - Function section for writing code
     - Run section for calling functions
     - Output section for viewing results
   - Each function has unique name and description
   - Test functions before saving
   - Save functions to database for reuse
   - Apply functions at template, field, or extraction level

### 14.2 Data Flow

1. **Configuration to Template Flow**:
   - Project configurations define available fields and tables
   - Templates reference project configurations
   - Field properties from project configuration auto-populate template fields
   - Table settings from project configuration applied to extracted tables

2. **PDF Processing Flow**:
   - Upload PDF to create template
   - Extract text and coordinates from PDF
   - Apply Python processing to extracted data
   - Validate against field definitions
   - Generate structured output

3. **Table Extraction Flow**:
   - Identify tables in PDF
   - Apply extraction settings
   - Map columns to table configuration
   - Process extracted data with Python functions
   - Validate against column definitions
   - Include in structured output 