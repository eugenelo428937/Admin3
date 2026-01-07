# Data Model: Frontend Test Coverage Phase 2

**Feature**: 005-frontend-test-coverage-phase2
**Date**: 2025-11-26
**Status**: Complete

## Test Matrix

This document defines the test coverage requirements for each module category.

---

## 1. Component Test Matrix

### Common Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| BaseProductCard | BaseProductCard.js | Render, props, events | CartContext, ProductContext | Context wrapper |
| JsonContentRenderer | JsonContentRenderer.js | Render, content parsing | None | Direct render |
| RulesEngineAcknowledgmentModal | RulesEngineAcknowledgmentModal.js | Open/close, acknowledgment, callbacks | RulesEngine context | Mock context |
| VATBreakdown | VATBreakdown.js | Render, calculations, formatting | None | Direct render |

### Navigation Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| AuthModal | AuthModal.js | Open/close, form validation, submit | AuthContext, Router | Context + Router mocks |
| MainNavBar | MainNavBar.js | Render, menu items, responsive | Router, Redux | Router + mock store |
| MainNavActions | MainNavActions.js | Click handlers, active states | Router | MemoryRouter |
| MobileNavigation | MobileNavigation.js | Drawer open/close, menu items | Router | MemoryRouter |
| NavigationMenu | NavigationMenu.js | Menu rendering, navigation | Router | MemoryRouter |
| NavbarBrand | NavbarBrand.js | Logo render, link | Router | MemoryRouter |
| SearchModal | SearchModal.js | Open/close, search input, submit | Redux | Mock store |
| TopNavBar | TopNavBar.js | Render, user actions | AuthContext | Context wrapper |
| TopNavActions | TopNavActions.js | Click handlers | None | Direct render |
| UserActions | UserActions.js | Auth state display, logout | AuthContext | Context wrapper |

### Product Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| ActiveFilters | ActiveFilters.js | Render, remove filter, clear all | Redux | Mock store |
| ProductList | ProductList.js | Render, loading, empty, pagination | Redux, ProductContext | Store + context |
| TutorialSelectionDialog | TutorialSelectionDialog.js | Open/close, selection, confirm | TutorialChoiceContext | Context wrapper |
| TutorialSelectionSummaryBar | TutorialSelectionSummaryBar.js | Collapsed/expanded, selection display | TutorialChoiceContext | Context wrapper |
| TutorialSummaryBarContainer | TutorialSummaryBarContainer.js | State management, callbacks | TutorialChoiceContext | Context wrapper |
| FilterDebugger | FilterDebugger.js | Render debug info | Redux | Mock store |

### Ordering Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| CheckoutPage | CheckoutPage.js | Steps render, navigation, validation | CartContext, AuthContext | Multi-context wrapper |
| CartReviewStep | CartReviewStep.js | Cart display, item operations | CartContext | Context wrapper |
| CartSummaryPanel | CartSummaryPanel.js | Totals, VAT display | CartContext | Context wrapper |
| TermsConditionsStep | TermsConditionsStep.js | Terms display, acknowledgment | RulesEngine | Mock service |

### User Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| EmailVerification | EmailVerification.js | Token handling, success/error | Router, AuthService | Router + mock service |
| Logout | Logout.js | Logout action, redirect | AuthContext, Router | Context + router |
| OrderHistory | OrderHistory.js | Order list, empty state | UserService | Mock service |
| PhoneCodeAutocomplete | PhoneCodeAutocomplete.js | Country search, selection | PhoneValidationService | Mock service |
| PhoneCodeDropdown | PhoneCodeDropdown.js | Country list, selection | PhoneValidationService | Mock service |
| ProfileForm | ProfileForm.js | Form render, validation, submit | AuthContext, UserService | Context + mock service |
| ResendActivation | ResendActivation.js | Submit, success/error | AuthService | Mock service |

### Admin Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| ExamSessionForm | ExamSessionForm.js | Form render, validation, submit | ExamSessionService | Mock service |
| ExamSessionList | ExamSessionList.js | List render, pagination | ExamSessionService | Mock service |
| ProductDetail | ProductDetail.js | Detail render, actions | ProductService | Mock service |
| ProductForm | ProductForm.js | Form render, validation, submit | ProductService | Mock service |
| ProductImport | ProductImport.js | File upload, validation | ProductService | Mock service |
| ProductList | ProductList.js | List render, filters | ProductService | Mock service |
| ProductTable | ProductTable.js | Table render, sorting | ProductService | Mock service |
| SubjectDetail | SubjectDetail.js | Detail render | SubjectService | Mock service |
| SubjectForm | SubjectForm.js | Form render, validation | SubjectService | Mock service |
| SubjectList | SubjectList.js | List render | SubjectService | Mock service |

### Address Components

| Component | File | Tests Required | Dependencies | Mock Strategy |
|-----------|------|----------------|--------------|---------------|
| AddressSelectionPanel | AddressSelectionPanel.js | List render, selection, add/edit | AddressService | Mock service |

---

## 2. Page Test Matrix

| Page | File | Tests Required | Dependencies | Mock Strategy |
|------|------|----------------|--------------|---------------|
| Cart | Cart.js | Cart display, checkout navigation | CartContext, Router | Context + router |
| Home | Home.js | Hero, featured products, navigation | ProductService, Router | Service mock + router |
| ProfilePage | ProfilePage.js | Profile sections, form interaction | AuthContext, UserService | Context + mock service |
| Registration | Registration.js | Form render, validation, submit | AuthService, Router | Mock service + router |

---

## 3. Store Test Matrix

| Module | File | Tests Required | Dependencies |
|--------|------|----------------|--------------|
| Store Index | store/index.js | Store creation, middleware | All slices |
| Filter Selectors | slices/filterSelectors.js | All selector functions | Filter state |

---

## 4. Theme Test Matrix

| Theme | File | Tests Required |
|-------|------|----------------|
| Main Theme | theme.js | Structure, palette, typography |
| Color Theme | colorTheme.js | Color values, palette structure |
| Typography Theme | typographyTheme.js | Font families, sizes, weights |
| LiftKit Theme | liftKitTheme.js | Custom components, overrides |

---

## 5. Root Level Test Matrix

| File | Tests Required | Dependencies |
|------|----------------|--------------|
| App.js | Routing setup, provider hierarchy | All contexts, Router |
| config.js | Config values, environment variables | None |

---

## 6. Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                        Pages                                 │
│  (Cart, Home, ProfilePage, Registration)                     │
├─────────────────────────────────────────────────────────────┤
│                      Components                              │
│  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────────┐  │
│  │ Common  │  │Navigation │  │ Product │  │   Ordering   │  │
│  └────┬────┘  └─────┬─────┘  └────┬────┘  └──────┬───────┘  │
│       │             │             │              │           │
├───────┴─────────────┴─────────────┴──────────────┴───────────┤
│                       Contexts                               │
│  CartContext    AuthContext    ProductContext    Tutorial    │
├──────────────────────────────────────────────────────────────┤
│                      Redux Store                             │
│  filtersSlice    filterSelectors    middleware               │
├──────────────────────────────────────────────────────────────┤
│                       Services                               │
│  (Tested in Phase 1 - 95% coverage)                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Test Priority Classification

### High Priority (80%+ coverage required)
- All checkout flow components
- Authentication components
- Navigation components
- Pages

### Medium Priority (75%+ coverage required)
- Product display components
- User profile components
- Admin CRUD components

### Low Priority (70%+ coverage required)
- Debug/dev tool components
- Utility components
- Theme configuration

---

## 8. Mock Data Structures

### Cart Mock
```javascript
const mockCart = {
  items: [
    { id: 1, product_id: 72, quantity: 1, price: 99.99 }
  ],
  total: 99.99,
  itemCount: 1
};
```

### User Mock
```javascript
const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_authenticated: true
};
```

### Product Mock
```javascript
const mockProduct = {
  id: 72,
  code: 'CB1-CSM-P-25',
  name: 'Core Study Material',
  price: 99.99,
  subject: { code: 'CB1', name: 'Business Finance' }
};
```

### Filter State Mock
```javascript
const mockFilterState = {
  subjects: ['CM2', 'SA1'],
  categories: ['Bundle'],
  product_types: [],
  searchQuery: '',
  currentPage: 1,
  pageSize: 20
};
```
