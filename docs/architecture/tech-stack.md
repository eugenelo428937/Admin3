# Technology Stack

## Backend Technologies

### Core Framework
- **Django 5.1** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Primary database (ACTEDDBDEV01)

### Authentication & Security
- **JWT (JSON Web Tokens)** - Authentication with refresh tokens
- **Django CORS Headers** - CORS handling for React frontend
- **Django CSRF** - CSRF protection

### External Integrations
- **GraphQL** - Integration with external Administrate API
- **MJML** - Email template system for responsive emails

### Development Tools
- **Python 3.x** - Programming language
- **pip** - Package management
- **virtualenv** - Environment isolation

## Frontend Technologies

### Core Framework
- **React 18** - Frontend framework
- **React Router** - Client-side routing
- **React Hooks** - State management patterns

### UI & Styling
- **Material-UI (MUI)** - Primary UI component library
- **Chakra UI** - Additional UI components
- **Framer Motion** - Animation library
- **CSS-in-JS** - Styling approach

### State Management
- **React Context API** - Global state management
- **React Hooks** - Local state management

### HTTP & API
- **Axios** - HTTP client for API communication
- **REST API** - Communication pattern with Django backend

### Development Tools
- **Node.js** - JavaScript runtime
- **npm** - Package management
- **React Scripts** - Build and development tools

## Database Technologies

### Primary Database
- **PostgreSQL** - Production database (ACTEDDBDEV01)
- **Django ORM** - Object-relational mapping
- **Django Migrations** - Database schema management

### Key Database Concepts
- **Foreign Key Relationships** - Data integrity
- **Indexing** - Query optimization
- **Transactions** - Data consistency

## DevOps & Infrastructure

### Development Environment
- **Windows** - Primary development platform
- **PowerShell** - Command line interface
- **Git** - Version control system

### Server Architecture
- **Django Development Server** - Backend (port 8888)
- **React Development Server** - Frontend (port 3000)
- **PostgreSQL Server** - Database

## Email System

### Email Technologies
- **MJML** - Responsive email templates
- **Django Email Backend** - Email sending
- **Email Queue System** - Reliable email delivery
- **Master Template System** - Email template management

## Testing Technologies

### Backend Testing
- **Django TestCase** - Unit testing
- **APITestCase** - API testing
- **Mock** - Test doubles and mocking

### Frontend Testing
- **React Testing Library** - Component testing
- **Jest** - Test runner and assertions
- **Mock Service Worker** - API mocking

## Build & Development Tools

### Backend Tools
- **Django Management Commands** - Custom management tasks
- **Django Admin** - Administrative interface
- **Django Debug Toolbar** - Development debugging

### Frontend Tools
- **Webpack** - Module bundling (via React Scripts)
- **Babel** - JavaScript transpilation
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Key Integrations

### External APIs
- **Administrate API** - External system integration via GraphQL
- **Payment Processing** - E-commerce functionality
- **Email Services** - Transactional email delivery

### Internal Systems
- **Shopping Cart** - E-commerce functionality
- **Product Catalog** - Course and material management
- **User Management** - Authentication and profiles
- **Order Management** - Purchase processing

## Architecture Patterns

### Backend Patterns
- **REST API** - HTTP-based API design
- **Model-View-Controller (MVC)** - Django's MVT pattern
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic organization

### Frontend Patterns
- **Component-Based Architecture** - React components
- **Container/Presentational** - Component organization
- **Custom Hooks** - Logic reuse
- **Error Boundaries** - Error handling

### Data Flow
- **Unidirectional Data Flow** - React state management
- **API-First Design** - Backend-frontend separation
- **Event-Driven** - User interaction handling

## Performance Considerations

### Backend Optimization
- **Database Query Optimization** - select_related/prefetch_related
- **Caching Strategies** - Response and query caching
- **Connection Pooling** - Database connections

### Frontend Optimization
- **Code Splitting** - Bundle optimization
- **Lazy Loading** - Component loading
- **Memoization** - React performance optimization
- **Bundle Analysis** - Size optimization

## Security Stack

### Backend Security
- **Authentication** - JWT with refresh tokens
- **Authorization** - Role-based access control
- **Input Validation** - Data sanitization
- **HTTPS** - Secure communication

### Frontend Security
- **XSS Protection** - Cross-site scripting prevention
- **CSRF Protection** - Cross-site request forgery prevention
- **Secure Storage** - Token storage best practices
- **Content Security Policy** - Additional security headers