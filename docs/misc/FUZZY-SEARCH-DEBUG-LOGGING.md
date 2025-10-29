# Fuzzy Search Debug Logging Guide

**Date**: 2025-10-22
**Purpose**: Comprehensive logging for diagnosing fuzzy search issues

## Overview

The fuzzy search service now includes detailed debug logging that shows:
- Every product being evaluated
- Individual algorithm scores
- Bonus calculations
- Final scores and pass/fail status
- Summary of top results

This helps diagnose issues like:
- Why expected products aren't matching
- Why unexpected products are matching
- How scores are being calculated
- Which bonuses are being applied

## Log Output Structure

### 1. Search Start
```
🔍 [SEARCH-START] Query: "cs1 core read" | Min score: 60 | Limit: 50
================================================================================
Total products to scan: 523
```

### 2. Individual Product Scoring (DEBUG level)
```
📊 [SCORING] Query: "cs1 core read" | Product: [CS1] Core Reading
   Searchable text: "core reading material cs1 core subjects..."
   Algorithm scores: token_sort=85, partial=90, token_set=88
   Base weighted score: 87.10
   Best word match: "core" (score=75)
🎯 [SUBJECT-BONUS] Query: "cs1 core read" | Field: "cs1" | Score: 95 | Bonus: +12.5
🎯 [PRODUCT_NAME-BONUS] Query: "cs1 core read" | Field: "core reading material" | Score: 88 | Bonus: +9.0
   Bonus applied: +21.50 -> Final score: 108.60
   ✅ Final score: 108 (min_score: 60)

📊 [SCORING] Query: "cs1 core read" | Product: [CB1] Core Reading
   Searchable text: "core reading material cb1 corporate and business law..."
   Algorithm scores: token_sort=70, partial=85, token_set=72
   Base weighted score: 75.60
   Best word match: "core" (score=75)
   No bonus applied -> Final score: 75.60
   ✅ Final score: 75 (min_score: 60)

📊 [SCORING] Query: "cs1 core read" | Product: [SA1] Tutorial Pack
   Searchable text: "tutorial pack sa1 actuarial statistics..."
   Algorithm scores: token_sort=30, partial=40, token_set=28
   Base weighted score: 32.60
   Best word match: "pack" (score=25)
   No bonus applied -> Final score: 32.60
   ❌ Final score: 32 (min_score: 60)
```

### 3. Search Results Summary
```
================================================================================
🎯 [SEARCH-RESULTS] Query: "cs1 core read"
   Total scanned: 523 | Matches found: 15 | Returned: 15

   📋 Top 15 Results:
    1. Score: 108 | [CS1 ] Core Reading
       Algorithms: token_sort= 95, partial=100, token_set= 88
    2. Score:  95 | [CS1 ] Combined Materials Pack
       Algorithms: token_sort= 82, partial= 90, token_set= 85
    3. Score:  88 | [CS1 ] Mock Exam
       Algorithms: token_sort= 78, partial= 85, token_set= 80
    4. Score:  75 | [CB1 ] Core Reading
       Algorithms: token_sort= 70, partial= 85, token_set= 72
    5. Score:  72 | [CB2 ] Core Reading
       Algorithms: token_sort= 68, partial= 82, token_set= 70
    6. Score:  70 | [CM1 ] Core Reading
       Algorithms: token_sort= 65, partial= 80, token_set= 68
    7. Score:  68 | [CP1 ] Core Reading
       Algorithms: token_sort= 62, partial= 78, token_set= 65
    8. Score:  65 | [CP2 ] Core Reading
       Algorithms: token_sort= 60, partial= 75, token_set= 62
    9. Score:  62 | [CM2 ] Core Reading
       Algorithms: token_sort= 58, partial= 72, token_set= 60
   10. Score:  60 | [CP3 ] Core Reading
       Algorithms: token_sort= 55, partial= 70, token_set= 58
   11. Score:  58 | [SA1 ] Core Reading
       Algorithms: token_sort= 52, partial= 68, token_set= 55
   12. Score:  57 | [SA2 ] Core Reading
       Algorithms: token_sort= 50, partial= 65, token_set= 53
   13. Score:  55 | [SP1 ] Core Reading
       Algorithms: token_sort= 48, partial= 62, token_set= 52
   14. Score:  53 | [SP2 ] Core Reading
       Algorithms: token_sort= 46, partial= 60, token_set= 50
   15. Score:  52 | [SP3 ] Core Reading
       Algorithms: token_sort= 45, partial= 58, token_set= 48
================================================================================
```

**Note**: The debug logs now show up to **30 results** to give you a comprehensive view of how products are ranking.

## Log Entry Explanation

### Product Scoring Entry

**Header**:
```
📊 [SCORING] Query: "{query}" | Product: [{subject}] {product_name}
```
- Shows the query being searched
- Shows which product is being evaluated
- Subject code and product name for easy identification

**Searchable Text**:
```
   Searchable text: "{text}"
```
- The combined text from all searchable fields
- Includes: product name, description, subject code, subject description, variations, categories
- This is what the fuzzy algorithms compare against

**Algorithm Scores**:
```
   Algorithm scores: token_sort={score}, partial={score}, token_set={score}
```
- **token_sort**: Handles word order and plurals (60% weight)
- **partial**: Handles substring matches (10% weight)
- **token_set**: Handles partial word matches (30% weight)

**Note**: The weights have been adjusted from the original implementation to prioritize exact word matching over substring matching.

**Base Score**:
```
   Base weighted score: {score}
```
- Calculated as: `(token_sort * 0.5) + (partial * 0.3) + (token_set * 0.2)`

**Best Word Match**:
```
   Best word match: "{word}" (score={score})
```
- Shows the best matching individual word from searchable text
- If this score is higher than weighted score, it replaces it

**Bonuses**:
```
🎯 [SUBJECT-BONUS] Query: "{query}" | Field: "{value}" | Score: {score} | Bonus: +{bonus}
🎯 [PRODUCT_NAME-BONUS] Query: "{query}" | Field: "{value}" | Score: {score} | Bonus: +{bonus}
   Bonus applied: +{total_bonus} -> Final score: {score}
```
- Subject bonus: +0 to +15 points if subject matches well (threshold: 70)
- Product name bonus: +0 to +15 points if product name matches well (threshold: 70)
- Total bonus can be up to +30 points (combined)

**Final Score**:
```
   ✅ Final score: {score} (min_score: {threshold})  # Pass
   ❌ Final score: {score} (min_score: {threshold})  # Fail
```
- ✅ Product passed min_score threshold (included in results)
- ❌ Product failed min_score threshold (excluded from results)

## Viewing Logs

### Console Output (Live)

Logs appear in the Django console where `runserver` is running:
```bash
cd backend/django_Admin3
python manage.py runserver 8888
```

All INFO level logs (search start/end summaries) appear automatically.
DEBUG level logs (individual product scores) require DEBUG configuration.

### Log File

Logs are also written to `backend/django_Admin3/django_debug.log`:
```bash
# View recent logs
tail -f backend/django_Admin3/django_debug.log

# View logs for specific query
grep "cs1 core read" backend/django_Admin3/django_debug.log

# View only product scoring details
grep "📊 \[SCORING\]" backend/django_Admin3/django_debug.log

# View only results summaries
grep "🎯 \[SEARCH-RESULTS\]" backend/django_Admin3/django_debug.log

# View bonus applications
grep "🎯.*BONUS" backend/django_Admin3/django_debug.log
```

## Interpreting Algorithm Scores in Top 30 Results

Each product in the top 30 results now shows the individual algorithm scores that contributed to the final score:

```
1. Score: 108 | [CS1 ] Core Reading
   Algorithms: token_sort= 95, partial=100, token_set= 88
```

### Understanding the Scores

**token_sort** (60% weight):
- Measures how well the query matches when words are sorted
- Good for: "CS1 Core" matching "Core CS1" or "Exam" matching "Exams"
- High score (>80): Strong word-level match
- Low score (<60): Words don't match well

**partial** (10% weight):
- Measures substring matches
- Good for: "Read" matching "Reading" or "Core" matching "Core Reading Material"
- High score (>80): Query is a good substring of the product
- Low score (<60): Query doesn't appear as substring

**token_set** (30% weight):
- Measures matches when unique tokens are compared
- Good for: Handling duplicate words and word variations
- High score (>80): Word sets overlap significantly
- Low score (<60): Word sets are very different

### Using Scores to Diagnose Issues

#### Issue: Expected product not ranking #1

**Example**: "CS1 Core Read" - CS1 Core Reading is #3 instead of #1

**Check algorithm scores**:
```
1. Score: 95 | [CB1 ] Combined Pack
   Algorithms: token_sort=88, partial=95, token_set=90

3. Score: 88 | [CS1 ] Core Reading
   Algorithms: token_sort=85, partial=90, token_set=82
```

**Diagnosis**:
- CB1 has higher partial score (95 vs 90) → Better substring match
- CB1 has higher token_set (90 vs 82) → Better word set overlap
- CS1 missing subject bonus? Check bonus logs

**Solution**:
- Verify CS1 product is getting subject bonus
- Consider increasing token_sort weight (currently 60%)
- Consider decreasing partial weight (currently 10%)

#### Issue: Wrong subject products matching

**Example**: "CS1 Core" matching CB1, CB2, CM1

**Check algorithm scores**:
```
1. Score: 95 | [CB1 ] Core Reading
   Algorithms: token_sort=85, partial=95, token_set=88

5. Score: 75 | [CS1 ] Core Reading
   Algorithms: token_sort=72, partial=90, token_set=70
```

**Diagnosis**:
- CB1 has higher scores across all algorithms
- CS1 should have +15 subject bonus but still ranking lower
- Base scores for CB1 are too high (85, 95, 88)

**Solution**:
- Increase min_score threshold (e.g., 70 → 80)
- Verify subject codes are distinct ("CS1" vs "CB1" are similar)
- Check if searchable text for CB1 contains "CS1" accidentally

#### Issue: All products scoring similar

**Example**: Top 30 products all score 60-65

**Check algorithm scores**:
```
1. Score: 65 | [CS1 ] Core Reading
   Algorithms: token_sort=60, partial=62, token_set=58

2. Score: 64 | [CB1 ] Core Reading
   Algorithms: token_sort=59, partial=61, token_set=57

3. Score: 63 | [CM1 ] Core Reading
   Algorithms: token_sort=58, partial=60, token_set=56
```

**Diagnosis**:
- All algorithm scores are similar and low (55-62)
- Query doesn't match products well
- Products are too similar (all "Core Reading")

**Solution**:
- Refine query to be more specific
- Improve product names/descriptions to be more distinctive
- Lower min_score to see more matches

## Diagnostic Use Cases

### Case 1: Query Returns No Results

**Example**: "CS1 Core Read" returns no results

**What to check in logs**:

1. **Search start** - Verify query was received correctly:
```
🔍 [SEARCH-START] Query: "cs1 core read" | Min score: 60
```

2. **Product scores** - Look for CS1 products in logs:
```
📊 [SCORING] Query: "cs1 core read" | Product: [CS1] Core Reading
```

3. **Check final scores**:
```
   ❌ Final score: 55 (min_score: 60)  # Too low!
```

**Common causes**:
- `min_score` too high (e.g., 60 when scores are 50-55)
- Query has typo that fuzzy matching can't handle
- Product name/subject doesn't contain query terms
- Searchable text missing key fields

**Solutions**:
- Lower `FUZZY_SEARCH_MIN_SCORE` in `.env.development`
- Check if product data is correct (subject code, product name)
- Verify searchable text includes expected fields

### Case 2: Wrong Products Match

**Example**: "CS1 Core" matches CB1, CB2, CM1, etc. instead of CS1

**What to check in logs**:

1. **Look at scores for CS1 products**:
```
📊 [SCORING] Query: "cs1 core" | Product: [CS1] Core Reading
   Algorithm scores: token_sort=85, partial=90, token_set=88
   Base weighted score: 87.10
🎯 [SUBJECT-BONUS] Query: "cs1 core" | Field: "cs1" | Score: 100 | Bonus: +15.0
   ✅ Final score: 102 (min_score: 60)
```

2. **Compare with CB1 products**:
```
📊 [SCORING] Query: "cs1 core" | Product: [CB1] Core Reading
   Algorithm scores: token_sort=70, partial=85, token_set=72
   Base weighted score: 75.60
   No bonus applied -> Final score: 75.60
   ✅ Final score: 75 (min_score: 60)
```

3. **Check result summary** - See what ranked highest:
```
   📋 Top 10 Results:
    1. Score: 102 | [CS1 ] Core Reading  ✅ Correct
    2. Score:  75 | [CB1 ] Core Reading  ❌ Should be lower
```

**Common causes**:
- Subject bonus not working (CS1 should get +15 bonus)
- Fuzzy matching too lenient ("cs1" matching "cb1")
- Product name similarity ("Core Reading" in both)

**Solutions**:
- Verify subject bonus is being applied
- Increase `min_score` to filter out weak matches
- Check if subject codes are distinct enough

### Case 3: Results Ranked Incorrectly

**Example**: Expected product #1 appears as #5

**What to check in logs**:

1. **Find both products in scoring logs**
2. **Compare their scores**:
```
Expected #1:
   📊 [SCORING] Product: [CS1] Core Reading
   Final score: 85

Actual #1:
   📊 [SCORING] Product: [CS1] Mock Exam
   Final score: 95  # Higher because of better name match
```

3. **Check bonuses**:
```
Expected #1: Bonus: +15 (subject only)
Actual #1:   Bonus: +25 (subject +15, product name +10)
```

**Common causes**:
- Product name matches query better than expected product
- Bonuses applied differently to different products
- Fuzzy algorithms favor certain word patterns

**Solutions**:
- Adjust bonus weights (increase/decrease `max_bonus`)
- Change algorithm weights in code
- Improve product name/description data

## Enabling/Disabling Debug Logs

Debug logs are already enabled in development. To disable them:

### Option 1: Change Log Level in Settings

**File**: `backend/django_Admin3/django_Admin3/settings/development.py`

```python
LOGGING = {
    # ... existing config ...
    'root': {
        'handlers': ['file', 'console'],
        'level': 'INFO',  # Change from DEBUG to INFO
    },
}
```

### Option 2: Add Specific Logger for Fuzzy Search

```python
LOGGING = {
    # ... existing config ...
    'loggers': {
        'exam_sessions_subjects_products.services': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',  # DEBUG for detailed logs
            # level': 'INFO',  # INFO for summaries only
            'propagate': False,
        },
    },
}
```

## Performance Considerations

**Debug logging overhead**:
- Each product logged: ~5-10 log lines
- 500 products scanned: ~2500-5000 log lines
- Console output: ~50-100ms overhead
- File output: ~10-20ms overhead

**Recommendations**:
- Use DEBUG logging only when diagnosing issues
- Use INFO logging in production (summaries only)
- Rotate log files to prevent disk space issues
- Filter logs by query when analyzing specific searches

## Log Filtering Commands

### Search for Specific Query
```bash
grep "Query: \"cs1 core read\"" backend/django_Admin3/django_debug.log
```

### Show Only Passing Products
```bash
grep "✅ Final score" backend/django_Admin3/django_debug.log
```

### Show Only Failing Products
```bash
grep "❌ Final score" backend/django_Admin3/django_debug.log
```

### Show Products with Subject Bonus
```bash
grep "SUBJECT-BONUS" backend/django_Admin3/django_debug.log
```

### Show Products with Product Name Bonus
```bash
grep "PRODUCT_NAME-BONUS" backend/django_Admin3/django_debug.log
```

### Show Result Summaries Only
```bash
grep "SEARCH-RESULTS" backend/django_Admin3/django_debug.log
```

### Show Scores for Specific Subject
```bash
grep "\[CS1 \]" backend/django_Admin3/django_debug.log
```

### Show Top 30 Results for All Searches
```bash
grep -A 61 "📋 Top" backend/django_Admin3/django_debug.log
```

## Example: Diagnosing "CS1 Core Read" Issue

**Problem**: "CS1 Core Read" returns no results

**Step 1: Run search and capture logs**
```bash
# Search via API
curl "http://localhost:8888/api/products/current/fuzzy-search/?q=CS1%20Core%20Read"

# View logs
tail -100 backend/django_Admin3/django_debug.log
```

**Step 2: Check search start**
```
🔍 [SEARCH-START] Query: "cs1 core read" | Min score: 60 | Limit: 50
```
✅ Query received correctly (lowercase: "cs1 core read")

**Step 3: Find CS1 products in logs**
```bash
grep "cs1 core read" django_debug.log | grep "\[CS1"
```

**Step 4: Examine CS1 Core Reading scores**
```
📊 [SCORING] Query: "cs1 core read" | Product: [CS1] Core Reading
   Searchable text: "core reading material cs1 core subjects..."
   Algorithm scores: token_sort=60, partial=75, token_set=58
   Base weighted score: 64.10
   Best word match: "core" (score=67)
🎯 [SUBJECT-BONUS] Query: "cs1 core read" | Field: "cs1" | Score: 85 | Bonus: +7.5
🎯 [PRODUCT_NAME-BONUS] Query: "cs1 core read" | Field: "core reading material" | Score: 75 | Bonus: +2.5
   Bonus applied: +10.00 -> Final score: 77.10
   ✅ Final score: 77 (min_score: 60)
```

**Analysis**:
- ✅ CS1 Core Reading scored 77 (above min_score: 60)
- ✅ Subject bonus applied (+7.5)
- ✅ Product name bonus applied (+2.5)
- ✅ Should appear in results!

**Step 5: Check result summary**
```
🎯 [SEARCH-RESULTS] Query: "cs1 core read"
   Total scanned: 523 | Matches found: 15 | Returned: 15

   📋 Top 15 Results:
    1. Score:  77 | [CS1 ] Core Reading  ✅ Found it!
       Algorithms: token_sort= 85, partial= 90, token_set= 82
    2. Score:  70 | [CS1 ] Combined Materials Pack
       Algorithms: token_sort= 78, partial= 85, token_set= 75
    ...
```

**Resolution**: Product IS matching! Issue was with frontend display or API response parsing.

## Summary

### Log Levels

| Level | What's Logged | Use Case |
|-------|---------------|----------|
| INFO | Search start/end summaries, top 10 results | Production monitoring |
| DEBUG | Individual product scoring details, algorithm scores, bonuses | Issue diagnosis |

### Key Indicators

| Emoji | Meaning |
|-------|---------|
| 🔍 | Search started |
| 📊 | Scoring product |
| 🎯 | Bonus applied or results summary |
| ✅ | Product passed min_score |
| ❌ | Product failed min_score |
| 📋 | Top results list |

### Quick Diagnosis

**No results**:
1. Check `min_score` in search start log
2. Find expected product in scoring logs
3. Check if final score is below min_score
4. Lower `FUZZY_SEARCH_MIN_SCORE` if needed

**Wrong results**:
1. Compare scores of expected vs actual results
2. Check which bonuses were applied
3. Look at algorithm scores (token_sort, partial, token_set)
4. Verify searchable text contains expected terms

**Poor ranking**:
1. Find both products in scoring logs
2. Compare final scores
3. Check bonus differences
4. Adjust bonus weights or algorithm weights if needed

---

**Documentation Complete**: 2025-10-22
**Status**: ✅ Debug logging enabled
**Log Location**: `backend/django_Admin3/django_debug.log`
**Log Level**: DEBUG (shows all scoring details)
