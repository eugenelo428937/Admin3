-- Active: 1774632167474@@localhost@5432@ACTEDDBDEV01@acted
SELECT  te.code, te.id, te.main_instructor_id, ps.id 
-- ps.product_code, cp.fullname, cp.id cpid, ppv.id ppvid, es.session_code, s.code, pv.name, cp.code, pv.code 
FROM catalog_products cp
left join catalog_product_product_variations ppv ON ppv.product_id = cp.id
left join catalog_product_variations pv ON ppv.product_variation_id = pv.id
left join products ps ON ps.product_product_variation_id = ppv.id 
left join catalog_exam_session_subjects ess ON ess.id = ps.exam_session_subject_id
left join catalog_exam_sessions es on es.id = ess.exam_session_id
left join catalog_subjects s on s.id = ess.subject_id
left join tutorial_events te on te.product_id = ps.id
where es.session_code ='26' and te.id is not null LIMIT 900

select ti.id, au.first_name||' '||au.last_name from tutorial_instructors ti
left join staff on staff.id = ti.staff_id
left join public.auth_user au on au.id = staff.user_id