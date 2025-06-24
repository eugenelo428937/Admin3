select ps.id psid, ps.fullname pname, pv.id pvid, pv.description, pg.id pgid, pg.name pgname
from acted_products ps
left join acted_product_productvariation ppv on ppv.product_id = ps.id 
left join acted_product_variations pv on ppv.product_variation_id = pv.id
left join acted_product_productgroup ppg on ppg.product_id = ps.id
left join acted_product_group pg on pg.id = ppg.product_group_id

