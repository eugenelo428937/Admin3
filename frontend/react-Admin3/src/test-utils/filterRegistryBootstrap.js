/**
 * Filter Registry Test Bootstrap
 *
 * Replaces the (now-removed) static fallback registrations in
 * `src/store/filters/filterRegistry.ts`. Tests previously relied on
 * those module-load registrations; production now bootstraps the
 * registry via `FilterRegistry.registerFromBackend(...)` on App mount
 * (see App.js boot effect).
 *
 * In tests we have no App boot, so this helper calls
 * `FilterRegistry.registerFromBackend(...)` with a fixture that
 * mirrors the `/api/products/filter-configuration/` response shape.
 * `setupTests.js` invokes this once globally so every test file
 * starts with the same six registered filters: programme_type,
 * subjects, categories, product_types, modes_of_delivery, plus the
 * always-present searchQuery.
 *
 * Individual tests that want a clean registry (e.g.
 * `filterRegistry.test.js`) can still call `FilterRegistry.clear()`
 * in their own `beforeEach`.
 */

import { FilterRegistry } from '../store/filters/filterRegistry';

/**
 * Fixture matching the shape of /api/products/filter-configuration/.
 * Keep keys/labels/orders in sync with the rows in
 * `filtering.filter_configurations` so test behaviour mirrors prod.
 */
// Section titles in the FilterPanel come from `config.label`, which
// mirrors `FilterConfiguration.display_label` in the DB. The fixture
// here uses the plural form an admin would write for a section header
// ("Subjects", "Categories", …). To change the section title in
// production, edit `display_label` on the corresponding
// FilterConfiguration row via the admin.
export const FILTER_CONFIGURATION_FIXTURE = {
  'programme_type': {
    filter_key: 'programme_type',
    label: 'Programmes',
    display_order: 1,
    filter_type: 'filter_group',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
  'subjects': {
    filter_key: 'subjects',
    label: 'Subjects',
    display_order: 2,
    filter_type: 'subject',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: true,
    filter_groups: [],
  },
  'categories': {
    filter_key: 'categories',
    label: 'Categories',
    display_order: 3,
    filter_type: 'filter_group',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
  'product_types': {
    filter_key: 'product_types',
    label: 'Product Types',
    display_order: 4,
    filter_type: 'filter_group',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
  'modes_of_delivery': {
    filter_key: 'modes_of_delivery',
    label: 'Modes of Delivery',
    display_order: 5,
    filter_type: 'subject_type',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
};

/**
 * Populate FilterRegistry with the standard six filter configs.
 * Idempotent: clears then re-registers.
 */
export function bootstrapFilterRegistryForTests() {
  FilterRegistry.registerFromBackend(FILTER_CONFIGURATION_FIXTURE);
}
