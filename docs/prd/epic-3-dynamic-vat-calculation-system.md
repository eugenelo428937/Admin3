# Epic 3: Dynamic VAT Calculation System

**Epic Goal**: Implement a comprehensive, rules-driven VAT calculation system that replaces legacy hardcoded logic with configurable business rules, supporting multiple regions, product types, and pricing scenarios through the enhanced Rules Engine.

**Business Value**: Eliminates manual VAT rate updates, reduces compliance risk, enables rapid response to tax regulation changes, and provides audit trail for all VAT calculations.

**Implementation Approach**: Complete replacement of existing VAT calculation logic with rules-driven system. All legacy VAT code will be removed from both frontend and backend. The Rules Engine foundation from Epic 1 will be leveraged for all VAT calculations.

## Story 3.1: VAT Rules Engine Foundation and Product Classification

As a system administrator,
I want to configure VAT rules based on product types and customer regions,
so that VAT calculations are automatically applied according to business rules without code changes.

**Acceptance Criteria**:
1. VAT calculation rules execute at `checkout_start` and `checkout_payment` entry points
2. Both entry points call `calculate_vat` rule with consistent context structure
3. Country determination uses `acted_user_profile_address.country` where `country = acted_user_profile.send_study_material_to`
4. VAT calculation considers: country, products ordered, and various discounts
5. Product classification system identifies digital vs physical products
6. Performance impact under 50ms for VAT calculation per checkout step

**Implementation Verification**:
- IV1: All legacy VAT calculation code removed from backend
- IV2: All legacy VAT calculation code removed from frontend
- IV3: `checkout_start` and `checkout_payment` entry points properly configured
- IV4: `calculate_vat` rule executes correctly with user address context

**Implementation Details**:
- **Entry Points**: `checkout_start`, `checkout_payment`
- **VAT Rule**: `calculate_vat` (called from both entry points)
- **Context**: User address country, cart products, discount information
- **Country Logic**: `acted_user_profile_address.country` matching `acted_user_profile.send_study_material_to`
- **Actions**: `update` actions for cart VAT amounts and rates

## Story 3.2: Regional VAT Rules Implementation

As a customer from different regions,
I want VAT to be calculated correctly based on my location and product types,
so that I see accurate pricing that complies with tax regulations.

**Acceptance Criteria**:
1. Zero VAT for digital products when customer region is ROW (non-UK/IE/EC)
2. Standard VAT rates for UK, Ireland, and EC customers on all products
3. Special South Africa VAT rules for specific product codes
4. Switzerland and Guernsey treated as ROW for VAT purposes
5. Live Online Tutorials always have VAT regardless of region
6. VAT exemption reasons clearly recorded in order data

**Integration Verification**:
- IV1: Cart totals match legacy VAT calculations
- IV2: Invoice generation includes correct VAT breakdowns
- IV3: Order confirmation emails show accurate VAT information

## Story 2.3: Product-Specific VAT Rules

As a business user,
I want different VAT treatment for different product categories,
so that eBooks, tutorials, and physical materials are taxed appropriately.

**Acceptance Criteria**:
1. Digital products (eBooks, Online Classroom) - zero VAT for ROW customers
2. Physical products maintain regional VAT regardless of customer location
3. UK eBook zero VAT rule implemented (effective May 1, 2020)
4. CM/CS eBook special PBOR VAT handling for UK customers
5. Bundle discount VAT inheritance from parent products
6. Product code pattern matching supports all legacy product types

**Integration Verification**:
- IV1: Product catalog displays correct VAT-inclusive/exclusive pricing
- IV2: Search and filter functionality unaffected by VAT changes
- IV3: Product recommendations maintain pricing accuracy

## Story 2.4: Pricing Scenario VAT Calculations

As a customer with special pricing (retaker, reduced price, additional items),
I want VAT calculated correctly on my discounted rates,
so that I receive accurate total pricing for my specific situation.

**Acceptance Criteria**:
1. Additional items use `additnet`/`additvat` with regional VAT rules
2. Retaker pricing applies VAT correctly with `retakernet`/`retakervat`
3. Reduced pricing countries get appropriate VAT treatment
4. Pricing priority: Additional → Retaker → Reduced → Discounted → Standard
5. VAT scaler adjustments applied when `vat_adjust` is enabled
6. All pricing scenarios maintain audit trail

**Implementation Verification**:
- IV1: Legacy pricing VAT logic completely replaced
- IV2: All pricing scenarios handled by rules engine
- IV3: Cart and checkout components use new VAT calculation API

## Story 2.5: VAT Administration and Configuration

As a finance administrator,
I want to manage VAT rules and rates through admin interface,
so that I can respond to tax regulation changes without requiring code deployments.

**Acceptance Criteria**:
1. Admin interface for managing VAT rules by region and product type
2. VAT rate configuration with effective date support
3. VAT rule testing with sample cart data
4. Audit trail of all VAT rule modifications
5. Bulk update capabilities for product VAT classifications
6. VAT calculation dry-run mode for testing rule changes

**Implementation Verification**:
- IV1: New VAT admin interface replaces legacy configuration
- IV2: VAT rule management accessible to authorized users
- IV3: Admin interface provides comprehensive VAT control

## Story 2.6: VAT Reporting and Compliance

As a finance manager,
I want comprehensive VAT reporting and audit capabilities,
so that I can ensure compliance and generate required tax reports.

**Acceptance Criteria**:
1. VAT calculation audit trail with rule execution history
2. VAT summary reports by region and time period
3. Zero VAT exemption reason tracking and reporting
4. VAT rate change impact analysis
5. Order-level VAT breakdown with applied rules
6. Export capabilities for external accounting systems

**Integration Verification**:
- IV1: Existing reporting infrastructure leveraged
- IV2: Order export formats include VAT details
- IV3: Financial reconciliation processes unaffected

---

## 📊 **Implementation Plan Overview**

### **Phase 1: Foundation (Weeks 1-2)**
- **Stories**: 2.1 (VAT Rules Engine Foundation)
- **Goal**: Establish VAT rules infrastructure
- **Deliverable**: Basic VAT rule execution framework

### **Phase 2: Core VAT Logic (Weeks 3-5)**
- **Stories**: 2.2 (Regional Rules), 2.3 (Product-Specific Rules)
- **Goal**: Implement main VAT calculation logic
- **Deliverable**: Working VAT calculations for common scenarios

### **Phase 3: Advanced Scenarios (Weeks 6-7)**
- **Stories**: 2.4 (Pricing Scenarios)
- **Goal**: Handle complex pricing and VAT interactions
- **Deliverable**: Complete VAT calculation coverage

### **Phase 4: Administration & Compliance (Weeks 8-9)**
- **Stories**: 2.5 (Administration), 2.6 (Reporting)
- **Goal**: Enable business user self-service and compliance
- **Deliverable**: Production-ready VAT system

---

## 📋 **Implementation Strategy**

### **Incremental Deployment Approach**
1. **Shadow Mode**: Run new VAT calculations alongside legacy, compare results
2. **Gradual Rollout**: Enable for specific customer segments or product types
3. **A/B Testing**: Split traffic between legacy and new VAT systems
4. **Full Cutover**: Complete migration once validation complete

### **Testing Strategy**
- **Unit Tests**: Individual VAT rule testing with comprehensive scenarios
- **Integration Tests**: End-to-end checkout flow with VAT calculations
- **Regression Tests**: Ensure legacy VAT calculations match new system
- **Performance Tests**: VAT calculation speed under load
- **User Acceptance Tests**: Business user validation of admin interface

### **Risk Mitigation**
- **Parallel Execution**: Maintain legacy system during transition
- **Data Validation**: Continuous comparison of old vs new calculations
- **Rollback Plan**: Ability to revert to legacy system if issues arise
- **Monitoring**: Real-time alerts for VAT calculation discrepancies

---

## 🔧 **Technical Implementation Details**

### **Database Changes Required**
```sql
-- Product VAT classification
ALTER TABLE products ADD COLUMN vat_category VARCHAR(50);
ALTER TABLE products ADD COLUMN is_digital BOOLEAN DEFAULT FALSE;

-- Cart VAT tracking
ALTER TABLE cart ADD COLUMN vat_calculation_method VARCHAR(20) DEFAULT 'legacy';
ALTER TABLE cart_items ADD COLUMN vat_rule_applied VARCHAR(100);

-- VAT audit trail
CREATE TABLE vat_calculation_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    cart_id INTEGER,
    rule_id VARCHAR(100),
    calculation_input JSONB,
    calculation_output JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**
```
POST /api/rules/engine/execute/     # VAT calculation execution
GET  /api/vat/rates/               # Current VAT rates by region
POST /api/vat/calculate/           # Manual VAT calculation for testing
GET  /api/vat/audit/{order_id}/    # VAT calculation audit trail
```

### **Rules Engine Integration**
```json
{
  "entry_point": "checkout_vat_calculation",
  "context": {
    "user": {
      "region": "UK|IE|EC|SA|ROW",
      "country_code": "GB",
      "reduced_price_eligible": true
    },
    "cart": {
      "items": [{
        "product_code": "CM/CC/001",
        "product_category": "digital_ebook",
        "price_type": "standard",
        "net_amount": 59.99,
        "current_vat": 11.998
      }]
    },
    "settings": {
      "vat_adjust_enabled": true,
      "effective_date": "2025-09-23"
    }
  }
}
```

---

## 📈 **Success Metrics**

### **Technical Metrics**
- **Accuracy**: 100% match with legacy VAT calculations during parallel run
- **Performance**: VAT calculation under 50ms per cart
- **Reliability**: 99.9% uptime for VAT calculation service
- **Coverage**: All product types and pricing scenarios supported

### **Business Metrics**
- **Tax Compliance**: Zero VAT calculation errors in audit
- **Admin Efficiency**: 80% reduction in manual VAT rate updates
- **Change Response**: VAT rule changes deployed in under 24 hours
- **User Satisfaction**: No customer complaints about VAT accuracy

---

## 🚀 **Go-Live Criteria**

### **Technical Readiness**
- [ ] All test scenarios pass with 100% accuracy
- [ ] Performance benchmarks met under production load
- [ ] Monitoring and alerting systems operational
- [ ] Rollback procedures tested and documented

### **Business Readiness**
- [ ] Finance team trained on new admin interface
- [ ] VAT compliance verification completed
- [ ] Customer communication about VAT changes prepared
- [ ] Support team trained on new VAT calculation system

---

**Document Control**
- **Created**: 2025-09-23
- **Based on**: Epic 1 Story 1.2 (Dynamic VAT Calculation System)
- **Dependencies**: Epic 1 (Enhanced Rules Engine Foundation)
- **Owner**: Finance Team / Product Team
- **Next Review**: 2025-10-07