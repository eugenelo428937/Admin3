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
- **Redux Toolkit** for filter state management (product filtering)
- **Context API** for cart and authentication state
- **RTK Query** for API data fetching and caching

### Redux Filter State Management

The frontend uses Redux Toolkit for centralized product filter state management with bidirectional URL synchronization.

#### Architecture

**Core Files**:
- `src/store/index.js` - Redux store configuration
- `src/store/slices/filtersSlice.js` - Filter state and actions
- `src/store/middleware/urlSyncMiddleware.js` - Redux ↔ URL synchronization
- `src/store/api/catalogApi.js` - RTK Query API endpoints

#### Redux DevTools Configuration

**IMPORTANT**: We use **Redux Toolkit**, not legacy Redux. DevTools setup is different:

**✅ Redux Toolkit (What we use)**:
```javascript
// src/store/index.js
export const store = configureStore({
  reducer: { ... },
  devTools: process.env.NODE_ENV !== 'production', // ✅ Automatic DevTools!
});
```

**❌ Legacy Redux (What you'll see in old docs)**:
```javascript
// DON'T USE THIS - This is for legacy Redux createStore
const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);
```

**Key Points**:
- Redux Toolkit's `configureStore` **automatically enables DevTools** - no manual setup needed
- You will **NOT** find `window.__REDUX_DEVTOOLS_EXTENSION__` in our codebase - it's handled internally
- DevTools are **enabled in development**, **disabled in production** (automatic)
- See verification guide: `docs/redux-devtools-verification.md`

**To Use Redux DevTools**:
1. Install browser extension: [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) / [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)
2. Run `npm start` (DevTools only work in development)
3. Open browser DevTools (F12) → Look for "Redux" tab
4. View state, actions, and time-travel debugging

**Official Docs**: https://redux-toolkit.js.org/api/configureStore#devtools

#### Filter State Structure

```javascript
{
  // Array filters
  subjects: [],              // Subject codes (e.g., ['CM2', 'SA1'])
  categories: [],            // Category codes
  product_types: [],         // Product type codes
  products: [],              // Product IDs
  modes_of_delivery: [],     // Delivery mode codes

  // Search
  searchQuery: '',           // Search query string

  // Pagination
  currentPage: 1,
  pageSize: 20,

  // UI state
  isFilterPanelOpen: false,
  isLoading: false,
  error: null,

  // Filter counts from API
  filterCounts: {
    subjects: {},
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {}
  }
}
```

#### URL Synchronization (Story 1.1)

The URL sync middleware provides **bidirectional** synchronization between Redux state and browser URL:

**Redux → URL (Automatic)**:
```javascript
// Component dispatches Redux action
dispatch(setSubjects(['CM2', 'SA1']));

// Middleware automatically updates URL
// URL becomes: /products?subject_code=CM2&subject_1=SA1
```

**URL → Redux (On Mount)**:
```javascript
// ProductList component restores filters from URL
const searchParams = new URLSearchParams(window.location.search);
const filtersFromUrl = parseUrlToFilters(searchParams);
dispatch(setSubjects(filtersFromUrl.subjects));
```

**URL Parameter Formats**:
- **Indexed**: `subject_code=CB1&subject_1=CB2&subject_2=CB3`
- **Comma-separated**: `group=PRINTED,EBOOK`

**Performance**: URL updates occur in < 0.1ms (target: < 5ms)

#### Filter Actions

**Basic Setters**:
```javascript
dispatch(setSubjects(['CM2', 'SA1']));
dispatch(setCategories(['Bundle']));
dispatch(setProductTypes(['Core Study Material']));
dispatch(setSearchQuery('actuarial'));
```

**Navigation Actions** (Clear existing filters):
```javascript
dispatch(navSelectSubject('CM2'));      // Clear all, set subject
dispatch(navViewAllProducts());         // Keep subjects, clear others
dispatch(navSelectProductGroup('8'));   // Keep subjects, set product type
dispatch(navSelectProduct('PROD123'));  // Keep subjects, set product
```

**Clear Actions**:
```javascript
dispatch(clearAllFilters());            // Clear everything
dispatch(resetFilters());               // Reset to initial state
```

#### Usage Patterns

**Navigation Menu** (`MainNavBar.js`):
```javascript
const handleSubjectClick = (subjectCode) => {
  dispatch(navSelectSubject(subjectCode));
  navigate('/products'); // URL sync automatic
};
```

**Filter Panel** (`FilterPanel.js`):
```javascript
const filters = useSelector(selectFilters);

const handleToggle = (filterType, value) => {
  dispatch(toggleSubjectFilter(value));
  // URL updated automatically by middleware
};
```

**Product Search** (`useProductsSearch.js`):
```javascript
const filters = useSelector(selectFilters);

// Hook reads ALL filters from Redux (single source of truth)
const searchParams = {
  filters: { ...filters }
};
```

**Search Modal** (`SearchModal.js`):
```javascript
const handleShowMatchingProducts = () => {
  // Search modal is search-only - NO filter management
  // Search query stored in Redux (filters.searchQuery)
  handleCloseSearchModal();
  navigate('/products'); // URL sync automatic
};
```

**Note**: Search modal provides **search-only functionality** (as of 2025-10-21). All filtering happens on the products page via FilterPanel. SearchBox uses Redux for search query persistence only (`setSearchQuery` action), NOT for filter selections. See `specs/spec-filter-searching-refinement-20251021.md` for details

#### Important Rules

1. **Never manually construct URLs**: Use Redux dispatch only
2. **Single source of truth**: Always read filters from Redux state
3. **URL sync is automatic**: Middleware handles all URL updates
4. **Navigate without query params**: `navigate('/products')` not `navigate('/products?subject=CM2')`
5. **Restore on mount**: Parse URL params and dispatch to Redux once on mount

#### Testing

**Unit Tests**:
- `filtersSlice.test.js` - Redux state and actions (43 tests)
- `urlSyncMiddleware.test.js` - URL synchronization (33 tests)
- `useProductsSearch.test.js` - Hook integration (7 tests)
- `urlSyncPerformance.test.js` - Performance validation (5 tests)

**Test Coverage**: 96/96 tests passing (100%)

**Performance Metrics**:
- Average URL update: 0.069ms
- 95th percentile: 0.092ms
- Maximum: 0.104ms

## Test-Driven Development (TDD) Enforcement

### Mandatory TDD Process
All code development in Admin3 MUST follow strict Test-Driven Development practices:

1. **RED Phase**: Write a failing test first
   - Create test that captures the desired behavior
   - Run test to verify it fails (confirms test validity)
   - Never write implementation code without a failing test

2. **GREEN Phase**: Write minimal implementation
   - Write only enough code to make the test pass
   - Avoid over-engineering or implementing untested features
   - Focus on passing the current test, nothing more

3. **REFACTOR Phase**: Improve code quality
   - Refactor implementation while keeping tests green
   - Improve design, remove duplication, enhance readability
   - All tests must continue passing during refactoring

### TDD Enforcement Rules

#### For All Agents
- **No production code without tests**: Agents must verify tests exist before implementing features
- **Test-first validation**: Run tests and confirm failures before implementation
- **Coverage requirements**: Minimum 80% test coverage for new code
- **TodoWrite integration**: Track TDD phases (RED/GREEN/REFACTOR) in todo lists

#### Test Commands by Project Area
```bash
# Backend (Django) - from backend/django_Admin3/
python manage.py test                    # Run all tests
python manage.py test --coverage        # Run with coverage report
python manage.py test apps.specific     # Test specific app

# Frontend (React) - from frontend/react-Admin3/
npm test                                # Run tests in watch mode
npm test -- --coverage --watchAll=false # Run with coverage
npm test -- --testPathPattern=Component # Test specific component
```

#### File Organization
- **Backend tests**: `backend/django_Admin3/apps/{app}/tests/test_{module}.py`
- **Frontend tests**: `frontend/react-Admin3/src/components/__tests__/{Component}.test.js`

#### TDD Workflow Integration
When implementing features, agents must:
1. Create failing test with descriptive name
2. Use TodoWrite to track TDD phase: `tddStage: "RED"`
3. Run test to confirm failure
4. Implement minimal solution
5. Update TodoWrite to `tddStage: "GREEN"`
6. Verify test passes
7. Refactor if needed with `tddStage: "REFACTOR"`
8. Run full test suite before marking complete

### Configuration
TDD enforcement is configured via:
- `tdd-guard.config.js`: Project-specific TDD rules
- Claude Code hooks: Pre/post tool execution validation
- Coverage thresholds: 80% minimum for new code

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
/api/rules/engine/execute/                     # Execute rules by entry point with context (ActedRule-based)
/api/rules/engine/evaluate/                    # Legacy rules evaluation (deprecated)
/api/rules/engine/acknowledge/                 # Accept Terms & Conditions  
/api/rules/engine/calculate-vat/               # VAT calculation via rules engine
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

#### ActedRule Structure (JSONB)
**Model**: `ActedRule` in `backend/django_Admin3/rules_engine/models/acted_rule.py`
**Table**: `acted_rules_engine`

```json
{
  "rule_id": "rule_checkout_terms_v3",
  "name": "Checkout Terms v3",
  "entry_point": "checkout_terms",
  "priority": 10,
  "active": true,
  "version": 3,
  "rules_fields_id": "rf_checkout_context",
  "condition": {
    "type": "jsonlogic",
    "expr": { "==": [ { "var": "user.region" }, "EU" ] }
  },
  "actions": [
    {
      "type": "user_acknowledge",
      "id": "ack_terms_v3",
      "messageTemplateId": "tmpl_terms_v3", 
      "ackKey": "terms_v3_eu",
      "required": true
    }
  ],
  "stop_processing": true,
  "metadata": { "createdBy": "admin_user", "createdAt": "2025-08-29T10:00:00Z" }
}
```

#### ActedRulesFields Schema
**Model**: `ActedRulesFields` in `backend/django_Admin3/rules_engine/models/acted_rules_fields.py`
**Table**: `acted_rules_fields`
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

## Simplified Message Template System

### Overview
Staff can create and edit message content through Django admin with predefined styling. No custom styling configuration - all messages use predefined style variants and React components.

### Message Template Management
```
/admin/rules_engine/messagetemplate/       # Manage message templates
```

### Predefined Style Variants
Staff can choose from these predefined style variants:

| **Variant** | **Use Case** | **CSS Classes** |
|-------------|--------------|-----------------|
| `info` | General information | `message-info` (blue theme) |
| `success` | Success confirmations | `message-success` (green theme) |
| `warning` | Important warnings | `message-warning` (orange theme) |
| `error` | Error messages | `message-error` (red theme) |
| `alert` | Critical alerts | `message-alert` (red theme) |
| `neutral` | Default messages | `message-neutral` (gray theme) |

### React Component Types
Staff can choose from these predefined component types:

| **Component Type** | **React Component** | **Use Case** |
|-------------------|-------------------|--------------|
| `banner_message` | `<MessageBanner />` | Top page banners |
| `inline_alert` | `<InlineAlert />` | Inline page alerts |
| `modal_dialog` | `<MessageModal />` | Modal popup dialogs |
| `terms_modal` | `<TermsModal />` | Terms & conditions |
| `toast_notification` | `<ToastMessage />` | Toast notifications |
| `sidebar_notice` | `<SidebarNotice />` | Sidebar notices |

### Content Structure
Message templates use simple JSON content structure:

```json
{
  "title": "Message Title",
  "message": "Main message with {{placeholders}}",
  "details": ["List", "of", "details"],
  "buttons": [
    {"label": "Accept", "action": "acknowledge", "variant": "primary"}
  ]
}
```

### Usage in React Components
```javascript
import { MessageRenderer } from '../Common/MessageRenderer';

// All message rendering handled by single component
<MessageRenderer 
  effects={rulesEngineEffects}
  onDismiss={handleMessageDismiss}
  onAction={handleMessageAction}
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
