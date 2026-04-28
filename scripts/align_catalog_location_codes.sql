-- ------------------------------------------------------------------
-- align_catalog_location_codes.sql
-- ------------------------------------------------------------------
-- Aligns "acted"."catalog_products"."code" for tutorial-location entries
-- with the canonical codes in "acted"."tutorial_locations"."code".
--
-- Matching rule: case-insensitive equality on
--   catalog_products.shortname  ==  tutorial_locations.name
--
-- Examples that will be rewritten:
--   catalog_products.code 'BHM' (shortname='Birmingham') -> 'Bir'
--   catalog_products.code 'GSW' (shortname='Glasgow')    -> 'GLA'
--   catalog_products.code 'LDN' (shortname='London')     -> 'Lon'
--
-- After running this with COMMIT, run audit_and_fix_purchasable_codes.sql
-- to propagate the new codes into "acted"."purchasables"."code" and
-- "acted"."products"."product_code".
-- ------------------------------------------------------------------

BEGIN;

-- ---------- STEP 1: preview the alignment plan -------------------
DROP TABLE IF EXISTS tmp_loc_align;
CREATE TEMP TABLE tmp_loc_align ON COMMIT DROP AS
SELECT
    cp.id           AS catalog_product_id,
    cp.shortname    AS shortname,
    cp.code         AS old_code,
    tl.code         AS new_code
FROM   "acted"."catalog_products"     cp
JOIN   "acted"."tutorial_locations"   tl
       ON LOWER(TRIM(cp.shortname)) = LOWER(TRIM(tl.name));

SELECT
    catalog_product_id,
    shortname,
    old_code,
    new_code,
    CASE WHEN old_code = new_code
         THEN 'ok'
         ELSE 'will rewrite'
    END AS status
FROM tmp_loc_align
ORDER BY shortname;

-- ---------- STEP 2: apply the rewrite ----------------------------
UPDATE "acted"."catalog_products" cp
SET    code = a.new_code,
       updated_at = NOW()
FROM   tmp_loc_align a
WHERE  cp.id = a.catalog_product_id
  AND  cp.code IS DISTINCT FROM a.new_code;

-- ---------- STEP 3: verification ---------------------------------
SELECT
    'rewritten' AS bucket,
    COUNT(*)    AS count
FROM   tmp_loc_align
WHERE  old_code IS DISTINCT FROM new_code;

SELECT
    'still_mismatched' AS bucket,
    COUNT(*)           AS count
FROM   tmp_loc_align a
JOIN   "acted"."catalog_products" cp ON cp.id = a.catalog_product_id
WHERE  cp.code IS DISTINCT FROM a.new_code;

-- ------------------------------------------------------------------
-- Flip to COMMIT to persist; leave as ROLLBACK for a dry run.
-- ------------------------------------------------------------------
ROLLBACK;
-- COMMIT;
