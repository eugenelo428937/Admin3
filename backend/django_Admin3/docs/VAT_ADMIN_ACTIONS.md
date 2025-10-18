# VAT Admin Actions

**Phase 7: Django Admin Interface - Actions Reference**
**Last Updated:** 2025-10-17

This document provides detailed reference for all admin actions available in the VAT management system.

---

## Table of Contents

1. [UtilsCountrys Admin Actions](#utilscountrys-admin-actions)
2. [UtilsRegion Admin Actions](#utilsregion-admin-actions)
3. [UtilsCountryRegion Admin Actions](#utilscountryregion-admin-actions)
4. [VATAudit Admin Actions](#vataudit-admin-actions)
5. [Testing VAT Rules](#testing-vat-rules)

---

## UtilsCountrys Admin Actions

**Admin URL:** `/admin/utils/utilscountrys/`

### Overview

Manage VAT rates for all countries in the system. Changes take effect immediately for new VAT calculations.

### List View Features

#### Inline Editing

Edit VAT rates directly from the list view without opening individual records:

**Editable Fields:**
- **VAT Percent**: Enter decimal value (e.g., 20.00 for 20%)
- **Active**: Toggle checkbox to enable/disable country

**Steps:**
1. Click in the **VAT Percent** or **Active** field
2. Make your changes
3. Scroll to bottom and click **Save** button
4. Changes are applied to all edited rows

**Benefits:**
- Quick bulk updates
- Visual confirmation of changes
- No need to open individual country forms

**Example Use Case:**
Updating VAT rates for multiple EU countries after a policy change:
1. Filter countries by searching "France"
2. Update VAT Percent to 20.00
3. Repeat for other countries
4. Click Save once to apply all changes

---

#### Search Functionality

**Search Fields:**
- Country Code (e.g., "GB", "US", "FR")
- Country Name (e.g., "United Kingdom", "France")

**Search Examples:**
- Search "GB" → Finds "United Kingdom"
- Search "United" → Finds "United Kingdom", "United States"
- Search "20" → Finds countries with VAT rate containing "20"

---

#### Filtering

**Available Filters:**
- **Active**: Show only active or inactive countries

**Filter Usage:**
1. Use right sidebar filters
2. Click **Active** or **Inactive**
3. List updates automatically

---

#### Ordering

**Default Ordering:** Countries sorted alphabetically by **Name**

**Custom Ordering:**
Click column headers to sort:
- **Code**: Sort by country code
- **Name**: Sort by country name
- **VAT Percent**: Sort by VAT rate (ascending/descending)

---

### Detail Form

**Access:** Click on country name in list view

#### Sections

**1. Country Information**
- **Code**: 2-letter country code (read-only for existing records)
- **Name**: Full country name

**2. VAT Configuration**
- **VAT Percent**: Decimal value (0.00 to 100.00)
  - Examples: 20.00 (20%), 15.00 (15%), 0.00 (no VAT)
- **Active**: Enable/disable country for VAT calculations

**Description:**
> VAT percentage (e.g., 20.00 for 20%). Changes take effect immediately for new calculations.

**3. Metadata** (Collapsed by default)
- **Created At**: When country record was created
- **Updated At**: When country record was last modified

---

### Change Logging

**Automatic Logging:** All VAT rate changes are logged to console/log file

**Log Format:**
```
VAT rate changed for {code} ({name}): {old_rate}% → {new_rate}% by {username}
```

**Example Log Entries:**
```
[2025-10-17 10:30:15] INFO vat.admin: VAT rate changed for GB (United Kingdom): 20.00% → 15.00% by admin_user
[2025-10-17 10:31:42] INFO vat.admin: VAT rate changed for FR (France): 19.60% → 20.00% by john.doe
```

**Log Location:** `logs/vat_admin.log` (configure in Django logging settings)

**Use Cases:**
- Compliance auditing
- Change tracking
- Rollback reference

---

## UtilsRegion Admin Actions

**Admin URL:** `/admin/utils/utilsregion/`

### Overview

Manage VAT regions (UK, IE, EU, SA, ROW). Regions group countries with similar VAT treatment.

### List View Features

#### Display Columns

| Column | Description | Example |
|--------|-------------|---------|
| Code | Region identifier | UK, EU, ROW |
| Name | Full region name | United Kingdom |
| Description | Region purpose | United Kingdom VAT region |
| Active | Enable/disable status | ✓ or ✗ |

---

#### Inline Editing

**Editable Field:**
- **Active**: Toggle to enable/disable region

**Note:** Code, Name, and Description are edited via detail form to prevent accidental changes.

---

#### Search & Filters

**Search Fields:**
- Region Code
- Region Name

**Filters:**
- Active status

**Ordering:**
Default ordering by **Code** (alphabetical: EU, IE, ROW, SA, UK)

---

### Detail Form

#### Sections

**1. Region Information**
- **Code**: Region identifier (max 10 characters)
- **Name**: Full region name
- **Description**: Purpose and scope of region

**2. Status**
- **Active**: Enable/disable region

**3. Metadata** (Collapsed)
- Created/Updated timestamps

---

### Region Purpose Reference

| Region | Purpose | Countries | VAT Treatment |
|--------|---------|-----------|---------------|
| UK | United Kingdom | GB | 20% standard VAT |
| IE | Ireland | IE | 23% standard VAT |
| EU | European Union | EU member states | 0% B2B reverse charge |
| SA | South Africa | ZA | 15% standard VAT |
| ROW | Rest of World | All others | 0% export |

---

## UtilsCountryRegion Admin Actions

**Admin URL:** `/admin/utils/utilscountryregion/`

### Overview

Manage country-to-region mappings with effective date tracking. Supports historical changes and future-dated transitions.

### List View Features

#### Display Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| Country | Country code and name | Yes |
| Region | Region code and name | Yes |
| Effective From | Start date of mapping | Yes |
| Effective To | End date (blank = ongoing) | Yes |
| Current? | ✓ if active today | No (computed) |

---

#### Current Status Indicator

The **Current?** column shows:
- ✅ **Green Checkmark**: Mapping is active today
  - `effective_from <= today`
  - `effective_to` is blank OR `effective_to >= today`
- ❌ **Red X**: Mapping is not active
  - Future mapping: `effective_from > today`
  - Expired mapping: `effective_to < today`

**Examples:**
```
GB → UK (from 2021-01-01) [effective_to: blank] → ✅ Current
GB → EU (from 2000-01-01) [effective_to: 2020-12-31] → ❌ Expired
FR → EU (from 2030-01-01) [effective_to: blank] → ❌ Future
```

---

#### Date Hierarchy Navigation

**Feature:** Navigate mappings by date using drill-down interface

**Levels:**
1. **Year** → 2020, 2021, 2022, etc.
2. **Month** → January, February, March, etc.
3. **Day** → 1, 2, 3, etc.

**Usage:**
1. Click year to see all mappings that year
2. Click month to narrow down to specific month
3. Click day for mappings on exact date
4. Click "All" breadcrumb to reset

**Use Case:**
Finding what VAT region GB was in on Brexit day (2021-01-01):
1. Click "2021" in date hierarchy
2. Click "January"
3. Click "1"
4. See GB → UK mapping with effective_from = 2021-01-01

---

#### Filtering

**Available Filters:**
- **Region**: Filter by specific region (UK, IE, EU, SA, ROW)
- **Effective From**: Filter by year/month

**Example Workflows:**

**Find all UK region mappings:**
1. Click **UK** in Region filter
2. View all countries mapped to UK

**Find mappings created in 2021:**
1. Use Effective From filter
2. Select year: 2021

---

### Detail Form

#### Sections

**1. Mapping**
- **Country**: Select from dropdown
- **Region**: Select from dropdown

**2. Effective Dates**
- **Effective From**: Date when mapping becomes active (required)
- **Effective To**: Date when mapping expires (optional)
  - Leave blank for ongoing mappings
  - Set date to end mapping

**Description:**
> Set effective date range for this mapping. Leave effective_to blank for ongoing mappings.

**3. Metadata** (Collapsed)
- Created/Updated timestamps

---

### Overlapping Date Validation

**Automatic Check:** System validates for overlapping date ranges when saving

**Warning Displayed:**
```
Warning: Overlapping date range detected for GB. Please verify effective dates.
```

**What It Means:**
Multiple mappings exist for the same country with overlapping effective dates.

**Example Overlap:**
```
Mapping 1: GB → EU (2000-01-01 to 2020-12-31)
Mapping 2: GB → UK (2020-06-01 to blank)
                    ^^^^^^^^
                    Overlap: Jun-Dec 2020
```

**Resolution:**
1. Adjust `effective_to` on Mapping 1 to 2020-05-31
2. OR adjust `effective_from` on Mapping 2 to 2021-01-01
3. Ensure no gaps or overlaps

---

### Best Practices

#### Creating Historical Mappings

**Scenario:** Record past VAT region changes

**Steps:**
1. Create old mapping with `effective_to` date
2. Create new mapping with `effective_from` = day after old mapping ends
3. Verify no gaps between mappings

**Example: GB Brexit Transition**
```
Old Mapping:
- Country: GB
- Region: EU
- Effective From: 2000-01-01
- Effective To: 2020-12-31

New Mapping:
- Country: GB
- Region: UK
- Effective From: 2021-01-01
- Effective To: [blank]
```

---

#### Creating Future Mappings

**Scenario:** Schedule future VAT region changes

**Steps:**
1. Create new mapping with future `effective_from` date
2. Keep existing mapping active (don't set `effective_to` yet)
3. System will automatically switch on the effective date

**Example: Scheduled Policy Change**
```
Current Mapping:
- Country: FR
- Region: EU
- Effective From: 2000-01-01
- Effective To: [blank]  ← Leave blank until change date

Future Mapping:
- Country: FR
- Region: NEW_REGION
- Effective From: 2026-01-01  ← Future date
- Effective To: [blank]
```

**On 2025-12-31:**
Update current mapping `effective_to` to 2025-12-31

**On 2026-01-01:**
System automatically uses new mapping

---

## VATAudit Admin Actions

**Admin URL:** `/admin/vat/vataudit/`

### Overview

**Read-only** audit trail of all VAT calculations. No add or delete functionality - records are automatically created.

### List View Features

#### Display Columns

| Column | Description | Type |
|--------|-------------|------|
| ID | Unique audit record ID | Integer |
| Cart | Associated cart (clickable) | ForeignKey |
| Rule ID | VAT calculation rule used | String |
| Created At | Calculation timestamp | DateTime |
| Duration (ms) | Execution time | Integer |
| VAT Total | Calculated VAT amount | Computed (£) |

---

#### Filtering

**Available Filters:**
- **Rule ID**: Filter by specific calculation rule
  - `calculate_vat` (standard calculation)
  - `cart_calculate_vat` (cart-specific)
  - Other custom rules
- **Created At**: Filter by date range
  - Today
  - Past 7 days
  - This month
  - This year
  - Custom date range

---

#### Search

**Search Fields:**
- **Cart ID**: Find calculations for specific cart
- **Rule ID**: Search for specific rule

**Search Examples:**
- Search "123" → Finds cart ID 123
- Search "calculate" → Finds rules containing "calculate"

---

#### Date Hierarchy

Navigate audit records by date:
1. Click year to see all records that year
2. Click month to see records that month
3. Click day to see records on specific date

**Use Case:** Finding VAT calculations for end-of-month reconciliation

---

### Detail View

**Sections:**

#### 1. Audit Information
- **ID**: Unique identifier
- **Cart**: Link to cart (if applicable)
- **Order**: Link to order (if applicable)
- **Rule ID**: Calculation rule used
- **Created At**: Timestamp

#### 2. Input Context (Collapsed)

**Format:** Pretty-printed JSON

**Contains:**
- User information (country, region)
- Cart items with quantities and prices
- Configuration settings
- IP address (for region detection)

**Example:**
```json
{
  "user": {
    "id": 123,
    "country": "GB",
    "region": "UK"
  },
  "cart": {
    "id": 456,
    "items": [
      {
        "product_id": 789,
        "quantity": 2,
        "price": "50.00"
      }
    ]
  }
}
```

---

#### 3. Output Data

**Format:** Pretty-printed JSON with styling

**Contains:**
- VAT calculation results
- Applied rates per item
- Totals breakdown (net, VAT, gross)
- Region information
- Status messages

**Example:**
```json
{
  "status": "calculated",
  "region": "UK",
  "totals": {
    "net": "100.00",
    "vat": "20.00",
    "gross": "120.00"
  },
  "items": [
    {
      "product_id": 789,
      "net_amount": "50.00",
      "vat_amount": "10.00",
      "gross_amount": "60.00",
      "vat_rate": 0.20
    }
  ]
}
```

---

#### 4. Performance

- **Duration (ms)**: Execution time in milliseconds
  - Use for performance monitoring
  - Identify slow calculations
  - Average: < 50ms
  - Alert if > 1000ms

---

### Export Action

**Purpose:** Export audit records to JSON file for accounting/compliance

**Steps:**

1. **Select Records:**
   - Use checkboxes to select specific records
   - OR use "Select all X records" link for bulk export

2. **Choose Action:**
   - From **Action** dropdown at top of list
   - Select **"Export selected audit records as JSON"**

3. **Execute:**
   - Click **Go** button
   - Browser downloads `vat_audit_export.json`

4. **Review Export:**
   - Open JSON file in text editor or JSON viewer
   - Verify data completeness

---

#### Export File Format

**Filename:** `vat_audit_export.json`

**Structure:**
```json
[
  {
    "id": 1,
    "cart_id": 123,
    "order_id": null,
    "rule_id": "calculate_vat",
    "created_at": "2025-10-16T10:00:00Z",
    "input_context": {
      "user": {...},
      "cart": {...}
    },
    "output_data": {
      "status": "calculated",
      "totals": {...}
    },
    "duration_ms": 25
  },
  {
    "id": 2,
    ...
  }
]
```

---

#### Export Best Practices

**1. Filter Before Export**
- Don't export all records at once
- Use date filters to narrow down
- Export by month for accounting periods

**2. Batch Exports**
- Monthly exports for reconciliation
- Quarterly exports for compliance
- Annual exports for auditing

**3. File Management**
- Name files with date range: `vat_audit_2025-10.json`
- Store securely (contains customer data)
- Keep backups for compliance

**4. Performance Tips**
- Limit exports to < 1000 records
- Large exports may timeout
- Use date hierarchy to narrow selection

---

### Read-Only Enforcement

**Add Permission:** ❌ Disabled
- Cannot create new audit records manually
- Records created automatically during VAT calculations

**Delete Permission:** ❌ Disabled
- Cannot delete audit records
- Permanent audit trail for compliance
- Contact database admin for emergency deletions

**Edit Permission:** ❌ Disabled
- Cannot modify audit records
- Data integrity protection
- All fields are read-only in detail view

---

## Testing VAT Rules

### Via Django Shell

**Purpose:** Test VAT calculations interactively

**Steps:**

1. **Open Django Shell:**
   ```bash
   python manage.py shell
   ```

2. **Import Dependencies:**
   ```python
   from cart.services.vat_orchestrator import vat_orchestrator
   from cart.models import Cart
   ```

3. **Get Test Cart:**
   ```python
   cart = Cart.objects.get(id=123)
   ```

4. **Execute VAT Calculation:**
   ```python
   result = vat_orchestrator.execute_vat_calculation(cart)
   print(result)
   ```

5. **Verify Results:**
   ```python
   print(f"Region: {result['region']}")
   print(f"Net: £{result['totals']['net']}")
   print(f"VAT: £{result['totals']['vat']}")
   print(f"Gross: £{result['totals']['gross']}")
   ```

---

### Via API Endpoint

**Purpose:** Test VAT calculations via HTTP API

**Endpoint:** `POST /api/cart/calculate-vat/`

**Request:**
```bash
curl -X POST http://localhost:8888/api/cart/calculate-vat/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"cart_id": 123}'
```

**Response:**
```json
{
  "success": true,
  "region": "UK",
  "totals": {
    "net": "100.00",
    "vat": "20.00",
    "gross": "120.00"
  },
  "items": [...]
}
```

---

### Test Scenarios

#### 1. Test UK VAT Calculation

**Setup:**
- Country: GB
- Region: UK
- Expected VAT: 20%

**Shell Test:**
```python
from userprofile.models import ActedUserProfile
user = ActedUserProfile.objects.get(id=1)
user.country = 'GB'
user.save()

cart = Cart.objects.get(user=user)
result = vat_orchestrator.execute_vat_calculation(cart)
assert result['totals']['vat'] == "20.00"  # For £100 net
```

---

#### 2. Test EU B2B Zero VAT

**Setup:**
- Country: FR (France)
- Region: EU
- Expected VAT: 0% (reverse charge)

**Shell Test:**
```python
user.country = 'FR'
user.save()
result = vat_orchestrator.execute_vat_calculation(cart)
assert result['totals']['vat'] == "0.00"
```

---

#### 3. Test ROW Export

**Setup:**
- Country: US (United States)
- Region: ROW
- Expected VAT: 0% (export)

**Shell Test:**
```python
user.country = 'US'
user.save()
result = vat_orchestrator.execute_vat_calculation(cart)
assert result['totals']['vat'] == "0.00"
```

---

## Additional Resources

- **VAT Admin Guide:** `docs/VAT_ADMIN_GUIDE.md` - User guide for admin interfaces
- **Phase 7 Spec:** `tasks/spec-2025-10-06-121922-phase7-tasks.md` - Technical specification
- **Test Suite:** `utils/tests/test_admin.py`, `vat/tests/test_admin.py` - Admin interface tests

---

*Generated for Admin3 project - VAT Calculation System Phase 7*
*Last Updated: 2025-10-17*
