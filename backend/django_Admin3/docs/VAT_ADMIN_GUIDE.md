# VAT Admin Guide

**Phase 7: Django Admin Interface**
**Last Updated:** 2025-10-17

This guide provides step-by-step instructions for managing VAT rates, regions, and audit trails through the Django Admin interface.

---

## Table of Contents

1. [Accessing the Admin Interface](#accessing-the-admin-interface)
2. [How to Update VAT Rates](#how-to-update-vat-rates)
3. [How to Manage VAT Regions](#how-to-manage-vat-regions)
4. [How to Modify Region Mappings](#how-to-modify-region-mappings)
5. [How to View VAT Audit Trail](#how-to-view-vat-audit-trail)
6. [VAT Regions Overview](#vat-regions-overview)
7. [Troubleshooting](#troubleshooting)

---

## Accessing the Admin Interface

1. Navigate to: `http://localhost:8888/admin/` (development) or your production admin URL
2. Log in with your superuser credentials
3. Look for **Utils** and **VAT** sections in the admin home

---

## How to Update VAT Rates

**Purpose:** Change VAT percentage rates for countries without code deployment.

**Steps:**

1. Navigate to Django Admin: `/admin/`
2. Go to: **Utils → VAT Countries**
3. Find the country you want to update (e.g., "United Kingdom")
4. **Option A - Inline Editing:**
   - Directly edit the **VAT Percent** field in the list view
   - Update the **Active** checkbox if needed
   - Click **Save** at the bottom of the page
5. **Option B - Detail Form:**
   - Click on the country name to open the detail form
   - Update **VAT Percent** field (e.g., 20.00 for 20%)
   - Update **Active** checkbox if needed
   - Click **Save**

**Effect:**
- Changes take effect immediately for new VAT calculations
- Existing cart calculations will be recalculated when items are modified
- Orders already placed retain their original VAT calculations

**Audit:**
All VAT rate changes are automatically logged with:
- Admin username who made the change
- Old VAT rate → New VAT rate
- Timestamp of change

**Example Log:**
```
VAT rate changed for GB (United Kingdom): 20.00% → 15.00% by admin_user
```

---

## How to Manage VAT Regions

**Purpose:** Enable/disable VAT regions or update region information.

**Steps:**

1. Navigate to: **Utils → VAT Regions**
2. View existing regions (UK, IE, EU, SA, ROW)
3. **To Enable/Disable a Region:**
   - Use inline editing to toggle the **Active** checkbox
   - Click **Save**
4. **To Edit Region Details:**
   - Click on the region code
   - Update **Name** or **Description** as needed
   - Click **Save**

**Current VAT Regions:**

| Code | Name | Description |
|------|------|-------------|
| UK | United Kingdom | United Kingdom VAT region (20%) |
| IE | Ireland | Ireland VAT region (23%) |
| EU | European Union | EU VAT region (B2B reverse charge, 0%) |
| SA | South Africa | South Africa VAT region (15%) |
| ROW | Rest of World | Rest of World (0% - exports) |

**Note:** Disabling a region will prevent countries from being mapped to it. Existing mappings remain but won't be used for new calculations.

---

## How to Modify Region Mappings

**Purpose:** Assign countries to VAT regions with effective date tracking.

**Steps:**

1. Navigate to: **Utils → Country Region Mappings**
2. View existing mappings with current status indicators
3. **To Create a New Mapping:**
   - Click **Add Country Region Mapping**
   - Select **Country** from dropdown
   - Select **Region** from dropdown
   - Set **Effective From** date (when mapping becomes active)
   - Set **Effective To** date (optional - leave blank for ongoing mappings)
   - Click **Save**
4. **To Edit an Existing Mapping:**
   - Click on the mapping to edit
   - Update **Effective From** or **Effective To** dates
   - Click **Save**

**Date Hierarchy:**
- Use the date hierarchy at the top to filter mappings by year/month
- Navigate through historical mappings easily

**Current Status Indicator:**
- ✅ Green checkmark = Mapping is currently active
- ❌ Red X = Mapping is expired or not yet active

**Validation:**
The system checks for overlapping date ranges and displays a warning if detected:
```
Warning: Overlapping date range detected for GB. Please verify effective dates.
```

**Best Practices:**
- Leave `effective_to` blank for ongoing mappings
- When changing a country's region, create a new mapping with future `effective_from` date
- End the old mapping by setting its `effective_to` date to the day before the new mapping starts

**Example: Moving GB from EU to UK region post-Brexit:**
1. Existing mapping: GB → EU (effective_from: 2000-01-01, effective_to: 2020-12-31)
2. New mapping: GB → UK (effective_from: 2021-01-01, effective_to: blank)

---

## How to View VAT Audit Trail

**Purpose:** View complete history of VAT calculations for accounting and compliance.

**Steps:**

1. Navigate to: **VAT → VAT Audits**
2. Use filters to narrow down records:
   - **Rule ID**: Filter by calculation rule (e.g., "calculate_vat")
   - **Created At**: Filter by date range
3. Use search to find specific records:
   - Search by Cart ID or Rule ID
4. **To View Audit Record Details:**
   - Click on the record ID to view full details
   - Expand **Input Context** to see request data
   - View **Output Data** to see calculation results
   - Check **Performance** metrics (execution duration)

**List View Columns:**
- **ID**: Unique audit record identifier
- **Cart**: Associated cart (if applicable)
- **Rule ID**: VAT calculation rule used
- **Created At**: When calculation was performed
- **Duration (ms)**: Execution time in milliseconds
- **VAT Total**: Total VAT amount calculated (formatted currency)

**Detail View Sections:**

1. **Audit Information:**
   - Cart ID, Order ID (if applicable)
   - Rule ID and version
   - Timestamp

2. **Input Context (JSON):**
   - User information (country, region)
   - Cart items and quantities
   - Configuration settings used

3. **Output Data (JSON):**
   - VAT calculation results
   - Applied rates per item
   - Totals (net, VAT, gross)
   - Region information

4. **Performance:**
   - Execution duration in milliseconds

**Export Functionality:**

To export audit records for accounting:

1. Select audit records using checkboxes
2. From **Action** dropdown, select **Export selected audit records as JSON**
3. Click **Go**
4. Download `vat_audit_export.json` file

**Export Format:**
```json
[
  {
    "id": 1,
    "cart_id": 123,
    "order_id": null,
    "rule_id": "calculate_vat",
    "created_at": "2025-10-16T10:00:00Z",
    "input_context": {...},
    "output_data": {...},
    "duration_ms": 25
  }
]
```

**Note:** The audit trail is **read-only**. You cannot add or delete audit records - they are automatically created during VAT calculations.

---

## VAT Regions Overview

### Current VAT Structure

The VAT system uses a region-based approach with country mappings:

```
Country (GB) → Region (UK) → VAT Rate (20%)
```

### Region Definitions

#### UK - United Kingdom
- **VAT Rate:** 20%
- **Countries:** GB
- **Type:** Standard domestic VAT

#### IE - Ireland
- **VAT Rate:** 23%
- **Countries:** IE
- **Type:** Standard domestic VAT

#### EU - European Union
- **VAT Rate:** 0%
- **Countries:** All EU member states (except UK, IE)
- **Type:** B2B reverse charge
- **Note:** Customer responsible for VAT in their country

#### SA - South Africa
- **VAT Rate:** 15%
- **Countries:** ZA
- **Type:** Standard domestic VAT

#### ROW - Rest of World
- **VAT Rate:** 0%
- **Countries:** All other countries
- **Type:** Export (no VAT charged)

---

## Troubleshooting

### VAT Calculation Showing Old Rate

**Symptom:** Customer sees old VAT rate in their cart despite admin update.

**Cause:** Cart was created before VAT rate change.

**Solutions:**
1. **Customer Action:** Remove and re-add items to cart
2. **Admin Action:** Ask customer to refresh cart or clear browser cache
3. **System Behavior:** VAT is automatically recalculated when items are modified

**Why This Happens:**
VAT is calculated when items are added to cart and stored in `cart.vat_result` (JSONB field). To get updated rates, the cart must trigger a recalculation.

---

### Country Not Appearing in VAT Countries List

**Symptom:** A country doesn't appear in the VAT Countries admin list.

**Cause:** Country hasn't been synced from the master `country_country` table.

**Solution:**
1. Check if country exists in `country_country` table
2. If missing, add it via **Country → Countries** admin
3. If it exists, VAT percent should be available for editing

**Background:**
The VAT system uses the existing `UtilsCountrys` model which references countries. All countries in the system should automatically have a VAT rate field (default: 0.00%).

---

### Audit Trail Export Timeout

**Symptom:** Export action times out or fails when selecting many records.

**Cause:** Too many records selected (large JSON file generation).

**Solution:**
1. Use date filters to narrow down records
2. Export in smaller batches (e.g., one month at a time)
3. Use search to target specific carts or rules

**Best Practice:**
Export by month or quarter for accounting purposes rather than exporting all historical records at once.

---

### Overlapping Date Range Warning

**Symptom:** Warning message when saving country-region mapping.

**Cause:** Multiple mappings exist for the same country with overlapping effective dates.

**Impact:** System will use the most recent mapping, but overlaps may cause confusion.

**Solution:**
1. Review existing mappings for the country
2. Adjust `effective_to` date on old mapping
3. Ensure new mapping starts immediately after old mapping ends
4. Example fix:
   - Old: effective_from=2020-01-01, effective_to=2020-12-31
   - New: effective_from=2021-01-01, effective_to=blank

---

### Permission Errors in Admin

**Symptom:** Cannot access VAT admin pages or modify records.

**Cause:** User account lacks required permissions.

**Solution:**
1. Ensure user is a **staff** member (can access admin)
2. Ensure user is a **superuser** OR has specific permissions:
   - `utils.view_utilscountrys`
   - `utils.change_utilscountrys`
   - `utils.view_utilsregion`
   - `utils.change_utilsregion`
   - `utils.view_utilscountryregion`
   - `utils.change_utilscountryregion`
   - `vat.view_vataudit` (read-only)

**Granting Permissions:**
1. Go to **Authentication and Authorization → Users**
2. Select the user
3. Scroll to **User Permissions**
4. Add required permissions
5. Save

---

## Additional Resources

- **API Documentation:** See `docs/api/` for VAT calculation API endpoints
- **Testing Guide:** See `docs/testing/` for VAT testing procedures
- **Phase 7 Spec:** See `tasks/spec-2025-10-06-121922-phase7-tasks.md` for technical details

---

## Support

For technical issues or questions:
- Check the troubleshooting section above
- Review audit logs for calculation errors
- Contact development team with audit record IDs for investigation

---

*Generated for Admin3 project - VAT Calculation System Phase 7*
*Last Updated: 2025-10-17*
