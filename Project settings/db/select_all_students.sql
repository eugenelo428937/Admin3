SELECT * FROM "students" s 
LEFT JOIN "auth_user" u
ON s.user_id = u.id
order by u.id desc;

