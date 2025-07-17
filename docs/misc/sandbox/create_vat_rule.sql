-- Create VAT calculation rule for standard UK VAT
INSERT INTO acted_rules (
    name, 
    description, 
    trigger_type, 
    priority, 
    is_active, 
    is_blocking, 
    created_at, 
    updated_at
) VALUES (
    'Standard VAT Calculation',
    'Calculate 20% VAT for UK customers on all taxable products',
    'checkout_start',
    10,
    TRUE,
    FALSE,
    NOW(),
    NOW()
);

-- Get the rule ID
SET @vat_rule_id = LAST_INSERT_ID();

-- Create VAT calculation action
INSERT INTO acted_rule_actions (
    rule_id, 
    action_type, 
    message_template_id, 
    parameters, 
    execution_order
) VALUES (
    @vat_rule_id,
    'calculate_vat',
    NULL,
    JSON_OBJECT(
        'function', 'calculate_vat_standard',
        'vat_rate', 0.20,
        'exempt_product_types', JSON_ARRAY('book', 'educational_material'),
        'threshold_amount', 0,
        'description', 'Standard UK VAT at 20%'
    ),
    1
);

-- Create location-based VAT rule for EU customers
INSERT INTO acted_rules (
    name, 
    description, 
    trigger_type, 
    priority, 
    is_active, 
    is_blocking, 
    created_at, 
    updated_at
) VALUES (
    'EU Location Based VAT',
    'Calculate VAT based on customer location within EU',
    'checkout_start',
    15,
    TRUE,
    FALSE,
    NOW(),
    NOW()
);

-- Get the EU VAT rule ID
SET @eu_vat_rule_id = LAST_INSERT_ID();

-- Create EU VAT calculation action
INSERT INTO acted_rule_actions (
    rule_id, 
    action_type, 
    message_template_id, 
    parameters, 
    execution_order
) VALUES (
    @eu_vat_rule_id,
    'calculate_vat',
    NULL,
    JSON_OBJECT(
        'function', 'calculate_vat_by_location',
        'country_rates', JSON_OBJECT(
            'GB', 0.20,
            'DE', 0.19,
            'FR', 0.20,
            'IT', 0.22,
            'ES', 0.21,
            'NL', 0.21,
            'IE', 0.23,
            'US', 0.00,
            'CA', 0.05
        ),
        'user_country', 'GB',
        'default_rate', 0.20,
        'exempt_product_types', JSON_ARRAY('book', 'educational_material'),
        'threshold_amount', 0,
        'description', 'Location-based VAT calculation'
    ),
    1
);

-- Create business customer VAT rule
INSERT INTO acted_rules (
    name, 
    description, 
    trigger_type, 
    priority, 
    is_active, 
    is_blocking, 
    created_at, 
    updated_at
) VALUES (
    'Business Customer VAT',
    'Handle VAT for business customers including reverse charge scenarios',
    'checkout_start',
    20,
    FALSE,  -- Disabled by default until business customer fields are added
    FALSE,
    NOW(),
    NOW()
);

-- Get the business VAT rule ID
SET @business_vat_rule_id = LAST_INSERT_ID();

-- Create business VAT calculation action
INSERT INTO acted_rule_actions (
    rule_id, 
    action_type, 
    message_template_id, 
    parameters, 
    execution_order
) VALUES (
    @business_vat_rule_id,
    'calculate_vat',
    NULL,
    JSON_OBJECT(
        'function', 'calculate_business_vat',
        'supplier_country', 'GB',
        'vat_rate', 0.20,
        'exempt_product_types', JSON_ARRAY('book', 'educational_material'),
        'threshold_amount', 0,
        'description', 'Business customer VAT with reverse charge support'
    ),
    1
);

-- Add conditions for the standard VAT rule (applies when user country is GB)
INSERT INTO acted_rule_conditions (
    rule_id,
    condition_type,
    field_name,
    operator,
    expected_value,
    condition_group
) VALUES (
    @vat_rule_id,
    'field_comparison',
    'user.country',
    'equals',
    'GB',
    'default'
);

-- Add conditions for the EU VAT rule (applies when user country is in EU but not GB)
INSERT INTO acted_rule_conditions (
    rule_id,
    condition_type,
    field_name,
    operator,
    expected_value,
    condition_group
) VALUES (
    @eu_vat_rule_id,
    'field_comparison',
    'user.country',
    'in',
    'AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE',
    'default'
);

-- Add additional condition to exclude GB from EU rule
INSERT INTO acted_rule_conditions (
    rule_id,
    condition_type,
    field_name,
    operator,
    expected_value,
    condition_group
) VALUES (
    @eu_vat_rule_id,
    'field_comparison',
    'user.country',
    'not_equals',
    'GB',
    'default'
);

-- Output the created rule IDs
SELECT @vat_rule_id as 'Standard VAT Rule ID', @eu_vat_rule_id as 'EU VAT Rule ID', @business_vat_rule_id as 'Business VAT Rule ID'; 