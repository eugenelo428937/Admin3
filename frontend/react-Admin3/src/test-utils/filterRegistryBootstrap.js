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
// Dict keys here become each filter's `pluralLabel` (see
// FilterRegistry.registerFromBackend). The production backend keys its
// response by snake_case filter_key, so the rendered section titles
// would actually be snake_case there — that is a separate bug tracked
// in docs/to-dos/filter-registry-architecture-debt.md, addressed in a
// follow-up by adding a `plural_label` field to FilterConfiguration.
// For now we use friendly keys here so the tests assert the same
// section titles the old static-fallback produced.
export const FILTER_CONFIGURATION_FIXTURE = {
  'Programmes': {
    filter_key: 'programme_type',
    label: 'Programme',
    display_order: 1,
    filter_type: 'filter_group',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
  'Subjects': {
    filter_key: 'subjects',
    label: 'Subject',
    display_order: 2,
    filter_type: 'subject',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: true,
    filter_groups: [],
  },
  'Categories': {
    filter_key: 'categories',
    label: 'Category',
    display_order: 3,
    filter_type: 'filter_group',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
  'Product Types': {
    filter_key: 'product_types',
    label: 'Product Type',
    display_order: 4,
    filter_type: 'filter_group',
    allow_multiple: true,
    is_collapsible: true,
    is_expanded_by_default: false,
    filter_groups: [],
  },
  'Modes of Delivery': {
    filter_key: 'modes_of_delivery',
    label: 'Mode of Delivery',
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
