# VAT Calculation System - Detailed Implementation Plan

**Project**: Epic 3 - Dynamic VAT Calculation System
**Created**: 2025-09-23
**Duration**: 10 weeks (50 working days) - includes legacy code removal
**Approach**: Test-Driven Development with incremental rollout

## 📋 **Phase 0: Legacy Code Removal (Week 1)**

### **Pre-Implementation: Complete Legacy VAT Code Removal**
**Approach**: Clean slate implementation - remove all existing VAT calculation logic before building new system.

**Tasks**:
- [ ] **T0.1**: Remove Backend Legacy VAT Code
  - Remove VAT calculation methods from cart/models.py
  - Remove VAT logic from orders/models.py and products/models.py
  - Delete legacy VAT utility files and configuration
- [ ] **T0.2**: Remove Frontend Legacy VAT Code
  - Remove VAT calculation components and hooks
  - Delete legacy VAT utility functions and constants
  - Clean up VAT state management from context/reducers
- [ ] **T0.3**: Database Schema Cleanup
  - Remove legacy VAT fields from database tables
  - Create migration for schema cleanup
  - Validate database integrity after cleanup

**Acceptance Criteria**:
- [ ] Zero legacy VAT references remain in codebase
- [ ] Application starts and runs without VAT calculations
- [ ] Cart and checkout flow works (without VAT display)
- [ ] Database schema cleaned of legacy VAT fields

**Documentation**: See `docs/prd/epic-3-legacy-vat-removal-plan.md`

## 📋 **Phase 1: Foundation (Week 2)**

### **Week 2: VAT Rules Infrastructure**

#### **Day 1-2: Checkout Entry Points and Context Building**
**TDD Approach**: Write failing tests first, then implement
```python
# Test: test_checkout_vat_entry_points.py
def test_checkout_start_vat_calculation():
    """Test checkout_start entry point triggers calculate_vat rule"""
    # RED: Write failing test
    user = create_user_with_address(send_material_to="GB")
    cart = create_cart_with_products(user)

    result = rules_engine.execute("checkout_start", build_vat_context(user, cart))
    assert result["vat_calculations"]["total_vat"] > 0  # Fails initially

    # GREEN: Implement checkout entry points and calculate_vat rule
    # REFACTOR: Optimize context building and rule execution
```

**Tasks**:
- [ ] **T1.1**: Configure Checkout VAT Entry Points
  - Setup `checkout_start` entry point in rules engine
  - Setup `checkout_payment` entry point in rules engine
  - Configure both to call `calculate_vat` rule
- [ ] **T1.2**: Implement VAT Context Building
  - Build context with user address country logic
  - Use `acted_user_profile_address.country` where `country = acted_user_profile.send_study_material_to`
  - Include cart products and discount information
- [ ] **T1.3**: Create Product Classification Service
  - Write tests for digital/physical product detection
  - Implement product code pattern matching for VAT categories
  - Create VAT category assignment logic

**Acceptance Criteria**:
- [ ] `checkout_start` and `checkout_payment` entry points configured
- [ ] `calculate_vat` rule executes from both entry points
- [ ] VAT context includes user address country and cart products
- [ ] Product classification correctly identifies 100% of test products
- [ ] Entry points respond within 50ms per execution

**Test Coverage**:
```bash
# Backend tests
python manage.py test apps.rules_engine.tests.test_checkout_entry_points --coverage
python manage.py test apps.vat.tests.test_context_building --coverage
python manage.py test apps.products.tests.test_vat_classification --coverage

# Frontend integration tests
npm test -- --testPathPattern=checkout.*vat --coverage

# Minimum 95% coverage required for Phase 1
```

### **Week 2: Basic VAT Rule Structure**

#### **Day 3-5: Calculate VAT Rule Implementation**
**TDD Approach**: Test calculate_vat rule execution and sub-rules
```python
# Test: test_calculate_vat_rule.py
def test_calculate_vat_rule_execution():
    """Test calculate_vat rule executes all sub-rules correctly"""
    # RED: Write test for calculate_vat rule
    user = create_user_with_address(send_material_to="GB", address_country="GB")
    cart = create_cart_with_digital_products(user)

    context = build_vat_context(user, cart)
    result = rules_engine.execute_rule("calculate_vat", context)
    assert result["vat_calculations"]["items"][0]["vat_amount"] >= 0
    # Initially fails

    # GREEN: Implement calculate_vat rule and sub-rules
    # REFACTOR: Optimize rule execution performance
```

**Tasks**:
- [ ] **T2.1**: Implement Calculate VAT Master Rule
  - Create `calculate_vat` rule that orchestrates all VAT calculations
  - Configure rule to be called from `checkout_start` and `checkout_payment`
  - Test rule execution with various context scenarios
- [ ] **T2.2**: Create VAT Sub-Rules
  - Implement `determine_vat_region` sub-rule for country mapping
  - Create `apply_regional_vat_rules` for UK/IE/EC vs ROW logic
  - Add `row_digital_zero_vat` rule for ROW digital products
- [ ] **T2.3**: Address Country Resolution Logic
  - Implement logic to match `acted_user_profile_address.country` with `send_study_material_to`
  - Create fallback mechanisms for address mismatches
  - Test edge cases for missing or multiple addresses

**Acceptance Criteria**:
- [ ] `calculate_vat` rule successfully executes from both entry points
- [ ] Address country resolution works for all user profile scenarios
- [ ] VAT sub-rules execute in correct sequence and produce accurate results
- [ ] Regional classification correctly maps all countries to VAT regions

**Test Scenarios**:
1. **Checkout Start**: User begins checkout → `checkout_start` entry point → `calculate_vat` rule executes
2. **Checkout Payment**: User selects payment method → `checkout_payment` entry point → `calculate_vat` rule executes
3. **Address Resolution**: User has `send_study_material_to="GB"` and matching address → country="GB", region="UK"
4. **Address Mismatch**: User has `send_study_material_to="GB"` but no matching address → fallback logic applies

---

## 📋 **Phase 2: Core VAT Logic (Weeks 3-5)**

### **Week 3: Regional VAT Rules**

#### **Day 6-8: Zero VAT for ROW Digital Products**
**TDD Approach**: Implement core business logic with comprehensive tests
```python
# Test: test_row_digital_vat.py
def test_row_customer_digital_product_zero_vat():
    """ROW customers get zero VAT on digital products"""
    # RED: Test fails initially
    user = create_user(country='US')  # ROW
    cart = create_cart_with_digital_products()
    result = VATCalculator.calculate(user, cart)
    assert result.total_vat == 0

    # GREEN: Implement ROW digital VAT rule
    # REFACTOR: Optimize performance
```

**Tasks**:
- [ ] **T3.1**: ROW Digital Product Zero VAT Rule
  - Write comprehensive tests for ROW scenarios
  - Implement JSONLogic rule for ROW digital products
  - Test with all digital product codes from legacy system
- [ ] **T3.2**: UK/IE/EC Standard VAT Rules
  - Test standard VAT application for EU customers
  - Implement regional VAT rate lookup
  - Validate against current VAT rates
- [ ] **T3.3**: Live Online Tutorial Override
  - Test tutorial VAT override for all regions
  - Implement tutorial detection and VAT application
  - Verify tutorial VAT regardless of customer region

**Acceptance Criteria**:
- [ ] ROW customers get 0% VAT on all digital products
- [ ] UK/IE/EC customers get standard VAT on all products
- [ ] Live Online Tutorials always have VAT regardless of region
- [ ] 100% compatibility with legacy VAT calculations for basic scenarios

#### **Day 9-10: South Africa Special VAT Rules**
**TDD Approach**: Test complex business rules with edge cases
```python
# Test: test_sa_special_vat.py
def test_sa_customer_specific_products_maintain_vat():
    """SA customers maintain VAT on specific product codes"""
    # RED: Test SA special product VAT retention
    user = create_user(country='ZA')  # South Africa
    cart = create_cart_with_sa_vat_products()
    result = VATCalculator.calculate(user, cart)
    assert result.total_vat > 0  # Should maintain VAT

    # GREEN: Implement SA special VAT rules
    # REFACTOR: Optimize SA product code matching
```

**Tasks**:
- [ ] **T3.4**: SA VAT Product Code Mapping
  - Test SA-specific product code lists
  - Implement SA VAT retention logic
  - Validate against legacy SA VAT calculations
- [ ] **T3.5**: Switzerland/Guernsey ROW Treatment
  - Test CH/GG customers treated as ROW
  - Implement special region mapping
  - Verify zero VAT for digital products

**Acceptance Criteria**:
- [ ] SA customers maintain VAT on specific product codes
- [ ] SA customers get zero VAT on non-SA-specific products
- [ ] CH/GG customers treated identically to ROW customers
- [ ] All regional rules maintain 100% accuracy with legacy system

### **Week 4: Product-Specific VAT Rules**

#### **Day 11-13: UK eBook Zero VAT Implementation**
**TDD Approach**: Test date-dependent business rules
```python
# Test: test_uk_ebook_zero_vat.py
def test_uk_ebook_zero_vat_after_may_2020():
    """UK customers get zero VAT on eBooks after May 1, 2020"""
    # RED: Test date-dependent VAT rule
    user = create_uk_user()
    cart = create_cart_with_ebooks()

    with freeze_time("2020-05-01"):
        result = VATCalculator.calculate(user, cart)
        assert result.total_vat == 0

    with freeze_time("2020-04-30"):
        result = VATCalculator.calculate(user, cart)
        assert result.total_vat > 0
```

**Tasks**:
- [ ] **T4.1**: UK eBook Zero VAT Rule (Post May 2020)
  - Test date-dependent VAT rules
  - Implement effective date logic in rules engine
  - Test eBook product code detection
- [ ] **T4.2**: CM/CS eBook PBOR VAT Handling
  - Test complex PBOR VAT calculation for CM/CS subjects
  - Implement printed product VAT lookup for PBOR component
  - Validate PBOR VAT retention logic
- [ ] **T4.3**: Bundle Discount VAT Inheritance
  - Test discount line VAT removal when parent product has zero VAT
  - Implement VAT inheritance logic for bundle discounts
  - Test processing order dependency

**Acceptance Criteria**:
- [ ] UK customers get zero VAT on eBooks after May 1, 2020
- [ ] UK customers get standard VAT on eBooks before May 1, 2020
- [ ] CM/CS eBooks retain PBOR VAT component for UK customers
- [ ] Bundle discounts inherit VAT status from parent products

### **Week 5: VAT Scaler and Edge Cases**

#### **Day 14-16: VAT Scaler Implementation**
**TDD Approach**: Test configurable VAT adjustments
```python
# Test: test_vat_scaler.py
def test_vat_scaler_applied_to_eligible_products():
    """VAT scaler adjusts VAT for specific products when enabled"""
    # RED: Test VAT scaler functionality
    user = create_user(vat_adjust_enabled=True)
    cart = create_cart_with_scaler_eligible_products()
    result = VATCalculator.calculate(user, cart, vat_scaler=1.2)
    assert result.items[0].vat_amount == original_vat * 1.2
```

**Tasks**:
- [ ] **T5.1**: VAT Scaler Configuration and Application
  - Test VAT scaler for eligible product codes
  - Implement configurable scaler rates
  - Test scaler application only when enabled
- [ ] **T5.2**: Edge Case Handling
  - Test multiple pricing scenarios in single cart
  - Implement webinar discount VAT logic
  - Test CMEW product exclusion from totals

**Acceptance Criteria**:
- [ ] VAT scaler applies correctly to eligible products
- [ ] VAT scaler respects enable/disable configuration
- [ ] All edge cases from legacy system handled correctly
- [ ] Complex cart scenarios calculate VAT accurately

---

## 📋 **Phase 3: Advanced Scenarios (Weeks 6-7)**

### **Week 6: Pricing Scenario VAT Integration**

#### **Day 17-19: Additional and Retaker Pricing VAT**
**TDD Approach**: Test pricing hierarchy and VAT interaction
```python
# Test: test_pricing_scenario_vat.py
def test_additional_pricing_with_regional_vat():
    """Additional pricing applies correct VAT based on region"""
    # RED: Test additional pricing VAT calculation
    user = create_row_user()
    cart = create_cart_with_additional_items()
    result = VATCalculator.calculate(user, cart)
    # Additional digital items should have zero VAT for ROW
    assert result.items[0].vat_amount == 0
```

**Tasks**:
- [ ] **T6.1**: Additional Items VAT Calculation
  - Test additional pricing with regional VAT rules
  - Implement additnet/additvat with VAT rule integration
  - Test reduced additional pricing scenarios
- [ ] **T6.2**: Retaker Pricing VAT Integration
  - Test retaker pricing with all regional VAT scenarios
  - Implement retakernet/retakervat VAT calculations
  - Validate retaker pricing accuracy with legacy
- [ ] **T6.3**: Reduced Price Country VAT
  - Test reduced pricing with complex VAT scenarios
  - Implement reduced price VAT calculation
  - Test reduced pricing priority over other scenarios

**Acceptance Criteria**:
- [ ] Additional items apply regional VAT rules correctly
- [ ] Retaker pricing maintains VAT calculation accuracy
- [ ] Reduced pricing scenarios handle VAT appropriately
- [ ] Pricing hierarchy respects VAT rule priorities

### **Week 7: Performance Optimization and Shadow Testing**

#### **Day 20-21: Performance Optimization**
**TDD Approach**: Test performance requirements
```python
# Test: test_vat_performance.py
def test_vat_calculation_performance_under_50ms():
    """VAT calculation completes within performance requirements"""
    # RED: Test performance requirements
    large_cart = create_cart_with_50_items()

    start_time = time.time()
    result = VATCalculator.calculate(user, large_cart)
    calculation_time = (time.time() - start_time) * 1000

    assert calculation_time < 50  # Under 50ms requirement
```

**Tasks**:
- [ ] **T7.1**: VAT Calculation Performance Optimization
  - Profile VAT calculation performance
  - Optimize rule execution and database queries
  - Implement VAT result caching where appropriate
- [ ] **T7.2**: Shadow Mode Testing
  - Run new VAT calculations alongside legacy system
  - Compare results for 100% accuracy
  - Log discrepancies for investigation
- [ ] **T7.3**: Load Testing
  - Test VAT calculations under production load
  - Validate performance with concurrent users
  - Ensure no performance degradation

**Acceptance Criteria**:
- [ ] VAT calculations complete within 50ms for typical carts
- [ ] Shadow mode shows 100% accuracy with legacy calculations
- [ ] Load testing shows no performance degradation
- [ ] VAT calculation caching improves repeat performance

---

## 📋 **Phase 4: Administration & Compliance (Weeks 8-9)**

### **Week 8: Admin Interface and Configuration**

#### **Day 22-24: VAT Rules Administration**
**TDD Approach**: Test admin interface functionality
```python
# Test: test_vat_admin_interface.py
def test_vat_rule_creation_through_admin():
    """Admin can create and modify VAT rules through interface"""
    # RED: Test admin VAT rule management
    admin_user = create_admin_user()
    rule_data = {
        'name': 'Test VAT Rule',
        'entry_point': 'checkout_vat_calculation',
        'condition': {'==': [{'var': 'user.region'}, 'UK']}
    }
    response = admin_client.post('/admin/vat/rules/', rule_data)
    assert response.status_code == 201
```

**Tasks**:
- [ ] **T8.1**: VAT Rules Admin Interface
  - Test VAT rule creation and modification
  - Implement user-friendly rule configuration
  - Add VAT rule validation and testing tools
- [ ] **T8.2**: VAT Rate Management
  - Test VAT rate configuration by region
  - Implement effective date support for rate changes
  - Add VAT rate history and audit trail
- [ ] **T8.3**: VAT Rule Testing Interface
  - Test dry-run mode for VAT rule changes
  - Implement sample cart VAT testing
  - Add rule impact analysis tools

**Acceptance Criteria**:
- [ ] Admin users can create and modify VAT rules without code changes
- [ ] VAT rates can be updated with effective dates
- [ ] VAT rule testing interface allows safe rule validation
- [ ] All VAT changes maintain complete audit trail

### **Week 9: Reporting and Production Readiness**

#### **Day 25-27: VAT Reporting and Compliance**
**TDD Approach**: Test reporting and audit requirements
```python
# Test: test_vat_reporting.py
def test_vat_audit_trail_completeness():
    """VAT calculations maintain complete audit trail"""
    # RED: Test audit trail functionality
    user = create_user()
    cart = create_cart()
    result = VATCalculator.calculate(user, cart)

    audit_log = VATCalculationLog.objects.filter(
        cart_id=cart.id
    ).first()
    assert audit_log.calculation_input is not None
    assert audit_log.rule_id is not None
```

**Tasks**:
- [ ] **T9.1**: VAT Audit Trail and Logging
  - Test comprehensive VAT calculation logging
  - Implement audit trail for all VAT decisions
  - Add VAT exemption reason tracking
- [ ] **T9.2**: VAT Reporting Dashboard
  - Test VAT summary reports by region and period
  - Implement VAT calculation statistics
  - Add VAT rule usage analytics
- [ ] **T9.3**: Production Deployment Preparation
  - Test production deployment procedures
  - Implement VAT calculation monitoring
  - Add rollback procedures for VAT rules

**Acceptance Criteria**:
- [ ] Complete audit trail for all VAT calculations
- [ ] VAT reporting provides required compliance data
- [ ] Production monitoring alerts on VAT calculation issues
- [ ] Rollback procedures allow quick recovery from VAT rule issues

---

## 🧪 **Testing Strategy by Phase**

### **Unit Testing Requirements**
```bash
# Phase 1: Foundation
python manage.py test apps.products.tests.test_vat_classification
python manage.py test apps.rules_engine.tests.test_vat_entry_points
python manage.py test apps.vat.tests.test_context_builder

# Phase 2: Core Logic
python manage.py test apps.vat.tests.test_regional_rules
python manage.py test apps.vat.tests.test_product_rules
python manage.py test apps.vat.tests.test_sa_special_rules

# Phase 3: Advanced Scenarios
python manage.py test apps.vat.tests.test_pricing_scenarios
python manage.py test apps.vat.tests.test_performance

# Phase 4: Administration
python manage.py test apps.vat.tests.test_admin_interface
python manage.py test apps.vat.tests.test_reporting
```

### **Integration Testing Requirements**
```bash
# End-to-end VAT calculation flows
python manage.py test integration.test_vat_checkout_flow
python manage.py test integration.test_vat_cart_updates
python manage.py test integration.test_vat_order_processing

# Legacy system compatibility
python manage.py test integration.test_vat_legacy_compatibility
```

### **Performance Testing Requirements**
```bash
# VAT calculation performance benchmarks
python manage.py test performance.test_vat_calculation_speed
python manage.py test performance.test_vat_concurrent_users
python manage.py test performance.test_vat_large_carts
```

---

## 📊 **Acceptance Criteria Summary**

### **Phase 0 Success Criteria**
- [ ] Complete removal of legacy VAT calculation code
- [ ] Application functions without VAT calculations
- [ ] Database schema cleaned of legacy VAT fields
- [ ] Codebase ready for clean rules engine implementation

### **Phase 1 Success Criteria**
- [ ] VAT infrastructure supports all required scenarios
- [ ] Product classification accuracy: 100%
- [ ] VAT context building performance: <10ms
- [ ] Test coverage: >95% for new VAT code

### **Phase 2 Success Criteria**
- [ ] Regional VAT rule accuracy: 100% vs legacy business rules
- [ ] Product-specific VAT rule coverage: 100%
- [ ] VAT calculation performance: <50ms per cart
- [ ] All legacy VAT scenarios reimplemented via rules engine

### **Phase 3 Success Criteria**
- [ ] Complex pricing scenario support: 100%
- [ ] Performance under load: <50ms @ 100 concurrent users
- [ ] Edge case coverage: 100% of legacy scenarios
- [ ] Rules engine VAT calculations complete

### **Phase 4 Success Criteria**
- [ ] Admin interface usability: Finance team can manage rules
- [ ] VAT compliance reporting: All required reports available
- [ ] Production monitoring: 99.9% uptime for VAT calculations
- [ ] Complete replacement of legacy VAT system

---

## 🚨 **Risk Mitigation**

### **Technical Risks**
1. **Performance degradation**: Continuous performance monitoring, caching strategy
2. **VAT calculation errors**: Parallel shadow mode, extensive testing
3. **Rule complexity**: Modular rule design, comprehensive documentation

### **Business Risks**
1. **Tax compliance issues**: Finance team validation, external audit
2. **Customer impact**: Gradual rollout, immediate rollback capability
3. **Revenue impact**: Continuous VAT calculation validation

### **Mitigation Actions**
- [ ] Shadow mode deployment for 2 weeks minimum
- [ ] Finance team training on new VAT admin interface
- [ ] 24/7 monitoring for VAT calculation discrepancies
- [ ] Immediate rollback procedures documented and tested

---

**Document Control**
- **Owner**: Technical Lead, Finance Team
- **Review Frequency**: Weekly during implementation
- **Last Updated**: 2025-09-23
- **Next Review**: 2025-09-30