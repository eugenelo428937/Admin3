-- ------------------------------------------------------------------
-- audit_and_fix_purchasable_codes.sql
-- ------------------------------------------------------------------
-- Audits every row in "acted"."purchasables" / "acted"."products"
-- whose code does not match the expected format and, when the
-- correct code can be derived, rewrites it in place.
--
-- Format rules enforced by store.Product._generate_product_code():
--   Material/Marking (eBook, Printed, Marking):
--     {subject_code}/{variation_code}{product_code}/{exam_session_code}
--   Tutorial/Other:
--     {subject_code}/{location_code}/{variation_code}/{exam_session_code}
--
-- Tutorial location comes from the first linked row in
-- "acted"."tutorial_events".location_id -> "acted"."tutorial_locations".
-- Tutorials without a linked location cannot be auto-fixed and are
-- reported in step 1 for manual follow-up.
--
-- Usage:
--   psql -h <host> -U <user> -d ACTEDDBDEV01 -f audit_and_fix_purchasable_codes.sql
--
-- The script is wrapped in a single transaction. By default it ends in
-- ROLLBACK so you can review without persisting. Switch the final line
-- to COMMIT once you have reviewed the audit output.
--
-- WARNING: tutorial fixes rewrite purchasables.code using
-- tutorial_locations.code. If that table holds different location
-- abbreviations than the live purchasables codes (e.g., tutorial_locations
-- uses 'Lon' while purchasables use 'LDN'), running with COMMIT will
-- rewrite them — review step 1 output first.
--
-- Note: this file uses only single-statement DDL/DML separated by ';'
-- so pgAdmin's "Limit rows" query rewriter does not interfere.
-- ------------------------------------------------------------------

BEGIN;

-- ---------- STEP 0: build the audit set ---------------------------
DROP TABLE IF EXISTS tmp_code_fix;
CREATE TEMP TABLE tmp_code_fix ON COMMIT DROP AS
SELECT
    pr.purchasable_ptr_id                     AS purchasable_id,
    pu.code                                   AS current_code,
    pv.variation_type                         AS variation_type,
    pu.is_addon                               AS is_addon,
    CASE
        WHEN pv.variation_type IN ('eBook', 'Printed', 'Marking')
            THEN ess.subject_code
                 || '/' || pv.variation_code || pv.catalog_product_code
                 || '/' || ess.exam_session_code
        WHEN tl.location_code IS NOT NULL
            THEN ess.subject_code
                 || '/' || tl.location_code
                 || '/' || pv.variation_code
                 || '/' || ess.exam_session_code
        ELSE NULL
    END                                       AS expected_code,
    CASE
        WHEN pv.variation_type IN ('eBook', 'Printed', 'Marking')
            THEN 'material'
        WHEN tl.location_code IS NOT NULL
            THEN 'tutorial'
        ELSE 'tutorial_no_location'
    END                                       AS kind
FROM "acted"."products"     pr
JOIN "acted"."purchasables" pu ON pu.id = pr.purchasable_ptr_id
JOIN (
    SELECT
        ppv.id                AS ppv_id,
        cp.code               AS catalog_product_code,
        COALESCE(pv2.code,'') AS variation_code,
        pv2.variation_type    AS variation_type
    FROM "acted"."catalog_product_product_variations" ppv
    JOIN "acted"."catalog_products"           cp  ON cp.id  = ppv.product_id
    JOIN "acted"."catalog_product_variations" pv2 ON pv2.id = ppv.product_variation_id
)            pv  ON pv.ppv_id  = pr.product_product_variation_id
JOIN (
    SELECT
        e.id            AS ess_id,
        s.code          AS subject_code,
        xs.session_code AS exam_session_code
    FROM "acted"."catalog_exam_session_subjects" e
    JOIN "acted"."catalog_subjects"      s  ON s.id  = e.subject_id
    JOIN "acted"."catalog_exam_sessions" xs ON xs.id = e.exam_session_id
)            ess ON ess.ess_id = pr.exam_session_subject_id
LEFT JOIN (
    SELECT DISTINCT ON (te.product_id)
        te.product_id  AS product_id,
        tl.code        AS location_code
    FROM "acted"."tutorial_events"    te
    JOIN "acted"."tutorial_locations" tl ON tl.id = te.location_id
    WHERE tl.code IS NOT NULL AND tl.code <> ''
    ORDER BY te.product_id, te.id
)            tl  ON tl.product_id = pr.purchasable_ptr_id;

-- Addons share their base's PPV, so the derived `expected_code` would be
-- the base's code and rewriting it would collide with the base. Mark every
-- addon row in tmp_code_fix so the UPDATE steps skip it.
UPDATE tmp_code_fix SET expected_code = NULL, kind = 'addon'
WHERE  is_addon = TRUE;

-- Non-product purchasables (vouchers/binders/etc.) don't have a row in
-- products. Add them as 'non_product' with no expected_code (skipped).
INSERT INTO tmp_code_fix (purchasable_id, current_code, variation_type,
                          is_addon, expected_code, kind)
SELECT
    p.id, p.code, NULL, p.is_addon, NULL, 'non_product'
FROM "acted"."purchasables" p
LEFT JOIN "acted"."products" pr ON pr.purchasable_ptr_id = p.id
WHERE pr.purchasable_ptr_id IS NULL;

-- ---------- STEP 1: audit report ---------------------------------
SELECT
    kind,
    variation_type,
    purchasable_id,
    current_code,
    expected_code,
    CASE
        WHEN expected_code IS NULL          THEN 'no expected code (skipped)'
        WHEN current_code = expected_code   THEN 'ok'
        ELSE                                     'MISMATCH (will be fixed)'
    END AS status
FROM tmp_code_fix
WHERE expected_code IS NULL
   OR current_code IS DISTINCT FROM expected_code
ORDER BY kind, current_code;

-- ---------- STEP 2: apply fixes ----------------------------------
UPDATE "acted"."purchasables" p
SET    code = f.expected_code,
       updated_at = NOW()
FROM   tmp_code_fix f
WHERE  p.id = f.purchasable_id
  AND  f.expected_code IS NOT NULL
  AND  p.code IS DISTINCT FROM f.expected_code;

UPDATE "acted"."products" pr
SET    product_code = f.expected_code
FROM   tmp_code_fix f
WHERE  pr.purchasable_ptr_id = f.purchasable_id
  AND  f.expected_code IS NOT NULL
  AND  pr.product_code IS DISTINCT FROM f.expected_code;

-- ---------- STEP 3: post-fix verification ------------------------
SELECT 'still_mismatched' AS bucket, COUNT(*) AS count
FROM   tmp_code_fix f
JOIN   "acted"."purchasables" p ON p.id = f.purchasable_id
WHERE  f.expected_code IS NOT NULL
  AND  p.code IS DISTINCT FROM f.expected_code;

SELECT 'no_expected_code' AS bucket, COUNT(*) AS count
FROM   tmp_code_fix
WHERE  expected_code IS NULL;

-- ------------------------------------------------------------------
-- Flip to COMMIT to persist; leave as ROLLBACK for a dry run.
-- ------------------------------------------------------------------
ROLLBACK;
-- COMMIT;
