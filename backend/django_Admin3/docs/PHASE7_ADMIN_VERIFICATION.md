# Phase 7 Admin Verification Checklist

**Phase 7: Django Admin Interface**
**Created:** 2025-10-17
**Purpose:** Manual verification checklist for all admin interfaces

---

## Pre-Verification Setup

### 1. Create Superuser (if needed)

```bash
cd backend/django_Admin3
python manage.py createsuperuser
```

**Credentials for testing:**
- Username: `admin_test`
- Email: `admin@example.com`
- Password: [Set secure password]

### 2. Start Django Server

```bash
python manage.py runserver 8888
```

### 3. Navigate to Admin

Open browser: `http://localhost:8888/admin/`

Log in with superuser credentials

---

## UtilsCountrys Admin Verification

**Admin URL:** `/admin/utils/utilscountrys/`

### List View Checks

- [ ] Page loads without errors
- [ ] List displays columns: code, name, vat_percent, active
- [ ] Countries are ordered alphabetically by name
- [ ] Search box is present and functional
- [ ] Filter sidebar shows "Active" filter option

### Inline Editing Checks

- [ ] Can click into VAT Percent field and edit
- [ ] Can toggle Active checkbox
- [ ] Changes persist after clicking Save
- [ ] Multiple rows can be edited and saved together

### Search Functionality

- [ ] Search by code works (e.g., "GB" finds United Kingdom)
- [ ] Search by name works (e.g., "United" finds United Kingdom)
- [ ] Search results update immediately

### Filter Functionality

- [ ] Click "Active" filter shows only active countries
- [ ] Click "All" resets filter
- [ ] Click "Inactive" shows only inactive countries (if any exist)

### Detail Form Checks

- [ ] Click on country name opens detail form
- [ ] All fields are present and correctly labeled
- [ ] VAT Configuration section has descriptive text
- [ ] Metadata section is collapsed by default
- [ ] Save button works correctly
- [ ] Save and continue editing button works

### VAT Rate Change Logging

**Test:**
1. Edit a country's VAT rate (e.g., GB from 20.00 to 21.00)
2. Save the change
3. Check console/log output

- [ ] Log entry created with format: `VAT rate changed for {code} ({name}): {old}% → {new}% by {username}`
- [ ] Log includes admin username
- [ ] Log includes old and new rates

### Field Validation

- [ ] VAT Percent accepts decimal values (e.g., 20.00)
- [ ] VAT Percent rejects negative values
- [ ] VAT Percent rejects values > 100
- [ ] Code field cannot be changed for existing records (or warns)

---

## UtilsRegion Admin Verification

**Admin URL:** `/admin/utils/utilsregion/`

### List View Checks

- [ ] Page loads without errors
- [ ] List displays columns: code, name, description, active
- [ ] Regions are ordered by code
- [ ] Can see all 5 regions: UK, IE, EU, SA, ROW

### Inline Editing Checks

- [ ] Can toggle Active checkbox for regions
- [ ] Changes persist after clicking Save

### Search Functionality

- [ ] Search by code works (e.g., "UK" finds United Kingdom)
- [ ] Search by name works (e.g., "Europe" finds European Union)

### Detail Form Checks

- [ ] Click on region code opens detail form
- [ ] All sections are present (Region Information, Status, Metadata)
- [ ] Fields are correctly labeled
- [ ] Save button works correctly

### Region Data Verification

**Verify these regions exist:**

- [ ] **UK** - United Kingdom
  - Active: ✓
  - Description: UK VAT region

- [ ] **IE** - Ireland
  - Active: ✓
  - Description: Ireland VAT region

- [ ] **EU** - European Union
  - Active: ✓
  - Description: EU VAT region (B2B reverse charge)

- [ ] **SA** - South Africa
  - Active: ✓
  - Description: South Africa VAT region

- [ ] **ROW** - Rest of World
  - Active: ✓
  - Description: Rest of World (exports, no VAT)

---

## UtilsCountryRegion Admin Verification

**Admin URL:** `/admin/utils/utilscountryregion/`

### List View Checks

- [ ] Page loads without errors
- [ ] List displays columns: country, region, effective_from, effective_to, is_current
- [ ] Date hierarchy navigation is present at top
- [ ] Filter sidebar shows Region and Effective From filters

### Is Current Display

**Test:**
1. Find a mapping with no effective_to date
2. Verify it shows ✅ green checkmark in is_current column

- [ ] Current mappings show ✅ green checkmark
- [ ] Expired mappings show ❌ red X (if any exist)
- [ ] Future mappings show ❌ red X (if any exist)

### Date Hierarchy Checks

- [ ] Click on a year to filter by that year
- [ ] Click on a month to filter by that month
- [ ] Click on a day to filter by that day
- [ ] Breadcrumb navigation works ("All" resets)

### Filter Functionality

- [ ] Region filter shows all regions (UK, IE, EU, SA, ROW)
- [ ] Clicking a region filters mappings correctly
- [ ] Effective From filter allows year selection

### Detail Form Checks

- [ ] Click on mapping opens detail form
- [ ] All sections present (Mapping, Effective Dates, Metadata)
- [ ] Country dropdown populated with countries
- [ ] Region dropdown populated with regions
- [ ] Effective From date picker works
- [ ] Effective To date picker works (optional field)

### Overlapping Date Validation

**Test:**
1. Create a new mapping for an existing country
2. Set dates that overlap with existing mapping
3. Save

- [ ] Warning message displayed about overlapping dates
- [ ] Mapping still saves (warning only, not error)
- [ ] Warning mentions specific country code

**Example Test Data:**
- Country: GB
- Region: UK
- Effective From: 2020-01-01
- Effective To: 2025-12-31
- (If GB→UK mapping already exists with overlapping dates)

### Create Mapping Test

**Test:**
1. Click "Add Country Region Mapping"
2. Select a country not yet mapped (or create test mapping)
3. Select a region
4. Set effective_from to today's date
5. Leave effective_to blank
6. Save

- [ ] Mapping created successfully
- [ ] Shows ✅ is_current = True
- [ ] Appears in list view

---

## VATAudit Admin Verification

**Admin URL:** `/admin/vat/vataudit/`

### List View Checks

- [ ] Page loads without errors
- [ ] List displays columns: id, cart, rule_id, created_at, duration_ms, vat_total
- [ ] Records are ordered by created_at (newest first)
- [ ] Date hierarchy is present
- [ ] Filters show: Rule ID, Created At

### VAT Total Display

**Test:**
1. Find an audit record with VAT calculation
2. Check vat_total column

- [ ] VAT total displays as currency (e.g., "£20.00")
- [ ] Format is correct: £X.XX
- [ ] Handles records with no VAT (shows "£0.00" or "N/A")

### Filter Functionality

- [ ] Rule ID filter shows available rules
- [ ] Clicking a rule_id filters records
- [ ] Created At filter shows date ranges (Today, Past 7 days, etc.)
- [ ] Filters combine correctly (rule_id AND created_at)

### Search Functionality

- [ ] Search by cart ID works
- [ ] Search by rule_id works
- [ ] Search results update immediately

### Detail View Checks

**Test:**
1. Click on an audit record ID

- [ ] Detail page opens
- [ ] All sections present:
  - Audit Information
  - Input Context (collapsed)
  - Output Data
  - Performance

### Input Context Display

- [ ] Expand Input Context section
- [ ] JSON is pretty-printed (indented)
- [ ] Wrapped in `<pre>` tag for readability
- [ ] Contains expected keys: user, cart, etc.

### Output Data Display

- [ ] Output Data section is expanded by default
- [ ] JSON is pretty-printed with syntax highlighting
- [ ] Background color is light gray (#f5f5f5)
- [ ] Contains expected keys: status, totals, region, items
- [ ] Scrollable if content exceeds 500px height

### Performance Metrics

- [ ] Duration (ms) field displays numeric value
- [ ] Value is reasonable (< 1000ms for most calculations)

### Read-Only Enforcement

**Test:**
1. Try to access add form: `/admin/vat/vataudit/add/`

- [ ] Add form is NOT accessible (403 or disabled)
- [ ] "Add VAT Audit" button NOT visible in list view

**Test:**
2. Try to delete an audit record

- [ ] Delete checkbox NOT visible in list view
- [ ] Delete action NOT available in detail view
- [ ] Cannot bulk delete records

### Export Action Test

**Test:**
1. Select multiple audit records using checkboxes
2. From Action dropdown, select "Export selected audit records as JSON"
3. Click Go

- [ ] Browser downloads `vat_audit_export.json`
- [ ] File contains JSON array
- [ ] Each record has expected fields: id, cart_id, order_id, rule_id, created_at, input_context, output_data, duration_ms
- [ ] JSON is valid and properly formatted
- [ ] File size is reasonable for number of records

### Export Format Validation

**Open downloaded JSON file:**

- [ ] Valid JSON syntax (no parse errors)
- [ ] Array structure: `[{...}, {...}]`
- [ ] Each object has all required fields
- [ ] Timestamps in ISO format: `"2025-10-16T10:00:00Z"`
- [ ] Nested objects preserved (input_context, output_data)

---

## Integration Verification

### Cross-Admin Navigation

**Test:**
1. From UtilsCountryRegion admin, click on a Country link
2. Should navigate to UtilsCountrys detail for that country

- [ ] Link navigation works
- [ ] Correct country detail page opens

**Test:**
3. From UtilsCountryRegion admin, click on a Region link
4. Should navigate to UtilsRegion detail for that region

- [ ] Link navigation works
- [ ] Correct region detail page opens

**Test:**
5. From VATAudit admin, click on a Cart link
6. Should navigate to Cart detail in cart admin

- [ ] Link navigation works (if cart admin exists)
- [ ] OR displays cart ID if link not configured

---

## Performance Verification

### Load Time Checks

**Test with ~100 records in each admin:**

- [ ] UtilsCountrys list loads in < 2 seconds
- [ ] UtilsRegion list loads in < 1 second
- [ ] UtilsCountryRegion list loads in < 2 seconds
- [ ] VATAudit list loads in < 3 seconds

### Pagination

**Test if >100 records exist:**

- [ ] Pagination controls appear
- [ ] "Show all" link works
- [ ] Next/Previous buttons work
- [ ] Jump to page number works

---

## Browser Compatibility

**Test in multiple browsers:**

### Chrome/Edge
- [ ] All features work correctly
- [ ] Layout is correct
- [ ] No JavaScript errors in console

### Firefox
- [ ] All features work correctly
- [ ] Layout is correct
- [ ] No JavaScript errors in console

### Safari (if available)
- [ ] All features work correctly
- [ ] Layout is correct
- [ ] No JavaScript errors in console

---

## Accessibility Checks

### Keyboard Navigation

- [ ] Can tab through form fields
- [ ] Can submit forms using Enter key
- [ ] Can use keyboard shortcuts (if configured)

### Screen Reader Compatibility

- [ ] Form labels are properly associated with inputs
- [ ] Error messages are announced
- [ ] Success messages are announced

---

## Security Verification

### Permission Checks

**Test with non-superuser account:**

**Create test user:**
```bash
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.create_user('staff_test', 'staff@example.com', 'password')
>>> user.is_staff = True
>>> user.save()
```

**Add specific permissions:**
- `utils.view_utilscountrys`
- `utils.change_utilscountrys`
(Do NOT grant superuser)

**Test:**
- [ ] User can access admin home
- [ ] User can view UtilsCountrys (if granted permission)
- [ ] User CANNOT view UtilsCountrys (if permission not granted)
- [ ] User can edit UtilsCountrys (if granted permission)
- [ ] User CANNOT edit UtilsCountrys (if permission not granted)

---

## Data Integrity Checks

### Unique Constraints

**Test:**
1. Try to create duplicate country code

- [ ] System prevents duplicate with error message

**Test:**
2. Try to create duplicate region code

- [ ] System prevents duplicate with error message

### Foreign Key Constraints

**Test:**
1. Try to delete a Region that has CountryRegion mappings

- [ ] System prevents deletion OR cascades correctly
- [ ] Warning shown about related objects

---

## Edge Case Testing

### Empty States

**Test:**
1. Filter to show zero results

- [ ] "No records found" message displays
- [ ] No errors in console
- [ ] Can clear filters to show results again

### Large Data

**Test with 1000+ audit records:**

- [ ] List view still performant
- [ ] Export doesn't timeout (or use smaller batch)
- [ ] Search remains responsive

### Special Characters

**Test:**
1. Create/edit region with special characters in description

- [ ] Saves correctly
- [ ] Displays correctly (no XSS issues)
- [ ] Exports correctly in JSON

---

## Screenshots (Optional)

**Capture screenshots for documentation:**

- [ ] `utils_countrys_list.png` - UtilsCountrys list view
- [ ] `utils_countrys_edit.png` - UtilsCountrys edit form
- [ ] `utils_region_list.png` - UtilsRegion list view
- [ ] `utils_country_region_list.png` - UtilsCountryRegion list with is_current
- [ ] `utils_country_region_date_hierarchy.png` - Date hierarchy navigation
- [ ] `vat_audit_list.png` - VATAudit list view
- [ ] `vat_audit_detail.png` - VATAudit detail with JSON formatting
- [ ] `vat_audit_export.png` - Export action dropdown

---

## Completion Sign-Off

**Verified By:** _________________________

**Date:** _________________________

**Overall Status:**
- [ ] All checks passed
- [ ] Some issues found (document below)
- [ ] Major issues requiring fixes

**Issues Found:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Notes:**

_______________________________________________
_______________________________________________
_______________________________________________

---

*Generated for Admin3 project - VAT Calculation System Phase 7*
*Last Updated: 2025-10-17*
