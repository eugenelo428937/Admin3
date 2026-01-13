# Phone Number Country Code Database Redesign Plan

## Problem Statement

The current implementation stores phone numbers in the database without their associated country codes. This causes issues:

1. **Issue**: User "smalleyes1031@gmail.com" has a Hong Kong phone number, but the checkout shows UK (+44) instead of HK (+852)
2. **Root Cause**: Phone numbers are stored as raw strings (e.g., "12345678") without the country code ISO code or phone prefix
3. **Current Workaround**: Frontend attempts to detect country from phone number format or user's address country, which is unreliable

## Current State Analysis

### Database Models

#### 1. `UserProfileContactNumber` (acts_user_profile_contact_number)
```python
class UserProfileContactNumber(models.Model):
    CONTACT_TYPE_CHOICES = [
        ('HOME', 'Home'),
        ('WORK', 'Work'),
        ('MOBILE', 'Mobile'),
    ]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='contact_numbers')
    contact_type = models.CharField(max_length=8, choices=CONTACT_TYPE_CHOICES)
    number = models.CharField(max_length=32)  # ← Only stores raw number, NO country code
```

#### 2. `OrderUserContact` (acted_order_user_contact)
```python
class OrderUserContact(models.Model):
    order = models.ForeignKey(ActedOrder, on_delete=models.CASCADE)
    home_phone = models.CharField(max_length=20, null=True, blank=True)      # ← No country code
    mobile_phone = models.CharField(max_length=20)                            # ← No country code
    work_phone = models.CharField(max_length=20, null=True, blank=True)       # ← No country code
    email_address = models.EmailField(max_length=254)
```

### Frontend Components

1. **ValidatedPhoneInput.js** - Phone input with country selector dropdown
   - Receives `selectedCountry` as prop (object with `iso_code`, `phone_code`, `name`)
   - Country is managed in parent component state
   - Country is NOT persisted to database

2. **UserFormWizard.js** - Registration and profile editing
   - Manages `homePhoneCountry`, `mobilePhoneCountry`, `workPhoneCountry` state
   - Auto-sets phone country from address country (unreliable)
   - Does NOT send country code to backend

3. **CommunicationDetailsPanel.js** - Checkout step 1
   - Similar country state management
   - Attempts to detect country from phone number format (unreliable)
   - Does NOT receive country code from backend

## Proposed Solution

### Design Decision: Separate Country Code Field

Add a dedicated `country_code` field (ISO 3166-1 alpha-2) to store the phone country:
- **Why ISO code (e.g., "HK", "GB")**: Maps directly to frontend country dropdown, validates via libphonenumber-js
- **Why separate field**: Cleaner than parsing E.164 prefix, explicit data storage, easier to query/filter
- **Alternative rejected**: Storing full E.164 format ("+85212345678") requires parsing to display country selector

---

## Implementation Tasks

### Phase 1: Backend Model Changes

#### Task 1.1: Update `UserProfileContactNumber` Model
**File**: `/backend/django_Admin3/userprofile/models/contact_number.py`

**Changes**:
```python
class UserProfileContactNumber(models.Model):
    CONTACT_TYPE_CHOICES = [
        ('HOME', 'Home'),
        ('WORK', 'Work'),
        ('MOBILE', 'Mobile'),
    ]
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='contact_numbers')
    contact_type = models.CharField(max_length=8, choices=CONTACT_TYPE_CHOICES)
    number = models.CharField(max_length=32)
    country_code = models.CharField(max_length=2, blank=True, default='')  # NEW: ISO 3166-1 alpha-2 (e.g., "HK", "GB")
```

**Migration**: Add nullable field with default ''

---

#### Task 1.2: Update `OrderUserContact` Model
**File**: `/backend/django_Admin3/cart/models.py`

**Changes**:
```python
class OrderUserContact(models.Model):
    order = models.ForeignKey(ActedOrder, on_delete=models.CASCADE)

    # Contact Information with country codes
    home_phone = models.CharField(max_length=20, null=True, blank=True)
    home_phone_country = models.CharField(max_length=2, blank=True, default='')  # NEW

    mobile_phone = models.CharField(max_length=20)
    mobile_phone_country = models.CharField(max_length=2, blank=True, default='')  # NEW

    work_phone = models.CharField(max_length=20, null=True, blank=True)
    work_phone_country = models.CharField(max_length=2, blank=True, default='')  # NEW

    email_address = models.EmailField(max_length=254)
```

**Migration**: Add 3 nullable fields with default ''

---

#### Task 1.3: Create Database Migrations
```bash
cd backend/django_Admin3
python manage.py makemigrations userprofile --name add_country_code_to_contact_number
python manage.py makemigrations cart --name add_phone_country_codes_to_order_contact
python manage.py migrate
```

---

### Phase 2: Backend API Changes

#### Task 2.1: Update User Registration Serializer
**File**: `/backend/django_Admin3/users/serializers.py`

**Changes to `create()` method**:
```python
# Contact Numbers - now with country code
if profile_data.get('home_phone'):
    UserProfileContactNumber.objects.create(
        user_profile=user_profile,
        contact_type='HOME',
        number=profile_data['home_phone'],
        country_code=profile_data.get('home_phone_country', '')  # NEW
    )
if profile_data.get('work_phone'):
    UserProfileContactNumber.objects.create(
        user_profile=user_profile,
        contact_type='WORK',
        number=profile_data['work_phone'],
        country_code=profile_data.get('work_phone_country', '')  # NEW
    )
if profile_data.get('mobile_phone'):
    UserProfileContactNumber.objects.create(
        user_profile=user_profile,
        contact_type='MOBILE',
        number=profile_data['mobile_phone'],
        country_code=profile_data.get('mobile_phone_country', '')  # NEW
    )
```

---

#### Task 2.2: Update User Profile GET Endpoint
**File**: `/backend/django_Admin3/users/views.py`

**Changes to `profile()` method**:
```python
# Get contact numbers with country codes
contact_numbers = {}
for contact in profile.contact_numbers.all():
    key_prefix = contact.contact_type.lower()
    contact_numbers[f'{key_prefix}_phone'] = contact.number
    contact_numbers[f'{key_prefix}_phone_country'] = contact.country_code  # NEW
```

**Response structure**:
```json
{
  "contact_numbers": {
    "home_phone": "12345678",
    "home_phone_country": "HK",
    "mobile_phone": "98765432",
    "mobile_phone_country": "HK",
    "work_phone": "",
    "work_phone_country": ""
  }
}
```

---

#### Task 2.3: Update User Profile PATCH Endpoint
**File**: `/backend/django_Admin3/users/views.py`

**Changes to `update_profile()` method**:
```python
# Update contact numbers with country codes
contact_numbers = data.get('contact_numbers', {})
for contact_type_key, number in contact_numbers.items():
    if contact_type_key.endswith('_phone') and not contact_type_key.endswith('_phone_country'):
        contact_type = contact_type_key.replace('_phone', '').upper()
        country_key = f'{contact_type_key}_country'
        country_code = contact_numbers.get(country_key, '')

        if contact_type in ['HOME', 'WORK', 'MOBILE'] and number:
            contact, created = UserProfileContactNumber.objects.get_or_create(
                user_profile=profile,
                contact_type=contact_type,
                defaults={'number': number, 'country_code': country_code}
            )
            if not created:
                contact.number = number
                contact.country_code = country_code  # NEW
                contact.save()
```

---

#### Task 2.4: Update Checkout Contact Data Extraction
**File**: `/backend/django_Admin3/cart/views.py`

**Changes to `_extract_and_save_contact_data_fallback()` method**:
```python
def _extract_and_save_contact_data_fallback(self, order, user_preferences, user):
    """Extract contact data from user_preferences or user profile"""

    contact_data = {
        'home_phone': '',
        'home_phone_country': '',
        'mobile_phone': '',
        'mobile_phone_country': '',
        'work_phone': '',
        'work_phone_country': '',
        'email_address': ''
    }

    # Extract from user_preferences (primary source)
    for key in contact_data.keys():
        pref = user_preferences.get(key)
        if pref and isinstance(pref, dict):
            contact_data[key] = pref.get('value', '')
        elif pref and isinstance(pref, str):
            contact_data[key] = pref

    # ... rest of fallback logic

    # Create OrderUserContact with country codes
    OrderUserContact.objects.create(
        order=order,
        home_phone=contact_data['home_phone'],
        home_phone_country=contact_data['home_phone_country'],
        mobile_phone=contact_data['mobile_phone'],
        mobile_phone_country=contact_data['mobile_phone_country'],
        work_phone=contact_data['work_phone'],
        work_phone_country=contact_data['work_phone_country'],
        email_address=contact_data['email_address']
    )
```

---

### Phase 3: Frontend Changes

#### Task 3.1: Update UserFormWizard Registration Payload
**File**: `/frontend/react-Admin3/src/components/User/UserFormWizard.js`

**Changes to registration payload**:
```javascript
const profile = {
  // ... existing fields
  home_phone: form.home_phone,
  home_phone_country: homePhoneCountry?.iso_code || '',  // NEW
  work_phone: showWorkSection ? form.work_phone : "",
  work_phone_country: showWorkSection ? (workPhoneCountry?.iso_code || '') : '',  // NEW
  mobile_phone: form.mobile_phone,
  mobile_phone_country: mobilePhoneCountry?.iso_code || '',  // NEW
};
```

---

#### Task 3.2: Update UserFormWizard Profile Loading
**File**: `/frontend/react-Admin3/src/components/User/UserFormWizard.js`

**Changes to load country from profile**:
```javascript
// In useEffect that loads profile data
useEffect(() => {
  if (profileData?.contact_numbers) {
    // Set phone countries from saved data
    const setCountryFromCode = (isoCode, setter) => {
      if (isoCode && countryList.length > 0) {
        const country = countryList.find(c => c.iso_code === isoCode);
        if (country) setter(country);
      }
    };

    setCountryFromCode(profileData.contact_numbers.home_phone_country, setHomePhoneCountry);
    setCountryFromCode(profileData.contact_numbers.mobile_phone_country, setMobilePhoneCountry);
    setCountryFromCode(profileData.contact_numbers.work_phone_country, setWorkPhoneCountry);
  }
}, [profileData, countryList]);
```

---

#### Task 3.3: Update UserFormWizard Profile Update Payload
**File**: `/frontend/react-Admin3/src/components/User/UserFormWizard.js`

**Changes to update payload**:
```javascript
// Contact numbers with country codes
if (
  changedFields.has("home_phone") ||
  changedFields.has("mobile_phone") ||
  changedFields.has("work_phone")
) {
  updatePayload.contact_numbers = {};
  if (changedFields.has("home_phone")) {
    updatePayload.contact_numbers.home_phone = form.home_phone;
    updatePayload.contact_numbers.home_phone_country = homePhoneCountry?.iso_code || '';
  }
  if (changedFields.has("mobile_phone")) {
    updatePayload.contact_numbers.mobile_phone = form.mobile_phone;
    updatePayload.contact_numbers.mobile_phone_country = mobilePhoneCountry?.iso_code || '';
  }
  if (changedFields.has("work_phone")) {
    updatePayload.contact_numbers.work_phone = form.work_phone;
    updatePayload.contact_numbers.work_phone_country = workPhoneCountry?.iso_code || '';
  }
}
```

---

#### Task 3.4: Update CommunicationDetailsPanel to Load Country from Profile
**File**: `/frontend/react-Admin3/src/components/Common/CommunicationDetailsPanel.js`

**Changes**:
```javascript
// Remove the detectCountryForPhone workaround function

// Update useEffect to set countries from profile data
useEffect(() => {
  if (countryList.length === 0 || !userProfile) return;

  const setCountryFromCode = (isoCode) => {
    if (isoCode) {
      const country = countryList.find(c => c.iso_code === isoCode);
      if (country) return country;
    }
    return countryList.find(c => c.name === "United Kingdom"); // Default
  };

  // Set from saved country codes
  setHomePhoneCountry(setCountryFromCode(userProfile.contact_numbers?.home_phone_country));
  setMobilePhoneCountry(setCountryFromCode(userProfile.contact_numbers?.mobile_phone_country));
  setWorkPhoneCountry(setCountryFromCode(userProfile.contact_numbers?.work_phone_country));

}, [countryList, userProfile]);
```

---

#### Task 3.5: Update CommunicationDetailsPanel Update Handlers
**File**: `/frontend/react-Admin3/src/components/Common/CommunicationDetailsPanel.js`

**Changes to `handleProfileUpdate()`**:
```javascript
const handleProfileUpdate = async () => {
  const updateData = {
    user: { email: formData.email },
    contact_numbers: {
      home_phone: formData.homePhone,
      home_phone_country: homePhoneCountry?.iso_code || '',
      mobile_phone: formData.mobilePhone,
      mobile_phone_country: mobilePhoneCountry?.iso_code || '',
      work_phone: formData.workPhone,
      work_phone_country: workPhoneCountry?.iso_code || ''
    }
  };

  // Remove formatPhoneForStorage - no longer needed
  // ...
};
```

**Changes to `handleOrderOnlyUpdate()`**:
```javascript
const handleOrderOnlyUpdate = () => {
  if (onProfileUpdate) {
    onProfileUpdate({
      orderOnly: true,
      contact: {
        home_phone: formData.homePhone,
        home_phone_country: homePhoneCountry?.iso_code || '',
        mobile_phone: formData.mobilePhone,
        mobile_phone_country: mobilePhoneCountry?.iso_code || '',
        work_phone: formData.workPhone,
        work_phone_country: workPhoneCountry?.iso_code || '',
        email_address: formData.email
      }
    });
  }
};
```

---

#### Task 3.6: Update CheckoutSteps Contact Data State
**File**: `/frontend/react-Admin3/src/components/Ordering/CheckoutSteps.js`

**Changes to contact state**:
```javascript
const [contactData, setContactData] = useState({
  home_phone: '',
  home_phone_country: '',  // NEW
  mobile_phone: '',
  mobile_phone_country: '',  // NEW
  work_phone: '',
  work_phone_country: '',  // NEW
  email_address: ''
});
```

**Changes to `handleContactDataUpdate()`**:
```javascript
const handleContactDataUpdate = useCallback((updateInfo) => {
  if (updateInfo.orderOnly && updateInfo.contact) {
    setContactData({
      home_phone: updateInfo.contact.home_phone || '',
      home_phone_country: updateInfo.contact.home_phone_country || '',
      mobile_phone: updateInfo.contact.mobile_phone || '',
      mobile_phone_country: updateInfo.contact.mobile_phone_country || '',
      work_phone: updateInfo.contact.work_phone || '',
      work_phone_country: updateInfo.contact.work_phone_country || '',
      email_address: updateInfo.contact.email_address || ''
    });
  }
  // ...
}, []);
```

---

#### Task 3.7: Update Checkout Submission Payload
**File**: `/frontend/react-Admin3/src/components/Ordering/CheckoutSteps.js`

**Changes to checkout payload**:
```javascript
const user_preferences = {
  // ... existing preferences
  home_phone: { value: contactData.home_phone, inputType: 'text' },
  home_phone_country: { value: contactData.home_phone_country, inputType: 'text' },
  mobile_phone: { value: contactData.mobile_phone, inputType: 'text' },
  mobile_phone_country: { value: contactData.mobile_phone_country, inputType: 'text' },
  work_phone: { value: contactData.work_phone, inputType: 'text' },
  work_phone_country: { value: contactData.work_phone_country, inputType: 'text' },
  email_address: { value: contactData.email_address, inputType: 'text' }
};
```

---

### Phase 4: Cleanup

#### Task 4.1: Remove Workaround Code from CommunicationDetailsPanel
**File**: `/frontend/react-Admin3/src/components/Common/CommunicationDetailsPanel.js`

**Remove**:
- `detectCountryForPhone()` helper function
- `formatPhoneForStorage()` helper function
- Complex useEffect that tries to detect country from phone number

---

### Phase 5: Testing

#### Task 5.1: Backend Unit Tests
**File**: `/backend/django_Admin3/userprofile/tests/test_models.py`

**New tests**:
- Test `UserProfileContactNumber` creation with country_code
- Test `OrderUserContact` creation with phone country fields
- Test profile GET returns country codes
- Test profile PATCH saves country codes

#### Task 5.2: Backend Integration Tests
**File**: `/backend/django_Admin3/users/tests/test_views.py`

**New tests**:
- Test registration with phone country codes
- Test profile update with phone country codes
- Test checkout saves phone country codes

#### Task 5.3: Frontend Unit Tests
**Files**:
- `/frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.test.js`
- `/frontend/react-Admin3/src/components/Common/__tests__/CommunicationDetailsPanel.test.js`
- `/frontend/react-Admin3/src/components/Ordering/CheckoutSteps/__tests__/CartReviewStep.test.js`

**New tests**:
- Test phone country is loaded from profile
- Test phone country is sent in registration payload
- Test phone country is sent in profile update payload
- Test phone country is sent in checkout payload

---

## Data Migration Considerations

### Existing Data

For existing users without `country_code`:
1. Leave `country_code` as empty string (default)
2. Frontend falls back to UK if no country code saved
3. When user edits phone and saves, country code gets populated

**No backfill needed** - gradual migration as users update profiles.

---

## API Contract Summary

### Profile GET Response
```json
{
  "contact_numbers": {
    "home_phone": "12345678",
    "home_phone_country": "HK",
    "mobile_phone": "98765432",
    "mobile_phone_country": "HK",
    "work_phone": "",
    "work_phone_country": ""
  }
}
```

### Profile PATCH Request
```json
{
  "contact_numbers": {
    "home_phone": "12345678",
    "home_phone_country": "HK",
    "mobile_phone": "98765432",
    "mobile_phone_country": "HK"
  }
}
```

### Registration Request
```json
{
  "profile": {
    "home_phone": "12345678",
    "home_phone_country": "HK",
    "mobile_phone": "98765432",
    "mobile_phone_country": "HK"
  }
}
```

### Checkout Request
```json
{
  "user_preferences": {
    "home_phone": { "value": "12345678", "inputType": "text" },
    "home_phone_country": { "value": "HK", "inputType": "text" },
    "mobile_phone": { "value": "98765432", "inputType": "text" },
    "mobile_phone_country": { "value": "HK", "inputType": "text" }
  }
}
```

---

## Implementation Order

1. **Phase 1**: Backend model changes + migrations (safe, additive)
2. **Phase 2**: Backend API changes (backward compatible - new fields are optional)
3. **Phase 3**: Frontend changes (use new fields when available)
4. **Phase 4**: Cleanup workaround code
5. **Phase 5**: Testing

---

## Files to Modify

### Backend
1. `/backend/django_Admin3/userprofile/models/contact_number.py`
2. `/backend/django_Admin3/cart/models.py`
3. `/backend/django_Admin3/users/serializers.py`
4. `/backend/django_Admin3/users/views.py`
5. `/backend/django_Admin3/cart/views.py`

### Frontend
1. `/frontend/react-Admin3/src/components/User/UserFormWizard.js`
2. `/frontend/react-Admin3/src/components/Common/CommunicationDetailsPanel.js`
3. `/frontend/react-Admin3/src/components/Ordering/CheckoutSteps.js`

### Tests
1. `/backend/django_Admin3/userprofile/tests/test_models.py`
2. `/backend/django_Admin3/users/tests/test_views.py`
3. `/frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.test.js`
4. `/frontend/react-Admin3/src/components/Common/__tests__/CommunicationDetailsPanel.test.js`
