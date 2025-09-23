# VAT Calculation System - Testing & Acceptance Criteria

**Project**: Epic 3 - Dynamic VAT Calculation System
**Created**: 2025-09-23
**Testing Approach**: Test-Driven Development (TDD) with comprehensive scenario coverage

## 🎯 **Overall Acceptance Criteria**

### **Primary Success Metrics**
- ✅ **100% Accuracy**: New VAT calculations match legacy system results
- ✅ **Performance**: VAT calculation completes in <50ms per cart
- ✅ **Coverage**: All legacy VAT scenarios supported
- ✅ **Reliability**: 99.9% uptime for VAT calculation service

### **Business Success Metrics**
- ✅ **Compliance**: Zero VAT calculation errors in production
- ✅ **Efficiency**: 80% reduction in manual VAT rate updates
- ✅ **Agility**: VAT rule changes deployed in <24 hours
- ✅ **Auditability**: Complete VAT calculation audit trail

---

## 📋 **Phase 1: Foundation Testing (Weeks 1-2)**

### **Story 3.1: VAT Rules Engine Foundation**

#### **Unit Testing Requirements**
```python
# Test File: test_vat_product_classification.py
class TestVATProductClassification:
    def test_digital_product_identification(self):
        """Digital products correctly identified by product code patterns"""
        test_cases = [
            ("/CC/", True),      # eBook
            ("/CN/", True),      # Digital course materials
            ("/CFC/", True),     # Digital flashcards
            ("/PC/", False),     # Printed materials
            ("/PFC/", False),    # Physical flashcards
        ]
        for code, expected_digital in test_cases:
            product = Product(code=f"CM{code}001")
            assert product.is_digital == expected_digital

    def test_vat_category_assignment(self):
        """Products assigned correct VAT categories"""
        product_ebook = Product(code="CM/CC/001")
        assert product_ebook.vat_category == "digital_ebook"

        product_tutorial = Product(name="LIVE ONLINE TUTORIAL")
        assert product_tutorial.vat_category == "live_tutorial"

    def test_product_classification_performance(self):
        """Product classification completes within performance requirements"""
        products = [Product(code=f"CM/CC/{i:03d}") for i in range(100)]

        start_time = time.time()
        for product in products:
            VATProductClassifier.classify(product)
        duration = time.time() - start_time

        assert duration < 0.1  # 100 products in under 100ms
```

#### **Integration Testing Requirements**
```python
# Test File: test_vat_entry_points.py
class TestVATEntryPoints:
    def test_checkout_vat_calculation_entry_point(self):
        """VAT calculation entry point executes correctly"""
        context = {
            "user": {"region": "UK", "country_code": "GB"},
            "cart": {"items": [{"product_code": "CM/CC/001", "net_amount": 59.99}]}
        }

        result = rules_engine.execute("checkout_vat_calculation", context)
        assert result["status"] == "success"
        assert "vat_calculations" in result

    def test_cart_item_update_entry_point(self):
        """Cart item updates trigger VAT recalculation"""
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(
            cart=cart,
            product_code="CM/CC/001",
            quantity=1
        )

        # Trigger cart update
        result = rules_engine.execute("cart_item_update", {
            "cart_id": cart.id,
            "updated_item_id": cart_item.id
        })

        assert result["vat_recalculated"] == True
```

#### **Acceptance Criteria Validation**
- [ ] **AC1**: VAT calculation rules execute at `checkout_vat_calculation` entry point
  - Test: `test_checkout_vat_calculation_entry_point`
  - Validation: Entry point responds with VAT calculation results
- [ ] **AC2**: Product classification system identifies digital vs physical products
  - Test: `test_digital_product_identification`
  - Validation: 100% accuracy on test product codes
- [ ] **AC3**: Regional VAT zones configured correctly
  - Test: `test_regional_zone_mapping`
  - Validation: All countries map to correct VAT zones
- [ ] **AC4**: Performance impact under 50ms for VAT calculation per cart
  - Test: `test_vat_calculation_performance`
  - Validation: Performance benchmarks met

---

## 📋 **Phase 2: Core VAT Logic Testing (Weeks 3-5)**

### **Story 3.2: Regional VAT Rules Implementation**

#### **Critical Test Scenarios**
```python
# Test File: test_regional_vat_rules.py
class TestRegionalVATRules:
    def test_row_customer_digital_product_zero_vat(self):
        """ROW customers get zero VAT on digital products"""
        user = self.create_user(country="US")  # ROW
        cart = self.create_cart_with_digital_products(user)

        result = VATCalculator.calculate(user, cart)

        assert result.total_vat == 0
        assert all(item.vat_amount == 0 for item in result.items if item.is_digital)

    def test_uk_customer_digital_product_standard_vat(self):
        """UK customers get standard VAT on digital products (pre-2020 rule)"""
        user = self.create_user(country="GB")
        cart = self.create_cart_with_digital_products(user)

        with freeze_time("2020-04-30"):  # Before UK eBook rule
            result = VATCalculator.calculate(user, cart)
            assert result.total_vat > 0

    def test_sa_customer_special_product_vat_retention(self):
        """SA customers maintain VAT on SA-specific products"""
        user = self.create_user(country="ZA")  # South Africa
        cart = self.create_cart_with_sa_products(user)

        result = VATCalculator.calculate(user, cart)

        # SA-specific products should maintain VAT
        sa_items = [item for item in result.items if item.product_code in SA_VAT_PRODUCTS]
        assert all(item.vat_amount > 0 for item in sa_items)

    def test_live_tutorial_always_has_vat(self):
        """Live Online Tutorials have VAT regardless of customer region"""
        test_countries = ["US", "AU", "JP", "BR"]  # Various ROW countries

        for country in test_countries:
            user = self.create_user(country=country)
            cart = self.create_cart_with_live_tutorial(user)

            result = VATCalculator.calculate(user, cart)
            tutorial_items = [item for item in result.items if "LIVE ONLINE TUTORIAL" in item.name]
            assert all(item.vat_amount > 0 for item in tutorial_items)

    def test_switzerland_guernsey_row_treatment(self):
        """Switzerland and Guernsey customers treated as ROW"""
        for country in ["CH", "GG"]:
            user = self.create_user(country=country)
            cart = self.create_cart_with_digital_products(user)

            result = VATCalculator.calculate(user, cart)
            assert result.total_vat == 0  # Should be treated as ROW
```

#### **Edge Case Testing**
```python
# Test File: test_vat_edge_cases.py
class TestVATEdgeCases:
    def test_mixed_cart_digital_physical_products(self):
        """Mixed carts apply VAT correctly to each product type"""
        user = self.create_user(country="US")  # ROW
        cart = Cart.objects.create(user=user)

        # Add digital product (should be zero VAT)
        CartItem.objects.create(cart=cart, product_code="CM/CC/001", quantity=1)
        # Add physical product (should have VAT based on region)
        CartItem.objects.create(cart=cart, product_code="CM/PC/001", quantity=1)

        result = VATCalculator.calculate(user, cart)

        digital_items = [item for item in result.items if item.is_digital]
        physical_items = [item for item in result.items if not item.is_digital]

        assert all(item.vat_amount == 0 for item in digital_items)
        # Physical items may have VAT depending on shipping/regional rules

    def test_multiple_sa_products_in_cart(self):
        """Multiple SA-specific products maintain individual VAT calculations"""
        user = self.create_user(country="ZA")
        cart = self.create_cart_with_multiple_sa_products(user)

        result = VATCalculator.calculate(user, cart)

        # Verify each SA product maintains its VAT
        for item in result.items:
            if item.product_code in SA_VAT_PRODUCTS:
                assert item.vat_amount > 0
                assert item.vat_rate == SA_VAT_RATE
```

#### **Performance Testing**
```python
# Test File: test_vat_performance.py
class TestVATPerformance:
    def test_large_cart_vat_calculation_performance(self):
        """Large carts complete VAT calculation within time limits"""
        user = self.create_user(country="GB")
        large_cart = self.create_cart_with_items(user, item_count=50)

        start_time = time.time()
        result = VATCalculator.calculate(user, large_cart)
        duration = (time.time() - start_time) * 1000  # Convert to ms

        assert duration < 50  # Must complete in under 50ms
        assert result.total_vat >= 0  # Valid calculation result

    def test_concurrent_vat_calculations(self):
        """Concurrent VAT calculations maintain performance"""
        users = [self.create_user(country=country) for country in ["GB", "US", "DE", "AU"]]
        carts = [self.create_cart_with_items(user, 10) for user in users]

        start_time = time.time()

        # Simulate concurrent calculations
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(VATCalculator.calculate, user, cart)
                      for user, cart in zip(users, carts)]
            results = [future.result() for future in futures]

        duration = (time.time() - start_time) * 1000

        assert duration < 200  # All calculations in under 200ms
        assert all(result.status == "success" for result in results)
```

---

## 📋 **Phase 3: Advanced Scenarios Testing (Weeks 6-7)**

### **Story 3.4: Pricing Scenario VAT Calculations**

#### **Comprehensive Pricing Tests**
```python
# Test File: test_pricing_scenario_vat.py
class TestPricingScenarioVAT:
    def test_additional_items_vat_calculation(self):
        """Additional items apply regional VAT rules correctly"""
        user = self.create_user(country="US")  # ROW
        cart = Cart.objects.create(user=user)

        # Create additional item
        product = Product.objects.create(
            code="CM/CC/001",
            additional="Y",
            additnet=49.99,
            additvat=0.00  # Should remain 0 for ROW
        )
        CartItem.objects.create(cart=cart, product=product, quantity=1)

        result = VATCalculator.calculate(user, cart)

        assert result.items[0].net_amount == 49.99
        assert result.items[0].vat_amount == 0  # ROW + digital = zero VAT

    def test_retaker_pricing_with_sa_vat(self):
        """Retaker pricing applies SA VAT correctly"""
        user = self.create_user(country="ZA")  # South Africa
        cart = Cart.objects.create(user=user)

        product = Product.objects.create(
            code="CM/CC/001",  # SA VAT-applicable product
            retaker="Y",
            retakernet=39.99,
            retakervat=6.00
        )
        CartItem.objects.create(cart=cart, product=product, quantity=1)

        result = VATCalculator.calculate(user, cart)

        assert result.items[0].net_amount == 39.99
        assert result.items[0].vat_amount == 6.00  # SA VAT maintained

    def test_reduced_price_with_vat_scaler(self):
        """Reduced pricing with VAT scaler applies correctly"""
        user = self.create_user(country="GB", reduced_price_eligible=True)
        cart = Cart.objects.create(user=user)

        product = Product.objects.create(
            code="CM/CC/001",
            reducenet=29.99,
            reducevat=6.00
        )
        CartItem.objects.create(cart=cart, product=product, quantity=1)

        # Enable VAT scaler
        with override_settings(VAT_ADJUST_ENABLED=True, VAT_SCALER=1.2):
            result = VATCalculator.calculate(user, cart)

            expected_vat = 6.00 * 1.2  # VAT scaler applied
            assert abs(result.items[0].vat_amount - expected_vat) < 0.01

    def test_pricing_hierarchy_precedence(self):
        """Pricing hierarchy applies in correct order"""
        user = self.create_user(country="GB", reduced_price_eligible=True)
        cart = Cart.objects.create(user=user)

        # Product with multiple pricing options
        product = Product.objects.create(
            code="CM/CC/001",
            additional="Y",        # Should take precedence
            retaker="Y",
            net=59.99, vat=12.00,
            additnet=49.99, additvat=10.00,
            retakernet=39.99, retakervat=8.00,
            reducenet=29.99, reducevat=6.00
        )
        CartItem.objects.create(cart=cart, product=product, quantity=1)

        result = VATCalculator.calculate(user, cart)

        # Additional pricing should take precedence
        assert result.items[0].net_amount == 49.99
        assert result.items[0].vat_amount == 10.00
```

---

## 📋 **Phase 4: Administration & Compliance Testing (Weeks 8-9)**

### **Story 3.5: VAT Administration and Configuration**

#### **Admin Interface Testing**
```python
# Test File: test_vat_admin_interface.py
class TestVATAdminInterface:
    def test_vat_rule_creation(self):
        """Admin can create VAT rules through interface"""
        admin_user = User.objects.create_superuser("admin", "admin@test.com", "password")
        self.client.force_login(admin_user)

        rule_data = {
            "name": "Test UK eBook Rule",
            "entry_point": "checkout_vat_calculation",
            "priority": 100,
            "condition": {
                "and": [
                    {"==": [{"var": "user.region"}, "UK"]},
                    {"==": [{"var": "product.is_ebook"}, True]}
                ]
            },
            "actions": [{
                "type": "update",
                "target": "cart.items[].vat_amount",
                "operation": "set",
                "value": 0
            }]
        }

        response = self.client.post("/admin/rules_engine/actedrule/add/", rule_data)
        assert response.status_code == 302  # Redirect after successful creation

        # Verify rule was created
        rule = ActedRule.objects.filter(name="Test UK eBook Rule").first()
        assert rule is not None
        assert rule.entry_point == "checkout_vat_calculation"

    def test_vat_rate_management(self):
        """Admin can manage VAT rates by region"""
        admin_user = User.objects.create_superuser("admin", "admin@test.com", "password")
        self.client.force_login(admin_user)

        rate_data = {
            "region": "UK",
            "rate": 20.0,
            "effective_date": "2025-01-01"
        }

        response = self.client.post("/admin/vat/rates/", rate_data)
        assert response.status_code == 201

        # Verify rate configuration
        rate = VATRate.objects.filter(region="UK").first()
        assert rate.rate == 20.0

    def test_vat_rule_dry_run(self):
        """Admin can test VAT rules with sample data"""
        admin_user = User.objects.create_superuser("admin", "admin@test.com", "password")
        self.client.force_login(admin_user)

        test_data = {
            "rule_id": "test_rule",
            "sample_context": {
                "user": {"region": "UK"},
                "cart": {"items": [{"product_code": "CM/CC/001", "net_amount": 59.99}]}
            }
        }

        response = self.client.post("/admin/vat/test-rule/", test_data)
        assert response.status_code == 200

        result = response.json()
        assert "calculated_vat" in result
        assert result["status"] == "success"
```

### **Story 3.6: VAT Reporting and Compliance**

#### **Audit Trail Testing**
```python
# Test File: test_vat_audit_compliance.py
class TestVATAuditCompliance:
    def test_vat_calculation_audit_trail(self):
        """All VAT calculations create complete audit trail"""
        user = self.create_user(country="GB")
        cart = self.create_cart_with_items(user, 3)

        # Clear existing logs
        VATCalculationLog.objects.all().delete()

        result = VATCalculator.calculate(user, cart)

        # Verify audit log created
        audit_logs = VATCalculationLog.objects.filter(cart_id=cart.id)
        assert audit_logs.count() > 0

        log = audit_logs.first()
        assert log.calculation_input is not None
        assert log.calculation_output is not None
        assert log.rule_id is not None
        assert log.created_at is not None

    def test_vat_exemption_reason_tracking(self):
        """VAT exemptions include clear reason tracking"""
        user = self.create_user(country="US")  # ROW
        cart = self.create_cart_with_digital_products(user)

        result = VATCalculator.calculate(user, cart)

        # Verify exemption reasons recorded
        for item in result.items:
            if item.vat_amount == 0:
                assert item.vat_exemption_reason is not None
                assert "ROW customer" in item.vat_exemption_reason or "digital product" in item.vat_exemption_reason

    def test_vat_summary_reporting(self):
        """VAT summary reports provide required data"""
        # Create test orders with various VAT scenarios
        orders = [
            self.create_order_with_vat(region="UK", vat_amount=100.00),
            self.create_order_with_vat(region="US", vat_amount=0.00),
            self.create_order_with_vat(region="SA", vat_amount=50.00),
        ]

        report_data = VATReportGenerator.generate_summary(
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )

        assert "total_vat_collected" in report_data
        assert "vat_by_region" in report_data
        assert "zero_vat_orders" in report_data
        assert report_data["total_vat_collected"] == 150.00
```

---

## 🎯 **Critical Test Scenarios Summary**

### **Must-Pass Scenarios (100% Required)**
1. **UK customer + eBook (post-May 2020)** → Zero VAT
2. **ROW customer + Digital product** → Zero VAT
3. **SA customer + SA-specific product** → SA VAT rate
4. **Any customer + Live Online Tutorial** → Standard VAT
5. **UK customer + Physical product** → Standard VAT
6. **Bundle discount + Zero VAT parent** → Zero VAT discount

### **Performance Requirements**
- VAT calculation: <50ms per cart
- Concurrent users: Support 100+ simultaneous calculations
- Large carts: <50ms for 50+ items
- Admin interface: <2s page load times

### **Data Integrity Requirements**
- 100% audit trail coverage
- VAT exemption reason tracking
- Rule execution logging
- Calculation accuracy validation

---

## 📊 **Automated Testing Pipeline**

### **Pre-commit Testing**
```bash
# Run before every commit
python manage.py test apps.vat --fast
python manage.py test apps.rules_engine.tests.test_vat_integration
pytest tests/performance/test_vat_performance.py::test_basic_performance
```

### **CI/CD Pipeline Testing**
```bash
# Full test suite on every pull request
python manage.py test --coverage --settings=settings.test
pytest tests/integration/test_vat_scenarios.py
pytest tests/performance/ --benchmark-only
python manage.py test_vat_legacy_compatibility
```

### **Production Validation Testing**
```bash
# Shadow mode validation in production
python manage.py run_vat_shadow_mode --duration=24h
python manage.py validate_vat_accuracy --sample-size=1000
python manage.py monitor_vat_performance --alert-threshold=50ms
```

---

## ✅ **Go-Live Acceptance Gates**

### **Technical Gates**
- [ ] All unit tests passing (>95% coverage)
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] Shadow mode validation: 100% accuracy
- [ ] Load testing completed successfully

### **Business Gates**
- [ ] Finance team VAT rule creation training completed
- [ ] VAT compliance review passed
- [ ] Customer communication prepared
- [ ] Support team training completed
- [ ] Rollback procedures tested

### **Monitoring Gates**
- [ ] VAT calculation monitoring active
- [ ] Error alerting configured
- [ ] Performance monitoring operational
- [ ] Audit trail verification enabled

---

**Document Control**
- **Owner**: QA Lead, Technical Lead
- **Review Frequency**: Weekly during implementation
- **Test Execution**: Continuous via CI/CD
- **Last Updated**: 2025-09-23