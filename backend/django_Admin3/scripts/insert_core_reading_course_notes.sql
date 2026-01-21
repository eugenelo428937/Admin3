-- =============================================================================
-- SQL Script: Insert Core Reading (PPV 492) and Course Notes (PPV 435)
-- into store.products for all exam session subjects (excluding subject_id 29, 23)
-- =============================================================================
-- New product_code format: {subject}/{variation.code}{product.code}/{session_code}
-- Core Reading (PPV 492): variation.code=C, product.code=CR → e.g., CB1/CCR/2025-04
-- Course Notes (PPV 435): variation.code=C, product.code=N → e.g., CB1/CN/2025-04
-- =============================================================================

-- First, verify the PPV details
SELECT
    ppv.id as ppv_id,
    p.code as product_code,
    pv.code as variation_code,
    p.fullname as product_name,
    pv.variation_type
FROM "acted"."catalog_product_product_variations" ppv
JOIN "acted"."catalog_products" p ON p.id = ppv.product_id
JOIN "acted"."catalog_product_variations" pv ON pv.id = ppv.product_variation_id
WHERE ppv.id IN (492, 435);

-- Preview what will be inserted (DRY RUN)
SELECT
    ess.id as exam_session_subject_id,
    492 as product_product_variation_id,
    s.code || '/CCR/' || es.session_code as product_code,
    'Core Reading' as product_name
FROM "acted"."catalog_exam_session_subjects" ess
JOIN "acted"."catalog_subjects" s ON s.id = ess.subject_id
JOIN "acted"."catalog_exam_sessions" es ON es.id = ess.exam_session_id
WHERE ess.subject_id NOT IN (29, 23)
UNION ALL
SELECT
    ess.id as exam_session_subject_id,
    435 as product_product_variation_id,
    s.code || '/CN/' || es.session_code as product_code,
    'Course Notes' as product_name
FROM "acted"."catalog_exam_session_subjects" ess
JOIN "acted"."catalog_subjects" s ON s.id = ess.subject_id
JOIN "acted"."catalog_exam_sessions" es ON es.id = ess.exam_session_id
WHERE ess.subject_id NOT IN (29, 23)
ORDER BY product_code;

-- =============================================================================
-- ACTUAL INSERT STATEMENTS (uncomment to execute)
-- =============================================================================

-- Insert Core Reading (PPV 492) for all eligible exam session subjects
INSERT INTO "acted"."products" (
    exam_session_subject_id,
    product_product_variation_id,
    product_code,
    is_active,
    created_at,
    updated_at
)
SELECT
    ess.id,
    492,
    s.code || '/CCR/' || es.session_code,
    true,
    NOW(),
    NOW()
FROM "acted"."catalog_exam_session_subjects" ess
JOIN "acted"."catalog_subjects" s ON s.id = ess.subject_id
JOIN "acted"."catalog_exam_sessions" es ON es.id = ess.exam_session_id
WHERE ess.subject_id NOT IN (29, 23)
ON CONFLICT (exam_session_subject_id, product_product_variation_id) DO NOTHING;

-- Insert Course Notes (PPV 435) for all eligible exam session subjects
INSERT INTO "acted"."products" (
    exam_session_subject_id,
    product_product_variation_id,
    product_code,
    is_active,
    created_at,
    updated_at
)
SELECT
    ess.id,
    435,
    s.code || '/CN/' || es.session_code,
    true,
    NOW(),
    NOW()
FROM "acted"."catalog_exam_session_subjects" ess
JOIN "acted"."catalog_subjects" s ON s.id = ess.subject_id
JOIN "acted"."catalog_exam_sessions" es ON es.id = ess.exam_session_id
WHERE ess.subject_id NOT IN (29, 23)
ON CONFLICT (exam_session_subject_id, product_product_variation_id) DO NOTHING;

-- Verify inserted records
SELECT
    sp.id,
    sp.product_code,
    sp.exam_session_subject_id,
    sp.product_product_variation_id,
    sp.is_active
FROM "acted"."products" sp
WHERE sp.product_product_variation_id IN (492, 435)
ORDER BY sp.product_code;
