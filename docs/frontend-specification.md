# Frontend Specification - Admin3

## Section 1: Project Overview
*[Previous sections completed]*

## Section 2: User Interface Components  
*[Previous sections completed]*

## Section 3: Information Architecture

### 3.1 Site Structure & Navigation Hierarchy

The Admin3 frontend follows a hierarchical navigation structure organized around core business domains:

#### Primary Navigation Structure
```
Admin3 Application
├── Authentication
│   ├── Login
│   ├── Password Reset
│   └── User Registration
├── Dashboard
│   ├── Overview/Analytics
│   └── Quick Actions
├── Product Management
│   ├── Product Catalog
│   ├── Product Variations
│   └── Product Groups
├── Exam Management
│   ├── Exam Sessions
│   ├── Session Subjects
│   └── Current Products
├── Order Management
│   ├── Shopping Cart
│   ├── Order History
│   └── Order Details
├── Tutorial Management
│   ├── Tutorial Events
│   ├── Event Booking
│   └── Event Management
├── User Management
│   ├── User Profile
│   ├── Account Settings
│   └── Role Management
└── System Administration
    ├── Email Management
    ├── Rules Engine
    └── System Settings
```

#### Navigation Patterns
- **Top-level Navigation**: Main menu bar with primary sections
- **Breadcrumb Navigation**: Hierarchical path indication
- **Contextual Navigation**: Section-specific sub-menus
- **Quick Actions**: Dashboard shortcuts to common tasks

### 3.2 Content Organization Strategy

#### Content Grouping Principles
1. **Business Domain Separation**: Content organized by functional areas (Products, Exams, Orders, etc.)
2. **User Role Alignment**: Information structured according to user permissions and responsibilities
3. **Task-Oriented Layout**: Content arranged to support common user workflows
4. **Data Relationship Preservation**: Related information kept together (e.g., Product with its Variations)

#### Content Hierarchy Levels
1. **Primary Level**: Main business domains (Products, Exams, Orders)
2. **Secondary Level**: Functional areas within domains (Product Catalog, Exam Sessions)
3. **Tertiary Level**: Specific operations (Add Product, Edit Session, View Order)
4. **Detail Level**: Individual record views and forms

### 3.3 User Flow Patterns

#### Core User Journeys
1. **Product Discovery & Ordering**
   ```
   Login → Browse Products → Filter/Search → View Details → Add to Cart → Checkout → Order Confirmation
   ```

2. **Exam Session Management**
   ```
   Login → Exam Sessions → Create/Edit Session → Add Subjects → Configure Products → Publish
   ```

3. **Tutorial Event Management**
   ```
   Login → Tutorials → View Events → Book Tutorial → Manage Booking → Confirmation
   ```

4. **Order Management**
   ```
   Login → Orders → View History → Order Details → Track Status → Manage Returns
   ```

#### Decision Points & Branch Logic
- **Authentication State**: Authenticated vs. Guest user paths
- **User Permissions**: Role-based feature access
- **Data Availability**: Conditional display based on data presence
- **System State**: Different flows for active vs. inactive sessions

### 3.4 Data Entity Relationships

#### Primary Data Models & Frontend Representation
```
Products (Master Catalog)
├── ProductVariations (Types: Printed/eBook, Tutorial Types)
├── ProductGroups (Related Products)
└── ExamSessionSubjectProducts (Current Available Products)

ExamSessions
├── ExamSessionSubjects (Many-to-Many)
└── Available Products per Subject

Orders
├── OrderItems (Individual Products)
└── User/Customer Information

Cart
├── CartItems (Session-based)
└── User Association

Tutorials
├── Event Information
├── Booking Details
└── User Registrations
```

#### Data Flow Considerations
- **Real-time Updates**: Cart contents, product availability
- **Cached Data**: Product catalogs, user preferences
- **External API Integration**: Administrate API for course data
- **State Management**: User session, cart persistence, form data

---

## Section 4: Technical Requirements & Constraints
*[To be completed in next section]*