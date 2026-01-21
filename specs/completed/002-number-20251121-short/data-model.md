# Data Model: Test Suite Entities

**Feature**: Comprehensive Test Suite Coverage
**Date**: 2025-11-21

## Overview

This document describes the key entities (models) that require test coverage across 11 Django apps.

## App-by-App Model Breakdown

### 1. address_analytics App

**AddressLookupLog**
- **Purpose**: Tracks address lookup attempts for analytics and performance monitoring
- **Fields**:
  - postcode (CharField, max 10, indexed)
  - search_query (CharField, max 255, optional)
  - lookup_timestamp (DateTimeField, auto_now_add, indexed)
  - cache_hit (BooleanField, indexed)
  - response_time_ms (IntegerField)
  - result_count (IntegerField)
  - api_provider (CharField, max 20, indexed, default='postcoder')
  - success (BooleanField, indexed)
  - error_message (TextField, optional)
- **Relationships**: None
- **Validation Rules**:
  - postcode must be valid UK format (implicit)
  - api_provider must be 'postcoder' or 'getaddress'
  - response_time_ms must be positive integer
- **Key Tests**: Field validations, index creation, __str__ method

---

### 2. students App

**Student**
- **Purpose**: Stores student enrollment data and type classification
- **Fields**:
  - student_ref (AutoField, primary key)
  - user (OneToOneField to User, cascading delete)
  - student_type (CharField, choices: S/Q/I, default='regular')
  - apprentice_type (CharField, choices: none/L4/L7, default='none')
  - create_date (DateTimeField, auto_now_add)
  - modified_date (DateTimeField, auto_now)
  - remarks (TextField, optional)
- **Relationships**: OneToOne with User
- **Validation Rules**:
  - student_type must be 'S', 'Q', or 'I'
  - apprentice_type must be 'none', 'L4', or 'L7'
  - user must be unique (OneToOne constraint)
- **Key Tests**: Choice field validation, OneToOne uniqueness, auto timestamps

---

### 3. core_auth App

**No Models** (views-only authentication app)
- **Purpose**: JWT authentication and authorization
- **Test Focus**: View tests, authentication workflows, token generation/validation

---

### 4. exam_sessions App

**ExamSession** (requires codebase exploration for complete definition)
- **Purpose**: Manages exam session scheduling and details
- **Estimated Fields**: session_name, exam_date, registration_deadline, location, capacity
- **Relationships**: Likely ManyToMany with Subjects, ForeignKey to ExamPeriod
- **Key Tests**: Date validations, capacity constraints, session status

---

### 5. exam_sessions_subjects App

**ExamSessionSubject** (relationship model)
- **Purpose**: Links exam sessions to subjects (many-to-many intermediary)
- **Estimated Fields**: exam_session (FK), subject (FK), registration_open, max_candidates
- **Relationships**: ForeignKey to ExamSession, ForeignKey to Subject
- **Key Tests**: Unique together constraint, registration logic

---

### 6. marking App

**Marking** (requires codebase exploration)
- **Purpose**: Tracks marking/grading workflow for exam submissions
- **Estimated Fields**: student (FK), exam_session (FK), marker (FK to User), marks, status, submitted_date
- **Relationships**: ForeignKey to Student, ExamSession, User (marker)
- **Key Tests**: Status transitions, marks validation, submission workflow

---

### 7. marking_vouchers App

**MarkingVoucher** (requires codebase exploration)
- **Purpose**: Voucher management for marking services
- **Estimated Fields**: code, student (FK), valid_from, valid_until, used, used_date
- **Relationships**: ForeignKey to Student
- **Key Tests**: Code uniqueness, date validations, redemption logic

---

### 8. tutorials App

**TutorialEvent** / **TutorialSession** (requires codebase exploration)
- **Purpose**: Manages tutorial event scheduling and registration
- **Estimated Fields**: event_name, event_date, location, capacity, instructor, subject (FK)
- **Relationships**: ForeignKey to Subject, ManyToMany with Students (registrations)
- **External Dependencies**: Administrate GraphQL API (for event data sync)
- **Key Tests**: Capacity constraints, date validations, external API mocking

---

### 9. userprofile App

**UserProfile** (requires codebase exploration)
- **Purpose**: Extends User model with additional profile information
- **Estimated Fields**: user (OneToOne), phone, address, organization, professional_status
- **Relationships**: OneToOne with User
- **Key Tests**: OneToOne uniqueness, optional field handling

---

### 10. users App

**User** (Django auth User or custom User model)
- **Purpose**: User account management
- **Tests Required**: Custom user model methods, permissions, user creation
- **Key Tests**: User creation, authentication, permissions

---

### 11. address_cache App

**AddressCache** (requires codebase exploration)
- **Purpose**: Caches address lookup results for performance
- **Estimated Fields**: postcode, cached_data (JSONField), cache_timestamp, expiry_date
- **Relationships**: None
- **Key Tests**: Cache expiry logic, JSONField validation

---

## Testing Strategy by Model Complexity

### Simple Models (5-7 tests per model)
- address_analytics.AddressLookupLog
- address_cache.AddressCache (estimated)
- exam_sessions_subjects.ExamSessionSubject (estimated)
- marking_vouchers.MarkingVoucher (estimated)

### Medium Models (8-12 tests per model)
- students.Student
- userprofile.UserProfile (estimated)
- exam_sessions.ExamSession (estimated)

### Complex Models (12+ tests per model)
- marking.Marking (estimated - workflow complexity)
- tutorials.TutorialEvent (estimated - external API integration)

---

## Relationships Map

```
User ───┬──── OneToOne ──── Student
        │
        ├──── OneToOne ──── UserProfile
        │
        └──── ForeignKey ──── Marking (as marker)

Student ─┬─── ForeignKey ──── Marking
         │
         ├─── ForeignKey ──── MarkingVoucher
         │
         └─── ManyToMany ──── TutorialEvent (registrations)

ExamSession ──┬─── ManyToMany ──── Subject (via ExamSessionSubject)
              │
              └─── ForeignKey ──── Marking

Subject ──┬─── ForeignKey ──── TutorialEvent
          │
          └─── ManyToMany ──── ExamSession (via ExamSessionSubject)
```

---

## Test Data Requirements

### Shared Fixtures (needed by most apps)
```python
# User fixtures
test_user = User.objects.create_user(
    username='test_user',
    email='test@example.com',
    password='testpass123'
)

admin_user = User.objects.create_user(
    username='admin_user',
    email='admin@example.com',
    password='adminpass123',
    is_staff=True,
    is_superuser=True
)
```

### App-Specific Fixtures

**students app**:
```python
student = Student.objects.create(
    user=test_user,
    student_type='S',
    apprentice_type='none'
)
```

**exam_sessions app** (estimated):
```python
exam_session = ExamSession.objects.create(
    name='June 2025 Session',
    exam_date='2025-06-15',
    registration_deadline='2025-05-01'
)
```

---

## Summary

- **Total Models Identified**: 11 models across 11 apps
- **Simple Models**: 4 (address analytics, cache, vouchers, relationships)
- **Medium Models**: 4 (students, profiles, exam sessions, user)
- **Complex Models**: 2 (marking workflow, tutorials with external API)
- **No Models**: 1 (core_auth - views only)

**Next**: Create quickstart.md with test execution guide
