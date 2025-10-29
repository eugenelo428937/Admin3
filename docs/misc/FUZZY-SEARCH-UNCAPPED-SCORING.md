# Fuzzy Search: Uncapped Score Sorting Fix

**Date:** 2025-10-23
**Status:** Implemented, requires server restart

## Problem

When searching "CS1 Cor", all CS1 products scored identically (100) despite having different product names:
- CS1 Core Reading: 100
- CS1 Course Notes: 100
- CS1 Mock Exam: 99

The issue was that high weighted scores were **capped at 100** before sorting:
```python
# CS1 Core Reading
partial_ratio("cor", "core reading") = 100
weighted: 100 × 3.0 = 300 → capped to 100

# CS1 Course Notes
partial_ratio("cor", "course notes") = 67
weighted: 67 × 3.0 = 201 → capped to 100

# Both products scored 100 and tied!
```

## Root Cause

The scoring algorithm had two features working against each other:

1. **Multi-token detection** (lines 277-307): Correctly detected "CS1 Cor" as subject + remainder, applied 3.0x weight to product name matches
2. **Score capping** (line 350): Capped weighted scores at 100 BEFORE sorting, causing ties

## Solution

**Store uncapped weighted scores for sorting, but display capped scores to users:**

### Changes Made

**File:** `backend/django_Admin3/exam_sessions_subjects_products/services/fuzzy_search_service.py`

1. **Store uncapped score** (lines 349-354):
```python
# IMPORTANT: Store uncapped weighted score for sorting
uncapped_score = best_score
final_score = min(100, int(best_score))  # Cap only for display
```

2. **Return uncapped score** (lines 361-367):
```python
return {
    'score': final_score,
    'uncapped_score': uncapped_score,  # For accurate sorting
    'token_sort': token_sort_score,
    'partial': partial_score,
    'token_set': token_set_score
}
```

3. **Include uncapped score in tuples** (lines 92-100, 565-572):
```python
products_with_scores.append((
    product,
    score,  # Display score (capped)
    score_result.get('uncapped_score', score),  # Sorting score (uncapped)
    searchable_text,
    score_result['token_sort'],
    score_result['partial'],
    score_result['token_set']
))
```

4. **Sort by uncapped score** (lines 139-141, 574-575):
```python
# Sort by uncapped fuzzy score (highest first) for accurate ranking
# x[2] is uncapped_score, x[1] is capped display score
products_with_scores.sort(key=lambda x: x[2], reverse=True)
```

5. **Update tuple unpacking** (lines 148, 187, 580):
- Added one more element to handle uncapped_score in tuple

## Expected Behavior After Fix

With "CS1 Cor" query:

| Product | Partial Ratio | Weighted | Uncapped | Display | Rank |
|---------|---------------|----------|----------|---------|------|
| CS1 Core Reading | 100 | 300 | 300 | 100 | 1st ✅ |
| CS1 Course Notes | 67 | 201 | 201 | 100 | 2nd ✅ |
| CS1 Mock Exam | 33 | 99 | 99 | 99 | 3rd ✅ |

**Sorting uses uncapped score (300 > 201 > 99), so products rank correctly!**
**Display shows capped score (100, 100, 99) for UX consistency.**

## Testing

### Manual Test
```bash
# Search "CS1 Cor"
curl "http://localhost:8888/api/exam-sessions-subjects-products/fuzzy_search/?q=CS1%20Cor&limit=10"

# Expected results:
# 1. CS1 Core Reading (score: 100, uncapped: 300)
# 2. CS1 Course Notes (score: 100, uncapped: 201)
# 3. CS1 Mock Exam (score: 99, uncapped: 99)
```

### Verify in Logs
```bash
tail -f backend/django_Admin3/django_debug.log | grep "Multi-token"

# Expected output:
# 🎯 Multi-token query detected: subject="cs1" + remainder="cor"
# Remainder "cor" vs shortname "core reading": score=100 (weight=3.0x HIGH)
```

## Required Action

**⚠️ Django server MUST be restarted to load the new code:**

```bash
# Stop Django server (Ctrl+C)
# Restart:
cd backend/django_Admin3
python manage.py runserver 8888
```

## Verification Steps

1. ✅ Code validated: `python manage.py check --deploy` passes
2. ⏳ Server restart required
3. ⏳ Test search "CS1 Cor"
4. ⏳ Verify CS1 Core Reading ranks #1
5. ⏳ Check debug logs show multi-token detection

## Related Files

- Implementation: `exam_sessions_subjects_products/services/fuzzy_search_service.py`
- Multi-token detection: Lines 277-307
- Score calculation: Lines 337-367
- Related docs:
  - `FUZZY-SEARCH-FIELD-SPECIFIC-MATCHING.md`
  - `FUZZY-SEARCH-DEBUG-LOGGING.md`

## Notes

- The multi-token detection code was already in place but not executing due to server not being restarted
- This fix ensures high-scoring products can be properly differentiated even when display scores are identical
- Uncapped scores can exceed 100 (e.g., 300, 201) for sorting purposes only
