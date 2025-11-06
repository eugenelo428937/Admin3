SELECT pbp.id, pb.bundle_name,ps.fullname, pv.name, pbp.product_product_variation_id ppv_id, pb.id bundle_id FROM acted_product_bundle_products pbp
left join acted_product_bundles pb ON pbp.bundle_id = pb.id
left join acted_product_productvariation ppv ON ppv.id =pbp.product_product_variation_id
left join acted_products ps ON ps.id = ppv.product_id
left join acted_product_variations pv ON pv.id = ppv.product_variation_id
ORDER BY bundle_name, ppv_id LIMIT 1000