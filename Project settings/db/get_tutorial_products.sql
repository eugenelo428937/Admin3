SELECT
    s.code subject_code,
    te.code event_code,
    ps.fullname product_name,
    esspvp.amount product_price,
    esspvp.price_type price_type,
    te.venue,
    pv.description,
    pv.code vcode,
    s.id subject_id,
    ps.id product_id,
    es.id exam_session_id,
    ess.id exam_session_subject_id,
    essp.id exam_session_subject_product_id,
    esspv.id exam_session_subject_product_variation_id,
    esspvp.id price_id,
    te.id event_id
FROM
    acted_tutorial_events te
    LEFT JOIN acted_exam_session_subject_product_variations esspv ON esspv.id = te.exam_session_subject_product_variation_id
    LEFT JOIN acted_exam_session_subject_products essp ON essp.id = esspv.exam_session_subject_product_id
    LEFT JOIN acted_exam_session_subjects ess ON ess.id = essp.exam_session_subject_id
    LEFT JOIN acted_exam_sessions es ON es.id = ess.exam_session_id
    LEFT JOIN acted_subjects s ON s.id = ess.subject_id
    LEFT JOIN acted_product_productvariation ppv ON ppv.id = esspv.product_product_variation_id
    LEFT JOIN acted_products ps ON ps.id = essp.product_id
    LEFT JOIN acted_product_variations pv on pv.id = ppv.id
    LEFT JOIN acted_exam_session_subject_product_variation_price esspvp ON esspvp.variation_id = esspv.id 