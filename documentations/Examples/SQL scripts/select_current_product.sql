SELECT pro.id,pro.code,s.id,s.code,essp.id esspid, mp.id, mp.name, mp.recommended_submit_date, mp.deadline 
FROM acted_exam_sessions es 
LEFT JOIN acted_exam_session_subjects ess ON es.id = ess.exam_session_id
LEFT JOIN acted_exam_session_subject_products essp ON ess.id = essp.exam_session_subject_id 
LEFT JOIN acted_subjects s ON s.id = ess.subject_id
LEFT JOIN acted_products pro ON pro.id = essp.product_id
LEFT JOIN acted_marking_paper mp ON mp.exam_session_subject_product_id = essp.id
WHERE pro.code like 'MM%'

LIMIT 100