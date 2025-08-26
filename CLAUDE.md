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
- **Rule**: Business rule definitions with entry point integration (stored in JSONB with versioning)
- **RulesFields**: JSON Schema definitions for context validation
- **RuleAction**: Actions triggered by rules (display, acknowledge, calculations)
- **RuleExecution**: Audit trail of rule executions with context snapshots
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
/api/rules/engine/execute/                     # Execute rules by entry point with context
/api/rules/engine/simulate/                    # Dry-run rules without side effects
/api/rules/engine/accept-terms/                # Accept Terms & Conditions
/api/rules/engine/checkout-terms-status/       # Check T&C acceptance status
/api/rules/acknowledgments/template-styles/    # Get dynamic styles for templates
/api/rules/executions/                         # View rule execution history and audit logs
```

## Rules Engine Architecture

### Overview
The Rules Engine is a comprehensive business rule management system that enables dynamic content delivery, user acknowledgments, and complex business logic execution at predefined entry points throughout the application.

### Core Components

#### RuleEngine (Main Orchestrator)
- **Entry Method**: `execute(entryPoint, context)`
- **Purpose**: Main controller that coordinates rule execution flow
- **Location**: Django service layer (`backend/django_Admin3/apps/rules_engine/services/`)

#### RuleRepository
- **Purpose**: CRUD operations and versioning for rules
- **Storage**: PostgreSQL JSONB tables with indexing by entryPoint, active_from, priority
- **Caching**: In-memory cache with invalidation on rule updates

#### Validator
- **Purpose**: Validates incoming context against RulesFields JSON Schema
- **Behavior**: Fails fast on invalid context, produces admin alerts for schema mismatches

#### ConditionEvaluator
- **Purpose**: Evaluates rule conditions using JSONLogic or CEL expressions
- **Features**: Pre-compiled expressions for performance, complex condition composition

#### ActionDispatcher
- **Purpose**: Executes actions via pluggable ActionHandlers (Command pattern)
- **Handlers**: DisplayMessageHandler, DisplayModalHandler, UserAcknowledgeHandler, UserPreferenceHandler, UpdateHandler

#### MessageTemplateService
- **Purpose**: Renders templates with context placeholders
- **Features**: i18n support, XSS sanitization, multiple format support (HTML, JSON, Markdown)

#### ExecutionStore
- **Purpose**: Persists RuleExecution records for audit trail
- **Data**: Rule ID, context snapshot, results, timestamps, errors

### Execution Flow

1. **Entry Point Trigger**: Request hits system at entry point → `RuleEngine.execute(entryPoint, context)`
2. **Rule Retrieval**: RuleRepository fetches active rules ordered by priority and created_at
3. **Rule Processing**: For each rule:
   - Validator checks context against RulesFields schema
   - ConditionEvaluator runs rule condition expressions
   - If condition true → ActionDispatcher invokes action handlers
   - Persist RuleExecution record with full audit trail
4. **Flow Control**: Respect rule chaining and stopOnMatch parameters
5. **Response**: Return composed UI/response (messages, modals, blocking flags)

### Data Models

#### Rule Structure (JSONB)
```json
{
  "id": "rule_123",
  "name": "Checkout Terms v2",
  "entryPoint": "checkout_terms",
  "priority": 10,
  "active": true,
  "version": 3,
  "rulesFieldsId": "rf_99",
  "condition": {
    "type": "jsonlogic",
    "expr": { "==": [ { "var": "user.region" }, "EU" ] }
  },
  "actions": [
    {
      "type": "user_acknowledge",
      "id": "ack_terms_v2",
      "messageTemplateId": "tmpl_terms_v2",
      "ackKey": "terms_v2",
      "required": true
    }
  ],
  "stopProcessing": true,
  "metadata": { "createdBy": "admin", "createdAt": "2025-08-01T12:00:00Z" }
}
```

#### RulesFields Schema
```json
{
  "id": "rf_99",
  "schema": {
    "type": "object",
    "properties": {
      "user": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "region": { "type": "string" },
          "age": { "type": "integer" }
        },
        "required": ["id"]
      },
      "cart": {
        "type": "object",
        "properties": {
          "items": { "type": "array" },
          "total": { "type": "number" }
        },
        "required": ["items"]
      }
    },
    "required": ["user", "cart"]
  }
}
```

### Action Types

#### display_message
- **Payload**: templateId, placement, priority, dismissible
- **Purpose**: Non-blocking informational messages

#### display_modal
- **Payload**: templateId, size, blocking
- **Purpose**: Modal dialogs requiring user interaction

#### user_acknowledge
- **Payload**: templateId, ackKey, required, persistTo, scope
- **Purpose**: User acknowledgment tracking (Terms & Conditions, etc.)
- **Persistence**: per-session/per-user/per-order scope options

#### user_preference
- **Payload**: Same as acknowledge but required=false
- **Purpose**: Optional user preference collection

#### update
- **Payload**: target (field paths), operation (set/increment/append/remove), value/functionId
- **Safety**: Explicit allow-list for modifiable fields, transaction-wrapped for critical flows

### Security & Sandboxing

#### Custom Functions
- **Storage**: Named, versioned functions in FunctionRegistry
- **Execution**: WASM modules or isolated sandbox with CPU/memory limits
- **Review**: All functions must be reviewed before production enablement

#### Template Safety
- **Sanitization**: XSS prevention via whitelist approach
- **Validation**: Rate limiting for expensive template rendering

#### Field Updates
- **Access Control**: Allow-lists and role-based permissions for update rule authoring
- **Validation**: Server-side enforcement for critical flows (checkout)

### Rule Chaining Options

#### Simple Sequence (Current Implementation)
- Rules ordered by priority with stopOnMatch flag
- Each rule can set stopProcessing: true for short-circuiting

#### Future Enhancements
- **DAG-based flows**: Rules as graph nodes with conditional edge traversal
- **State machine**: Multi-step workflows with rule-based transitions
- **Event-driven**: Rules emit/subscribe to events for decoupled processing

### Performance Optimization

#### Caching Strategy
- Cache active rules per entryPoint in Redis/application cache
- Pre-compile condition expressions to ASTs
- Invalidate cache on rule updates

#### Query Optimization
- PostgreSQL JSONB indexes on (entryPoint, active, priority)
- Lightweight client-side rules for non-critical personalization
- Server-side authoritative rules for security/checkout

### Observability & Testing

#### Admin Features
- **Dry-run mode**: Simulate rules with synthetic context
- **Rule versioning**: Rollback capabilities
- **Execution visualization**: Rule trigger flows and chains

#### Monitoring
- **Metrics**: Rule hit counters, execution latency, failure rates
- **Logging**: Full audit trail with context snapshots
- **Alerting**: Rule failure notifications and performance degradation alerts

#### Testing
- **Unit tests**: Test vectors stored in rule metadata
- **Integration tests**: Full flow testing with mock contexts
- **Performance tests**: Load testing for high-volume entry points

### Critical Flow Enforcement

#### Server-Side Authority
- Always re-validate rules server-side for critical operations
- Return deterministic results: `{ok: false, errors: [...], requiredAcks: [{ackKey, ruleId}], blocked: true}`
- Use database transactions for atomic acknowledgment + order creation

#### Idempotency
- Implement idempotency keys for user_acknowledge and update actions
- DB constraints prevent duplicate acknowledgments
- Retry-safe operations for all rule executions

### Development Workflow

#### Rule Creation Process
1. Create/Update rule via Django Admin or React Admin UI
2. Store rule JSON in PostgreSQL with version increment
3. Run dry-run simulation via `/api/rules/engine/simulate/`
4. Publish → trigger cache invalidation → rule goes live

#### Integration Points
```python
# Frontend trigger example
useEffect(() => {
  fetch('/api/rules/engine/execute/', {
    method: 'POST',
    body: JSON.stringify({
      entryPoint: 'checkout_terms',
      context: {
        user: { id: 'u123', region: 'EU' },
        cart: { total: 59.99 }
      }
    })
  })
  .then(res => res.json())
  .then(setRuleResults);
}, []);
```

#### Django Implementation Pattern
```python
@api_view(['POST'])
def execute_rules(request):
    entry_point = request.data.get("entryPoint")
    context = request.data.get("context", {})
    
    results = rule_engine.execute(entry_point, context)
    return Response(results)
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