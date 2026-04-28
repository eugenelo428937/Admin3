-- Active: 1774632167474@@localhost@5432@ACTEDDBDEV01@acted
SELECT 
    te.code, 
    pur.code, 
    ces.session_code, 
    cs.code, 
    tl.name, 
    tv.name,
    au.first_name,
    au.last_name
FROM tutorial_events te 
left join tutorial_sessions ts ON te.id = ts.tutorial_event_id
LEFT JOIN tutorial_locations tl ON tl.id = te.location_id
LEFT JOIN tutorial_venues tv ON tv.id = te.venue_id
LEFT JOIN tutorial_instructors ti ON te.main_instructor_id = ti.id
LEFT JOIN staff st ON st.id= ti.staff_id
LEFT JOIN public.auth_user au ON au.id = st.user_id
LEFT JOIN user_profile up ON up.user_id = au.id
left join purchasables pur ON te.product_id = pur.id
left join products ps ON ps.purchasable_ptr_id = pur.id
left join catalog_product_product_variations ppv ON ppv.id = ps.product_product_variation_id
LEFT JOIN catalog_products cp ON cp.id = ppv.product_id
LEFT JOIN catalog_product_variations cpv ON cpv.id = ppv.product_variation_id
left join catalog_exam_session_subjects cess ON cess.id = ps.exam_session_subject_id
left join catalog_exam_sessions ces ON ces.id = cess.exam_session_id
left join catalog_subjects cs ON cs.id = cess.subject_id
where ces.session_code ='26' LIMIT 9999

select ti.id, au.first_name||' '||au.last_name from tutorial_instructors ti
left join staff on staff.id = ti.staff_id
left join public.auth_user au on au.id = staff.user_id