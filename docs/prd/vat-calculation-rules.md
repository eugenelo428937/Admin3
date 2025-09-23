# VAT Calculation Rules for Admin3

**Document Version**: 1.0
**Created**: 2025-09-23
**Based on**: Legacy FORPRO VAT Calculation Logic Analysis
**Purpose**: Comprehensive VAT rules specification for Rules Engine implementation

## Executive Summary

This document defines the complete VAT calculation rules extracted from the legacy FORPRO system. These rules will be implemented using the Admin3 Rules Engine to provide dynamic, configurable VAT calculations based on customer location, product type, and pricing scenarios.

## 1. Regional VAT Zones

### 1.1 Standard VAT Regions
- **UK** - United Kingdom (Standard VAT applies)
- **IE** - Ireland (Standard VAT applies)
- **EC** - European Community (Standard VAT applies)

### 1.2 Special VAT Regions
- **SA** - South Africa (Special VAT rates on specific products)
- **CH** - Switzerland (Treated as ROW for VAT purposes)
- **GG** - Guernsey (Treated as ROW for VAT purposes)
- **ROW** - Rest of World (Zero VAT on digital products)

## 2. Product Classification

### 2.1 Digital Products (Zero VAT for ROW)
Products that are delivered digitally and have zero VAT for customers outside UK/IE/EC:

| Product Code Pattern | Description | VAT Treatment |
|---------------------|-------------|---------------|
| `/CC/`, `/CCPR/` | eBook products | Zero VAT for ROW |
| `/CN/`, `/CNPR/` | Digital course materials | Zero VAT for ROW |
| `/CFC/` | Digital flashcards | Zero VAT for ROW |
| `/CS/`, `/CS1/`, `/CS2/` | Smart Revise | Zero VAT for ROW |
| `/CCD/` | Sound Revision | Zero VAT for ROW |
| `/CEX/`, `/CEX2/` | Online exam products | Zero VAT for ROW |
| `/CM1/`, `/CMT1/`, `/CMTR1/` | Digital tutorials | Zero VAT for ROW |
| `/CAMP/`, `/CMIN/`, `/CMAA/`, `/CMAS/` | Various digital materials | Zero VAT for ROW |
| `ONLINE CLASSROOM` | Online classroom access | Zero VAT for ROW |

### 2.2 Physical Products
Products that require physical delivery maintain standard VAT rates based on region:

| Product Code Pattern | Description | VAT Treatment |
|---------------------|-------------|---------------|
| `/PC/`, `/PCPR/` | Printed materials | Standard VAT by region |
| `/PFC/` | Physical flashcards | Standard VAT by region |
| `/PSTA/`, `/PFAC/` | Physical study aids | Standard VAT by region |

### 2.3 Special Products
| Product Type | Condition | VAT Treatment |
|--------------|-----------|---------------|
| `LIVE ONLINE TUTORIAL` | Any region | Always has VAT |
| Webinar (5th+ in order) | Discounted rate | Discounted VAT applies |
| `/CMEW/` | Live online component | Zero VAT (excluded from totals) |

## 3. Pricing Scenarios

### 3.1 Priority Order
VAT calculation follows this priority order for pricing scenarios:
1. **Additional items** - Items marked as additional purchases
2. **Retaker pricing** - Special pricing for retaking students
3. **Reduced pricing** - Country-specific reduced rates
4. **Discounted pricing** - Promotional discounts
5. **Standard pricing** - Default pricing

### 3.2 Additional Items Logic
```
IF item.additional = "Y":
    IF reduced_price_eligible AND item.radditnet > 0:
        use radditnet/radditvat (reduced additional pricing)
    ELSE:
        use additnet/additvat (standard additional pricing)
```

### 3.3 Retaker Pricing Logic
```
IF item.retaker = "Y":
    use retakernet/retakervat
    Apply regional VAT rules
```

### 3.4 Reduced Pricing Logic
```
IF customer.reduced_price_country = "Y" AND item.reducenet > 0:
    use reducenet/reducevat
    Apply regional VAT rules
```

## 4. South Africa Special VAT Rules

### 4.1 SA VAT-Applicable Products
The following products maintain VAT for South African customers even when other ROW countries get zero VAT:

```
/CC/, /CCPR/, /CN/, /CNPR/, /CESTA/, /CEFAC/, /CFC/,
/CMT1/, /CMTR1/, /CEX/, /CEX2/, /CM1/, /CNRB/, /CNR2/,
/CAMP/, /CMIN/, /CMAA/, /CMAS/, /CX/, /CCR/, /CBAR/,
/CE11/, /CH11/, /CLAM/, /CSWE2/
```

### 4.2 SA VAT Calculation
```
IF region = "SA" AND product_code IN sa_vat_products:
    Apply standard VAT rate
    IF vat_adjust_enabled:
        Apply VAT scaler
ELSE:
    Zero VAT
```

## 5. UK eBook Zero VAT Rule

### 5.1 Implementation Date
**Effective from: May 1, 2020**

### 5.2 Affected Products
UK customers receive zero VAT on the following eBook products:
```
/CAMP/, /CMIN/, /CMAA/, /CMAS/, /CC/, /CCPR/, /CCR/,
/CEX/, /CEX2/, /CFC/, /CM1/, /CN/, /CNPR/, /CNRB/,
/CNR2/, /CX/, /CBAR/, /CE11/, /CH11/, /CLAM/, /CSWE2/
```

### 5.3 Special Case: CM/CS eBooks with PBOR
For CM and CS subject eBooks that include PBOR (Practice-Based or Objective Response):
- The PBOR component VAT must be retained
- Look up the corresponding printed product VAT for PBOR component
- Apply only the PBOR VAT amount

## 6. VAT Scaler Adjustments

### 6.1 VAT Scaler Application
When `vat_adjust = "Y"`, apply VAT scaler to these products:
```
/CC/, /CCPR/, /CN/, /CNPR/, /CCD/, /CESTA/, /CEFAC/,
/CFC/, /CMT1/, /CMTR1/, /CEX/, /CEX2/, /CM1/, /CNRB/,
/CNR2/, /CAMP/, /CMIN/, /CMAA/, /CMAS/, /CX/, /CCR/,
/CBAR/, /CE11/, /CH11/, /CLAM/, /CSWE2/
```

### 6.2 Scaler Calculation
```
adjusted_vat = original_vat * vat_scaler_rate
```

## 7. Special Discount Rules

### 7.1 Bundle Discount VAT (`*/AD/` code)
When CMCQ product has zero VAT (ROW customer), the associated bundle discount must also have zero VAT:
```
IF previous_item.code = "CMCQ" AND previous_item.vat = 0:
    current_item.vat = 0 // for */AD/ discount line
```

### 7.2 Processing Order
Cart items must be processed in order to ensure correct VAT removal flags are set before discount lines are encountered.

## 8. Rules Engine Implementation

### 8.1 Entry Point
- **Primary**: `checkout_vat_calculation`
- **Secondary**: `cart_update` (for real-time updates)

### 8.2 Context Requirements
```json
{
  "user": {
    "region": "UK|IE|EC|SA|CH|GG|ROW",
    "reduced_price_eligible": boolean,
    "country_code": "string"
  },
  "cart": {
    "items": [{
      "product_code": "string",
      "product_name": "string",
      "price_type": "standard|additional|retaker|reduced|discounted",
      "net_price": number,
      "vat_amount": number,
      "product_flags": {
        "is_digital": boolean,
        "is_ebook": boolean,
        "is_tutorial": boolean,
        "requires_shipping": boolean
      }
    }]
  },
  "settings": {
    "vat_adjust_enabled": boolean,
    "vat_scaler_rate": number,
    "effective_date": "YYYY-MM-DD"
  }
}
```

### 8.3 Rule Priority Structure
1. **Priority 100**: UK eBook zero VAT rule (date-dependent)
2. **Priority 90**: Live Online Tutorial VAT override
3. **Priority 80**: Regional VAT rules (ROW zero VAT)
4. **Priority 70**: South Africa special VAT
5. **Priority 60**: Switzerland/Guernsey ROW treatment
6. **Priority 50**: VAT scaler adjustments
7. **Priority 40**: Bundle discount VAT removal
8. **Priority 30**: Standard regional VAT application

### 8.4 Action Types
```json
{
  "type": "update",
  "target": "cart.items[].vat_calculation",
  "operation": "set",
  "value": {
    "vat_rate": "calculated_rate",
    "vat_amount": "calculated_amount",
    "vat_rule_applied": "rule_name",
    "vat_exempt_reason": "reason_if_zero"
  }
}
```

## 9. Testing Scenarios

### 9.1 Critical Test Cases
1. **UK customer + eBook after May 2020** → Zero VAT
2. **ROW customer + Digital product** → Zero VAT
3. **SA customer + Special product** → SA VAT rate
4. **UK customer + Live Online Tutorial** → Standard VAT
5. **CH customer + Digital product** → Zero VAT
6. **IE customer + Physical product** → Standard VAT
7. **Retaker + ROW + Digital** → Zero VAT
8. **Additional item + Reduced price** → Reduced additional VAT
9. **Bundle with CMCQ + ROW** → Both items zero VAT

### 9.2 Edge Cases
- Multiple pricing types in single cart
- Mixed digital/physical products
- Date-dependent rules crossing midnight
- VAT scaler with already zero VAT
- Reduced price country with retaker status

## 10. Migration Notes

### 10.1 Data Requirements
- Map legacy region codes to new system
- Convert product code patterns to product flags
- Migrate VAT rates and scaler values
- Preserve historical VAT calculations for audit

### 10.2 Validation Steps
1. Compare legacy VAT calculations with new rules engine
2. Verify all product codes are mapped correctly
3. Test all regional variations
4. Validate special date-dependent rules
5. Confirm VAT scaler applications

## 11. Business Rule Maintenance

### 11.1 Configurable Elements
- VAT rates by region
- Product code to VAT category mappings
- Special region lists (SA products, UK eBooks)
- VAT scaler rates
- Effective dates for rule changes

### 11.2 Admin Interface Requirements
- View/edit VAT rules without code changes
- Test VAT calculations with sample data
- Audit trail of VAT rule modifications
- Bulk update product VAT categories
- Regional VAT rate management

## 12. Compliance Considerations

### 12.1 Regulatory Requirements
- Maintain VAT calculation audit trail
- Support VAT rate changes with effective dates
- Generate VAT reports by region/period
- Handle VAT registration thresholds
- Support reverse charge mechanisms

### 12.2 Invoice Requirements
- Display VAT breakdown by rate
- Show VAT registration numbers
- Include VAT exemption reasons
- Support multiple VAT rates per invoice

## Appendix A: Product Code Master List

### Digital Product Codes
```
/CC/, /CCPR/, /CN/, /CNPR/, /CCD/, /CFC/, /CS/, /CS1/, /CS2/,
/CBIT/, /CSTA/, /CMCQ/, /CMT/, /CMT1/, /CMTR1/, /CESTP/,
/CSTP/, /CESTA/, /CEFAC/, /CFAC/, /CEX/, /CEX2/, /CM1/,
/CNRB/, /CNR2/, /CAMP/, /CMIN/, /CMAA/, /CMAS/, /CX/,
/CCR/, /CBAR/, /CE11/, /CH11/, /CLAM/, /CSWE2/, /CVAU/
```

### Physical Product Codes
```
/PC/, /PCPR/, /PFC/, /PSTA/, /PFAC/, /PSTP/, /PFFAC/
```

### Special Codes
```
/CMEW/ - Excluded from totals
*/AD/ - Bundle discount
WEBINAR - Special discounting after 4th item
```

## Appendix B: Regional Country Mappings

### UK Region
- United Kingdom (GB)
- Northern Ireland (included in UK for VAT)

### IE Region
- Republic of Ireland (IE)

### EC Region (EU Countries)
- All EU member states excluding UK (post-Brexit)
- Requires periodic update as EU membership changes

### SA Region
- South Africa (ZA)

### Special Treatment
- Switzerland (CH) → Treated as ROW
- Guernsey (GG) → Treated as ROW

### ROW (Rest of World)
- All countries not listed above

---

**Document Control**
- Review Frequency: Quarterly
- Owner: Finance Team / Product Team
- Technical Implementation: Development Team
- Next Review: 2025-12-31