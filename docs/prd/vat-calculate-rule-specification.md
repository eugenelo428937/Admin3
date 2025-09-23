# VAT Calculate Rule Specification

**Project**: Epic 3 - Dynamic VAT Calculation System
**Created**: 2025-09-23
**Purpose**: Define the `calculate_vat` rule structure and context requirements

## 🎯 **Rule Overview**

### **Rule Name**: `calculate_vat`
### **Entry Points**: `checkout_start`, `checkout_payment`
### **Purpose**: Calculate VAT amounts for cart items based on user country, product types, and applicable discounts

---

## 📋 **Context Structure**

### **Complete Context Schema**
```json
{
  "user": {
    "id": "string",
    "profile": {
      "send_study_material_to": "string (country_code)",
      "reduced_price_eligible": "boolean",
      "employer_code": "string|null"
    }
  },
  "user_address": {
    "country": "string (country_code)",
    "region": "UK|IE|EC|SA|CH|GG|ROW",
    "is_delivery_address": "boolean"
  },
  "cart": {
    "id": "string",
    "items": [{
      "id": "string",
      "product_code": "string",
      "product_name": "string",
      "quantity": "number",
      "price_type": "standard|additional|retaker|reduced|discounted",
      "net_amount": "number",
      "current_vat_amount": "number",
      "product_classification": {
        "is_digital": "boolean",
        "is_ebook": "boolean",
        "is_tutorial": "boolean",
        "is_live_tutorial": "boolean",
        "is_physical": "boolean",
        "vat_category": "string"
      }
    }],
    "discounts": [{
      "type": "bundle|volume|promotional",
      "product_codes": ["string"],
      "discount_percentage": "number"
    }],
    "total_net": "number",
    "current_total_vat": "number"
  },
  "checkout": {
    "step": "start|payment|confirmation",
    "payment_method": "card|invoice|null"
  },
  "settings": {
    "vat_adjust_enabled": "boolean",
    "vat_scaler_rate": "number",
    "effective_date": "YYYY-MM-DD"
  }
}
```

---

## 🔧 **Country Determination Logic**

### **Primary Rule**
```json
{
  "country_for_vat": {
    "source": "acted_user_profile_address.country",
    "condition": "acted_user_profile_address.country == acted_user_profile.send_study_material_to",
    "fallback": "acted_user_profile.send_study_material_to"
  }
}
```

### **Implementation Logic**
```python
# Context building logic
def build_vat_context(user, cart):
    # Get user's delivery address
    delivery_address = ActedUserProfileAddress.objects.filter(
        user=user,
        country=user.acted_user_profile.send_study_material_to
    ).first()

    if delivery_address:
        vat_country = delivery_address.country
    else:
        vat_country = user.acted_user_profile.send_study_material_to

    # Map country to VAT region
    vat_region = map_country_to_vat_region(vat_country)

    return {
        "user_address": {
            "country": vat_country,
            "region": vat_region,
            "is_delivery_address": bool(delivery_address)
        }
    }
```

---

## 📊 **VAT Region Mapping**

### **Region Classification**
```json
{
  "UK": ["GB", "UK"],
  "IE": ["IE"],
  "EC": [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IT", "LV", "LT", "LU", "MT", "NL", "PL",
    "PT", "RO", "SK", "SI", "ES", "SE"
  ],
  "SA": ["ZA"],
  "CH": ["CH"],
  "GG": ["GG"],
  "ROW": ["*"] // All other countries
}
```

### **Special Treatment Rules**
- **Switzerland (CH)**: Treated as ROW for VAT purposes
- **Guernsey (GG)**: Treated as ROW for VAT purposes
- **South Africa (SA)**: Special VAT rules for specific products

---

## 🎯 **Calculate VAT Rule Structure**

### **Rule Configuration**
```json
{
  "rule_id": "calculate_vat_v1",
  "name": "VAT Calculation Master Rule",
  "entry_point": ["checkout_start", "checkout_payment"],
  "priority": 100,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {
    "type": "jsonlogic",
    "expr": {"==": [1, 1]} // Always execute
  },
  "actions": [
    {
      "type": "call_rule",
      "rule_id": "determine_vat_region",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "classify_products",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "apply_regional_vat_rules",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "apply_product_specific_rules",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "apply_discount_vat_rules",
      "pass_context": true
    },
    {
      "type": "update",
      "target": "cart.total_vat",
      "operation": "calculate_sum",
      "source": "cart.items[].vat_amount"
    }
  ],
  "stop_processing": false
}
```

---

## 📋 **Sub-Rules Breakdown**

### **1. Determine VAT Region Rule**
```json
{
  "rule_id": "determine_vat_region",
  "condition": {"==": [1, 1]},
  "actions": [{
    "type": "update",
    "target": "user_address.region",
    "operation": "set",
    "value": {
      "function": "map_country_to_region",
      "params": {"country": {"var": "user_address.country"}}
    }
  }]
}
```

### **2. Regional VAT Rules**
```json
{
  "rule_id": "apply_regional_vat_rules",
  "condition": {"in": [{"var": "user_address.region"}, ["UK", "IE", "EC"]]},
  "actions": [{
    "type": "update",
    "target": "cart.items[].vat_amount",
    "operation": "calculate",
    "formula": "item.net_amount * 0.20" // Standard VAT rate
  }]
}
```

### **3. ROW Digital Product Zero VAT Rule**
```json
{
  "rule_id": "row_digital_zero_vat",
  "condition": {
    "and": [
      {"==": [{"var": "user_address.region"}, "ROW"]},
      {"==": [{"var": "cart.items[].product_classification.is_digital"}, true]}
    ]
  },
  "actions": [{
    "type": "update",
    "target": "cart.items[].vat_amount",
    "operation": "set",
    "value": 0
  }]
}
```

### **4. South Africa Special VAT Rule**
```json
{
  "rule_id": "sa_special_vat",
  "condition": {
    "and": [
      {"==": [{"var": "user_address.region"}, "SA"]},
      {"in": [{"var": "cart.items[].product_code"}, ["CM/CC/", "CM/CN/", "CM/CFC/"]]}
    ]
  },
  "actions": [{
    "type": "update",
    "target": "cart.items[].vat_amount",
    "operation": "calculate",
    "formula": "item.net_amount * 0.15" // SA VAT rate
  }]
}
```

### **5. UK eBook Zero VAT Rule (Post May 2020)**
```json
{
  "rule_id": "uk_ebook_zero_vat",
  "condition": {
    "and": [
      {"==": [{"var": "user_address.region"}, "UK"]},
      {"==": [{"var": "cart.items[].product_classification.is_ebook"}, true]},
      {">=": [{"var": "settings.effective_date"}, "2020-05-01"]}
    ]
  },
  "actions": [{
    "type": "update",
    "target": "cart.items[].vat_amount",
    "operation": "set",
    "value": 0
  }]
}
```

### **6. Live Tutorial VAT Override**
```json
{
  "rule_id": "live_tutorial_vat_override",
  "condition": {"==": [{"var": "cart.items[].product_classification.is_live_tutorial"}, true]},
  "actions": [{
    "type": "update",
    "target": "cart.items[].vat_amount",
    "operation": "calculate",
    "formula": "item.net_amount * get_standard_vat_rate(user_address.country)"
  }]
}
```

---

## 🔄 **Entry Point Integration**

### **Checkout Start Entry Point**
```python
# Frontend trigger: When user begins checkout
def trigger_checkout_start(user_id, cart_id):
    context = build_vat_context(user_id, cart_id)
    context["checkout"]["step"] = "start"

    result = rules_engine.execute("checkout_start", context)

    # Update cart with VAT calculations
    update_cart_vat(cart_id, result["vat_calculations"])
```

### **Checkout Payment Entry Point**
```python
# Frontend trigger: When user selects payment method
def trigger_checkout_payment(user_id, cart_id, payment_method):
    context = build_vat_context(user_id, cart_id)
    context["checkout"]["step"] = "payment"
    context["checkout"]["payment_method"] = payment_method

    result = rules_engine.execute("checkout_payment", context)

    # Update cart with final VAT calculations
    update_cart_vat(cart_id, result["vat_calculations"])
```

---

## 📊 **Expected Rule Outputs**

### **VAT Calculation Result Structure**
```json
{
  "status": "success",
  "vat_calculations": {
    "items": [{
      "item_id": "string",
      "net_amount": "number",
      "vat_amount": "number",
      "vat_rate": "number",
      "vat_rule_applied": "string",
      "exemption_reason": "string|null"
    }],
    "totals": {
      "total_net": "number",
      "total_vat": "number",
      "total_gross": "number"
    },
    "region_info": {
      "country": "string",
      "region": "string",
      "vat_treatment": "standard|zero|exempt"
    }
  },
  "rules_executed": ["string"],
  "execution_time_ms": "number"
}
```

---

## 🧪 **Testing Scenarios**

### **Critical Test Cases**
1. **UK customer + eBook (post-May 2020)** → Zero VAT
2. **ROW customer + Digital product** → Zero VAT
3. **SA customer + SA-specific product** → SA VAT rate
4. **Any customer + Live Online Tutorial** → Standard VAT
5. **Address mismatch scenarios** → Correct country resolution
6. **Multiple entry point calls** → Consistent results

### **Context Building Tests**
```python
def test_vat_context_building():
    user = create_user_with_address(
        send_material_to="GB",
        address_country="GB"
    )
    cart = create_cart_with_mixed_products(user)

    context = build_vat_context(user, cart)

    assert context["user_address"]["country"] == "GB"
    assert context["user_address"]["region"] == "UK"
    assert context["cart"]["items"][0]["product_classification"]["is_digital"] == True
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Context Building**
- [ ] Implement user address country resolution
- [ ] Build product classification system
- [ ] Create VAT region mapping
- [ ] Validate context structure

### **Phase 2: Rule Implementation**
- [ ] Configure checkout entry points
- [ ] Implement calculate_vat master rule
- [ ] Create regional VAT sub-rules
- [ ] Add product-specific VAT rules

### **Phase 3: Integration**
- [ ] Frontend checkout triggers
- [ ] Cart VAT update mechanisms
- [ ] Error handling and validation
- [ ] Performance optimization

---

**Document Control**
- **Owner**: Technical Lead, Business Analyst
- **Dependencies**: Epic 1 Rules Engine, User Profile Address system
- **Testing**: Comprehensive rule validation required
- **Review**: Weekly during implementation