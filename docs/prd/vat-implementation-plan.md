# VAT Calculation System - Detailed Implementation Plan

**Project**: Epic 2 - Dynamic VAT Calculation System
**Created**: 2025-09-23
**Duration**: 9 weeks (45 working days)
**Approach**: Test-Driven Development with incremental rollout

## 📋 **Phase 1: Foundation (Weeks 1-2)**

### **Week 1: VAT Rules Infrastructure**

#### **Day 1-2: Database Schema and Models**
**TDD Approach**: Write failing tests first, then implement
```python
# Test: test_vat_product_classification.py
def test_product_classification_digital_vs_physical():
    """Test product classification correctly identifies digital products"""
    # RED: Write failing test
    product = Product.objects.create(code="CM/CC/001")
    assert product.is_digital == True  # Fails initially

    # GREEN: Implement minimal solution
    # Add is_digital field and classification logic

    # REFACTOR: Optimize classification algorithm
```

**Tasks**:
- [ ] **T1.1**: Create VAT-related database migrations
  - Add `vat_category` and `is_digital` fields to Products
  - Create `VATCalculationLog` model for audit trail
  - Add VAT-related fields to Cart and CartItems
- [ ] **T1.2**: Implement Product Classification Service
  - Write tests for digital/physical product detection
  - Implement product code pattern matching
  - Create VAT category assignment logic
- [ ] **T1.3**: Setup VAT Rules Engine Entry Points
  - Configure `checkout_vat_calculation` entry point
  - Setup `cart_item_update` entry point
  - Test rule execution framework

**Acceptance Criteria**:
- [ ] All VAT-related database schemas created and migrated
- [ ] Product classification correctly identifies 100% of test products
- [ ] VAT rules engine entry points respond within 50ms
- [ ] 100% test coverage for new VAT infrastructure

**Test Coverage**:
```bash
# Backend tests
python manage.py test apps.products.tests.test_vat_classification --coverage
python manage.py test apps.rules_engine.tests.test_vat_entry_points --coverage

# Minimum 95% coverage required for Phase 1
```

### **Week 2: Basic VAT Rule Structure**

#### **Day 3-5: VAT Context Building and Validation**
**TDD Approach**: Test context data structure and validation
```python
# Test: test_vat_context_builder.py
def test_vat_context_includes_all_required_fields():
    """Test VAT context contains user region, cart items, settings"""
    # RED: Write test for complete context structure
    context = VATContextBuilder.build(user=user, cart=cart)
    assert context['user']['region'] in ['UK', 'IE', 'EC', 'SA', 'ROW']
    # Initially fails

    # GREEN: Implement context builder
    # REFACTOR: Optimize context building performance
```

**Tasks**:
- [ ] **T2.1**: Implement VAT Context Builder
  - Write tests for context data structure
  - Build context from user profile and cart data
  - Validate context against VAT rules schema
- [ ] **T2.2**: Create Regional Classification Service
  - Test region detection from user country
  - Implement special region handling (SA, CH, GG)
  - Create ROW fallback logic
- [ ] **T2.3**: Basic VAT Rule Templates
  - Create template rules for major scenarios
  - Test rule priority and execution order
  - Implement shadow mode for rule testing

**Acceptance Criteria**:
- [ ] VAT context builder generates valid context for all user types
- [ ] Regional classification correctly maps all countries
- [ ] Basic VAT rules execute without errors in shadow mode
- [ ] Context validation prevents invalid rule execution

**Test Scenarios**:
1. UK user with digital products → Context includes region="UK", is_digital=true
2. ROW user with mixed cart → Context includes appropriate product flags
3. SA user with special products → Context includes SA-specific product flags

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

### **Phase 1 Success Criteria**
- [ ] VAT infrastructure supports all required scenarios
- [ ] Product classification accuracy: 100%
- [ ] VAT context building performance: <10ms
- [ ] Test coverage: >95% for new VAT code

### **Phase 2 Success Criteria**
- [ ] Legacy VAT calculation compatibility: 100%
- [ ] Regional VAT rule accuracy: 100%
- [ ] Product-specific VAT rule coverage: 100%
- [ ] VAT calculation performance: <50ms per cart

### **Phase 3 Success Criteria**
- [ ] Complex pricing scenario support: 100%
- [ ] Performance under load: <50ms @ 100 concurrent users
- [ ] Shadow mode validation: 100% accuracy
- [ ] Edge case coverage: 100% of legacy scenarios

### **Phase 4 Success Criteria**
- [ ] Admin interface usability: Finance team can manage rules
- [ ] VAT compliance reporting: All required reports available
- [ ] Production monitoring: 99.9% uptime for VAT calculations
- [ ] Rollback capability: <5 minute recovery time

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