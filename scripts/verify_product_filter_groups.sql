-- Verify store products with catalog and filter group assignments
-- Products with NULL filter_group_id are missing group assignments
SELECT
    p.id AS store_product_id,
    p.product_code,
    p.is_active AS product_active,
    es.id AS exam_session_id,
    es.session_code,
    s.id AS subject_id,
    s.code AS subject_code,
    pv.id AS variation_id,
    pv.code AS variation_code,
    pv.variation_type,
    cp.id AS catalog_product_id,
    cp.shortname AS catalog_product_shortname,
    fg.id AS filter_group_id,
    fg.name AS filter_group_name,
    fg.code AS filter_group_code,
    fgp.name AS filter_group_parent_name
FROM acted.products p
INNER JOIN acted.catalog_exam_session_subjects ess ON p.exam_session_subject_id = ess.id
INNER JOIN acted.catalog_exam_sessions es ON ess.exam_session_id = es.id
INNER JOIN acted.catalog_subjects s ON ess.subject_id = s.id
INNER JOIN acted.catalog_product_product_variations ppv ON p.product_product_variation_id = ppv.id
INNER JOIN acted.catalog_product_variations pv ON ppv.product_variation_id = pv.id
INNER JOIN acted.catalog_products cp ON ppv.product_id = cp.id
LEFT JOIN acted.filter_product_product_groups ppg ON cp.id = ppg.product_id
LEFT JOIN acted.filter_groups fg ON ppg.product_group_id = fg.id
LEFT JOIN acted.filter_groups fgp ON fg.parent_id = fgp.id
where fg.id in (1,16) and s.code = 'CP1'
ORDER BY s.code, es.session_code, cp.shortname, pv.variation_type, fg.name;
