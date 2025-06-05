INSERT INTO acted_product_productgroup (product_id, product_group_id)
SELECT 
    p.id as product_id,
    3 as product_group_id
FROM acted_products p
WHERE p.id >= 124
  AND NOT EXISTS (
    SELECT 1 
    FROM acted_product_productgroup ppg 
    WHERE ppg.product_id = p.id 
      AND ppg.product_group_id = 3
  );
