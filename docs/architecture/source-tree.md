# Source Tree Structure

## Root Directory Structure

```
C:\Code\Admin3\
├── backend/                    # Django backend application
├── frontend/                   # React frontend application
├── docs/                      # Project documentation
├── .bmad-core/               # BMad agent configuration
├── .claude/                  # Claude Code settings
├── CLAUDE.md                 # Claude Code instructions
└── README.md                 # Project overview
```

## Backend Structure (`backend/django_Admin3/`)

### Core Django Application
```
django_Admin3/
├── django_Admin3/            # Main Django project settings
│   ├── __init__.py
│   ├── settings/             # Environment-specific settings
│   ├── urls.py              # Root URL configuration
│   ├── wsgi.py              # WSGI configuration
│   └── asgi.py              # ASGI configuration
├── manage.py                # Django management script
└── requirements.txt         # Python dependencies
```

### Django Applications

#### Core Applications
- **`core_auth/`** - Authentication and user management
- **`users/`** - User profiles and related functionality
- **`userprofile/`** - Extended user profile information

#### Product & Catalog Applications
- **`products/`** - Master product catalog
- **`product_variations/`** - Product variations (Print/eBook, etc.)
- **`product_groups/`** - Product grouping and categorization
- **`subjects/`** - Subject/course management

#### Exam & Session Applications
- **`exam_sessions/`** - Exam session management
- **`exam_sessions_subjects/`** - Many-to-many relationships
- **`exam_sessions_subjects_products/`** - Current products for ordering

#### E-commerce Applications
- **`cart/`** - Shopping cart functionality
- **`orders/`** - Order processing and management
- **`rules_engine/`** - Business rules and pricing logic

#### External Integration Applications
- **`administrate/`** - External Administrate API integration
- **`tutorials/`** - Tutorial event management

#### Utility Applications
- **`country/`** - Country and region data
- **`utils/`** - Shared utilities and helpers
- **`email_system/`** - Email template and queue management

### Common Django App Structure
Each Django app follows this structure:
```
app_name/
├── __init__.py
├── admin.py                 # Django admin configuration
├── apps.py                  # App configuration
├── models.py               # Database models
├── views.py                # API views
├── serializers.py          # DRF serializers
├── urls.py                 # URL routing
├── tests.py                # Unit tests
├── migrations/             # Database migrations
│   ├── __init__.py
│   └── 0001_initial.py
├── management/             # Custom management commands
│   ├── __init__.py
│   └── commands/
│       ├── __init__.py
│       └── custom_command.py
└── services/               # Business logic services
    ├── __init__.py
    └── api_service.py
```

## Frontend Structure (`frontend/react-Admin3/`)

### Root Frontend Files
```
react-Admin3/
├── public/                  # Static assets
│   ├── index.html          # Main HTML template
│   ├── favicon.ico         # Site favicon
│   └── manifest.json       # PWA manifest
├── src/                    # Source code
├── package.json            # Dependencies and scripts
├── package-lock.json       # Dependency lock file
└── .gitignore             # Git ignore rules
```

### Source Code Structure (`src/`)

#### Core Application Files
```
src/
├── App.js                  # Main application component
├── App.test.js            # App component tests
├── index.js               # Application entry point
├── reportWebVitals.js     # Performance monitoring
├── setupTests.js          # Test setup configuration
└── config.js              # Application configuration
```

#### Component Organization
```
src/components/
├── Navigation/             # Navigation components
│   ├── MainNavBar.js      # Main navigation bar
│   ├── NavbarBrand.js     # Brand/logo component
│   └── UserActions.js     # User action buttons
├── User/                  # User-related components
│   ├── Login.js           # Login form
│   ├── RegistrationWizard.js  # Registration flow
│   ├── ForgotPasswordForm.js  # Password reset
│   ├── PhoneCodeDropdown.js   # Phone code selection
│   └── CountryAutocomplete.js # Country selection
├── Product/               # Product-related components
│   ├── ProductCard/       # Product card variations
│   ├── ProductList.js     # Product listing
│   └── ProductDetail.js   # Product details
├── Address/               # Address management components
├── admin/                 # Admin interface components
│   ├── products/          # Product management
│   ├── subjects/          # Subject management
│   └── exam-sessions/     # Exam session management
├── styleguide/            # Style guide components
└── shared/                # Reusable shared components
```

#### Services Layer
```
src/services/
├── authService.js         # Authentication API calls
├── userService.js         # User management API calls
├── productService.js      # Product API calls
├── cartService.js         # Shopping cart API calls
├── examSessionService.js  # Exam session API calls
├── tutorialService.js     # Tutorial API calls
├── searchService.js       # Search functionality
├── rulesEngineService.js  # Business rules API calls
├── bundleService.js       # Product bundle API calls
├── addressMetadataService.js  # Address validation
├── phoneValidationService.js  # Phone number validation
├── errorTrackingService.js    # Error handling
└── loggerService.js       # Logging utilities
```

#### State Management
```
src/contexts/
├── AuthContext.js         # Authentication state
├── VATContext.js          # VAT display state
├── ProductContext.js      # Product state
└── TutorialChoiceContext.js   # Tutorial selection state
```

#### Custom Hooks
```
src/hooks/
├── useAuth.js             # Authentication hook
├── useApi.js              # API call hook
├── useResourceData.js     # Resource management hook
└── useProductCardHelpers.js   # Product card utilities
```

#### Styling & Theming
```
src/theme/
├── theme.js               # Material-UI theme configuration
├── colorTheme.js          # Color palette
└── styles/                # Custom CSS styles
    ├── liftkit.css        # Default styles
    └── components/        # Component-specific styles
```

#### Pages & Routing
```
src/pages/
├── Login.js               # Login page
├── Registration.js        # Registration page
├── ProductDelete.js       # Product deletion page
├── UserProfileDelete.js   # User deletion page
└── RegistrationDelete.js  # Registration cleanup
```

#### Utilities
```
src/utils/
├── productCodeGenerator.js    # Product code generation
├── validation.js             # Form validation helpers
├── formatters.js            # Data formatting utilities
└── constants.js             # Application constants
```

## Documentation Structure (`docs/`)

### Architecture Documentation
```
docs/architecture/
├── coding-standards.md    # Development standards
├── tech-stack.md         # Technology specifications
└── source-tree.md        # This file
```

### Project Requirements Documentation
```
docs/prd/                 # Product Requirements (sharded)
├── index.md              # PRD overview
├── requirements.md       # Functional requirements
├── epic-*.md            # Epic-specific requirements
└── technical-constraints-and-integration-requirements.md
```

### Technical Documentation
```
docs/project_doc/
├── email/               # Email system documentation
├── UIUX Guidelines/     # UI/UX standards
├── cart/               # Shopping cart implementation
├── product/            # Product system documentation
├── rules_engine/       # Business rules documentation
├── search/             # Search functionality
└── server_setup.md     # Server configuration
```

## Key File Relationships

### Database Models Hierarchy
- **Products** (master catalog) → **ProductVariations** → **ExamSessionSubjectProducts** (current ordering)
- **ExamSessions** → **ExamSessionSubjects** → **ExamSessionSubjectProducts**
- **Users** → **UserProfile** → **Orders** → **OrderItems**
- **Cart** → **CartItems** (shopping cart functionality)

### API Endpoint Structure
```
/api/
├── auth/              # Authentication endpoints
├── users/             # User management
├── products/          # Product catalog
├── subjects/          # Subject management
├── exam-sessions/     # Exam session management
├── cart/              # Shopping cart
├── tutorials/         # Tutorial events
├── rules/             # Rules engine
└── utils/             # Utility functions
```

### Frontend Component Hierarchy
```
App.js
├── Navigation/MainNavBar.js
├── Router Components
│   ├── Login.js
│   ├── Registration.js
│   ├── ProductList.js
│   └── ProductDetail.js
└── Shared Components
    ├── ErrorBoundary.js
    └── NoMatch.js
```

## Development Workflow Files

### Configuration Files
- **`.env.{environment}`** - Environment-specific configuration
- **`package.json`** - Frontend dependencies and scripts
- **`requirements.txt`** - Backend Python dependencies
- **`CLAUDE.md`** - Claude Code development instructions

### Build & Development
- **`manage.py`** - Django management commands
- **`npm start`** - React development server
- **`npm run build`** - Production build
- **`python manage.py runserver 8888`** - Django development server

## Testing Structure

### Backend Tests
```
each_app/tests/
├── test_models.py         # Model tests
├── test_views.py          # API endpoint tests
├── test_services.py       # Service layer tests
└── test_integration.py    # Integration tests
```

### Frontend Tests
```
src/components/ComponentName/
├── ComponentName.js
├── ComponentName.test.js
└── __tests__/
    ├── integration.test.js
    └── unit.test.js
```

## Important Notes

- **Master vs Current Products**: The `products` table is the master catalog, but `exam_sessions_subjects_products` contains current orderable items
- **Modular Architecture**: Each Django app is self-contained with models, views, serializers, and tests
- **Component-Based Frontend**: React components follow a hierarchical structure with clear separation of concerns
- **Service Layer**: Business logic is encapsulated in service classes for both backend and frontend
- **Configuration Management**: Environment-specific settings are managed through environment variables and configuration files