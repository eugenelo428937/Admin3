-- Delete duplicates from acted_marking_paper, keeping the first (lowest id) for each exam_session_subject_product_id
DELETE FROM acted_marking_paper
WHERE id NOT IN (
    SELECT MIN(id)
    FROM acted_marking_paper
    GROUP BY exam_session_subject_product_id
);