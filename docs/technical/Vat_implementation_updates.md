# Vat implementation updates

## vat.product_classifier.py is redundant

When user add product to cart, the cart context already have product_type in cart.items[].product_type
and cart.items[].metadata. These two fields will provide everything needed for product_classifier.
Remove the product_classifier.

## 2 create a new model utils_regions and utils_country_region

populate the table utils_regions  with UK, IE, EU, SA, ROW. utils_country_region will map utils_regions with country_country.
It can eliminate @vat_rates.py, the vat rates should be obtained by country_country.vat_percent.
The classification.get("is_ebook", False) or classification.get("is_digital", False) should already be addressed in the point above.

## 2 The rules engine is not utilize

We should use the rules_engine so that administration staff can modify the logic.
On entry point add_to_cart, checkout_start, checkout_payment, it will run rule calculate_vat.
the calculate_vat rules in acted_rules will be a composite of a sequence of rules.
More general rule should be run first and get override by the more specific rule.
It will run in the sequence below:
calculate_vat
    > calculate_vat_uk
        > calculate_vat_uk_digital_product
        > calculate_vat_uk_printed_product
        > calculate_vat_uk_flash_card
        > calculate_vat_uk_pbor
    > calculate_vat_eu
        > calculate_vat_eu_product
    > calculate_vat_sa
        > calculate_vat_as_product
    > calculate_vat_ie
        > calculate_vat_ie_product
    > calculate_vat_row
        > calculate_vat_row_product

### rule calculate_vat

```python
if region = "UK":
    run rule calculate_vat_uk
if region = "EU":
    run rule calculate_vat_eu
if region = "SA":
    run rule calculate_vat_sa
if region = "IE":
    run rule calculate_vat_ie
if region = "ROW":
    run rule calculate_vat_sa
```

### rule calculate_vat_uk

```python
For each item in cart.items:
    run child rules
```

### rule calculate_vat_uk_digital_product

```python
    if (item.is_digital):
        update(item.vat, 0)    
```

### rule calculate_vat_uk_printed_product

```python
    if !(item.is_digital):
        update(item.vat, cart.item.actual_price * country_country.vat_percent)
```

### rule calculate_vat_uk_flash_card

```python
    if (item.product_code = "FC")
        update(item.vat, cart.item.actual_price * country_country.vat_percent)
```

### rule calculate_vat_uk_pbor

```python
    if (item.product_code = "PBOR")
        update(item.vat, cart.item.actual_price * country_country.vat_percent)
```




### rule calculate_vat_eu_product, calculate_vat_ie, calculate_vat_sa, calculate_vat_row

```python
    update(item.vat, cart.item.actual_price * country_country.vat_percent)
```