# GitHub Copilot Instructions for Admin3 Project

## Project Overview
Admin3 is a Django REST API backend with React frontend for managing educational administration data. It integrates with the Administrate API for course management, tutorials, events, and student administration.

## Project Structure
```
Admin3/
├── backend/django_Admin3/           # Django REST API
│   ├── django_Admin3/              # Main Django project
│   ├── subjects/                   # Subject management app
│   ├── tutorials/                  # Tutorial events and sessions
│   ├── administrate/               # Administrate API integration
│   ├── core_auth/                  # Authentication system
│   └── manage.py
├── frontend/react-Admin3/          # React frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── services/              # API service layer
│   │   └── styles/                # CSS styling
│   └── public/
└── documentations/                 # Project documentation
```

## Technology Stack
- **Backend**: Django 6.0, Django REST Framework, PostgreSQL
- **Frontend**: React 19.2, Material-UI v7, Axios for API calls
- **Integration**: GraphQL queries to Administrate API
- **Authentication**: JWT tokens with refresh mechanism
- **Database**: PostgreSQL (ACTEDDBTEST01)

## Coding Conventions

### Django Backend
- Use class-based views with Django REST Framework
- Follow Django's model-view-serializer pattern
- Administrate app is for external API integration demo, not currently in use
- External API IDs stored as `external_id` fields
- Use proper model relationships (ForeignKey, ManyToMany)
- Management commands for data synchronization from external APIs

### React Frontend
- Functional components with hooks
- Use Material-UI for UI components
- CSS modules or component-specific CSS files
- API calls through centralized service layer
- Form validation and error handling
- Responsive design patterns

### API Integration
- GraphQL queries stored in separate files under `administrate/queries/`
- Use `AdministrateAPIService` for external API calls
- Validation functions for data imported from external sources
- Error handling for API timeouts and failures

## Key Models and Relationships

### Core Models
- `User`: Extends Django's built-in User model for authentication
- 'Products`: Represents master product catalog, For Tutorial product it represents courses in a location e,g, `Tutorial - Manchester`.
- `ProductVariations`: Versions of products, e.g. Printed/eBook for Materials Products, For Tutorial product it represents the tutorial type e.g. CB1 3 full days.
- `Subjects`: Educational subjects with codes and descriptions
- `ExamSessions`: Exam sessions
- `ExamSessionSubjects`: Many-to-many relationship between exam sessions and subjects
- `ExamSessionSubjectProducts`: Products associated with exam sessions and subjects. Listing current products available for sale.
- `ExamSessionSubjectProductsVariations`: Variations of products for acted_exam_session_subject_products and acted_product_variations.
- `ExamSessionSubjectProductsPrice`: Prices for variations of products in acted_exam_session_subject_product_variations.
- `Orders`: Represents orders placed by users
- `OrderItems`: Items in an order, linked to ExamSessionSubjectProductsVariations and ExamSessionSubjectProductsPrice.
- `Cart`: User's shopping cart
- `CartItems`: Items in the user's cart, linked to ExamSessionSubjectProductsVariations and ExamSessionSubjectProductsPrice.

## Authentication Pattern
- JWT-based authentication with access and refresh tokens
- CORS configuration for React frontend
- CSRF protection enabled
- User model extends Django's built-in User

## Data Import/Export
- Excel file processing for bulk imports
- CSV file handling for tutorial events
- Validation pipelines before data creation
- Error reporting for failed imports

## Testing Patterns
- API tests using Django REST Framework's APITestCase
- Test data setup in setUp() methods
- Authentication in tests using force_authenticate()
- Comprehensive error scenario testing

## Common Patterns

### API Service Layer
```python
# Use centralized API service for external calls
api_service = AdministrateAPIService()
result = api_service.execute_query(query, variables)
```

### Model Validation
```python
# Validation methods in models
def clean(self):
    if not self.code:
        raise ValidationError("Code is required")
```

### React Component Structure
```javascript
// Functional components with hooks
const ComponentName = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // API calls in useEffect
    useEffect(() => {
        fetchData();
    }, []);
    
    return (<div>...</div>);
};
```

### Error Handling
- Try-catch blocks for external API calls
- Proper error messages for user feedback
- Logging for debugging (use Django's logging framework)

## File Naming Conventions
- Python: snake_case (e.g., `course_templates.py`)
- JavaScript: camelCase for variables, PascalCase for components
- CSS: kebab-case for classes
- GraphQL files: descriptive names (e.g., `get_all_locations.graphql`)

## Database Considerations
- Use transactions for data consistency
- Index frequently queried fields
- Foreign key constraints properly set
- Soft deletes where appropriate (active flags)

## Security Guidelines
- Environment variables for sensitive data (.env files)
- No hardcoded credentials in source code
- Proper CORS configuration
- Input validation on all user inputs

## Performance Patterns
- Pagination for large datasets
- Select_related/prefetch_related for Django querysets
- Lazy loading in React components
- Caching for frequently accessed data

## Debugging and Logging
- Use Django's built-in logging framework
- Debug flags in management commands
- Structured error messages with context
- API response validation before processing

## Documentation Standards
- Docstrings for all classes and methods
- README files for setup instructions
- API documentation for endpoints
- Comment complex business logic

## Git Workflow
- Feature branches for new development
- Descriptive commit messages
- .gitignore for environment files and build artifacts
- No sensitive data in version control

## Common Commands
```bash
# Django management
python manage.py runserver 8888
python manage.py migrate

# React development
npm start
npm run build
npm test
```

## External API Integration Notes
- Administrate uses GraphQL with base64 encoded IDs
- Rate limiting considerations for API calls
- Pagination handling for large datasets
- Error retry mechanisms for failed requests

## Testing Data
- Use factories or fixtures for test data
- Separate test database configuration
- Clean up test data after each test
- Mock external API calls in tests
