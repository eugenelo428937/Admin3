-- Active: 1774632167474@@localhost@5432@ACTEDDBDEV01@acted
SELECT
    pur.id pur_id,
    pur.kind,
    pur.code,
    cp.id cp_id,
    cp.fullname,
    cpv.name variation_name,
    cs.id subject_id,
    cs.code subject_code,
    ces.id session_id,
    ces.session_code,
    prc.amount,
    prc.price_type
FROM
    purchasables pur
    left join products prod ON prod.purchasable_ptr_id = pur.id
    left join catalog_product_product_variations ppv ON ppv.id = prod.product_product_variation_id
    LEFT JOIN catalog_products cp ON cp.id = ppv.product_id
    LEFT JOIN catalog_product_variations cpv ON cpv.id = ppv.product_variation_id
    left join catalog_exam_session_subjects cess ON cess.id = prod.exam_session_subject_id
    left join catalog_exam_sessions ces ON ces.id = cess.exam_session_id
    left join catalog_subjects cs ON cs.id = cess.subject_id
    left join prices prc ON prc.purchasable_id = pur.id
where
    ces.session_code = '26'
ORDER By
    pur.code
LIMIT
    9999;


SELECT
    ppv.id ppvid,
    cp.fullname,
    pv.name pvname,
    pv.code pvcode,
    cp.code pcode
FROM
    catalog_products cp
    left join catalog_product_product_variations ppv ON ppv.product_id = cp.id
    left join catalog_product_variations pv ON ppv.product_variation_id = pv.id
SELECT
    pg_size_pretty(pg_database_size('ACTEDDBDEV01'));