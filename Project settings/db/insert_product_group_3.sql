INSERT INTO acted_product_productgroup (product_id, product_group_id)
SELECT 
    p.id as product_id,
    10 as product_group_id
FROM acted_products p
WHERE p.id IN (
    SELECT ps.id FROM acted_products ps where ps.fullname LIKE '%Tutorial%' AND ps.fullname NOT LIKE '%Online%'
);
