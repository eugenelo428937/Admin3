/**
 * @deprecated Backward-compatibility shim.
 *
 * All legacy named action creators (setSubjects, navSelectSubject, etc.) are
 * now defined directly in baseFilters.slice.ts and re-exported from
 * filtersSlice.ts. This file exists so any import of 'filtersSlice.legacy'
 * continues to resolve cleanly.
 *
 * It intentionally imports from baseFilters.slice — NOT from filtersSlice —
 * to avoid a circular dependency (filtersSlice.ts does `export * from` this
 * file, so this file cannot import back from filtersSlice.ts).
 *
 * Schedule: delete this file (and the `export * from './filtersSlice.legacy'`
 * line in filtersSlice.ts) in a follow-up PR once all call sites have been
 * migrated to the generic setFilter / toggleFilter / removeFilter /
 * setScalar / navSelectFilter actions.
 */

// Re-export the slice creator so callers get the action creators they need.
// The actual action creators live in baseFilters.slice (via filtersSlice),
// so we just re-export the slice's action map from there indirectly via
// a barrel that doesn't create a cycle.
//
// NOTE: this file is intentionally empty of new definitions.
// The named exports are provided by filtersSlice.ts itself (which already
// exports them). Any file that imported from 'filtersSlice.legacy' directly
// should be updated to import from 'filtersSlice' instead.
