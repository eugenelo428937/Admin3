# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin3 is a Django REST API backend with React frontend for the Online Store for Actuarial Education.

## Architecture

### Backend Structure
- **Django 5.1** with Django REST Framework
- **PostgreSQL** database (ACTEDDBDEV01)
- **JWT Authentication** with refresh tokens
- **Modular app structure** for different business domains
- **GraphQL integration** for external Administrate API calls

### Frontend Structure
- **React 18** with functional components and hooks
- **Material-UI** for consistent UI components
- **Axios** for API communication
- **React Router** for navigation
- **Context API** for state management

## Common Development Commands

### Backend (Django)
```bash
# Navigate to backend directory
cd backend/django_Admin3

# Activate virtual environment (Windows)
.\.venv\Scripts\activate

# Run development server
python manage.py runserver 8888

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Run tests
python manage.py test

# Management commands
python manage.py import_subjects
python manage.py sync_course_templates
python manage.py process_email_queue

# Rules Engine and JSON Content Setup
python setup_tc_rules.py                  # Setup Terms & Conditions rules
python update_tc_template_to_json.py      # Convert T&C template to JSON
python convert_summer_holiday_to_json.py  # Convert holiday templates to JSON
python setup_default_styles.py           # Setup default styling themes
```

### Frontend (React)
```bash
# Navigate to frontend directory
cd frontend/react-Admin3

# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Key Models and Relationships

### Core Models
- **Products**: Master product catalog (represents courses in locations for tutorials)
- **ProductVariations**: Versions of products (e.g., Printed/eBook for Materials, tutorial types for Tutorials)
- **ExamSessions**: Exam sessions management
- **ExamSessionSubjects**: Many-to-many relationship between exam sessions and subjects
- **ExamSessionSubjectProducts**: Current products available for ordering (NOT the master Products table)
- **Cart/CartItems**: Shopping cart functionality
- **Orders/OrderItems**: Order management
- **ActedOrderTermsAcceptance**: Terms & conditions acceptance tracking with audit trail

### Rules Engine Models
- **RuleEntryPoint**: Predefined execution points (home_page_mount, checkout_terms, etc.)
- **MessageTemplate**: Reusable message templates with JSON/HTML content formats
- **Rule**: Business rule definitions with entry point integration
- **RuleAction**: Actions triggered by rules (display, acknowledge, calculations)
- **ContentStyleTheme**: Staff-configurable styling themes (Default, Warning, Holiday, Terms)
- **ContentStyle**: Individual style configurations for JSON content elements
- **MessageTemplateStyle**: Links templates to themes with custom style overrides

### Important Database Relationship
The Django `products` model is the master table for all products but is **NOT** intended for user ordering. The `exam_sessions_subjects_products` model contains all **CURRENT** products available for ordering in the online store.

## Email System Architecture

### Email Templates and Queue System
- **Master template system** with MJML for responsive emails
- **Email queue processing** with retry logic and priority handling
- **Comprehensive logging** for debugging and monitoring
- **Development mode** with email redirection for testing

### Email Management Commands
```bash
# Process email queue
python manage.py process_email_queue

# Test email templates
python manage.py test_emails send --template order_confirmation --email test@example.com

# Generate email previews
python manage.py test_emails preview --template password_reset --save
```

### API Endpoints Structure
```
/api/auth/          # Authentication (login, refresh, password reset)
/api/users/         # User management
/api/products/      # Product catalog
/api/subjects/      # Subject management
/api/exam-sessions/ # Exam session management
/api/cart/          # Shopping cart
/api/tutorials/     # Tutorial events
/api/rules/         # Rules engine
/api/utils/         # Utility functions (email, etc.)
```

### Rules Engine API Endpoints
```
/api/rules/engine/evaluate/                    # Evaluate rules by entry point
/api/rules/engine/accept-terms/                # Accept Terms & Conditions
/api/rules/engine/checkout-terms-status/       # Check T&C acceptance status
/api/rules/acknowledgments/template-styles/    # Get dynamic styles for templates
```

## JSON Content System

### Overview
The application uses a sophisticated JSON-based content system that allows staff to manage message content and styling through Django admin without code changes.

### Content Formats
Message templates support multiple content formats:
- **HTML**: Traditional HTML content (legacy)
- **JSON**: Structured content with Material UI component mapping
- **Markdown**: Markdown with JSON structure support

### JSON Content Structure
```json
{
  "message_container": {
    "element": "container",
    "text_align": "left",
    "class": "terms-conditions-content",
    "title": "h4",
    "text": "Terms & Conditions"
  },
  "content": [
    {
      "seq": 1,
      "element": "p",
      "text": "By completing this purchase, you agree to our Terms & Conditions..."
    },
    {
      "seq": 2,
      "element": "ul",
      "text": [
        "Product delivery terms and conditions",
        "Refund and cancellation policy"
      ]
    }
  ]
}
```

### Supported Elements
- **container**: Layout containers
- **box**: Flexible boxes with styling
- **p**: Paragraphs
- **h1-h6**: Headings
- **ul/ol**: Lists
- **li**: List items

### Markdown Support
JSON content supports markdown-like syntax:
- `**bold text**` → **bold text**
- `[/link](Display Text)` → clickable links

## Staff-Configurable Styling System

### Overview
Staff can configure all styling through Django admin without touching code. The system uses database-driven styles that are applied dynamically to JSON content.

### Style Management
```
/admin/rules_engine/contentstyletheme/     # Manage style themes
/admin/rules_engine/contentstyle/          # Individual style configurations
/admin/rules_engine/messagetemplestyle/    # Template-theme assignments
```

### Theme System
- **Default Theme**: Standard styling for all content
- **Warning Theme**: Yellow/orange styling for alerts and warnings
- **Holiday Theme**: Special styling for holiday notices
- **Terms Theme**: Professional styling for Terms & Conditions

### Configurable Properties
Staff can configure through admin forms:
- **Colors**: Background, text, border colors (hex, rgba, named)
- **Layout**: Padding, margin, border width/radius
- **Typography**: Font size, weight, text alignment
- **Advanced**: Custom CSS properties via JSON field

### Style Priority System
1. Template-specific custom styles (highest priority)
2. Theme-based styles
3. CSS class selector matches
4. Element type matches
5. Global default styles (lowest priority)

### Usage in React Components
```javascript
import JsonContentRenderer from '../Common/JsonContentRenderer';
import DynamicJsonContentRenderer from '../Common/DynamicJsonContentRenderer';

// Basic JSON content rendering
<JsonContentRenderer 
  content={message.json_content}
  className="message-content"
/>

// Dynamic styling with backend configuration
<DynamicJsonContentRenderer 
  content={message.json_content}
  templateId={message.template_id}
  className="dynamic-message-content"
/>
```

## Testing

### Django Tests
- Use `APITestCase` for API testing
- Test data setup in `setUp()` methods
- Use `force_authenticate()` for authenticated tests
- Mock external API calls in tests

### React Tests
- Test component rendering and user interactions
- Mock API calls in component tests
- Test form validation and error handling

## Development Environment

### Environment Variables
- Use `.env.{environment}` files for configuration
- Never commit sensitive data to version control
- Store API keys, database credentials, and secrets in environment variables

### Windows Development Notes
- Use **PowerShell** for running scripts
- Join commands with `;;` instead of `&&`
- Django and React servers are typically always running
- Virtual environment activation: `.\.venv\Scripts\activate`

## Code Style and Conventions

### Django Backend
- Use **snake_case** for field names and methods
- Store external API IDs as `external_id` fields
- Include proper `__str__` methods for all models
- Use `active` boolean fields for soft deletes
- Follow Django REST Framework patterns

### React Frontend
- Use **functional components** with hooks
- **PascalCase** for component names
- **camelCase** for props and state variables
- Use Material-UI components consistently
- Implement proper loading states and error handling

## Performance Considerations

### Database Optimization
- Use `select_related`/`prefetch_related` for query optimization
- Implement pagination for large datasets
- Index frequently queried fields
- Use proper foreign key constraints

### Frontend Optimization
- Implement lazy loading where appropriate
- Use React.memo for expensive components
- Cache frequently accessed data
- Optimize bundle size with code splitting

## Security Guidelines

- JWT tokens with proper refresh mechanism
- CORS configuration for React frontend
- CSRF protection enabled
- Input validation on all user inputs
- Environment-specific configurations
- No hardcoded credentials in source code

## Common Patterns

### Error Handling
```python
try:
    result = api_service.execute_query(query, variables)
except Exception as e:
    logger.error(f"Operation failed: {str(e)}")
    return Response({"error": "Operation failed"}, status=500)
```

### React Component Structure
```javascript
const ComponentName = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        fetchData();
    }, []);
    
    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await apiService.getData();
            setData(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    
    return <div>{/* Component content */}</div>;
};
```

## Important Notes

- When creating new Django models, always confirm schema and fields
- Seek confirmation before performing file deletion
- Use transactions for data consistency in management commands
- Include debug flags in management commands for verbose output
- Test migrations on development data first
- Follow conventional commit message format
- Update documentation for setup changes

## Superdesign Instructions

When asked to design UI & frontend interfaces:

### Styling
- Use Material-UI components when possible
- Use Material UI icons when possible, else use bootstrap icons
- Use the styles in `frontend/react-Admin3/src/styles/liftkit.css` and `frontend/react-Admin3/src/styles` as default
- Generate responsive designs
- Save design files in `.superdesign/design_iterations` folder

### Workflow
1. Layout design (ASCII wireframe)
2. Theme design (use generateTheme tool)
3. Animation design
4. Generate HTML file
5. Confirm with user at each step