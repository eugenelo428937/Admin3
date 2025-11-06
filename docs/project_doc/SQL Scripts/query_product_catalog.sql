SELECT ppv.id, ps.fullname, pv.name FROM acted_product_productvariation ppv 
left join acted_products ps ON ps.id = ppv.product_id
left join acted_product_variations pv ON pv.id = ppv.product_variation_id
