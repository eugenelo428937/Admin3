SELECT * FROM public."Students" s 
LEFT JOIN public."Users" u
ON s.user_id = u.id
order by u.id desc;

