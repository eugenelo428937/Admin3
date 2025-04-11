ALTER TABLE
    "acted_exam_session_subject_products"
ADD
    COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
SELECT
    ess.id,
    es.id,
    es.session_code,
    s.id,
    s.code
FROM
    acted_exam_session_subjects ess
    left join acted_exam_sessions es on es.id = ess.exam_session_id
    left join acted_subjects s on s.id = ess.subject_id
LIMIT
    100
SELECT
    essp.id,
    essp.product_id,
    p.code,
    p.fullname,
    ess.id,
    es.id,
    es.session_code,
    s.id,
    s.code
FROM
    acted_exam_session_subject_products essp
    left join acted_exam_session_subjects ess on ess.id = essp.exam_session_subject_id
    left join acted_exam_sessions es on es.id = ess.exam_session_id
    left join acted_subjects s on s.id = ess.subject_id
    left join acted_products p on essp.product_id = p.id
where
    s.code = 'CB1'
order by
    s.code,
    p.code
LIMIT
    100
SELECT
    essp.id,
    essp.product_id,
    p.code,
    p.fullname
FROM
    acted_exam_session_subject_products essp
    left join acted_products p on essp.product_id = p.id
WHERE
    essp.exam_session_subject_id = 27
