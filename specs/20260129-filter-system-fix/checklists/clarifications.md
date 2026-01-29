# Clarification Log: Filtering System Remediation

**Feature**: [spec.md](../spec.md)
**Date**: 2026-01-29
**Ambiguities Found**: 3
**Questions Asked**: 3
**All Resolved**: Yes

## Ambiguity Scan Summary

Performed structured taxonomy scan across: behavioral, boundary, terminology, integration, error-handling, and data categories. Identified 3 material ambiguities requiring user input.

## Clarifications

### Q1: Zero-Count Filter Option Display (Behavioral)

**Ambiguity**: US2 scenario 4 said "shows a count of zero (or is hidden, per UI convention)" — contradicted by edge case section which said "group should appear with count of zero." No definitive behavior specified.

**Decision**: **Hide entirely**. Filter options with zero matching products are removed from the filter panel, not shown with a zero badge.

**Spec Changes**:
- Updated US2 acceptance scenario 4: zero-count options hidden entirely
- Updated edge case: zero-count groups hidden from panel
- Added FR-013: zero-count options MUST be hidden

---

### Q2: Configuration Endpoint Fallback State (Error-Handling)

**Ambiguity**: US5 scenario 4 and FR-012 referenced an "appropriate fallback state" without defining what that state actually is.

**Decision**: **Show error message**. Display an empty filter panel with a "Filters unavailable" message. Products remain visible and unfiltered.

**Spec Changes**:
- Updated US5 acceptance scenario 4: explicit "Filters unavailable" message behavior
- Updated FR-012: explicit fallback description

---

### Q3: Bundle Cross-Dimension Matching Semantics (Behavioral)

**Ambiguity**: US4 said bundles should "match active filter selections" but did not define matching semantics when filters span multiple dimensions (e.g., category + delivery mode).

**Decision**: **Single-product match**. A bundle appears in results only if it contains at least one product that satisfies ALL active filter dimensions simultaneously. Different products within the bundle cannot independently satisfy different dimensions.

**Spec Changes**:
- Added US4 acceptance scenario 5: explicit cross-dimension matching rule
- Renumbered existing scenario 5 to scenario 6
- Added FR-014: single-product matching semantics for bundles
