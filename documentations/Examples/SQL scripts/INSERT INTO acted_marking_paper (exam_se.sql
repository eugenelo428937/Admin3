INSERT INTO acted_marking_paper (exam_session_subject_product_id, name, recommended_submit_date, deadline)
SELECT
    mmx.essp_id,
    mmx.paper_name,
    mm1.recommended_submit_date,
    mm1.deadline
FROM (
    -- Get all MM2/MM3 products and their ESSP IDs for all subjects
    SELECT essp.id AS essp_id, pro.code AS product_code, s.code AS subject_code, 'M2' AS paper_name
    FROM acted_exam_session_subject_products essp
    JOIN acted_products pro ON pro.id = essp.product_id
    JOIN acted_exam_session_subjects ess ON ess.id = essp.exam_session_subject_id
    JOIN acted_subjects s ON s.id = ess.subject_id
    WHERE pro.code = 'MM1'
) mmx
JOIN (
    -- Get MM1 marking paper for the same subject
    SELECT essp.id AS essp_id, mp.recommended_submit_date, mp.deadline, s.code AS subject_code 
    FROM acted_exam_session_subject_products essp
    JOIN acted_products pro ON pro.id = essp.product_id
    JOIN acted_exam_session_subjects ess ON ess.id = essp.exam_session_subject_id
    JOIN acted_subjects s ON s.id = ess.subject_id
    JOIN acted_marking_paper mp ON mp.exam_session_subject_product_id = essp.id
    WHERE pro.code = 'MM3'
      AND mp.name = 'M1'
) mm1
ON mmx.subject_code = mm1.subject_code
WHERE NOT EXISTS (
    SELECT 1 FROM acted_marking_paper mp
    WHERE mp.exam_session_subject_product_id = mmx.essp_id
      AND mp.name = mmx.paper_name
);