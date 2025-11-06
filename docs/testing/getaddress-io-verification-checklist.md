# GetAddress.io Address Lookup - Verification Checklist

This checklist verifies that the existing getaddress.io address lookup functionality remains **unchanged and functional** after implementing the Postcoder.com integration.

## Prerequisites

- ✅ Django development server running (`http://localhost:8888`)
- ✅ React development server running (`http://localhost:3000`)
- ✅ Valid `GETADDRESS_API_KEY` configured in `.env.development`

---

## Backend Endpoint Verification

### Test 1: Direct API Call (cURL)

```bash
# Test getaddress.io endpoint directly
curl "http://localhost:8888/api/utils/address-lookup/?postcode=OX449EL"
```

**Expected Response:**
```json
{
  "addresses": [
    {
      "line_1": "2 Denton Lane",
      "line_2": "",
      "town_or_city": "Oxford",
      "county": "Oxfordshire",
      "postcode": "OX44 9EL",
      ...
    }
  ]
}
```

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 2: Verify Both Endpoints Coexist

```bash
# Test OLD endpoint (getaddress.io)
curl "http://localhost:8888/api/utils/address-lookup/?postcode=SW1A1AA"

# Test NEW endpoint (Postcoder)
curl "http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=SW1A1AA"
```

**Expected:**
- ✅ Both return 200 status
- ✅ Both return addresses in same format
- ✅ Response formats are identical (backward compatible)

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

## Frontend Integration Verification

### Test 3: Registration Form Address Lookup

1. **Navigate to:** Registration/Checkout form with address fields
   - Example: `http://localhost:3000/register` or checkout page

2. **Select Country:**
   - Choose "United Kingdom" from country dropdown

3. **Enter Postcode:**
   - Enter: `OX44 9EL` or `SW1A 1AA`
   - Press Tab or click into "Address" field

4. **Type Address:**
   - Start typing first line (e.g., "2 Denton" or "10 Downing")
   - Minimum 3 characters

**Expected Behavior:**
- ✅ Address suggestions dropdown appears
- ✅ Suggestions match typed text
- ✅ Suggestions show full address format
- ✅ No console errors in browser DevTools
- ✅ Loading spinner appears briefly during lookup

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 4: Select Address from Suggestions

1. **Continue from Test 3**
2. **Click** on one of the address suggestions

**Expected Behavior:**
- ✅ All address fields auto-populate:
  - Address line 1
  - City/Town
  - County (if applicable)
  - Postcode
- ✅ Dropdown closes
- ✅ Manual entry form becomes visible
- ✅ "Back to address lookup" button appears

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 5: Manual Entry Toggle

1. **Click** "Enter address manually" button (in dropdown or below address field)

**Expected Behavior:**
- ✅ Dropdown closes
- ✅ Full address form appears with all country-specific fields
- ✅ "Back to address lookup" button appears
- ✅ Can toggle back to lookup mode

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 6: Invalid Postcode Handling

1. **Enter invalid postcode:** `INVALID`
2. **Type address:** "Test"

**Expected Behavior:**
- ✅ No errors or crashes
- ✅ Empty suggestions or error message
- ✅ "Enter address manually" option still available

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 7: Browser DevTools Console Check

1. **Open** browser DevTools (F12)
2. **Navigate** to Console tab
3. **Perform** address lookup (Tests 3-4)

**Expected Behavior:**
- ✅ No JavaScript errors
- ✅ No React warnings
- ✅ No 404 or 500 network errors
- ✅ Successful API call to `/api/utils/address-lookup/`

**Status:** [ ] PASS / [ ] FAIL

**Network Request Details:**
- URL: `http://localhost:8888/api/utils/address-lookup/?postcode=...`
- Status: 200
- Response time: < 2000ms

**Notes:** _______________________________________________

---

### Test 8: Network Tab Verification

1. **Open** DevTools → Network tab
2. **Filter** by "XHR" or "Fetch"
3. **Perform** address lookup

**Expected Network Call:**
```
Request URL: http://localhost:8888/api/utils/address-lookup/?postcode=OX449EL
Request Method: GET
Status Code: 200 OK
```

**Response Headers should include:**
```
Content-Type: application/json
```

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 9: Different Postcodes

Test with various UK postcodes:

| Postcode  | Location         | Status      |
|-----------|------------------|-------------|
| SW1A 1AA  | Downing Street   | [ ] PASS    |
| EC1A 1BB  | Bank of England  | [ ] PASS    |
| OX44 9EL  | Oxford           | [ ] PASS    |
| M1 3NQ    | Manchester       | [ ] PASS    |
| G2 8DN    | Glasgow          | [ ] PASS    |

**Expected:** All postcodes return addresses

**Status:** [ ] ALL PASS / [ ] SOME FAIL

**Notes:** _______________________________________________

---

### Test 10: Empty/Missing Postcode

1. **Leave postcode empty**
2. **Try to type** in address field

**Expected Behavior:**
- ✅ Address field is disabled (greyed out)
- ✅ Tooltip or helper text indicates "Enter postcode first"
- ✅ No API calls made

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

## Cross-Browser Testing (Optional)

### Test 11: Browser Compatibility

Test address lookup in different browsers:

| Browser           | Version | Status      |
|-------------------|---------|-------------|
| Chrome            | Latest  | [ ] PASS    |
| Firefox           | Latest  | [ ] PASS    |
| Edge              | Latest  | [ ] PASS    |
| Safari (Mac/iOS)  | Latest  | [ ] PASS    |

**Status:** [ ] ALL PASS / [ ] SOME FAIL

**Notes:** _______________________________________________

---

## Integration with Form Validation

### Test 12: Required Field Validation

1. **Enter postcode and select address**
2. **Clear** the city field manually
3. **Try to submit form**

**Expected Behavior:**
- ✅ Form validation shows error for empty city
- ✅ Submit is blocked
- ✅ Address lookup still functional

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

### Test 13: Form Submission with Lookup Address

1. **Complete** full address lookup flow
2. **Fill** all other required form fields
3. **Submit** form

**Expected Behavior:**
- ✅ Form submits successfully
- ✅ Address data saved correctly
- ✅ No backend validation errors

**Status:** [ ] PASS / [ ] FAIL

**Notes:** _______________________________________________

---

## Verification Summary

**Total Tests:** 13
**Tests Passed:** _____ / 13
**Tests Failed:** _____ / 13

**Critical Issues:** (if any)
_______________________________________________
_______________________________________________

**Minor Issues:** (if any)
_______________________________________________
_______________________________________________

---

## Success Criteria

The existing getaddress.io address lookup is considered **fully functional** if:

- ✅ All backend tests pass (Tests 1-2)
- ✅ All frontend integration tests pass (Tests 3-10)
- ✅ No console errors or warnings
- ✅ Network calls use correct endpoint (`/api/utils/address-lookup/`)
- ✅ Form submission works end-to-end
- ✅ User experience is unchanged from before

---

## Troubleshooting

### Issue: "Address lookup failed" error

**Possible Causes:**
- GETADDRESS_API_KEY not configured
- API key invalid or expired
- Network connectivity issue
- GetAddress.io API service down

**Solution:**
1. Check `.env.development` file for `GETADDRESS_API_KEY`
2. Verify API key is valid at getaddress.io dashboard
3. Check Django server logs for detailed error

---

### Issue: Dropdown doesn't appear

**Possible Causes:**
- Postcode not entered
- Less than 3 characters typed
- JavaScript error blocking dropdown
- CSS z-index issue

**Solution:**
1. Check browser console for errors
2. Verify postcode field is filled
3. Type at least 3 characters in address field
4. Inspect element to check dropdown HTML exists

---

### Issue: Wrong endpoint being called

**Possible Causes:**
- Frontend code modified accidentally
- Config file pointing to wrong URL
- Browser cache issue

**Solution:**
1. Verify `SmartAddressInput.js` line 197 calls `/api/utils/address-lookup/`
2. Clear browser cache and hard refresh (Ctrl+Shift+R)
3. Check `config.js` for correct `apiBaseUrl`

---

## Next Steps After Verification

If all tests pass:
1. ✅ Mark T032 as complete
2. ✅ Proceed with T033 (Document frontend integration points)
3. ✅ Proceed with T034 (Create example frontend code for Postcoder)

If tests fail:
1. ❌ Document failures in "Notes" sections above
2. ❌ Review Django server logs for backend errors
3. ❌ Check browser console for frontend errors
4. ❌ Compare with working version (git diff)

---

**Tested By:** _______________
**Date:** _______________
**Overall Status:** [ ] PASS / [ ] FAIL
