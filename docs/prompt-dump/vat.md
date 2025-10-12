# Realign VAT Spec and implementation

From @docs\prd\epic-3-dynamic-vat-calculation-system.md , we are trying to implement dynamic VAT calculation using on the rules engine. However, I find our previous implementation in @specs\spec-2025-10-06-121922.md, @plans\spec-2025-10-06-121922-plan.md and @tasks\spec-2025-10-06-121922-tasks.md is not using the rules engine as designed.
Please use the @vat-calculate-rule-specification.md as the base as the main thinking here is correct.
Have a look at how the rules engine applied the tutorial booking fee. When user reach the entry point(checkout_payment), it invoke the rule and applies a tutorial booking fee in cart.fees

**The fundamental idea is the same.**

First create a new rule "set_user_region", it runs on "home_page_mount", "user_authenticate"(add new entry to acted_rule_entry_point) and "checkout_start".
On each of the entry point will run this rule. Condition is always true. the acted_rule_fields.schema will require cart.user and cart.user_context. It will call a custom function to using the user country to get the region from utils_regions.
When the cart.user or cart.user_context is null, use the IP address to determine the country.
The rule will update the cart.user_content.country and cart.user_content.region.
This will ensure the region is set when we need it for VAT calculation.

Then confirm the rules_engine current implementation supports calling rules in chain. Create a document on how to create chain rules. check @docs\project_doc\rules_engine. If currently it is not possible, create the fundamental implementation so rules can be run in chain and sub chain.

When user reaches the entry point "add_to_cart", "checkout_start" or "checkout payment". It will run a "calculate_vat" rule. It has always true condition.
The condition is always true. The rule fields schema will require to have the schema below. When adding it to the database, you will need to check and merge to the appropriate acted_rule_fields.schema

```json
"cart":{
    "id": int,
    "user": int,
    "items": [
        {
            "id": int,
            "current_product": int,
            "product_id": int,
            "product_name": str,
            "product_code": str,
            "subject_code": str,
            "exam_session_code": str,
            "product_type":str , // "tutorial,marking, matertial,bundle,marking_voucher,online_classroom
            "quantity": int,
            "price_type": str,
            "actual_price": double,
            "metadata": {
                "type": str,
                "title": str,
            },
        }
    ],
    "fees": [
    ],
    "has_marking": false,
    "has_digital": false,
    "has_tutorial": true,
    "has_material": false,
    "user_context": {
        "id": int,
        "email": str,
        "is_authenticated": bool,
        "ip": str,
        "home_country": str,
        "work_country": str,
        "country": str,
        "region": str
    },
}
```

This rule acts as a starting point and will subsequently run a series of rules.
The sequence as below:

1. calculate_vat
    1.1 calculate_vat_uk
        1.1.1 calculate_vat_uk_digital_product
        1.1.2 calculate_vat_uk_printed_product
        1.1.3 calculate_vat_uk_flashcard
        1.1.4 calculate_vat_uk_pbor
    1.2. calculate_vat_eu
        1.2.1 calculate_vat_eu_pbor
    1.3. calculate_vat_sa
    1.4. calculate_vat_ie
    1.5. calculate_vat_row

For example, a user is doing checkout with the products below:

```json
"cart":{
    "id": 196,
    "user": 60,
    "session_key": null,
    "items": [
        {
            "id": 987,
            "current_product": 1234,
            "product_id": 56,
            "product_name": "PBOR",
            "product_code": "PBOR",
            "subject_code": "CB1",
            "exam_session_code": "25A",
            "product_type": "material",
            "quantity": 1,
            "price_type": "standard",
            "actual_price": "106.00",
            "metadata": {
                "type": "material",
                "is_digital": true,
                "productName": "Paper B Online Resources",
                "productType": "Materials",
                "subjectCode": "CS2",
                "variationId": 513,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
            },
            "is_marking": false,
            "has_expired_deadline": false,
            "expired_deadlines_count": 0,
            "marking_paper_count": 0
        },
        {
            "id": 682,
            "current_product": 2615,
            "product_id": 77,
            "product_name": "Flash Cards",
            "product_code": "FC",
            "subject_code": "CB1",
            "exam_session_code": "25A",
            "product_type": "material",
            "quantity": 1,
            "price_type": "standard",
            "actual_price": "38.00",
            "metadata": {
                "type": "material",
                "productName": "Flash Cards",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 509,
                "variationName": "Printed Materials",
                "variationType": "Printed"
            },
            "is_marking": false,
            "has_expired_deadline": false,
            "expired_deadlines_count": 0,
            "marking_paper_count": 0
        },
        {
            "id": 683,
            "current_product": 2594,
            "product_id": 73,
            "product_name": "ASET (2020-2023 Papers)",
            "product_code": "EX2",
            "subject_code": "CB1",
            "exam_session_code": "25A",
            "product_type": "material",
            "quantity": 1,
            "price_type": "standard",
            "actual_price": "45.00",
            "metadata": {
                "type": "material",
                "productName": "ASET (2020-2023 Papers)",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 511,
                "variationName": "Printed Materials",
                "variationType": "Printed"
            },
            "is_marking": false,
            "has_expired_deadline": false,
            "expired_deadlines_count": 0,
            "marking_paper_count": 0
        },
        {
            "id": 684,
            "current_product": 2577,
            "product_id": 75,
            "product_name": "Core Reading",
            "product_code": "CR",
            "subject_code": "CB1",
            "exam_session_code": "25A",
            "product_type": "material",
            "quantity": 1,
            "price_type": "standard",
            "actual_price": "22.00",
            "metadata": {"type": "material",
                "is_digital": true,
                "productName": "Core Reading",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 1,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"},
            "is_marking": false,
            "has_expired_deadline": false,
            "expired_deadlines_count": 0,
            "marking_paper_count": 0
        }
    ],
    "fees": [
       
    ],
    "created_at": "2025-08-05T14:45:42.685123Z",
    "updated_at": "2025-10-09T11:53:37.719408Z",
    "has_marking": false,
    "has_digital": false,
    "has_tutorial": false,
    "has_material": false,
    "user_context": {
        "id": 60,
        "email": "<eugene.lo1115@gmail.com>",
        "is_authenticated": true,
        "ip": "127.0.0.1",
        "home_country": "United Kingdom",
        "work_country": "United Kingdom",
        "country": "UK",
        "region": "UK"       
    },
    "vat_calculations": {
        
    }
}
```

In sequence of operation:

1. calculate_vat rule execute with action {"==",{user_context.region, "UK"}} then execute calculate_vat_uk.

1. calculate_vat_uk rule execute with cart.items. Foreach cart.item, store country.vat_percent into "context_mapping" of the json in acted_rules.actions then calculate (cart.item.actual_price * country.vat_percent) and add it to cart.item.vat_percent and cart.item.vat_amount. In cart.vat_calculation, will have the information on the rule applies to each item.See below for example:

```json
            "cart":{
                "id": 196,
                "user": 60,
                "session_key": null,
                "items": [
                    {
                        "id": 987,
                        "current_product": 1234,
                        "product_id": 56,
                        "product_name": "PBOR",
                        "product_code": "PBOR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "106.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Paper B Online Resources",
                "productType": "Materials",
                "subjectCode": "CS2",
                "variationId": 513,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":21.20
                    },
                    {
                        "id": 682,
                        "current_product": 2615,
                        "product_id": 77,
                        "product_name": "Flash Cards",
                        "product_code": "FC",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "38.00",
                        "metadata": {
                            "type": "material",
                "productName": "Flash Cards",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 509,
                "variationName": "Printed Materials",
                "variationType": "Printed"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":7.60
                    },
                    {
                        "id": 683,
                        "current_product": 2594,
                        "product_id": 73,
                        "product_name": "ASET (2020-2023 Papers)",
                        "product_code": "EX2",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "45.00",
                        "metadata": {"type": "material",
                "productName": "ASET (2020-2023 Papers)",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 511,
                "variationName": "Printed Materials",
                "variationType": "Printed"},
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":9.00

                    },
                    {
                        "id": 684,
                        "current_product": 2577,
                        "product_id": 75,
                        "product_name": "Core Reading",
                        "product_code": "CR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "22.00",
                        "metadata": {"type": "material",
                "is_digital": true,
                "productName": "Core Reading",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 1,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"},
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":4.4
                    }
                ],
                "fees": [
                
                ],
                "created_at": "2025-08-05T14:45:42.685123Z",
                "updated_at": "2025-10-09T11:53:37.719408Z",
                "has_marking": false,
                "has_digital": false,
                "has_tutorial": false,
                "has_material": false,
                "user_context": {
                    "id": 60,
                    "email": "<eugene.lo1115@gmail.com>",
                    "is_authenticated": true,
                    "ip": "127.0.0.1",
                    "home_country": "United Kingdom",
                    "work_country": "United Kingdom",
                    "country": "UK",
                    "region": "UK"       
                },
                // note the vat calculation, first the calculate_vat_uk is applied to each items
                "vat_calculations": [
                        {
                            "item_id": 987,
                            "net_amount": 106.00,
                            "vat_amount": 21.20,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk"],                
                        },
                        {
                            "item_id": 682,
                            "net_amount": 38.00,
                            "vat_amount": 7.60,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk"],
                        },
                        {
                            "item_id": 683,
                            "net_amount": 45.00,
                            "vat_amount": 9.00,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk"],
                        },
                        {
                            "item_id": 684,
                            "net_amount": 22.00,
                            "vat_amount": 4.40,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk"],
                        }
                    ]
                }
            }
```

1. calculate_vat_uk_digital_product with cart.items. Foreach cart.item where item.metadata. == true, calculate (cart.item.actual_price * country.vat_percent) and add it to cart. **NOTE: in this example, the calculation IS IDENTICAL to calculate_vat_uk**. This rule is a placeholder in case of future change of UK VAT tax. We can disable it when the whole implementation is done.

        ```json
            "cart":{
                "id": 196,
                "user": 60,
                "session_key": null,
                "items": [
                    {
                        "id": 987,
                        "current_product": 1234,
                        "product_id": 56,
                        "product_name": "PBOR",
                        "product_code": "PBOR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "106.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Paper B Online Resources",
                "productType": "Materials",
                "subjectCode": "CS2",
                "variationId": 513,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":21.20
                    },
                    {
                        "id": 682,
                        "current_product": 2615,
                        "product_id": 77,
                        "product_name": "Flash Cards",
                        "product_code": "FC",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "38.00",
                        "metadata": {
                            "type": "material",
                "productName": "Flash Cards",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 509,
                "variationName": "Printed Materials",
                "variationType": "Printed"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":7.60
                    },
                    {
                        "id": 683,
                        "current_product": 2594,
                        "product_id": 73,
                        "product_name": "ASET (2020-2023 Papers)",
                        "product_code": "EX2",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "45.00",
                        "metadata": {"type": "material",
                "productName": "ASET (2020-2023 Papers)",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 511,
                "variationName": "Printed Materials",
                "variationType": "Printed"},
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":9.00

                    },
                    {
                        "id": 684,
                        "current_product": 2577,
                        "product_id": 75,
                        "product_name": "Core Reading",
                        "product_code": "CR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "22.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Core Reading",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 1,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":4.4
                    }
                ],
                "fees": [
                
                ],
                "created_at": "2025-08-05T14:45:42.685123Z",
                "updated_at": "2025-10-09T11:53:37.719408Z",
                "has_marking": false,
                "has_digital": false,
                "has_tutorial": false,
                "has_material": false,
                "user_context": {
                    "id": 60,
                    "email": "<eugene.lo1115@gmail.com>",
                    "is_authenticated": true,
                    "ip": "127.0.0.1",
                    "home_country": "United Kingdom",
                    "work_country": "United Kingdom",
                    "country": "UK",
                    "region": "UK"       
                },
                // note the vat calculation, first the calculate_vat_uk is applied to each items
                "vat_calculations": [
                        {
                            "item_id": 987,
                            "net_amount": 106.00,
                            "vat_amount": 21.20,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],
                        },
                        {
                            "item_id": 682,
                            "net_amount": 38.00,
                            "vat_amount": 7.60,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk"],
                        },
                        {
                            "item_id": 683,
                            "net_amount": 45.00,
                            "vat_amount": 9.00,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk"],               
                        },
                        {
                            "item_id": 684,
                            "net_amount": 22.00,
                            "vat_amount": 4.40,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],             
                        }
                    ]
                }
            }
            ```

1. calculate_vat_uk_printed_product with cart.items. Foreach cart.item where item.is_digital == false, the vat will be 0 for that item and add it to cart.item.vat_percent and cart.item.vat_amount. In cart.vat_calculation, will have the information on the rule applies to each item.See below for example:

 ```json
            "cart":{
                "id": 196,
                "user": 60,
                "session_key": null,
                "items": [
                    {
                        "id": 987,
                        "current_product": 1234,
                        "product_id": 56,
                        "product_name": "PBOR",
                        "product_code": "PBOR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "106.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Paper B Online Resources",
                "productType": "Materials",
                "subjectCode": "CS2",
                "variationId": 513,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":21.20
                    },
                    {
                        "id": 682,
                        "current_product": 2615,
                        "product_id": 77,
                        "product_name": "Flash Cards",
                        "product_code": "FC",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "38.00",
                        "metadata": {
                            "type": "material",
                "productName": "Flash Cards",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 509,
                "variationName": "Printed Materials",
                "variationType": "Printed"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0,
                        "vat_amount":0.00
                    },
                    {
                        "id": 683,
                        "current_product": 2594,
                        "product_id": 73,
                        "product_name": "ASET (2020-2023 Papers)",
                        "product_code": "EX2",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "45.00",
                        "metadata": {"type": "material",
                "productName": "ASET (2020-2023 Papers)",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 511,
                "variationName": "Printed Materials",
                "variationType": "Printed"},
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0,
                        "vat_amount":0.00

                    },
                    {
                        "id": 684,
                        "current_product": 2577,
                        "product_id": 75,
                        "product_name": "Core Reading",
                        "product_code": "CR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "22.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Core Reading",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 1,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":4.4
                    }
                ],
                "fees": [
                
                ],
                "created_at": "2025-08-05T14:45:42.685123Z",
                "updated_at": "2025-10-09T11:53:37.719408Z",
                "has_marking": false,
                "has_digital": false,
                "has_tutorial": false,
                "has_material": false,
                "user_context": {
                    "id": 60,
                    "email": "<eugene.lo1115@gmail.com>",
                    "is_authenticated": true,
                    "ip": "127.0.0.1",
                    "home_country": "United Kingdom",
                    "work_country": "United Kingdom",
                    "country": "UK",
                    "region": "UK"       
                },
                // note the vat calculation, first the calculate_vat_uk is applied to each items
                "vat_calculations": "vat_calculations": [
                        {
                            "item_id": 987,
                            "net_amount": 106.00,
                            "vat_amount": 21.20,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],
                        },
                        {
                            "item_id": 682,
                            "net_amount": 38.00,
                            "vat_amount": 0,
                            "vat_rate": 0,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_printed_product"],
                        },
                        {
                            "item_id": 683,
                            "net_amount": 45.00,
                            "vat_amount": 0,
                            "vat_rate": 0,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_printed_product"],
                        },
                        {
                            "item_id": 684,
                            "net_amount": 22.00,
                            "vat_amount": 4.40,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],             
                        }
                    ]
                }
            }
```

1. calculate_vat_uk_flashcard with cart.items.  Foreach cart.item where item.product_code = "FC", calculate (cart.item.actual_price * country.vat_percent) and add it to cart.

```json
            "cart":{
                "id": 196,
                "user": 60,
                "session_key": null,
                "items": [
                    {
                        "id": 987,
                        "current_product": 1234,
                        "product_id": 56,
                        "product_name": "PBOR",
                        "product_code": "PBOR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "106.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Paper B Online Resources",
                "productType": "Materials",
                "subjectCode": "CS2",
                "variationId": 513,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":21.20
                    },
                    {
                        "id": 682,
                        "current_product": 2615,
                        "product_id": 77,
                        "product_name": "Flash Cards",
                        "product_code": "FC",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "38.00",
                        "metadata": {
                            "type": "material",
                "productName": "Flash Cards",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 509,
                "variationName": "Printed Materials",
                "variationType": "Printed"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":7.6
                    },
                    {
                        "id": 683,
                        "current_product": 2594,
                        "product_id": 73,
                        "product_name": "ASET (2020-2023 Papers)",
                        "product_code": "EX2",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "45.00",
                        "metadata": {"type": "material",
                "productName": "ASET (2020-2023 Papers)",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 511,
                "variationName": "Printed Materials",
                "variationType": "Printed"},
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0,
                        "vat_amount":0.00

                    },
                    {
                        "id": 684,
                        "current_product": 2577,
                        "product_id": 75,
                        "product_name": "Core Reading",
                        "product_code": "CR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "22.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Core Reading",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 1,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":4.4
                    }
                ],
                "fees": [
                
                ],
                "created_at": "2025-08-05T14:45:42.685123Z",
                "updated_at": "2025-10-09T11:53:37.719408Z",
                "has_marking": false,
                "has_digital": false,
                "has_tutorial": false,
                "has_material": false,
                "user_context": {
                    "id": 60,
                    "email": "<eugene.lo1115@gmail.com>",
                    "is_authenticated": true,
                    "ip": "127.0.0.1",
                    "home_country": "United Kingdom",
                    "work_country": "United Kingdom",
                    "country": "UK",
                    "region": "UK"       
                },
                // note the vat calculation, first the calculate_vat_uk is applied to each items
                "vat_calculations": "vat_calculations": [
                        {
                            "item_id": 987,
                            "net_amount": 106.00,
                            "vat_amount": 21.20,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],
                        },
                        {
                            "item_id": 682,
                            "net_amount": 38.00,
                            "vat_amount": 7.6,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_printed_product","calculate_vat_uk_flashcard"],
                        },
                        {
                            "item_id": 683,
                            "net_amount": 45.00,
                            "vat_amount": 0,
                            "vat_rate": 0,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_printed_product"],
                        },
                        {
                            "item_id": 684,
                            "net_amount": 22.00,
                            "vat_amount": 4.40,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],             
                        }
                    ]
                }
            }
```

1. calculate_vat_uk_pbor with cart.items.  Foreach cart.item where item.product_code = "PBOR", calculate (cart.item.actual_price * country.vat_percent * multiplier) and add it to cart. This is a special item and the VAT will have a multiplier on top of the country amount and this multiplier will needs to set in the acted_rules for calculate_vat_uk_pbor. In this example is it set to 2.

```json
            "cart":{
                "id": 196,
                "user": 60,
                "session_key": null,
                "items": [
                    {
                        "id": 987,
                        "current_product": 1234,
                        "product_id": 56,
                        "product_name": "PBOR",
                        "product_code": "PBOR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "106.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Paper B Online Resources",
                "productType": "Materials",
                "subjectCode": "CS2",
                "variationId": 513,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "multiplier":2,
                        "vat_amount":41.40
                    },
                    {
                        "id": 682,
                        "current_product": 2615,
                        "product_id": 77,
                        "product_name": "Flash Cards",
                        "product_code": "FC",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "38.00",
                        "metadata": {
                            "type": "material",
                "productName": "Flash Cards",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 509,
                "variationName": "Printed Materials",
                "variationType": "Printed"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":7.6
                    },
                    {
                        "id": 683,
                        "current_product": 2594,
                        "product_id": 73,
                        "product_name": "ASET (2020-2023 Papers)",
                        "product_code": "EX2",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "45.00",
                        "metadata": {"type": "material",
                "productName": "ASET (2020-2023 Papers)",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 511,
                "variationName": "Printed Materials",
                "variationType": "Printed"},
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0,
                        "vat_amount":0.00

                    },
                    {
                        "id": 684,
                        "current_product": 2577,
                        "product_id": 75,
                        "product_name": "Core Reading",
                        "product_code": "CR",
                        "subject_code": "CB1",
                        "exam_session_code": "25A",
                        "product_type": "material",
                        "quantity": 1,
                        "price_type": "standard",
                        "actual_price": "22.00",
                        "metadata": {
                            "type": "material",
                "is_digital": true,
                "productName": "Core Reading",
                "productType": "Materials",
                "subjectCode": "CB1",
                "variationId": 1,
                "variationName": "Vitalsource eBook",
                "variationType": "eBook"
                        },
                        "is_marking": false,
                        "has_expired_deadline": false,
                        "expired_deadlines_count": 0,
                        "marking_paper_count": 0,
                        //VAT
                        "vat_percent":0.2,
                        "vat_amount":4.4
                    }
                ],
                "fees": [
                
                ],
                "created_at": "2025-08-05T14:45:42.685123Z",
                "updated_at": "2025-10-09T11:53:37.719408Z",
                "has_marking": false,
                "has_digital": false,
                "has_tutorial": false,
                "has_material": false,
                "user_context": {
                    "id": 60,
                    "email": "<eugene.lo1115@gmail.com>",
                    "is_authenticated": true,
                    "ip": "127.0.0.1",
                    "home_country": "United Kingdom",
                    "work_country": "United Kingdom",
                    "country": "UK",
                    "region": "UK"       
                },
                // note the vat calculation, first the calculate_vat_uk is applied to each items
                "vat_calculations": "vat_calculations": [
                        {
                            "item_id": 987,
                            "net_amount": 106.00,
                            "vat_amount": 41.40,
                            "vat_rate": 0.2,
                            "multiplier":2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product","calculate_vat_uk_pbor"],
                        },
                        {
                            "item_id": 682,
                            "net_amount": 38.00,
                            "vat_amount": 7.6,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_printed_product","calculate_vat_uk_flashcard"],
                        },
                        {
                            "item_id": 683,
                            "net_amount": 45.00,
                            "vat_amount": 0,
                            "vat_rate": 0,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_printed_product"],
                        },
                        {
                            "item_id": 684,
                            "net_amount": 22.00,
                            "vat_amount": 4.40,
                            "vat_rate": 0.2,
                            "vat_rule_applied": ["calculate_vat","calculate_vat_uk","calculate_vat_uk_digital_product"],             
                        }
                    ]
                }
            }
```