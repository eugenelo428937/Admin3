# Redesign Estore Layout

## Objectives

- Modernise layout
- Improve responsiveness and adaptive design, mobile friendly
- Align with modern UI/UX behavior
- Intuitive Navigation
- Accessibility

## Initial analysis

### Materials and Marking Products

#### Table layout and mobile friendliness

Table layout works perfectly in laptops but difficult to have a consistent layout in tablet/mobile resolution.
For a table to be responsive, the height of each row will need to be increased. The smaller the resolution more height for each cell. If we add more info for a product then a single product will be spanning the whole height of the screen.
Wrapping table cell breaks the relationship of Printed/ebook/Buy both.
Wrapping text results in word breaking up, cell with different height, terrible readability.

#### Products layout is tightly coupled in the products table

The layout of the products table is controlled by the initial SQL select statement and the **products.addonsale** field.

```vbs
    SELECT *, RECNO() AS "rec", IIF("/PB" $ code .AND. .NOT. "/PB&R" $ code .AND. .NOT. "/PBAR" $ code,"A"+fullname,"Z"+fullname) AS "listorder" FROM "products" ;
                        WHERE ","+ALLTRIM(products.webtype)+"," $ ",DISTANCE,PAPER,MARKING,ELECTRONIC," ;
                        .AND. products.subject == lcSubject ;
                        .AND. .NOT. ("/CC/" $ products.code) ;
                        .AND. .NOT. ("/CCPR/" $ products.code) ;
                        .AND. .NOT. ("/CN/" $ products.code) ;
                        .AND. .NOT. ("/CNPR/" $ products.code) ;
                        .AND. .NOT. ("/CFC/" $ products.code) ;
                        .AND. .NOT. ("/MX/" $ products.code) ;
                        .AND. .NOT. ("/MY/" $ products.code) ;
                        .AND. .NOT. ("/MM1/" $ products.code) ;
                        .AND. .NOT. ("/MM2/" $ products.code) ;
                        .AND. .NOT. ("/CNRB/" $ products.code) ;
                        .AND. .NOT. ("/CCR/" $ products.code) ;
                        .AND. products.websale = "Y" ;
                        .AND. BETWEEN(DATE(),products.release,products.expiry) ;
                        ORDER BY listorder ;
                        INTO CURSOR tmpQuery READWRITE
```

#### Relationship between products table rows

Each row of the products table shows the relationships below:

- Bundle
- Printed + ebook +/- "Buy both"
- ebook + marking +/- "Buy both"
- Product with either Printed or ebook variations

AMP ebook and mini ASET occuping double space have higher Visual Hierarchy than other products.

"Buy both" representing different meaning:

- different version of the same product (Printed material + ebook material)
- different product that are recommended to buy together (ebook material + marking)

And the behavior differs as well:

- normal rate(Printed) and additional rate(ebook)
- both normal rate(ebook and marking)

#### Pricing and other info for each product

- Pricing for each product and different type of discount
- VAT
- description
- context for providing guidance

#### Filter and searching

- Lacking Filter and searching for user friendliness

### Tutorial Products

#### Tutorial Products table

- Too long when expanded
- Traffic light system is not colourblindness firendly
- Tabbing thru tutorial choices for each row is difficult to navigate

#### Tutorial request

- Tutorial Request needs to go thru checkout process is cumbersome
- Other than special edication preference, it does not require addresses, t&c and other preference

### General UI/UX

#### Features bundled with other logics

- User related functinality can only be accessed when checking out.
  - Login  
  - Update profile and communication info
  - Reset password
  - change email
- Viewing cart will need to jump back and forth between pages.

#### DOM rendering, tracking changes and states

- Any user action or input will require a re-render of DOM
- Difficult to implement smooth transition or animation for visual feedback

#### Visual Design

Design elements that needs to improve:

- Visual hierarchy
- Contrast
- Typography
- Accessibility (Accessibility score 50% from accessibilityChecker.org)
- visual cues and hints
- micro-animations
- Feedback
- Cognitive load

#### Checkout process

The process is mostly fine. Some improvement can be made:

- Clear Step by Step process
- Some behavior is not common practice in modern website
  - Ref textbox with password type
  - Password textbox is not on the same page as log in
  - repeat Email is not common practice

## Research

Study the online store of actuarial education provider and leading e-commerce site to extract elements that can be applied to our site.

Focus on:

- Product page
- Navigation menu

### Products page

Explore how other online store display their product.

How other actuarial education organization organize their products:

- IFoA
- ACtEX
- ThinkActuary

and some e-commerce site:

- amazon
- ebay
- apple

#### Findings

Product Card and Grid layout

- Each product Card has a fixed height and width so the info stays in the desired layout in different resolutions.
- Each secreen resolution will have a fixed number of slots. e.g. :
  - 1440px+ : 4
  - 1024px : 3
  - 768px : 2
  - 425px : 1
- Wrap product cards to the next line gracefully if number of cards is more than slots available in each row.

### Navigation and functions in Menu bar

#### Navigation

- Seperate layout of navbar in laptop vs tablet/mobile
  - laptop : menu bar on top or left
  - tablet/mobile : access menu via hamburger with drawer sliding out for navigation links
- Use Icons with tooltips in mobile view

#### Common functions and elements

- Logo/brand
- Navigation to products/product groups
- Seaching
- Login/Profile/Logout
- Cart

## Feasibility study

From our research, in order to modernize our eStore and comform to common practice below is a list of features that should be included. I focus on the product page and the navigation bar first as these two are the main component.

- Product card and grid layout
  - pricing
  - description
  - context
  - filtering
- nav menu and common functions
  - logo
  - links
  - login/profile/logout
  - searching
  - cart

### Product card and grid layout

Explore the extend of code change to adpot the card and grid layout.

#### Code changes for product card and grid layout

- 48 fwx file (some obsolete) need revision
- Major rework in estore_product_list.fwx
  - Update tmpQuery select statment to fetch all product instead of just PC,PCPR,PN,PNPR,PFC,PNRB,PCR first
  - Remove logic of addonsale to control which product goes on the same row
  - Revise logic for "Buy both"??
  - fetch pricing, various discount rates and VAT
  - description and context
- css
- js

#### Database: products

Mainly on:

- products
- product_special
- products_oc

### Nav menu and common functions

Explore the extend of code change to adpot the navigation bar and common functions.

#### Code for Nav menu and common functions

- Refactorize login/profile to nav bar
  - estore_checkout_retrieve
  - estore_checkout_pw_check
  - estore_checkout_details
  - estore_checkout_pw_login_success
- filtering
  - logic for building metadata of prodcuts: subjects, category, ebook/printed...etc
  - add logic to estore_product_list.fwx and filter out products
  - mechanism to re-render the set of filtered products
- add searching function  
  - server vs client search?
    - server side
      - FuzzyWuzzy (Python) - Levenshtein distance: Tolerate typo and plurals
    - client side
      - lunr (js) - BM25F: less flexible but less load on the server
- Refactorize estore_cart_view and estore_cart to create a component accessible thru out the eStore.
- Responsive menu for mobile and laptop.

#### Database for nav menu and common functions

- filter_groups : main category of filter
- filter_groups_items : filter items for each filter
- filter_groups_items_product : mapping which product is in each filter item
- products
- products_special
- products_oc
- class
- estore_cart

## Difficulties

When i was exploring how to redesign the e-store layout, I came up with serveral iterations but I came across some limiting factors and I cannot come up with a design that I am happy with.

Code is tightly coupled and nested with business logics (obsolete and current). Make it very hard to seperate concerns and conduct testing without interact with some other part of the estore.

After some research on how to incorporating the existing code to a modern frontend, it is very inefficient and limit ourselves by the history.

So I come to a conclusion...

## A new eStore

### Compatability

- **No impact on existing student login** : Authentication supports BCrypt
- **No impact on Estore download/upload** :
  - It can create dbf files
    - estore_manager
    - efinal_manager
    - students
    - estore_cart
  - Upload can be done by uploading dbf files and a scripts to update the estore database.

### Tech Stack

- Database
  - PostgreSQL 18
- Backend
  - Python 3.14
  - Django 5.1
    - Model View Controller (MVC) Framework
    - Object Relational Mapping (ORM)
    - API : Django REST Framework
    - Django default Authentication with JWT (JSON Web Tokens)
    - Django CORS Headers - CORS handling for React frontend
    - Django CSRF - CSRF protection
  - GraphQL - Integration with external Administrate API
  - MJML - Email template markup language for emails templates
  - JsonLogic - Evaluation of runtime rules with rules engine
- Frontend
  - React 18
    - React Router
    - React Hooks
    - React Context API - Global state management
    - Redux state management
    - Material-UI (MUI) - Primary UI component library from google
    - Axios - HTTP client for API communication

### Feature Matrix

**Legend:**

- ✅ **Completed** - Feature implemented and functional
- 🛠️ **In Progress** - Currently being developed or enhanced  
- ⚠️ **To Be Implemented** - Identified need, not yet scheduled
- 🚫 **Blocked** - Need further input

- 🆕 : **New Feature**
- ✨ : **Revised**

#### User Management & Authentication

| Feature | Type | Status | Notes |
|---------|:------:|:--------:|-------|
| **Registration Form Wizard** | 🆕 | ✅ | UserProfile |
| **Address Search** | 🆕 | ✅ | International Address lookup functionality |
| **Dynamic Addres fields** | 🆕 | ✅ | Dynamic international address fields and validation |
| **International phone validation** | 🆕 | ✅ | Dynamic international address fields and validation |
| User Login | ✨ | ✅ | Django built-in authentication with JWT |
| Password Reset | ✨ | ✅ | Reset password with email notifcation |
| Change Email | ✨ | ✅ | Email-based update email with verification |
| Update Profile | ✨ | ✅ | Update profile via user form wizard |
| Sign Out | ✨ | ✅ | Token invalidation |
| Students (Extended User Type) |   | ⚠️ | User type specialization |
| Marker (Extended User Type) |   | ⚠️ | Marking-specific user features |
| Apprentice (Extended User Type) |   | ⚠️ | Apprentice program support |
| Study Plus (Extended User Type) |   | ⚠️ | Premium user features |
| Company Contact (Extended User Type) |   | ⚠️ | Premium user features |
| User Preferences |   | ⚠️ | Subject/location/delivery preferences |

#### Product

| Feature | Type | Status | Notes |
|---------|:------:|:--------:|-------|
| Product Grid | ✨ | ✅ | Product display |
| Material Product Cards | ✨ | ✅ | Material Product components |
| Marking Product Cards | ✨ | ✅ | Marking Product components |
| Marking Voucher Product Cards | ✨ | ✅ | Marking Product components |
| Tutorial Product Cards | ✨ | ✅ | Tutorial Product components |
| Online Classroom Product Cards | ✨ | ✅ | OC Product components |
| Bundles Product Cards | ✨ | ✅ | Bundle creation and management |
| Product Variation | ✨ | ✅ | Variations of product e.g. CMP : ebook, printed |
| Product Price | 🆕 | ✅ | Listing prices of various fees |
| **Recommended Products/Buy both** | 🆕 | ✅ | Buy both of ebook and printed, Mock Exam with marking...etc|
| Deadline Check | ✨ | ✅ | Marking deadline validation |
| **Tutorial Choices** | ✨ | ✅ | Tutorial choice |
| **Tutorial Choices Panel** | 🆕 | ✅ | TutorialChoiceContext, TutorialSelectionDialog, TutorialSummaryBarContainer |
| Tutorial Dates | ✨ | 🛠️ | Display Tutorial Schedule |
| Online Classroom (India/UK) | ✨ | 🛠️ | UK/Indian OC as product variations |
| Check Availability | ✨ | 🛠️ | Real-time availability checking |

#### Search & Filtering

| Feature | Type | Status | Notes |
|---------|:------:|:--------:|-------|
| **Fuzzy Search** | 🆕 | ✅ | FuzzySearchService with FuzzyWuzzy, typo tolerance, SearchModal component |
| **Advanced Filtering** | 🆕 | ✅ | Redux-based filter state, FilterPanel, URL synchronization middleware |
| **Filter Configuration** | 🆕 | ✅ | Active filters |
| **Filter Groups** | 🆕 | ✅ | Tree of filtera options |
| **Product Groups** | 🆕 | ✅ | Product categorization mapping to each filter |
| **Subject Filtering** | 🆕 | ✅ | Subject-based filtering via Redux filtersSlice |
| **Delivery Mode Filtering** | 🆕 | ✅ | Delivery option filtering via modes_of_delivery filter |
| **Product Category Filtering** | 🆕 | ✅ | Category-based filtering via categories filter |
| **Product Type Filtering** | 🆕 | ✅ | Type-based filtering via product_types filter |

#### Rules Engine & Business Logic

| Feature | Type | Status | Notes |
|---------|:------:|:--------:|-------|
| Rules Engine | 🆕 | ✅ | RuleEngine service with JSONB-based ActedRule model. Performance optimization with caching |
| Rules Entry Point | 🆕 | ✅ | Entry Point for rules execution |
| Rules Configuration | 🆕 | ✅ | Rule conditon, action and management via Django admin |
| Inline Model Message | 🆕 | ✅ | Rules for displaying Message via inline alert or dialog modal that does not require tracking |
| Message Templates | 🆕 | ✅ | MessageTemplate with JSON/HTML content formats |
| Holiday Messages | 🆕 | ✅ | Easter/Exam message display |
| Session Change Messages | 🆕 | ✅ | Exam session change notifications |
| ASET and Vault Message | 🆕 | ✅ | Tutorial session change notifications |
| UK Import Tax Warning | 🆕 | ✅ | Message for non-UK student |
| Expired Marking Deadlines Warning | 🆕 | ✅ | Message for marking with expired deadline |
| Product List Delivery Information | 🆕 | ✅ | Message for delivery information |
| User Acknowledgements Rules | 🆕 | ✅ | Rules that requires user acknowledgement when ordering |
| Terms and Conditions Rules | 🆕 | ✅ | T&C rule enforcement via user_acknowledge actions |
| Digital Content Acknowledgment | 🆕 | ✅ | digital content enforcement via user_acknowledge actions |
| Tutorial Credit Card Acknowledgment | 🆕 | ✅ | nominal booking fee for tutorial order with credit card |
| User Preference Rules | 🆕 | ✅ | Rules that stores user preference when ordering |
| Marketing Preference Rule | 🆕 | ✅ | User preference for marketing |
| Special Educational Needs Preference Rule | 🆕 | ✅ | User preference for special education needs |
| Employer Feedback Preference Rule | 🆕 | ✅ | User preference for sharing feedback to employer |
| Health and Safety Preference | 🆕 | ✅ | Health and safety preference attending tutorial |
| Update Rules | 🆕 | ✅ | Rule for applying changes to orders |
| Tutorial Booking Fee | 🆕 | ✅ | Add or remove tutorial booking fee rules |
| Dynamic VAT Rules | 🆕 | ✅ | 17 composite VAT rules for UK/IE/EU/SA/ROW with product-specific rates |
| Employer Validation Rules | 🆕 | 📋 | Employer-specific rules not yet configured |

#### Shopping Cart & Checkout

| Feature | Type | Status | Notes |
|---------|------|--------|-------|
| Add to Cart | ✨ | ✅ | Product cart management |
| Update Cart | ✨ | ✅ | Quantity and item updates |
| Empty Cart | ✨ | ✅ | Cart clearing functionality |
| Cart Panel | 🆕 | ✅ | Cart UI component |
| Checkout Steps | 🆕 | ✅ | Multi-step checkout process |
| Invoice Address Preference | ✨ | ✅ | Update invoice address |
| Study Materials Delivery Preference | ✨ | ✅ | Update material delivery |
| Display Communication Details | ✨ | ✅ | Contact information display |
| Calculate VAT | 🆕 | ✅ | Order VAT calculation |
| Terms and Conditions | 🆕 | ✅ | T&C acceptance |
| Special Education/Health Conditions | 🆕 | ✅ | Accessibility support |
| Notes | ✨ | ✅ | Order notes functionality |
| Product Specify Preference | 🆕 | ✅ | Product-specific preferences |
| Marketing Preferences | 🆕 | ✅ | Marketing opt-in/out |
| Feedback to Employers | 🆕 | ✅ | Employer feedback options |
| Credit Card Payment | ✨ | 🛠️ | Card payment processing |
| Invoice Payment | ✨ | 🛠️ | Invoice payment options |

| Dynamic VAT Calculation | ✨ | 🛠️ | 17 composite VAT rules (UK/IE/EU/SA/ROW), VATAudit model, CartVATDisplay component |
| Dynamic Employer Messaging | 🆕 | 📋 | Rules engine framework ready, employer-specific rules not yet configured |
| Mobile-Optimized Checkout | ✨ | 🛠️ | Responsive components with Material-UI breakpoints, touch-friendly UI |
| Enhanced Payment System | 🆕 | ⚠️ | Advanced payment integration |
| Apply Reduced rates |   | ⚠️ | Update price for reduced rate  |

#### Communication & Email

| Feature | Type | Status | Notes |
|---------|------|--------|-------|
| Email Module | ✨ | ✅ | Email system framework |
| Email Settings | ✨ | ✅ | Email configuration |
| MJML Templates | ✨ | ✅ | Responsive email templates |
| Conditional Email Rendering | ✨ | ✅ | Dynamic email content |
| Email Attachments | ✨ | ✅ | Attachment support |
| Content Rules | ✨ | ✅ | Email content rules |
| Placeholders | ✨ | ✅ | Dynamic content placeholders |
| Order Confirmation Emails | ✨ | ✅ | Printed material confirmations |
| Digital Material Confirmations | ✨ | ✅ | Digital order confirmations |
| Marking Material Confirmations | ✨ | ✅ | Marking order confirmations |
| Tutorial Order Confirmations | ✨ | ✅ | Tutorial confirmations |
| Tutorial Request Emails | ✨ | ⚠️ | Tutorial request notifications |

#### Payment Integration

| Feature | Type | Status | Notes |
|---------|------|--------|-------|
| Payment System | ✨ | 🚫 | Require test account |

### Rationale for clean slate rather than conservative

- Foxpro does not support a lot of the functionality of that are fundamental in modern web application
  - partial re-rendering
  - API and routing layer
  - Lack modern security frameworks
    - built-in authentication/authorization frameworks
    - JWT / OAuth2 / SSO support
    - CRSF protection
- Database not fully ACID compliant
  - corrupted index, tables or data
  - data contaminating when network glitches
  - lack data integrity validation e.g. Unique Primary Key (ref), Foreign Key constriant
- Schema design is not normalized
  - Foxpro is not a relational database.
  - Redundant data
    - e.g. first name, lastname, contact exists in various table (students, estore_manager, efinal_manager, estore_manager). Updating one will need to updating in all these tables.
  - Entity Integrity and Cohesion
    - e.g. In Products table, "binder" and "box size" are not related to ebook product, deadlines are not related to materials product.
  - Scalibility
    Since all data types in Foxpro is fixed width, each row will take up same space in storage. A Date column will be 8 bytes in size no matter if it is empty or not. More empty fields = wasting storage.
    - e.g. For the products table,
      - if there are more than 10 deadlines for a marking product, we will need to create another column
      - if every marking product will only have one deadline at some point, all other 9 deadlines column is all empty
      - every non-marking product have all daedlines column empty.
    - e.g. Studying Subject Course does not have standard, retaker, additional or reduced rate.
  - Efficiency
    As the above example, fetching a non-marking product will takes up same amount of bandwidth as marking product, even when a lot of the fields are empty.
