# Frontend Search Migration Guide

**Date:** 2025-10-23
**Status:** Backend Ready - Frontend Update Required

## Problem

The frontend is making **two successive API calls** for search:
1. `/fuzzy-search/?q=CM1+Core` → Returns ESSP IDs
2. `/search/` with `filters: {products: [ESSP IDs]}` → Should filter to those products

This causes issues because:
- The `products` filter now expects **Product IDs** (for navbar links)
- But fuzzy search returns **ESSP IDs**
- Results in zero products displayed

## Solution: Use searchQuery Parameter

The backend now supports a `searchQuery` parameter in the unified search endpoint that handles everything in ONE call.

### Backend Changes (✅ Complete)

**Endpoint:** `POST /api/exam-sessions-subjects-products/search/`

**New Request Format:**
```json
{
  "searchQuery": "CM1 Core",
  "filters": {
    "subjects": [],
    "categories": [],
    "product_types": [],
    "modes_of_delivery": []
  },
  "pagination": {
    "page": 1,
    "page_size": 20
  },
  "options": {
    "include_bundles": true
  }
}
```

**Response:**
```json
{
  "products": [...],  // Sorted by relevance (best match first)
  "filter_counts": {...},
  "pagination": {...}
}
```

### Frontend Changes Required

#### Location
`frontend/react-Admin3/src/services/searchService.js` (or equivalent)

#### OLD Code (Two-Call Pattern):
```javascript
// Step 1: Call fuzzy search
const fuzzySearchProducts = async (query) => {
  const response = await axios.get(
    `/api/products/current/fuzzy-search/`,
    { params: { q: query, limit: 50 } }
  );
  return response.data;
};

// Step 2: Call unified search with ESSP IDs
const filterByESSPs = async (esspIds) => {
  const response = await axios.post(
    `/api/exam-sessions-subjects-products/search/`,
    {
      filters: {
        products: esspIds  // ❌ This is broken!
      },
      pagination: { page: 1, page_size: 20 }
    }
  );
  return response.data;
};

// Usage:
const handleSearch = async (query) => {
  const fuzzyResults = await fuzzySearchProducts(query);
  const esspIds = fuzzyResults.products.map(p => p.id);
  const finalResults = await filterByESSPs(esspIds);
  setProducts(finalResults.products);
};
```

#### NEW Code (Single-Call Pattern):
```javascript
// Single call with searchQuery parameter
const searchProducts = async (query, filters = {}, pagination = {}) => {
  const response = await axios.post(
    `/api/exam-sessions-subjects-products/search/`,
    {
      searchQuery: query,  // ✅ New parameter!
      filters: filters,
      pagination: {
        page: pagination.page || 1,
        page_size: pagination.page_size || 20
      },
      options: {
        include_bundles: true
      }
    }
  );
  return response.data;
};

// Usage:
const handleSearch = async (query) => {
  const results = await searchProducts(query);
  setProducts(results.products);  // Already sorted by relevance!
};
```

### Filter Parameter Types

The backend now supports three types of product filters:

| Parameter | Type | Use Case | Example |
|-----------|------|----------|---------|
| `searchQuery` | String | Text search (fuzzy matching) | `"CM1 Core"` |
| `essp_ids` | Array[Int] | Filter to specific ESSP instances | `[2578, 2677, 2553]` |
| `product_ids` | Array[Int] | Filter by Product ID (navbar links) | `[75]` |
| `products` (legacy) | Array[Int/String] | Backward compatibility | `[75]` or `["Core Reading"]` |

### Migration Steps

1. **Update SearchBox Component**
   ```javascript
   // OLD:
   const handleSubmit = async (e) => {
     e.preventDefault();
     const fuzzyResults = await fuzzySearch(searchQuery);
     dispatch(setProducts(fuzzyResults.products.map(p => p.id)));
   };

   // NEW:
   const handleSubmit = async (e) => {
     e.preventDefault();
     dispatch(setSearchQuery(searchQuery));  // Store in Redux
     navigate('/products');  // Unified search handles it
   };
   ```

2. **Update useProductsSearch Hook**
   ```javascript
   // Build search payload
   const searchPayload = {
     searchQuery: filters.searchQuery || '',  // ✅ Add this
     filters: {
       subjects: filters.subjects || [],
       categories: filters.categories || [],
       product_types: filters.product_types || [],
       modes_of_delivery: filters.modes_of_delivery || [],
       // Remove: products (ESSP IDs) - handled by searchQuery now
     },
     pagination: {
       page: currentPage,
       page_size: pageSize
     }
   };
   ```

3. **Remove Fuzzy Search API Calls**
   - Delete `/fuzzy-search/` API call from search flow
   - Keep it ONLY for search suggestions (if used)

### Testing

#### Test Search Query
```bash
curl -X POST "http://localhost:8888/api/exam-sessions-subjects-products/search/" \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "CM1 Core",
    "pagination": {"page": 1, "page_size": 20}
  }'
```

**Expected:** Returns CM1 Core Reading first (best match)

#### Test Navbar Link (Product ID)
```bash
curl -X POST "http://localhost:8888/api/exam-sessions-subjects-products/search/" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {"product_ids": [75]},
    "pagination": {"page": 1, "page_size": 20}
  }'
```

**Expected:** Returns ALL Core Reading products (CB1, CB2, CS1, CS2, etc.)

#### Test Legacy ESSP IDs (Backward Compatibility)
```bash
curl -X POST "http://localhost:8888/api/exam-sessions-subjects-products/search/" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {"essp_ids": [2578, 2677, 2553]},
    "pagination": {"page": 1, "page_size": 20}
  }'
```

**Expected:** Returns only those specific ESSP instances

## Benefits of New Approach

### Performance
- ✅ **1 API call** instead of 2
- ✅ 50% reduction in network requests
- ✅ Faster perceived performance

### Correctness
- ✅ Search results sorted by **relevance**
- ✅ No confusion between ESSP IDs and Product IDs
- ✅ Consistent sorting (relevance for search, subject code for browse)

### Simplicity
- ✅ Single source of truth for search
- ✅ Less frontend state management
- ✅ Easier to debug

## Backward Compatibility

### Temporary Support (During Migration)

The backend still supports the OLD pattern for compatibility:

```javascript
// This STILL WORKS but uses ESSP IDs:
const response = await axios.post('/api/exam-sessions-subjects-products/search/', {
  filters: {
    products: [2578, 2677, 2553]  // Treated as ESSP IDs via legacy code
  }
});
```

BUT it tries BOTH ESSP and Product ID matching, so it's ambiguous.

### Recommended Migration Path

1. **Phase 1:** Update SearchBox to use `searchQuery` parameter
2. **Phase 2:** Update navbar links to use `product_ids` filter
3. **Phase 3:** Remove fuzzy-search API calls from search flow
4. **Phase 4:** (Future) Remove legacy `products` filter support

## Redux Integration

### Current State Shape
```javascript
{
  filters: {
    searchQuery: '',      // ✅ Add this
    subjects: [],
    categories: [],
    product_types: [],
    products: [],         // ❌ Remove this (was ESSP IDs)
    modes_of_delivery: []
  },
  currentPage: 1,
  pageSize: 20
}
```

### Updated Actions
```javascript
// filtersSlice.js
export const setSearchQuery = (state, action) => {
  state.filters.searchQuery = action.payload;
  state.currentPage = 1;  // Reset to page 1 on new search
};

export const clearSearchQuery = (state) => {
  state.filters.searchQuery = '';
};
```

## Related Documentation

- `BUG-FIXES-2025-10-23.md` - Backend fixes for ID handling
- `PRODUCT-SORTING-BEHAVIOR.md` - Sorting logic reference
- `FUZZY-SEARCH-UNCAPPED-SCORING.md` - Relevance scoring details

## Questions?

**Q: Can I still use `/fuzzy-search/` endpoint?**
A: Yes, but only for search suggestions/autocomplete. For actual search results, use `/search/` with `searchQuery`.

**Q: What about combining search with filters?**
A: Perfect use case for the new approach:
```javascript
{
  searchQuery: "Core Reading",
  filters: {
    subjects: ["CS1", "CS2"],
    categories: ["Material"]
  }
}
```
Returns Core Reading products for CS1/CS2 only, sorted by relevance.

**Q: What if I need to filter by specific ESSP IDs (not search)?**
A: Use the `essp_ids` filter:
```javascript
{
  filters: {
    essp_ids: [2578, 2677, 2553]
  }
}
```
