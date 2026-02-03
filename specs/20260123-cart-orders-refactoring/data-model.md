# Data Model: Cart and Orders Domain Separation

**Created**: 2026-01-23
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ CART APP (Ephemeral Shopping State)                              │
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌───────────┐           │
│  │   Cart   │────<│  CartItem    │     │  CartFee  │           │
│  │          │     │              │     │           │           │
│  │ user ────┤     │ product ─────┤→ store.Product  │           │
│  │ session  │     │ marking_vch ─┤→ MarkingVoucher │           │
│  │ vat_rslt │     │ vat_* fields │     │ fee_type  │           │
│  └──────────┘     └──────────────┘     └───────────┘           │
│        │                                                         │
│        │ checkout (one-way, read-only)                           │
│        ↓                                                         │
├─────────────────────────────────────────────────────────────────┤
│ ORDERS APP (Persistent Business Records)                         │
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌───────────┐           │
│  │  Order   │────<│  OrderItem   │     │  Payment  │           │
│  │          │     │              │     │           │           │
│  │ user     │     │ product      │     │ opayo_*   │           │
│  │ totals   │     │ vat_* fields │     │ status    │           │
│  │ calc_appl│     └──────────────┘     └───────────┘           │
│  └──────────┘                                                    │
│        │                                                         │
│        ├──< OrderAcknowledgment (T&Cs, product-specific)        │
│        ├──< OrderPreference (marketing, communication)          │
│        ├──< OrderContact (phones, email)                        │
│        └──< OrderDelivery (delivery/invoice addresses)          │
└─────────────────────────────────────────────────────────────────┘
```

**Cross-App Dependency**: Orders → Cart (read-only during checkout). Cart never imports from Orders.

---

## Cart App Entities

### Cart

**Table**: `acted_carts`
**New Model Name**: `Cart` (unchanged)
**Purpose**: Ephemeral shopping session — one per authenticated user or guest session.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `user` | FK → User | nullable, unique (non-null) | Authenticated user owning this cart |
| `session_key` | CharField(40) | nullable, unique | Guest session identifier |
| `has_marking` | BooleanField | default=False | Cart contains marking products |
| `has_digital` | BooleanField | default=False | Cart contains digital products |
| `has_tutorial` | BooleanField | default=False | Cart contains tutorial products |
| `has_material` | BooleanField | default=False | Cart contains material products |
| `vat_result` | JSONField | nullable | Complete VAT calculation from rules engine |
| `vat_calculation_error` | BooleanField | default=False | VAT calculation failed flag |
| `vat_calculation_error_message` | TextField | nullable | Error message if VAT failed |
| `vat_last_calculated_at` | DateTimeField | nullable | Last VAT calculation timestamp |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Last modification timestamp |

**Constraints**:
- `unique_cart_per_user`: Only one cart per authenticated user (NULL users exempt)

**Indexes**:
- `idx_cart_vat_result`: GIN index on `vat_result` JSONB field

**Validation Rules**:
- A cart must have either `user` or `session_key` set (not both empty)
- Type flags are denormalized — updated by CartService on item changes

---

### CartItem

**Table**: `acted_cart_items`
**New Model Name**: `CartItem` (unchanged)
**Purpose**: A product, marking voucher, or fee in the shopping cart.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `cart` | FK → Cart | CASCADE, related='items' | Parent cart |
| `product` | FK → store.Product | nullable, CASCADE | Product reference |
| `marking_voucher` | FK → MarkingVoucher | nullable, CASCADE | Marking voucher reference |
| `item_type` | CharField(20) | choices: product/marking_voucher/fee | Item classification |
| `quantity` | PositiveIntegerField | default=1 | Item quantity |
| `price_type` | CharField(20) | default='standard' | Pricing tier (standard/retaker/additional) |
| `actual_price` | DecimalField(10,2) | nullable | Resolved price for this item |
| `has_expired_deadline` | BooleanField | default=False | Marking product deadline flag |
| `expired_deadlines_count` | IntegerField | default=0 | Number of expired deadlines |
| `marking_paper_count` | IntegerField | default=0 | Total marking papers |
| `is_marking` | BooleanField | default=False | Marking product flag |
| `metadata` | JSONField | default=dict | Tutorial choices, variation IDs, bundle info |
| `added_at` | DateTimeField | auto_now_add | When item was added |
| `vat_region` | CharField(10) | nullable | VAT region (UK/IE/EU/SA/ROW) |
| `vat_rate` | DecimalField(5,4) | nullable, 0.0000–1.0000 | VAT rate applied |
| `vat_amount` | DecimalField(10,2) | nullable, ≥0 | Calculated VAT amount |
| `gross_amount` | DecimalField(10,2) | nullable, ≥0 | Net + VAT total |
| `vat_calculated_at` | DateTimeField | nullable | Last VAT calculation timestamp |
| `vat_rule_version` | IntegerField | nullable | Rule version that calculated VAT |

**Constraints**:
- `cart_item_has_product_or_voucher_or_is_fee`: Must have product OR voucher OR be fee type
- `cart_item_not_both_product_and_voucher`: Cannot have both product and voucher
- `cart_item_vat_rate_range`: VAT rate between 0.0000 and 1.0000 (or NULL)
- `cart_item_vat_amount_non_negative`: VAT amount ≥ 0 (or NULL)
- `cart_item_gross_amount_non_negative`: Gross amount ≥ 0 (or NULL)

**Indexes**:
- `idx_cartitem_vat_region`: For filtering by VAT region
- `idx_cartitem_vat_calc_at`: For finding stale calculations
- `idx_cartitem_cart_vat_region`: Composite for cart+region queries

**Metadata JSONField Structure**:
```json
{
  "variationType": "Printed|eBook|Online|Tutorial|...",
  "variationId": 123,
  "variationName": "Printed Study Material",
  "is_digital": true,
  "is_marking": false,
  "is_material": true,
  "is_tutorial": false,
  "addedViaBundle": { "bundleName": "Bundle Name" },
  "choices": [{ "location": "London", "dates": ["2026-04-01"] }],
  "locations": [{ "location": "London", "choices": [...] }]
}
```

---

### CartFee

**Table**: `acted_cart_fees`
**New Model Name**: `CartFee` (unchanged)
**Purpose**: Service fees applied to a cart (e.g., tutorial booking fees).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `cart` | FK → Cart | CASCADE, related='fees' | Parent cart |
| `fee_type` | CharField(50) | choices: tutorial_booking_fee/service_charge/processing_fee/convenience_fee | Fee classification |
| `name` | CharField(100) | required | Display name |
| `description` | TextField | blank | Fee description |
| `amount` | DecimalField(10,2) | required | Fee amount |
| `currency` | CharField(3) | default='GBP' | Currency code |
| `is_refundable` | BooleanField | default=False | Whether fee is refundable |
| `applied_at` | DateTimeField | auto_now_add | When fee was applied |
| `applied_by_rule` | IntegerField | nullable | Rule ID that applied this fee |
| `metadata` | JSONField | default=dict | Additional fee data |

**Constraints**:
- `unique_together`: (cart, fee_type) — one fee of each type per cart

---

## Orders App Entities

### Order

**Table**: `acted_orders`
**Current Model Name**: `ActedOrder` → **New**: `Order`
**Purpose**: Persistent business record created from a cart at checkout.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Order ID |
| `user` | FK → User | CASCADE | Customer who placed the order |
| `subtotal` | DecimalField(10,2) | default=0.00 | Total before VAT and fees |
| `vat_amount` | DecimalField(10,2) | default=0.00 | Total VAT amount |
| `total_amount` | DecimalField(10,2) | default=0.00 | Final total including VAT |
| `vat_rate` | DecimalField(5,4) | nullable | Primary VAT rate applied |
| `vat_country` | CharField(2) | nullable | Country code for VAT |
| `vat_calculation_type` | CharField(50) | nullable | Calculation type used |
| `calculations_applied` | JSONField | default=dict | All rule engine calculations |
| `created_at` | DateTimeField | auto_now_add | Order creation timestamp |
| `updated_at` | DateTimeField | auto_now | Last modification timestamp |

**Ordering**: `-created_at` (newest first)

---

### OrderItem

**Table**: `acted_order_items`
**Current Model Name**: `ActedOrderItem` → **New**: `OrderItem`
**Purpose**: Line item within an order, preserving product and VAT data from cart.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `order` | FK → Order | CASCADE, related='items' | Parent order |
| `product` | FK → store.Product | nullable, CASCADE | Product reference |
| `marking_voucher` | FK → MarkingVoucher | nullable, CASCADE | Marking voucher reference |
| `item_type` | CharField(20) | choices: product/marking_voucher/fee | Item classification |
| `quantity` | PositiveIntegerField | default=1 | Item quantity |
| `price_type` | CharField(20) | default='standard' | Pricing tier |
| `actual_price` | DecimalField(10,2) | nullable | Unit price |
| `net_amount` | DecimalField(10,2) | default=0.00 | Amount before VAT |
| `vat_amount` | DecimalField(10,2) | default=0.00 | VAT for this item |
| `gross_amount` | DecimalField(10,2) | default=0.00 | Total including VAT |
| `vat_rate` | DecimalField(5,4) | default=0.0000 | VAT rate applied |
| `is_vat_exempt` | BooleanField | default=False | Whether VAT exempt |
| `metadata` | JSONField | default=dict | Product-specific data |

**Constraints**:
- `order_item_has_product_or_voucher_or_is_fee`: Must have product OR voucher OR be fee type
- `order_item_not_both_product_and_voucher`: Cannot have both product and voucher

---

### Payment

**Table**: `acted_order_payments`
**Current Model Name**: `ActedOrderPayment` → **New**: `Payment`
**Purpose**: Payment transaction record for an order.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `order` | FK → Order | CASCADE, related='payments' | Parent order |
| `payment_method` | CharField(20) | choices: card/invoice/bank_transfer | Payment type |
| `amount` | DecimalField(10,2) | required | Payment amount |
| `currency` | CharField(3) | default='GBP' | Currency code |
| `transaction_id` | CharField(100) | nullable | Gateway transaction ID |
| `status` | CharField(20) | choices: pending/processing/completed/failed/cancelled/refunded | Transaction status |
| `client_ip` | GenericIPAddressField | nullable | Client IP for audit |
| `user_agent` | TextField | nullable | Browser user agent |
| `opayo_response` | JSONField | default=dict | Full Opayo API response |
| `opayo_status_code` | CharField(10) | nullable | Opayo status code |
| `opayo_status_detail` | CharField(200) | nullable | Opayo status detail |
| `error_message` | TextField | nullable | Error message if failed |
| `error_code` | CharField(50) | nullable | Error code if failed |
| `metadata` | JSONField | default=dict | Additional payment data |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Modification timestamp |
| `processed_at` | DateTimeField | nullable | When payment was processed |

**State Machine**:
```
pending → processing → completed
                    → failed
                    → cancelled
completed → refunded
```

---

### OrderAcknowledgment

**Table**: `acted_order_user_acknowledgments`
**Current Model Name**: `OrderUserAcknowledgment` → **New**: `OrderAcknowledgment`
**Purpose**: Records of T&Cs and product-specific acknowledgments at checkout.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `order` | FK → Order | CASCADE, related='user_acknowledgments' | Parent order |
| `acknowledgment_type` | CharField(50) | choices (see below) | Type classification |
| `rule_id` | PositiveIntegerField | nullable | Triggering rule ID |
| `template_id` | PositiveIntegerField | nullable | Message template ID |
| `title` | CharField(255) | required | Acknowledgment title |
| `content_summary` | TextField | required | What was acknowledged |
| `is_accepted` | BooleanField | default=False | Whether accepted |
| `accepted_at` | DateTimeField | auto_now_add | Acceptance timestamp |
| `ip_address` | GenericIPAddressField | nullable | Audit: IP address |
| `user_agent` | TextField | blank | Audit: browser info |
| `content_version` | CharField(20) | default='1.0' | Content version |
| `acknowledgment_data` | JSONField | default=dict | Product IDs, conditions |
| `rules_engine_context` | JSONField | default=dict | Rules engine context |

**Acknowledgment Types**: `terms_conditions`, `product_specific`, `deadline_expired`, `policy_change`, `warning`, `digital_consent`, `custom`

**Indexes**:
- (order, acknowledgment_type)
- (rule_id)
- (acknowledgment_type)

---

### OrderPreference

**Table**: `acted_order_user_preferences`
**Current Model Name**: `OrderUserPreference` → **New**: `OrderPreference`
**Purpose**: User preferences collected during checkout (marketing, communication).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `order` | FK → Order | CASCADE, related='user_preferences' | Parent order |
| `rule` | FK → ActedRule | nullable, CASCADE | Triggering rule |
| `template` | FK → MessageTemplate | nullable, CASCADE | Message template |
| `preference_type` | CharField(50) | choices: marketing/communication/delivery/notification/custom | Type |
| `preference_key` | CharField(100) | required | Unique preference identifier |
| `preference_value` | JSONField | default=dict | User's preference value(s) |
| `input_type` | CharField(20) | choices: radio/checkbox/text/textarea/select/custom | Input UI type |
| `display_mode` | CharField(20) | choices: inline/modal | Display method |
| `title` | CharField(255) | required | Display title |
| `content_summary` | TextField | blank | Content summary |
| `is_submitted` | BooleanField | default=True | Whether submitted |
| `submitted_at` | DateTimeField | auto_now_add | Submission timestamp |
| `updated_at` | DateTimeField | auto_now | Modification timestamp |
| `ip_address` | GenericIPAddressField | nullable | Audit: IP |
| `user_agent` | TextField | blank | Audit: browser |
| `rules_engine_context` | JSONField | default=dict | Rules context |

**Constraints**:
- `unique_together`: (order, rule, preference_key)

**Indexes**:
- (order, preference_type)
- (preference_key)
- (submitted_at)

---

### OrderContact

**Table**: `acted_order_user_contact`
**Current Model Name**: `OrderUserContact` → **New**: `OrderContact`
**Purpose**: Contact details captured at order time.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `order` | FK → Order | CASCADE, related='user_contact' | Parent order |
| `home_phone` | CharField(20) | nullable | Home phone number |
| `home_phone_country` | CharField(2) | default='' | Home phone country code |
| `mobile_phone` | CharField(20) | required | Mobile phone number |
| `mobile_phone_country` | CharField(2) | default='' | Mobile country code |
| `work_phone` | CharField(20) | nullable | Work phone number |
| `work_phone_country` | CharField(2) | default='' | Work country code |
| `email_address` | EmailField(254) | required | Contact email |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Modification timestamp |

---

### OrderDelivery

**Table**: `acted_order_delivery_detail`
**Current Model Name**: `OrderDeliveryDetail` → **New**: `OrderDelivery`
**Purpose**: Delivery and invoice address information for an order.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-generated ID |
| `order` | FK → Order | CASCADE, related='delivery_detail' | Parent order |
| `delivery_address_type` | CharField(10) | nullable, choices: home/work | Delivery address type |
| `invoice_address_type` | CharField(10) | nullable, choices: home/work | Invoice address type |
| `delivery_address_data` | JSONField | default=dict | Full delivery address (JSONB) |
| `invoice_address_data` | JSONField | default=dict | Full invoice address (JSONB) |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Modification timestamp |

**Address JSONField Structure**:
```json
{
  "address_line_1": "123 Main Street",
  "address_line_2": "Apt 4B",
  "city": "London",
  "county": "Greater London",
  "postcode": "SW1A 1AA",
  "country": "GB"
}
```

---

## Cross-App References

| From | To | Relationship | Notes |
|------|----|-------------|-------|
| CartItem | store.Product | FK (nullable) | Products for sale |
| CartItem | MarkingVoucher | FK (nullable) | Marking vouchers |
| OrderItem | store.Product | FK (nullable) | Preserved from CartItem |
| OrderItem | MarkingVoucher | FK (nullable) | Preserved from CartItem |
| OrderPreference | ActedRule | FK (nullable) | Rules engine integration |
| OrderPreference | MessageTemplate | FK (nullable) | Template reference |
| Cart, Order | User | FK | Owner |

---

## Migration Strategy

No database migrations needed. All models use `Meta.db_table` pointing to existing tables:

```python
class Order(models.Model):
    class Meta:
        db_table = 'acted_orders'
        managed = False  # During transition only; remove after swap
```

After the swap is complete and old cart app is removed, set `managed = True` and generate an empty migration (`--empty`) to register the model with Django's migration system.
