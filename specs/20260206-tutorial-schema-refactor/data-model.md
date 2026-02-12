# Data Model: Tutorial Schema Refactor

**Feature**: `20260206-tutorial-schema-refactor`
**Date**: 2026-02-06

## New Entities (acted schema)

### TutorialCourseTemplate

**Table**: `"acted"."tutorial_course_templates"`
**Django app**: `tutorials`

| Field | Type | Constraints | Notes |
| ----- | ---- | ----------- | ----- |
| id | BigAutoField | PK | Auto-generated |
| code | CharField(50) | unique | Copied from adm.course_templates.code |
| title | CharField(255) | required | Copied from adm.course_templates.title |
| description | TextField | blank, default="" | Not present in adm (defaults to empty) |
| is_active | BooleanField | default=True | Mapped from adm.course_templates.active |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Relationships**: None outgoing. Incoming: adm.CourseTemplate (one-to-one FK from adm)

---

### Staff

**Table**: `"acted"."staff"`
**Django app**: `tutorials`

| Field | Type | Constraints | Notes |
| ----- | ---- | ----------- | ----- |
| id | BigAutoField | PK | Auto-generated |
| user | OneToOneField(auth.User) | unique, on_delete=PROTECT | Links to Django auth_user |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Relationships**:
- `user` → auth.User (one-to-one, PROTECT)
- Incoming: TutorialInstructor.staff (one-to-one)

**`__str__`**: Returns `user.get_full_name()` or `user.username`

---

### TutorialInstructor

**Table**: `"acted"."tutorial_instructors"`
**Django app**: `tutorials`

| Field | Type | Constraints | Notes |
| ----- | ---- | ----------- | ----- |
| id | BigAutoField | PK | Auto-generated |
| staff | OneToOneField(Staff) | nullable, on_delete=SET_NULL | Nullable for instructors without auth_user |
| is_active | BooleanField | default=True | Copied from adm.instructors.is_active |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Relationships**:
- `staff` → Staff (one-to-one, SET_NULL)
- Incoming: TutorialEvents.instructor, TutorialSessions.instructor (one-to-many each)
- Incoming: adm.Instructor (one-to-one FK from adm)

**`__str__`**: Returns `staff.user.get_full_name()` if staff exists, else `f"Instructor #{id}"`

---

### TutorialLocation

**Table**: `"acted"."tutorial_locations"`
**Django app**: `tutorials`

| Field | Type | Constraints | Notes |
| ----- | ---- | ----------- | ----- |
| id | BigAutoField | PK | Auto-generated |
| name | CharField(255) | required | Copied from adm.locations.name |
| code | CharField(50) | blank=True | Copied from adm.locations.code |
| is_active | BooleanField | default=True | Copied from adm.locations.active |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Relationships**:
- Incoming: TutorialVenue.location (one-to-many)
- Incoming: TutorialEvents.location, TutorialSessions.location (one-to-many each)
- Incoming: adm.Location (one-to-one FK from adm)

**`__str__`**: Returns `name`

---

### TutorialVenue

**Table**: `"acted"."tutorial_venues"`
**Django app**: `tutorials`

| Field | Type | Constraints | Notes |
| ----- | ---- | ----------- | ----- |
| id | BigAutoField | PK | Auto-generated |
| name | CharField(255) | required | Copied from adm.venues.name |
| description | TextField | blank, default="" | Copied from adm.venues.description |
| location | ForeignKey(TutorialLocation) | nullable, on_delete=SET_NULL | Mapped from adm.venues.location (via external_id) |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Relationships**:
- `location` → TutorialLocation (many-to-one, SET_NULL)
- Incoming: TutorialEvents.venue, TutorialSessions.venue (one-to-many each)
- Incoming: adm.Venue (one-to-one FK from adm)

**`__str__`**: Returns `name`

---

## Modified Entities (acted schema)

### TutorialEvents (existing - modified)

**Table**: `"acted"."tutorial_events"` (unchanged)

| New/Changed Field | Type | Constraints | Notes |
| ----------------- | ---- | ----------- | ----- |
| instructor | ForeignKey(TutorialInstructor) | nullable, on_delete=SET_NULL, related_name='events' | NEW field |
| venue | ForeignKey(TutorialVenue) | nullable, on_delete=SET_NULL, related_name='events' | CHANGED from CharField(255) |
| location | ForeignKey(TutorialLocation) | nullable, on_delete=SET_NULL, related_name='events' | NEW field |

**Fields removed**: `venue` CharField (replaced by FK)

---

### TutorialSessions (existing - modified)

**Table**: `"acted"."tutorial_sessions"` (unchanged)

| New/Changed Field | Type | Constraints | Notes |
| ----------------- | ---- | ----------- | ----- |
| instructor | ForeignKey(TutorialInstructor) | nullable, on_delete=SET_NULL, related_name='sessions' | NEW field |
| venue | ForeignKey(TutorialVenue) | nullable, on_delete=SET_NULL, related_name='sessions' | CHANGED from CharField(255) |
| location | ForeignKey(TutorialLocation) | nullable, on_delete=SET_NULL, related_name='sessions' | CHANGED from CharField(255) |

**Fields removed**: `venue` CharField, `location` CharField (both replaced by FKs)

---

## Modified Entities (adm schema)

### CourseTemplate (existing - modified)

**Table**: `"adm"."course_templates"` (unchanged)

| Change | Field | Type | Notes |
| ------ | ----- | ---- | ----- |
| ADD | tutorial_course_template | ForeignKey(TutorialCourseTemplate) | nullable, on_delete=SET_NULL |
| REMOVE | code | CharField(50) | After data migration |
| REMOVE | title | CharField(255) | After data migration |
| REMOVE | categories | TextField | After data migration |
| REMOVE | active | BooleanField | After data migration |

**Retained fields**: id, external_id, event_learning_mode, custom_fields, tutorial_course_template (FK), created_at, updated_at

---

### Instructor (existing - modified)

**Table**: `"adm"."instructors"` (unchanged)

| Change | Field | Type | Notes |
| ------ | ----- | ---- | ----- |
| ADD | tutorial_instructor | ForeignKey(TutorialInstructor) | nullable, on_delete=SET_NULL |
| REMOVE | first_name | CharField(255) | After data migration |
| REMOVE | last_name | CharField(255) | After data migration |
| REMOVE | email | EmailField(255) | After data migration |

**Retained fields**: id, external_id, legacy_id, is_active, tutorial_instructor (FK), created_at, updated_at, last_synced

---

### Location (existing - modified)

**Table**: `"adm"."locations"` (unchanged)

| Change | Field | Type | Notes |
| ------ | ----- | ---- | ----- |
| ADD | tutorial_location | ForeignKey(TutorialLocation) | nullable, on_delete=SET_NULL |
| REMOVE | name | CharField(255) | After data migration |
| REMOVE | code | CharField(50) | After data migration |
| REMOVE | active | BooleanField | After data migration |

**Retained fields**: id, external_id, legacy_id, tutorial_location (FK), created_at, updated_at

---

### Venue (existing - modified)

**Table**: `"adm"."venues"` (unchanged)

| Change | Field | Type | Notes |
| ------ | ----- | ---- | ----- |
| ADD | tutorial_venue | ForeignKey(TutorialVenue) | nullable, on_delete=SET_NULL |
| REMOVE | name | CharField(255) | After data migration |
| REMOVE | description | TextField | After data migration |

**Retained fields**: id, external_id, location (FK to adm.Location via external_id), tutorial_venue (FK), created_at, updated_at

---

## Entity Relationship Diagram (text)

```
auth.User
    │ (one-to-one, PROTECT)
    ▼
acted.Staff
    │ (one-to-one, SET_NULL, nullable)
    ▼
acted.TutorialInstructor ◄──── adm.Instructor (cross-schema FK)
    │ (one-to-many, SET_NULL)
    ├──► acted.TutorialEvents
    └──► acted.TutorialSessions

acted.TutorialLocation ◄──── adm.Location (cross-schema FK)
    │ (one-to-many, SET_NULL)
    ├──► acted.TutorialVenue
    ├──► acted.TutorialEvents
    └──► acted.TutorialSessions

acted.TutorialVenue ◄──── adm.Venue (cross-schema FK)
    │ (one-to-many, SET_NULL)
    ├──► acted.TutorialEvents
    └──► acted.TutorialSessions

acted.TutorialCourseTemplate ◄──── adm.CourseTemplate (cross-schema FK)
    (no outgoing FKs)
```

## Data Migration Mapping

| Source (adm) | Target (acted) | Field Mapping |
| ------------ | -------------- | ------------- |
| course_templates.code | tutorial_course_templates.code | Direct copy |
| course_templates.title | tutorial_course_templates.title | Direct copy |
| course_templates.active | tutorial_course_templates.is_active | Rename: active → is_active |
| (none) | tutorial_course_templates.description | Default: "" |
| instructors.is_active | tutorial_instructors.is_active | Direct copy |
| (auth_user match) | staff.user | Created only if auth_user exists for instructor. Chain: adm.instructors → acted.tutorial_instructors → acted.staff → public.auth_user |
| locations.name | tutorial_locations.name | Direct copy |
| locations.code | tutorial_locations.code | Direct copy |
| locations.active | tutorial_locations.is_active | Rename: active → is_active |
| venues.name | tutorial_venues.name | Direct copy |
| venues.description | tutorial_venues.description | Direct copy |
| venues.location (external_id) | tutorial_venues.location_id | Resolved via adm.locations → acted.tutorial_locations FK chain |
