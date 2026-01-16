-- =============================================================================
-- SQL Script: Update existing Marking and Material product codes
-- =============================================================================
-- Old format: {subject}/{prefix}{product.code}{variation.code}/{session}-{id}
--             Example: CB1/PCP/2025-04-3 (P=Printed prefix, C=product, P=variation)
--
-- New format: {subject}/{variation.code}{product.code}/{session}
--             Example: CB1/PC/2025-04
--
-- Applies to variation_type IN ('eBook', 'Printed', 'Marking')
-- =============================================================================

-- Step 1: Preview what will be changed (DRY RUN)
SELECT
    sp.id,
    sp.product_code AS old_product_code,
    s.code || '/' || COALESCE(pv.code, '') || p.code || '/' || es.session_code AS new_product_code,
    pv.variation_type,
    p.code AS product_code_raw,
    pv.code AS variation_code_raw
FROM "acted"."products" sp
JOIN "acted"."catalog_product_product_variations" ppv ON ppv.id = sp.product_product_variation_id
JOIN "acted"."catalog_products" p ON p.id = ppv.product_id
JOIN "acted"."catalog_product_variations" pv ON pv.id = ppv.product_variation_id
JOIN "acted"."catalog_exam_session_subjects" ess ON ess.id = sp.exam_session_subject_id
JOIN "acted"."catalog_subjects" s ON s.id = ess.subject_id
JOIN "acted"."catalog_exam_sessions" es ON es.id = ess.exam_session_id
WHERE pv.variation_type IN ('eBook', 'Printed', 'Marking')
ORDER BY pv.variation_type, sp.product_code;

-- Step 2: Count records that will be updated
SELECT
    pv.variation_type,
    COUNT(*) AS count
FROM "acted"."products" sp
JOIN "acted"."catalog_product_product_variations" ppv ON ppv.id = sp.product_product_variation_id
JOIN "acted"."catalog_product_variations" pv ON pv.id = ppv.product_variation_id
WHERE pv.variation_type IN ('eBook', 'Printed', 'Marking')
GROUP BY pv.variation_type
ORDER BY pv.variation_type;

-- =============================================================================
-- Step 3: ACTUAL UPDATE (uncomment to execute)
-- =============================================================================

-- Check for potential duplicates before updating
-- (this should return 0 rows if all new codes are unique)
SELECT
    new_code,
    COUNT(*) AS duplicate_count
FROM (
    SELECT
        s.code || '/' || COALESCE(pv.code, '') || p.code || '/' || es.session_code AS new_code
    FROM "acted"."products" sp
    JOIN "acted"."catalog_product_product_variations" ppv ON ppv.id = sp.product_product_variation_id
    JOIN "acted"."catalog_products" p ON p.id = ppv.product_id
    JOIN "acted"."catalog_product_variations" pv ON pv.id = ppv.product_variation_id
    JOIN "acted"."catalog_exam_session_subjects" ess ON ess.id = sp.exam_session_subject_id
    JOIN "acted"."catalog_subjects" s ON s.id = ess.subject_id
    JOIN "acted"."catalog_exam_sessions" es ON es.id = ess.exam_session_id
    WHERE pv.variation_type IN ('eBook', 'Printed', 'Marking')
) subquery
GROUP BY new_code
HAVING COUNT(*) > 1;

-- Update all Marking and Material product codes
UPDATE "acted"."products" sp
SET
    product_code = s.code || '/' || COALESCE(pv.code, '') || p.code || '/' || es.session_code,
    updated_at = NOW()
FROM "acted"."catalog_product_product_variations" ppv,
     "acted"."catalog_products" p,
     "acted"."catalog_product_variations" pv,
     "acted"."catalog_exam_session_subjects" ess,
     "acted"."catalog_subjects" s,
     "acted"."catalog_exam_sessions" es
WHERE sp.product_product_variation_id = ppv.id
  AND p.id = ppv.product_id
  AND pv.id = ppv.product_variation_id
  AND ess.id = sp.exam_session_subject_id
  AND s.id = ess.subject_id
  AND es.id = ess.exam_session_id
  AND pv.variation_type IN ('eBook', 'Printed', 'Marking');

-- Step 4: Verify the update
SELECT
    sp.id,
    sp.product_code,
    pv.variation_type
FROM "acted"."products" sp
JOIN "acted"."catalog_product_product_variations" ppv ON ppv.id = sp.product_product_variation_id
JOIN "acted"."catalog_product_variations" pv ON pv.id = ppv.product_variation_id
WHERE pv.variation_type IN ('eBook', 'Printed', 'Marking')
ORDER BY pv.variation_type, sp.product_code
LIMIT 20;

-- Step 5: Count to verify all records updated
SELECT
    pv.variation_type,
    COUNT(*) AS count
FROM "acted"."products" sp
JOIN "acted"."catalog_product_product_variations" ppv ON ppv.id = sp.product_product_variation_id
JOIN "acted"."catalog_product_variations" pv ON pv.id = ppv.product_variation_id
WHERE pv.variation_type IN ('eBook', 'Printed', 'Marking')
  AND sp.product_code NOT LIKE '%-%'  -- New format doesn't have -id suffix
GROUP BY pv.variation_type
ORDER BY pv.variation_type;
