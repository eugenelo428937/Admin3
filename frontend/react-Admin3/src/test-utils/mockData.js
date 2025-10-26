/**
 * Mock Data for Integration Tests (Story 1.16)
 *
 * Provides realistic test data for products, subjects, categories, etc.
 * Used by MSW handlers and integration tests.
 */

// Mock Subjects
export const mockSubjects = [
  { code: 'CM2', name: 'CM2 Financial Engineering and Loss Reserving' },
  { code: 'SA1', name: 'SA1 Health and Care Principles' },
  { code: 'CB1', name: 'CB1 Business Finance' },
  { code: 'CP1', name: 'CP1 Actuarial Practice' },
  { code: 'FM1', name: 'FM1 Foundations of Actuarial Methods' },
];

// Mock Categories
export const mockCategories = [
  { code: 'BUNDLE', name: 'Bundle', display_name: 'Bundle' },
  { code: 'MATERIAL', name: 'Study Material', display_name: 'Study Material' },
  { code: 'EXAM', name: 'Mock Exam', display_name: 'Mock Exam' },
  { code: 'TUTORIAL', name: 'Tutorial', display_name: 'Tutorial' },
];

// Mock Product Types
export const mockProductTypes = [
  { code: 'CORE_MATERIAL', name: 'Core Study Material', display_name: 'Core Study Material' },
  { code: 'MOCK_EXAM', name: 'Mock Exam', display_name: 'Mock Exam' },
  { code: 'TUTORIAL', name: 'Tutorial', display_name: 'Tutorial' },
  { code: 'EBOOK', name: 'eBook', display_name: 'eBook' },
  { code: 'PRINTED', name: 'Printed Material', display_name: 'Printed Material' },
];

// Mock Modes of Delivery
export const mockModesOfDelivery = [
  { code: 'EBOOK', name: 'eBook', display_name: 'eBook' },
  { code: 'PRINTED', name: 'Printed', display_name: 'Printed' },
  { code: 'ONLINE', name: 'Online', display_name: 'Online' },
  { code: 'IN_PERSON', name: 'In Person', display_name: 'In Person' },
];

// Mock Products
export const mockProducts = [
  {
    id: 1,
    subject_code: 'CM2',
    name: 'CM2 Core Study Material',
    category: 'BUNDLE',
    product_type: 'CORE_MATERIAL',
    mode_of_delivery: 'EBOOK',
    price: 45.00,
    available: true,
    description: 'Complete core study material for CM2',
  },
  {
    id: 2,
    subject_code: 'CM2',
    name: 'CM2 Mock Exam',
    category: 'EXAM',
    product_type: 'MOCK_EXAM',
    mode_of_delivery: 'ONLINE',
    price: 15.00,
    available: true,
    description: 'Practice exam for CM2',
  },
  {
    id: 3,
    subject_code: 'SA1',
    name: 'SA1 Core Study Material',
    category: 'BUNDLE',
    product_type: 'CORE_MATERIAL',
    mode_of_delivery: 'EBOOK',
    price: 45.00,
    available: true,
    description: 'Complete core study material for SA1',
  },
  {
    id: 4,
    subject_code: 'SA1',
    name: 'SA1 Printed Material',
    category: 'MATERIAL',
    product_type: 'PRINTED',
    mode_of_delivery: 'PRINTED',
    price: 55.00,
    available: true,
    description: 'Printed study material for SA1',
  },
  {
    id: 5,
    subject_code: 'CB1',
    name: 'CB1 Core Study Material',
    category: 'BUNDLE',
    product_type: 'CORE_MATERIAL',
    mode_of_delivery: 'EBOOK',
    price: 45.00,
    available: true,
    description: 'Complete core study material for CB1',
  },
  {
    id: 6,
    subject_code: 'CB1',
    name: 'CB1 Tutorial',
    category: 'TUTORIAL',
    product_type: 'TUTORIAL',
    mode_of_delivery: 'ONLINE',
    price: 120.00,
    available: true,
    description: 'Online tutorial for CB1',
  },
  {
    id: 7,
    subject_code: 'CP1',
    name: 'CP1 Core Study Material',
    category: 'BUNDLE',
    product_type: 'CORE_MATERIAL',
    mode_of_delivery: 'EBOOK',
    price: 45.00,
    available: false,
    description: 'Complete core study material for CP1 (currently unavailable)',
  },
  {
    id: 8,
    subject_code: 'FM1',
    name: 'FM1 Core Study Material',
    category: 'BUNDLE',
    product_type: 'CORE_MATERIAL',
    mode_of_delivery: 'EBOOK',
    price: 45.00,
    available: true,
    description: 'Complete core study material for FM1',
  },
];

// Mock Filter Counts (returned by API alongside products)
export const mockFilterCounts = {
  subjects: {
    CM2: { count: 2, name: 'CM2', display_name: 'CM2 Financial Engineering and Loss Reserving' },
    SA1: { count: 2, name: 'SA1', display_name: 'SA1 Health and Care Principles' },
    CB1: { count: 2, name: 'CB1', display_name: 'CB1 Business Finance' },
    CP1: { count: 1, name: 'CP1', display_name: 'CP1 Actuarial Practice' },
    FM1: { count: 1, name: 'FM1', display_name: 'FM1 Foundations of Actuarial Methods' },
  },
  categories: {
    BUNDLE: { count: 5, name: 'Bundle', display_name: 'Bundle' },
    MATERIAL: { count: 1, name: 'Study Material', display_name: 'Study Material' },
    EXAM: { count: 1, name: 'Mock Exam', display_name: 'Mock Exam' },
    TUTORIAL: { count: 1, name: 'Tutorial', display_name: 'Tutorial' },
  },
  product_types: {
    CORE_MATERIAL: { count: 5, name: 'Core Study Material', display_name: 'Core Study Material' },
    MOCK_EXAM: { count: 1, name: 'Mock Exam', display_name: 'Mock Exam' },
    TUTORIAL: { count: 1, name: 'Tutorial', display_name: 'Tutorial' },
    PRINTED: { count: 1, name: 'Printed Material', display_name: 'Printed Material' },
  },
  modes_of_delivery: {
    EBOOK: { count: 5, name: 'eBook', display_name: 'eBook' },
    PRINTED: { count: 1, name: 'Printed', display_name: 'Printed' },
    ONLINE: { count: 2, name: 'Online', display_name: 'Online' },
  },
  products: {
    '1': { count: 1, name: 'CM2 Core Study Material', display_name: 'CM2 Core Study Material' },
    '2': { count: 1, name: 'CM2 Mock Exam', display_name: 'CM2 Mock Exam' },
    '3': { count: 1, name: 'SA1 Core Study Material', display_name: 'SA1 Core Study Material' },
    '4': { count: 1, name: 'SA1 Printed Material', display_name: 'SA1 Printed Material' },
    '5': { count: 1, name: 'CB1 Core Study Material', display_name: 'CB1 Core Study Material' },
    '6': { count: 1, name: 'CB1 Tutorial', display_name: 'CB1 Tutorial' },
    '7': { count: 1, name: 'CP1 Core Study Material', display_name: 'CP1 Core Study Material' },
    '8': { count: 1, name: 'FM1 Core Study Material', display_name: 'FM1 Core Study Material' },
  },
};

// Default API response structure
export const createMockApiResponse = (products, filterCounts, pagination = {}) => ({
  products: products || mockProducts,
  filterCounts: filterCounts || mockFilterCounts,
  pagination: {
    page: pagination.page || 1,
    page_size: pagination.page_size || 20,
    total_count: pagination.total_count || (products || mockProducts).length,
    has_next: pagination.has_next || false,
    has_previous: pagination.has_previous || false,
  },
});

/**
 * Filter products by search parameters
 * Mimics backend filtering logic for realistic tests
 */
export const filterProducts = (products, filters = {}) => {
  let filtered = [...products];

  // Filter by subjects
  if (filters.subjects && filters.subjects.length > 0) {
    filtered = filtered.filter(p => filters.subjects.includes(p.subject_code));
  }

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(p => filters.categories.includes(p.category));
  }

  // Filter by product types
  if (filters.product_types && filters.product_types.length > 0) {
    filtered = filtered.filter(p => filters.product_types.includes(p.product_type));
  }

  // Filter by products (IDs)
  if (filters.products && filters.products.length > 0) {
    filtered = filtered.filter(p => filters.products.includes(String(p.id)));
  }

  // Filter by modes of delivery
  if (filters.modes_of_delivery && filters.modes_of_delivery.length > 0) {
    filtered = filtered.filter(p => filters.modes_of_delivery.includes(p.mode_of_delivery));
  }

  // Filter by search query (name contains query, case-insensitive)
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.subject_code.toLowerCase().includes(query)
    );
  }

  return filtered;
};

/**
 * Calculate filter counts from filtered products
 * Mimics backend count calculation
 */
export const calculateFilterCounts = (products) => {
  const counts = {
    subjects: {},
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {},
  };

  products.forEach(product => {
    // Count subjects
    if (!counts.subjects[product.subject_code]) {
      const subjectData = mockSubjects.find(s => s.code === product.subject_code);
      counts.subjects[product.subject_code] = {
        count: 0,
        name: product.subject_code,
        display_name: subjectData?.name || product.subject_code,
      };
    }
    counts.subjects[product.subject_code].count++;

    // Count categories
    if (!counts.categories[product.category]) {
      const categoryData = mockCategories.find(c => c.code === product.category);
      counts.categories[product.category] = {
        count: 0,
        name: categoryData?.name || product.category,
        display_name: categoryData?.display_name || product.category,
      };
    }
    counts.categories[product.category].count++;

    // Count product types
    if (!counts.product_types[product.product_type]) {
      const typeData = mockProductTypes.find(t => t.code === product.product_type);
      counts.product_types[product.product_type] = {
        count: 0,
        name: typeData?.name || product.product_type,
        display_name: typeData?.display_name || product.product_type,
      };
    }
    counts.product_types[product.product_type].count++;

    // Count modes of delivery
    if (!counts.modes_of_delivery[product.mode_of_delivery]) {
      const modeData = mockModesOfDelivery.find(m => m.code === product.mode_of_delivery);
      counts.modes_of_delivery[product.mode_of_delivery] = {
        count: 0,
        name: modeData?.name || product.mode_of_delivery,
        display_name: modeData?.display_name || product.mode_of_delivery,
      };
    }
    counts.modes_of_delivery[product.mode_of_delivery].count++;

    // Count individual products
    if (!counts.products[String(product.id)]) {
      counts.products[String(product.id)] = {
        count: 0,
        name: product.name,
        display_name: product.name,
      };
    }
    counts.products[String(product.id)].count++;
  });

  return counts;
};
