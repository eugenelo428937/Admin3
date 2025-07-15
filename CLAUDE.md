# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin3 is a Django REST API backend with React frontend for educational administration data management. It integrates with the Administrate API for course management, tutorials, events, and student administration.

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

## API Integration

### Administrate API
- **GraphQL queries** stored in `administrate/templates/graphql/`
- **AdministrateAPIService** for external API calls
- **Base64 encoded IDs** handling from Administrate API
- **Retry mechanisms** for failed requests

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