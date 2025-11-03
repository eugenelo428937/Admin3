# Data Model: Hong Kong Address Lookup

**Feature**: 003-currently-the-backend
**Date**: 2025-11-01

## Overview

This feature **extends existing models** rather than creating new ones. No database migrations required.

---

## Existing Models (No Changes Required)

### User Profile Address Fields

The existing Django user profile model already contains the necessary address fields for both home and work addresses:

```python
# Existing fields (backend/django_Admin3/users/models.py or similar)
class UserProfile(models.Model):
    # Home Address
    home_building = models.CharField(max_length=255, blank=True)
    home_address = models.CharField(max_length=255, blank=True)
    home_district = models.CharField(max_length=100, blank=True)
    home_city = models.CharField(max_length=100, blank=True)
    home_county = models.CharField(max_length=100, blank=True)
    home_postal_code = models.CharField(max_length=20, blank=True)
    home_state = models.CharField(max_length=100, blank=True)
    home_country = models.CharField(max_length=100, blank=True)

    # Work Address
    work_building = models.CharField(max_length=255, blank=True)
    work_address = models.CharField(max_length=255, blank=True)
    work_district = models.CharField(max_length=100, blank=True)
    work_city = models.CharField(max_length=100, blank=True)
    work_county = models.CharField(max_length=100, blank=True)
    work_postal_code = models.CharField(max_length=20, blank=True)
    work_state = models.CharField(max_length=100, blank=True)
    work_country = models.CharField(max_length=100, blank=True)
```

**Status**: ✅ Existing schema is sufficient. No migrations needed.

---

## Hong Kong Address Data Mapping

### HK ALS API Response → Django Fields

Based on research findings, the HK Address Lookup Service returns addresses with the following structure (example):

```json
{
  "SuggestedAddress": [
    {
      "Address": {
        "PremisesAddress": {
          "EngPremisesAddress": {
            "EngBlock": {
              "BuildingName": "Central Government Offices"
            },
            "EngStreet": {
              "StreetName": "Tim Mei Avenue",
              "BuildingNoFrom": "2"
            },
            "EngDistrict": {
              "DcDistrict": "Central & Western"
            }
          },
          "Region": "HK"
        }
      }
    }
  ]
}
```

### Field Mapping Rules

| HK ALS Field | Django Field | Example Value | Notes |
|--------------|--------------|---------------|-------|
| `BuildingName` | `home_building` or `work_building` | "Central Government Offices" | Commercial/gov buildings |
| `BuildingName` + Flat/Floor | `home_building` or `work_building` | "Flat 5A, Floor 12, Block 3, Mei Foo Sun Chuen" | Residential estates (3D) |
| `StreetName` + `BuildingNoFrom` | `home_address` or `work_address` | "2 Tim Mei Avenue" | Street + number |
| `DcDistrict` | `home_district` or `work_district` | "Central & Western" | 18 districts in HK |
| `Region` | `home_county` or `work_county` | "HK" or "Kowloon" or "New Territories" | 3 main regions |
| N/A | `home_city` or `work_city` | "Hong Kong" | Fixed value |
| N/A | `home_postal_code` or `work_postal_code` | "" (empty) | HK doesn't use postal codes |
| N/A | `home_state` or `work_state` | "" (empty) | N/A for HK |
| "Hong Kong" | `home_country` or `work_country` | "Hong Kong" | Country identifier |

### Validation Rules (from Spec FR-016, FR-017)

**Strict Validation** (lookup-selected addresses):
- `building` OR `address` must be present
- `district` must be present
- `country` must be "Hong Kong" or "HK"
- All fields populated from API response (no partial data)

**Basic Validation** (manual entry):
- `building` OR `address` required
- `district` required
- `country` required
- Other fields optional

---

## Entities

### 1. HKAddressLookupRequest (Transient - Not Stored)

**Purpose**: Represents user's search query sent to HK ALS API

**Structure**:
```python
# Not a Django model - just API request data
{
    "search_text": str,  # Free-text search input
    "country": "Hong Kong"  # Context for routing to HK lookup
}
```

**Lifecycle**: Created on frontend, passed to backend endpoint, discarded after API call

---

### 2. HKAddressLookupResponse (Transient - Not Stored)

**Purpose**: Represents address suggestions returned from HK ALS API

**Structure**:
```python
# Not a Django model - API response DTO
{
    "addresses": [
        {
            "building": str,
            "street": str,
            "district": str,
            "region": str,
            "formatted_address": str,  # Display string
            "is_3d": bool  # True if residential estate with flat/floor
        }
    ],
    "error": str | null,
    "allow_manual": bool  # True if service unavailable
}
```

**Lifecycle**: Retrieved from HK ALS API, formatted by backend, sent to frontend, displayed in UI, discarded after user selection

---

### 3. UserProfile (Existing - Extended Usage)

**Purpose**: Store selected or manually entered Hong Kong address

**Validation States**:
- `lookup_selected`: Strict validation applied (FR-016)
- `manual_entry`: Basic validation applied (FR-017)
- Validation flag stored in session/form state (not persisted in DB)

**Example Data** (after HK address selection):
```python
user_profile = UserProfile(
    home_building="Flat 5A, Floor 12, Block 3, Mei Foo Sun Chuen",
    home_address="",  # May be empty for residential estates
    home_district="Sham Shui Po",
    home_city="Hong Kong",
    home_county="Kowloon",
    home_postal_code="",  # Empty for HK
    home_state="",
    home_country="Hong Kong",

    work_building="Central Government Offices",
    work_address="2 Tim Mei Avenue",
    work_district="Central & Western",
    work_city="Hong Kong",
    work_county="HK",
    work_postal_code="",
    work_state="",
    work_country="Hong Kong"
)
```

**Mixed Country Example** (UK home + HK work):
```python
user_profile = UserProfile(
    # UK home address
    home_building="10 Downing Street",
    home_address="Westminster",
    home_district="City of Westminster",
    home_city="London",
    home_county="Greater London",
    home_postal_code="SW1A 2AA",
    home_state="England",
    home_country="United Kingdom",

    # HK work address
    work_building="Central Government Offices",
    work_address="2 Tim Mei Avenue",
    work_district="Central & Western",
    work_city="Hong Kong",
    work_county="HK",
    work_postal_code="",
    work_state="",
    work_country="Hong Kong"
)
```

**Requirement Mapping**: FR-003 (mix countries), FR-018 (same user profile structure)

---

## State Transitions

### Address Entry Flow

```
[User selects country: Hong Kong]
    ↓
[Enters free-text search]
    ↓
[Clicks "Search" button]
    ↓
┌─────────────────────────────────────────────┐
│ Backend calls HK ALS API                    │
├─────────────────────────────────────────────┤
│ Success?                                    │
│  Yes → Return address list                  │
│  No  → Return error + allow_manual=true     │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Frontend displays results                   │
├─────────────────────────────────────────────┤
│ API Success?                                │
│  Yes → Show address selection dropdown      │
│  No  → Disable lookup, show manual fields   │
└─────────────────────────────────────────────┘
    ↓
[User selects address OR enters manually]
    ↓
┌─────────────────────────────────────────────┐
│ Populate form fields                        │
├─────────────────────────────────────────────┤
│ Source: Lookup?                             │
│  Yes → Apply strict validation (FR-016)     │
│  No  → Apply basic validation (FR-017)      │
└─────────────────────────────────────────────┘
    ↓
[Form submission]
    ↓
[Save to UserProfile model]
```

---

## Relationships

**No new relationships** - Feature uses existing UserProfile model fields.

**Country Field Usage**:
- Acts as discriminator for address lookup routing
- `country == "Hong Kong"` → Use HK ALS API
- `country == "United Kingdom"` → Use UK GetAddress.io API
- Other countries → Manual entry only (no lookup service)

---

## Performance Considerations

**No database performance impact**:
- Uses existing indexed fields (if `country` is indexed)
- No new foreign keys or joins
- No additional queries per request

**API Performance**:
- HK ALS API response time: < 2 seconds (estimated, per research)
- Backend timeout: 10 seconds (same as UK lookup)
- Frontend debounce: 300ms (if autocomplete added later)

---

## Summary

**Database Changes**: None
**New Models**: None
**Extended Models**: UserProfile (existing address fields reused)
**Validation Logic**: Added (conditional based on entry method)
**API Integration**: New (HK ALS API calls)

**Status**: ✅ Data model design complete. No migrations required. Proceed to contracts.
