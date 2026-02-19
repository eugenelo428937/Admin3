# API Contract: User Admin Endpoints

**Branch**: `20260216-admin-panel-api` | **Base URL**: `/api/users/`

All user admin endpoints require superuser for ALL operations (including GET):
- **All operations**: `IsSuperUser`

---

## User Profiles — `/api/users/profiles/`

### `GET /api/users/profiles/`

List all user profiles with associated user information.

**Response 200**:
```json
[
  {
    "id": 1,
    "user": {
      "id": 1,
      "username": "jdoe",
      "first_name": "John",
      "last_name": "Doe",
      "email": "jdoe@example.com"
    },
    "title": "Mr",
    "send_invoices_to": "HOME",
    "send_study_material_to": "HOME",
    "remarks": ""
  }
]
```

**Response 403**: Not superuser

### `GET /api/users/profiles/{id}/`

Retrieve single profile.

**Response 200**: Single object (same format as list item)
**Response 403/404**: Standard

### `PUT /api/users/profiles/{id}/`

Update profile fields (user info is read-only).

**Request**:
```json
{
  "title": "Dr",
  "send_invoices_to": "WORK",
  "send_study_material_to": "HOME",
  "remarks": "VIP customer"
}
```

**Response 200**: Updated profile
**Response 400/403/404**: Standard

---

## Profile Addresses — `/api/users/profiles/{id}/addresses/`

### `GET /api/users/profiles/{id}/addresses/`

List addresses for a user profile.

**Response 200**:
```json
[
  {
    "id": 1,
    "address_type": "HOME",
    "address_data": {
      "line1": "123 Main St",
      "line2": "",
      "city": "London",
      "postcode": "SW1A 1AA"
    },
    "country": "United Kingdom",
    "company": null,
    "department": null
  }
]
```

### `PUT /api/users/profiles/{pid}/addresses/{aid}/`

Update a specific address.

**Request**:
```json
{
  "address_type": "HOME",
  "address_data": {"line1": "456 New St", "city": "London", "postcode": "SW1A 2BB"},
  "country": "United Kingdom"
}
```

**Response 200**: Updated address
**Response 400/403/404**: Standard

---

## Profile Contacts — `/api/users/profiles/{id}/contacts/`

### `GET /api/users/profiles/{id}/contacts/`

**Response 200**:
```json
[
  {
    "id": 1,
    "contact_type": "MOBILE",
    "number": "+44 7700 900000",
    "country_code": "GB"
  }
]
```

### `PUT /api/users/profiles/{pid}/contacts/{cid}/`

**Request**:
```json
{
  "contact_type": "MOBILE",
  "number": "+44 7700 900001",
  "country_code": "GB"
}
```

**Response 200/400/403/404**: Standard

---

## Profile Emails — `/api/users/profiles/{id}/emails/`

### `GET /api/users/profiles/{id}/emails/`

**Response 200**:
```json
[
  {
    "id": 1,
    "email_type": "PERSONAL",
    "email": "jdoe@example.com"
  }
]
```

### `PUT /api/users/profiles/{pid}/emails/{eid}/`

**Request**:
```json
{
  "email_type": "PERSONAL",
  "email": "jdoe-new@example.com"
}
```

**Response 200/400/403/404**: Standard

---

## Staff — `/api/users/staff/`

### `GET /api/users/staff/`

List all staff members.

**Response 200**:
```json
[
  {
    "id": 1,
    "user": {
      "id": 5,
      "username": "tutor1",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jsmith@example.com"
    },
    "created_at": "2026-02-16T10:00:00Z",
    "updated_at": "2026-02-16T10:00:00Z"
  }
]
```

### `POST /api/users/staff/`

**Request**:
```json
{
  "user": 5
}
```

**Response 201**: Created staff object
**Response 400**: User already has staff record (OneToOne constraint)
**Response 403**: Not superuser

### `GET /api/users/staff/{id}/`

Retrieve single staff record.

### `PUT /api/users/staff/{id}/`

Update staff record.

**Request**: Same as POST
**Response 200/400/403/404**: Standard

### `DELETE /api/users/staff/{id}/`

**Response 204**: Deleted
**Response 403**: Not superuser
