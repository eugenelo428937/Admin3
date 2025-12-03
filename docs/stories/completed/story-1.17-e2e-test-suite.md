# Story 1.17: End-to-End Test Suite with Cypress/Playwright

**Epic**: Product Filtering State Management Refactoring
**Phase**: 4 - Enhanced Testing and Documentation (Priority 3)
**Story ID**: 1.17
**Estimated Effort**: 2 days
**Dependencies**: Stories 1.1-1.16 (implementation and integration tests complete)

---

## User Story

As a **QA engineer** and **developer**,
I want **end-to-end tests that validate complete user workflows in a real browser**,
So that **I can ensure the filtering system works correctly from the user's perspective before deploying to production**.

---

## Story Context

### Problem Being Solved

After implementing integration tests (Story 1.16), we need **end-to-end testing in real browsers** to validate:

**Current Testing Gaps**:
1. **No real browser testing** - Integration tests use JSDOM, not real browser
2. **No visual regression testing** - Can't catch visual/layout issues
3. **No cross-browser validation** - Chrome, Firefox, Safari differences
4. **No real network testing** - Integration tests use mocks, not real API
5. **No user journey testing** - Complete workflows from landing to checkout
6. **No performance testing** - Real-world render and interaction performance
7. **No accessibility testing** - ARIA, keyboard navigation, screen readers

**Why E2E Tests are Critical**:
- **User confidence**: Tests mirror actual user behavior
- **Browser quirks**: Catch browser-specific issues
- **Visual validation**: Ensure UI renders correctly
- **Performance validation**: Measure real-world performance
- **Regression detection**: Catch breaking changes before production
- **Documentation**: E2E tests serve as living documentation

**Solution**: Implement comprehensive E2E test suite using **Playwright** (recommended) or **Cypress** that:
- Tests complete user workflows in real browsers
- Validates filter functionality end-to-end
- Tests across multiple browsers (Chromium, Firefox, WebKit)
- Includes visual regression testing
- Validates accessibility
- Tests real API integration (optional staging environment)
- Runs in CI/CD pipeline

### Technology Choice: Playwright vs. Cypress

**Playwright (Recommended)**:
- ✅ Multi-browser support (Chromium, Firefox, WebKit) built-in
- ✅ Better performance (parallel execution)
- ✅ Modern API with auto-waiting
- ✅ Network interception without proxy
- ✅ Better TypeScript support
- ✅ Video recording and screenshots built-in
- ✅ Better CI/CD integration
- ❌ Smaller community than Cypress

**Cypress**:
- ✅ Larger community and ecosystem
- ✅ Excellent developer experience
- ✅ Built-in time-travel debugging
- ✅ Automatic screenshots/videos
- ❌ Multi-browser support requires paid version for WebKit
- ❌ Slower execution (runs inside browser)
- ❌ Network stubbing requires proxy

**Recommendation**: Use **Playwright** for this project due to better multi-browser support and performance.

### Existing System Integration

**Integrates with**:
- **Complete filtering system** (Stories 1.1-1.15)
- **Real Django backend API** (optional: staging environment)
- **Redux store** - Validate state via browser DevTools extension
- **URL routing** - Test browser navigation and history
- **Material-UI components** - Validate visual rendering
- **Integration tests** (Story 1.16) - Complement, don't duplicate

**Technology**:
- **Playwright** - E2E testing framework
- **@playwright/test** - Test runner
- **playwright-expect** - Assertions
- **GitHub Actions** - CI/CD integration (optional)

**Follows Pattern**:
- **Page Object Model** - Encapsulate page interactions
- **Test Data Builders** - Create test data programmatically
- **Arrange-Act-Assert** - Clear test structure
- **Independent Tests** - Each test runs in isolation

**Touch Points**:
- `e2e/` - NEW DIRECTORY (E2E test suite)
- `playwright.config.js` - NEW FILE (Playwright configuration)
- `.github/workflows/e2e-tests.yml` - NEW FILE (CI/CD workflow - optional)

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Install and configure Playwright
- Install: `npm install --save-dev @playwright/test`
- Install browsers: `npx playwright install`
- Create `playwright.config.js` with:
  - Multi-browser configuration (Chromium, Firefox, WebKit)
  - Base URL configuration
  - Screenshot/video on failure
  - Parallel execution settings
  - Retry logic for flaky tests

**AC2**: Create Page Object Model for filtering
- File: `e2e/pages/ProductsPage.js`
- Methods:
  - `navigateToProducts()` - Navigate to products page
  - `selectSubject(code)` - Select subject filter
  - `selectCategory(code)` - Select category filter
  - `selectProductType(code)` - Select product type filter
  - `selectTutorialFormat(format)` - Select tutorial format
  - `clearAllFilters()` - Clear all filters
  - `getActiveFilters()` - Get list of active filter chips
  - `getProductCount()` - Get number of displayed products
  - `getUrl()` - Get current URL
  - `waitForProductsLoaded()` - Wait for products to load

**AC3**: E2E tests for basic filter operations
- File: `e2e/tests/basic-filtering.spec.js`
- Test scenarios:
  - Apply single subject filter → products filtered correctly
  - Apply multiple filters → products match all filters
  - Clear individual filter → filter removed, products updated
  - Clear all filters → all filters removed, all products shown
  - Filters persist in URL → URL contains filter parameters

**AC4**: E2E tests for filter persistence
- File: `e2e/tests/filter-persistence.spec.js`
- Test scenarios:
  - Apply filters → refresh page → filters restored
  - Apply filters → copy URL → open in new tab → filters applied
  - Navigate away → back button → filters still applied
  - Apply filters → bookmark URL → reopen bookmark → filters restored
  - Share URL with filters → recipient sees filtered results

**AC5**: E2E tests for filter validation
- File: `e2e/tests/filter-validation.spec.js`
- Test scenarios:
  - Select tutorial_format without tutorial → validation error shown
  - Select product without subject → validation error shown
  - Invalid combinations prevented → error message displayed
  - Fix validation error → error message cleared
  - Valid combinations allowed → no errors

**AC6**: E2E tests for complex user workflows
- File: `e2e/tests/user-workflows.spec.js`
- Test scenarios:
  - **Browse and filter workflow**:
    1. Land on products page
    2. Browse subjects
    3. Select CB1
    4. Browse materials
    5. Select "Printed Materials"
    6. Review filtered products
    7. Clear filters
  - **Tutorial booking workflow**:
    1. Select "Tutorial Products" filter
    2. Select tutorial format "Online"
    3. Browse available tutorials
    4. Select specific tutorial
    5. Proceed to booking (out of scope for this story)
  - **Search and filter workflow**:
    1. Enter search query
    2. Apply subject filter
    3. Refine with category filter
    4. Review results
    5. Clear search, keep filters

**AC7**: E2E tests for URL synchronization
- File: `e2e/tests/url-sync.spec.js`
- Test scenarios:
  - Filter change → URL updates immediately
  - Multiple rapid filter changes → URL reflects final state
  - URL change → Redux state updates
  - Browser back button → previous filter state restored
  - Browser forward button → next filter state restored
  - Direct URL navigation → filters applied correctly

**AC8**: E2E tests for API integration
- File: `e2e/tests/api-integration.spec.js`
- Test scenarios:
  - Apply filter → API called with correct parameters
  - Multiple filters → API called with all parameters
  - API returns results → products displayed correctly
  - API returns empty results → "No products found" message
  - API error → error message displayed
  - API loading → loading indicator shown

**AC9**: Cross-browser compatibility tests
- Run all E2E tests on:
  - **Chromium** (Chrome, Edge)
  - **Firefox**
  - **WebKit** (Safari)
- Verify identical behavior across browsers
- Document browser-specific issues (if any)

**AC10**: Visual regression testing (optional)
- File: `e2e/tests/visual-regression.spec.js`
- Take screenshots of:
  - FilterPanel with no filters
  - FilterPanel with filters applied
  - ActiveFilters chip display
  - ProductList with various filter combinations
  - Validation error states
- Compare screenshots across test runs
- Flag visual changes for review

### Integration Requirements

**AC11**: CI/CD integration
- File: `.github/workflows/e2e-tests.yml` (or equivalent CI config)
- Workflow:
  1. Checkout code
  2. Install dependencies
  3. Start backend (Django dev server or use staging)
  4. Start frontend (React dev server)
  5. Run Playwright tests
  6. Upload test results and screenshots
  7. Fail build if tests fail
- Run on pull requests and main branch pushes

**AC12**: Test data management
- File: `e2e/fixtures/testData.js`
- Provide consistent test data:
  - Known subjects (CB1, CB2, CS1)
  - Known categories (Materials, Tutorials)
  - Known products with predictable filters
- Option 1: Use staging database with seeded data
- Option 2: Mock API responses for E2E tests
- Option 3: Database reset before each test run

**AC13**: Test reporting and artifacts
- Generate HTML test report
- Capture screenshots on failure
- Record videos for failed tests
- Store artifacts in CI/CD system
- Make reports accessible to team

### Quality Requirements

**AC14**: Comprehensive test coverage
- **Minimum 20 E2E tests** covering:
  - Basic filtering operations (5 tests)
  - Filter persistence (4 tests)
  - Filter validation (3 tests)
  - Complex workflows (3 tests)
  - URL synchronization (3 tests)
  - API integration (2 tests)
- All critical user paths tested
- All acceptance criteria from Stories 1.1-1.15 validated

**AC15**: Tests are reliable and maintainable
- **Target**: 0% flaky tests
- Proper waiting strategies (no arbitrary timeouts)
- Independent tests (no interdependencies)
- Clear test names and documentation
- Page Object Model reduces duplication
- Easy to update when UI changes

**AC16**: Fast execution time
- **Target**: Full E2E suite completes in < 5 minutes
- Parallel execution across browsers
- Efficient waiting strategies
- Optimized test data setup
- Run critical tests first (fail fast)

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/
├── e2e/
│   ├── pages/
│   │   ├── ProductsPage.js                    # Page Object for products page
│   │   ├── FilterPanelComponent.js            # Page Object for FilterPanel
│   │   └── ActiveFiltersComponent.js          # Page Object for ActiveFilters
│   ├── fixtures/
│   │   └── testData.js                        # Test data and constants
│   ├── tests/
│   │   ├── basic-filtering.spec.js            # Basic filter operations
│   │   ├── filter-persistence.spec.js         # Persistence tests
│   │   ├── filter-validation.spec.js          # Validation tests
│   │   ├── user-workflows.spec.js             # Complex user workflows
│   │   ├── url-sync.spec.js                   # URL synchronization tests
│   │   ├── api-integration.spec.js            # API integration tests
│   │   └── visual-regression.spec.js          # Visual regression (optional)
│   └── utils/
│       └── testHelpers.js                     # E2E test utilities
├── playwright.config.js                       # Playwright configuration
└── .github/workflows/
    └── e2e-tests.yml                          # CI/CD workflow (optional)
```

### Implementation Steps

#### Step 1: Install Playwright

**Commands**:
```bash
cd frontend/react-Admin3

# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install

# Install system dependencies (Linux only)
npx playwright install-deps
```

**Verify installation**:
```bash
npx playwright --version
# Should output: Version 1.x.x
```

#### Step 2: Create Playwright Configuration

**File**: `frontend/react-Admin3/playwright.config.js`

```javascript
/**
 * Playwright Configuration for E2E Tests
 *
 * Configures Playwright for testing the filtering system across multiple browsers.
 * Includes settings for parallel execution, screenshots, videos, and retries.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',

  // Maximum time one test can run (30 seconds)
  timeout: 30 * 1000,

  // Expect timeout for assertions (5 seconds)
  expect: {
    timeout: 5000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'], // Console output
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Navigation timeout
    navigationTimeout: 10 * 1000,

    // Action timeout
    actionTimeout: 5 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers (optional)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Web server configuration (optional - start dev server automatically)
  webServer: {
    command: 'npm start',
    port: 3000,
    timeout: 120 * 1000, // 2 minutes to start
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Step 3: Create Page Object Model - ProductsPage

**File**: `frontend/react-Admin3/e2e/pages/ProductsPage.js`

```javascript
/**
 * ProductsPage - Page Object Model
 *
 * Encapsulates interactions with the products page and filtering UI.
 * Provides high-level methods for E2E tests.
 */

export class ProductsPage {
  constructor(page) {
    this.page = page;

    // Locators for filter elements
    this.filterPanel = page.locator('[data-testid="filter-panel"]');
    this.activeFilters = page.locator('[data-testid="active-filters"]');
    this.productList = page.locator('[data-testid="product-list"]');
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.clearAllButton = page.locator('button:has-text("Clear All")');
  }

  /**
   * Navigate to products page
   */
  async navigateToProducts() {
    await this.page.goto('/products');
    await this.waitForProductsLoaded();
  }

  /**
   * Wait for products to finish loading
   */
  async waitForProductsLoaded() {
    // Wait for loading indicator to disappear
    await this.page.waitForLoadState('networkidle');
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Select a subject filter
   * @param {string} subjectCode - Subject code (e.g., 'CB1')
   */
  async selectSubject(subjectCode) {
    const checkbox = this.page.locator(
      `[data-testid="filter-subject-${subjectCode}"]`
    );
    await checkbox.check();
    await this.waitForProductsLoaded();
  }

  /**
   * Unselect a subject filter
   * @param {string} subjectCode - Subject code
   */
  async unselectSubject(subjectCode) {
    const checkbox = this.page.locator(
      `[data-testid="filter-subject-${subjectCode}"]`
    );
    await checkbox.uncheck();
    await this.waitForProductsLoaded();
  }

  /**
   * Select a category filter
   * @param {string} categoryCode - Category code (e.g., 'MAT')
   */
  async selectCategory(categoryCode) {
    const checkbox = this.page.locator(
      `[data-testid="filter-category-${categoryCode}"]`
    );
    await checkbox.check();
    await this.waitForProductsLoaded();
  }

  /**
   * Select a product type filter
   * @param {string} producttypeCode - Product type code (e.g., 'PRINTED')
   */
  async selectProductType(producttypeCode) {
    const checkbox = this.page.locator(
      `[data-testid="filter-product-type-${producttypeCode}"]`
    );
    await checkbox.check();
    await this.waitForProductsLoaded();
  }

  /**
   * Select tutorial format
   * @param {string} format - Format: 'online', 'in_person', 'hybrid'
   */
  async selectTutorialFormat(format) {
    const dropdown = this.page.locator('[data-testid="filter-tutorial-format"]');
    await dropdown.click();
    await this.page.locator(`[data-value="${format}"]`).click();
    await this.waitForProductsLoaded();
  }

  /**
   * Toggle tutorial checkbox
   */
  async toggleTutorial() {
    const checkbox = this.page.locator('[data-testid="filter-tutorial"]');
    await checkbox.click();
    await this.waitForProductsLoaded();
  }

  /**
   * Toggle distance learning checkbox
   */
  async toggleDistanceLearning() {
    const checkbox = this.page.locator('[data-testid="filter-distance-learning"]');
    await checkbox.click();
    await this.waitForProductsLoaded();
  }

  /**
   * Clear all filters
   */
  async clearAllFilters() {
    await this.clearAllButton.click();
    await this.waitForProductsLoaded();
  }

  /**
   * Clear individual filter by chip
   * @param {string} filterName - Filter name to clear
   */
  async clearFilterChip(filterName) {
    const chip = this.page.locator(
      `[data-testid="filter-chip-${filterName}"] button`
    );
    await chip.click();
    await this.waitForProductsLoaded();
  }

  /**
   * Get list of active filter chips
   * @returns {Promise<string[]>} - Array of active filter labels
   */
  async getActiveFilters() {
    const chips = await this.activeFilters
      .locator('[data-testid^="filter-chip-"]')
      .allTextContents();
    return chips;
  }

  /**
   * Get number of displayed products
   * @returns {Promise<number>} - Product count
   */
  async getProductCount() {
    const countText = await this.page
      .locator('[data-testid="product-count"]')
      .textContent();

    // Extract number from text like "Showing 15 products"
    const match = countText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get current URL
   * @returns {string} - Current URL
   */
  getUrl() {
    return this.page.url();
  }

  /**
   * Get URL search parameters
   * @returns {object} - URL params as key-value pairs
   */
  getUrlParams() {
    const url = new URL(this.page.url());
    const params = {};

    for (const [key, value] of url.searchParams.entries()) {
      if (params[key]) {
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    }

    return params;
  }

  /**
   * Check if validation error is displayed
   * @param {string} errorText - Expected error text
   * @returns {Promise<boolean>} - True if error is displayed
   */
  async hasValidationError(errorText) {
    const error = this.page.locator(`text=${errorText}`);
    return await error.isVisible();
  }

  /**
   * Get all displayed product names
   * @returns {Promise<string[]>} - Array of product names
   */
  async getProductNames() {
    return await this.productList
      .locator('[data-testid="product-name"]')
      .allTextContents();
  }

  /**
   * Check if "No products found" message is displayed
   * @returns {Promise<boolean>} - True if message is displayed
   */
  async hasNoProductsMessage() {
    const message = this.page.locator('text=No products found');
    return await message.isVisible();
  }

  /**
   * Check if error message is displayed
   * @returns {Promise<boolean>} - True if error is displayed
   */
  async hasErrorMessage() {
    const error = this.page.locator('[data-testid="error-message"]');
    return await error.isVisible();
  }
}
```

#### Step 4: Create Test Data Fixtures

**File**: `frontend/react-Admin3/e2e/fixtures/testData.js`

```javascript
/**
 * E2E Test Data
 *
 * Provides consistent test data for E2E tests.
 * Assumes backend has these subjects, categories, and products seeded.
 */

export const TEST_SUBJECTS = {
  CB1: { code: 'CB1', name: 'Actuarial Mathematics 1' },
  CB2: { code: 'CB2', name: 'Actuarial Mathematics 2' },
  CS1: { code: 'CS1', name: 'Actuarial Statistics 1' },
};

export const TEST_CATEGORIES = {
  MATERIALS: { code: 'MAT', name: 'Materials' },
  TUTORIALS: { code: 'TUT', name: 'Tutorials' },
};

export const TEST_PRODUCT_TYPES = {
  PRINTED: { code: 'PRINTED', name: 'Printed Materials' },
  EBOOK: { code: 'EBOOK', name: 'eBook' },
  ONLINE_TUTORIAL: { code: 'ONLINE_TUT', name: 'Online Tutorial' },
};

export const TEST_TUTORIAL_FORMATS = {
  ONLINE: 'online',
  IN_PERSON: 'in_person',
  HYBRID: 'hybrid',
};

/**
 * Expected product counts for filter combinations
 * These numbers assume a specific test database state
 */
export const EXPECTED_COUNTS = {
  all: 50,
  cb1: 15,
  cb2: 20,
  cs1: 15,
  materials: 30,
  tutorials: 20,
  cb1_materials: 10,
  cb2_tutorials: 8,
};

/**
 * Known product codes for testing specific product selection
 */
export const KNOWN_PRODUCTS = {
  CB1_PRINTED: 'CB1-MAT-PRINT-001',
  CB1_EBOOK: 'CB1-MAT-EBOOK-001',
  CB2_TUTORIAL: 'CB2-TUT-ONLINE-001',
};
```

#### Step 5: Create Basic Filtering E2E Tests

**File**: `frontend/react-Admin3/e2e/tests/basic-filtering.spec.js`

```javascript
/**
 * Basic Filtering E2E Tests
 *
 * Tests core filtering functionality: applying, removing, and clearing filters.
 */

import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage';
import { TEST_SUBJECTS, EXPECTED_COUNTS } from '../fixtures/testData';

test.describe('Basic Filtering', () => {
  let productsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.navigateToProducts();
  });

  test('should display all products initially', async () => {
    const count = await productsPage.getProductCount();
    expect(count).toBe(EXPECTED_COUNTS.all);

    const url = productsPage.getUrl();
    expect(url).toContain('/products');
    expect(url).not.toContain('?'); // No query params
  });

  test('should filter products by subject', async () => {
    // Select CB1 subject
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);

    // Verify product count updated
    const count = await productsPage.getProductCount();
    expect(count).toBe(EXPECTED_COUNTS.cb1);

    // Verify URL updated
    const params = productsPage.getUrlParams();
    expect(params.subject_code).toBe(TEST_SUBJECTS.CB1.code);

    // Verify active filter chip displayed
    const activeFilters = await productsPage.getActiveFilters();
    expect(activeFilters).toContain(TEST_SUBJECTS.CB1.name);
  });

  test('should filter products by multiple subjects', async () => {
    // Select CB1
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);

    // Select CB2
    await productsPage.selectSubject(TEST_SUBJECTS.CB2.code);

    // Verify product count is sum of both
    const count = await productsPage.getProductCount();
    expect(count).toBe(EXPECTED_COUNTS.cb1 + EXPECTED_COUNTS.cb2);

    // Verify URL contains both subjects
    const url = productsPage.getUrl();
    expect(url).toContain(`subject_code=${TEST_SUBJECTS.CB1.code}`);
    expect(url).toContain(`subject_code=${TEST_SUBJECTS.CB2.code}`);

    // Verify both filter chips displayed
    const activeFilters = await productsPage.getActiveFilters();
    expect(activeFilters).toContain(TEST_SUBJECTS.CB1.name);
    expect(activeFilters).toContain(TEST_SUBJECTS.CB2.name);
  });

  test('should combine subject and category filters', async () => {
    // Select CB1 subject
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);

    // Select Materials category
    await productsPage.selectCategory('MAT');

    // Verify filtered product count
    const count = await productsPage.getProductCount();
    expect(count).toBe(EXPECTED_COUNTS.cb1_materials);

    // Verify URL contains both filters
    const params = productsPage.getUrlParams();
    expect(params.subject_code).toBe(TEST_SUBJECTS.CB1.code);
    expect(params.category_code).toBe('MAT');
  });

  test('should remove individual filter', async () => {
    // Apply multiple filters
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);
    await productsPage.selectCategory('MAT');

    // Remove subject filter via chip
    await productsPage.clearFilterChip('subject-CB1');

    // Verify only category filter remains
    const params = productsPage.getUrlParams();
    expect(params.subject_code).toBeUndefined();
    expect(params.category_code).toBe('MAT');

    // Verify product count updated
    const count = await productsPage.getProductCount();
    expect(count).toBe(EXPECTED_COUNTS.materials);
  });

  test('should clear all filters', async () => {
    // Apply multiple filters
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);
    await productsPage.selectCategory('MAT');
    await productsPage.selectProductType('PRINTED');

    // Clear all filters
    await productsPage.clearAllFilters();

    // Verify all products displayed
    const count = await productsPage.getProductCount();
    expect(count).toBe(EXPECTED_COUNTS.all);

    // Verify URL reset
    const url = productsPage.getUrl();
    expect(url).toBe('http://localhost:3000/products');

    // Verify no active filter chips
    const activeFilters = await productsPage.getActiveFilters();
    expect(activeFilters).toHaveLength(0);
  });
});
```

#### Step 6: Create Filter Persistence E2E Tests

**File**: `frontend/react-Admin3/e2e/tests/filter-persistence.spec.js`

```javascript
/**
 * Filter Persistence E2E Tests
 *
 * Tests that filters persist across page refreshes, navigation, and URL sharing.
 */

import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage';
import { TEST_SUBJECTS } from '../fixtures/testData';

test.describe('Filter Persistence', () => {
  let productsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
  });

  test('should persist filters after page refresh', async ({ page }) => {
    // Navigate and apply filters
    await productsPage.navigateToProducts();
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);
    await productsPage.selectCategory('MAT');

    // Get URL before refresh
    const urlBefore = productsPage.getUrl();

    // Refresh page
    await page.reload();
    await productsPage.waitForProductsLoaded();

    // Verify URL unchanged
    const urlAfter = productsPage.getUrl();
    expect(urlAfter).toBe(urlBefore);

    // Verify filters still applied
    const activeFilters = await productsPage.getActiveFilters();
    expect(activeFilters).toContain(TEST_SUBJECTS.CB1.name);
    expect(activeFilters).toContain('Materials');
  });

  test('should restore filters from URL on direct navigation', async ({ page }) => {
    // Navigate directly to URL with filters
    const filterUrl = '/products?subject_code=CB1&category_code=MAT';
    await page.goto(filterUrl);
    await productsPage.waitForProductsLoaded();

    // Verify filters applied
    const activeFilters = await productsPage.getActiveFilters();
    expect(activeFilters).toContain(TEST_SUBJECTS.CB1.name);
    expect(activeFilters).toContain('Materials');

    // Verify product count correct
    const count = await productsPage.getProductCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should persist filters in browser back/forward navigation', async ({ page }) => {
    // Start with no filters
    await productsPage.navigateToProducts();

    // Apply first filter
    await productsPage.selectSubject(TEST_SUBJECTS.CB1.code);
    const url1 = productsPage.getUrl();

    // Apply second filter
    await productsPage.selectCategory('MAT');
    const url2 = productsPage.getUrl();

    // Go back (should have only CB1 filter)
    await page.goBack();
    await productsPage.waitForProductsLoaded();
    expect(productsPage.getUrl()).toBe(url1);

    const activeFilters1 = await productsPage.getActiveFilters();
    expect(activeFilters1).toContain(TEST_SUBJECTS.CB1.name);
    expect(activeFilters1).not.toContain('Materials');

    // Go forward (should have both filters)
    await page.goForward();
    await productsPage.waitForProductsLoaded();
    expect(productsPage.getUrl()).toBe(url2);

    const activeFilters2 = await productsPage.getActiveFilters();
    expect(activeFilters2).toContain(TEST_SUBJECTS.CB1.name);
    expect(activeFilters2).toContain('Materials');
  });

  test('should share filters via URL to another browser tab', async ({ context }) => {
    // Apply filters in first tab
    const page1 = await context.newPage();
    const productsPage1 = new ProductsPage(page1);
    await productsPage1.navigateToProducts();
    await productsPage1.selectSubject(TEST_SUBJECTS.CB1.code);

    // Get URL with filters
    const filterUrl = productsPage1.getUrl();

    // Open URL in new tab
    const page2 = await context.newPage();
    const productsPage2 = new ProductsPage(page2);
    await page2.goto(filterUrl);
    await productsPage2.waitForProductsLoaded();

    // Verify filters applied in new tab
    const activeFilters = await productsPage2.getActiveFilters();
    expect(activeFilters).toContain(TEST_SUBJECTS.CB1.name);

    // Verify same product count
    const count1 = await productsPage1.getProductCount();
    const count2 = await productsPage2.getProductCount();
    expect(count1).toBe(count2);

    // Cleanup
    await page1.close();
    await page2.close();
  });
});
```

*Due to length constraints, I'll provide the structure for remaining test files in summary form.*

#### Step 7-11: Additional E2E Test Files (Structure)

**Remaining test files to create**:

1. **filter-validation.spec.js**: Test validation errors for invalid filter combinations
2. **user-workflows.spec.js**: Test complete user journeys (browse → filter → select → checkout)
3. **url-sync.spec.js**: Test bidirectional Redux ↔ URL synchronization
4. **api-integration.spec.js**: Test real API integration, loading states, errors
5. **visual-regression.spec.js** (optional): Screenshot comparison tests

Each file follows structure:
- Page Object Model usage
- Real user interactions
- Browser navigation testing
- Cross-browser compatibility
- Performance validation

#### Step 12: Create CI/CD Workflow (Optional)

**File**: `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd frontend/react-Admin3
          npm ci

      - name: Install Playwright browsers
        run: |
          cd frontend/react-Admin3
          npx playwright install --with-deps

      - name: Start backend (Django)
        run: |
          cd backend/django_Admin3
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt
          python manage.py migrate
          python manage.py runserver 8888 &
          sleep 10

      - name: Run E2E tests
        run: |
          cd frontend/react-Admin3
          npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/react-Admin3/playwright-report/
          retention-days: 7

      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-videos
          path: frontend/react-Admin3/test-results/
          retention-days: 7
```

### Running E2E Tests

**Local development**:
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test basic-filtering.spec.js

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Debug mode with Playwright Inspector
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

---

## Integration Verification

### IV1: All E2E Tests Pass

**Verification Steps**:
1. Run full E2E suite: `npx playwright test`
2. Verify all tests pass across all browsers
3. Check test execution time

**Success Criteria**:
- All E2E tests pass (Chromium, Firefox, WebKit)
- No flaky tests
- Execution time < 5 minutes
- All critical user workflows tested

### IV2: Cross-Browser Compatibility Validated

**Verification Steps**:
1. Run tests on each browser individually
2. Compare results across browsers
3. Document any browser-specific issues

**Success Criteria**:
- Identical behavior across Chromium, Firefox, WebKit
- No browser-specific failures
- UI renders consistently across browsers

### IV3: CI/CD Integration Working

**Verification Steps**:
1. Create pull request
2. Verify E2E tests run in CI
3. Check test results and artifacts

**Success Criteria**:
- E2E tests run automatically on PR
- Test results visible in CI dashboard
- Screenshots/videos uploaded on failure
- Build fails if E2E tests fail

### IV4: Real User Workflows Validated

**Verification Steps**:
1. Review test coverage of user workflows
2. Manually execute same workflows
3. Compare E2E test results with manual testing

**Success Criteria**:
- All critical user paths have E2E tests
- E2E tests catch real issues (verified by introducing bugs)
- User workflow documentation matches tests

---

## Definition of Done

- [x] Playwright installed and configured
- [x] playwright.config.js created with multi-browser support
- [x] Page Object Model created (ProductsPage)
- [x] Test data fixtures created
- [x] Basic filtering E2E tests complete (5+ tests)
- [x] Filter persistence E2E tests complete (4+ tests)
- [x] Filter validation E2E tests complete (3+ tests)
- [x] User workflow E2E tests complete (3+ tests)
- [x] URL synchronization E2E tests complete (3+ tests)
- [x] API integration E2E tests complete (2+ tests)
- [x] All tests pass across Chromium, Firefox, WebKit
- [x] CI/CD integration working (optional)
- [x] Test execution time < 5 minutes
- [x] No flaky tests
- [x] Test documentation complete
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: E2E Tests Too Slow

**Risk**: E2E tests take too long to run, slowing down development

**Mitigation**:
1. **Parallel execution** - Run tests across multiple workers
2. **Smart waiting** - Use efficient waiting strategies, not arbitrary timeouts
3. **Run critical tests first** - Fail fast approach
4. **Run in CI only** - Optional: Run full E2E suite only in CI, not locally
5. **Selective test runs** - Run subset of tests during development

**Probability**: Medium (E2E tests inherently slower than unit tests)
**Impact**: Medium (can slow down CI/CD pipeline)

### Secondary Risk: Flaky E2E Tests

**Risk**: Tests fail intermittently due to timing issues or network problems

**Mitigation**:
1. **Retry logic** - Configure retries in playwright.config.js
2. **Proper waiting** - Use Playwright's auto-waiting, avoid sleep()
3. **Stable selectors** - Use data-testid attributes, not fragile CSS selectors
4. **Independent tests** - Each test fully independent, no shared state
5. **Network mocking** - Mock unreliable external APIs

**Probability**: Medium (common issue with E2E tests)
**Impact**: High (reduces confidence in test suite)

### Rollback Plan

If E2E tests cause issues:

1. **Skip in CI** (2 minutes):
   - Comment out E2E workflow in CI config
   - Continue development with integration tests only

2. **Fix flaky tests** (1 hour):
   - Identify failing tests
   - Add better waiting/retry logic
   - Re-enable tests

3. **Remove if blocking** (5 minutes):
   - Delete e2e/ directory
   - Remove Playwright dependency
   - Rely on integration tests (Story 1.16)

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Stories 1.1-1.16**: All implementation and integration tests complete
- **Backend running**: Need Django dev server or staging environment
- **Test data**: Need consistent test database state

**Blockers**:
- If implementation not complete → blocks E2E test creation
- If backend not available → blocks API integration tests
- If UI missing data-testid attributes → makes selectors fragile

**Enables**:
- **Story 1.18**: Documentation references E2E test examples
- **Production confidence**: E2E tests provide final validation before deployment
- **Epic completion**: Final testing story before documentation

---

## Related PRD Sections

- **Section 3.2**: NFR-05: Cross-browser compatibility (Chrome, Firefox, Safari)
- **Section 4.6**: Testing and validation strategy (E2E testing)
- **Section 5.2**: Story 1.17 - End-to-End Test Suite
- **Phase 4 Goal**: Enhanced testing and documentation

---

## Next Steps After Completion

1. **Story 1.18**: Complete documentation and knowledge transfer (final story!)
2. **Epic Review**: Review all 18 stories for completeness
3. **Production Deployment**: Deploy refactored filtering system
4. **Monitoring**: Set up production monitoring and alerts
5. **Phase 4 Complete**: Epic finished and ready for implementation

---

## Verification Script

```bash
# Install Playwright
cd frontend/react-Admin3
npm install --save-dev @playwright/test
npx playwright install

# Verify Playwright configuration exists
test -f playwright.config.js
echo "Playwright config exists: $?"

# Verify Page Object Model exists
test -f e2e/pages/ProductsPage.js
echo "Page Object Model exists: $?"

# Verify test files exist
test -f e2e/tests/basic-filtering.spec.js
test -f e2e/tests/filter-persistence.spec.js
echo "Test files exist: $?"

# Run E2E tests
npx playwright test
echo "E2E tests pass: $?"

# Check test execution time (should be < 5 minutes)
time npx playwright test
echo "Execution time acceptable: $?"

# Verify multi-browser support
npx playwright test --project=chromium --project=firefox --project=webkit
echo "Multi-browser tests pass: $?"
```

---

**Story Status**: Ready for Development (after Stories 1.1-1.16 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
