# Implementation Plan: Profile Management Wizard

**Branch**: `002-profile-wizard-refactor` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-profile-wizard-refactor/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Spec found and parsed successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✅
   → Project Type: Web application (frontend + backend)
   → Structure Decision: Option 2 (frontend/backend separation)
3. Fill the Constitution Check section ✅
   → No constitution file found - proceeding with standard practices
4. Evaluate Constitution Check section ✅
   → No violations - refactoring existing components
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ✅
   → No NEEDS CLARIFICATION markers - all tech stack known
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ⏳
7. Re-evaluate Constitution Check section ⏳
8. Plan Phase 2 → Task generation approach ⏳
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Refactor the existing ProfileForm component to reuse the RegistrationWizard pattern, creating a unified dual-mode component (UserFormWizard) that handles both new user registration and authenticated user profile editing. The refactored wizard will support incremental step-by-step saving, automatic email verification when email changes, password change notifications, and seamless data pre-filling in profile mode.

**Technical Approach**:
- Rename RegistrationWizard → UserFormWizard
- Add mode prop ('registration' | 'profile') to distinguish behavior
- Implement change detection for incremental saves (diff current vs initial state)
- Integrate with existing backend APIs (profile GET/PATCH, email verification, password notifications)
- Leverage existing components (SmartAddressInput, ValidatedPhoneInput, Material-UI)

## Technical Context

**Language/Version**: JavaScript (ES6+), React 18
**Primary Dependencies**:
- **Frontend**: Material-UI v5, React Router v6, Axios
- **Backend**: Django 5.1, Django REST Framework, PostgreSQL
**Storage**: PostgreSQL database (existing schema - no migrations needed)
**Testing**: Jest + React Testing Library (frontend), Django TestCase (backend - existing)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
**Project Type**: Web application (frontend/backend separation)
**Performance Goals**:
- Profile load: < 500ms
- Step save: < 1 second
- Email send: < 30 seconds
- Field validation: < 100ms
**Constraints**:
- Must maintain backward compatibility with existing registration flow
- Zero database schema changes (pure component refactor)
- Must preserve existing email verification and password reset infrastructure
**Scale/Scope**:
- Refactor 1 component (RegistrationWizard → UserFormWizard)
- Integrate with 1 navigation component (UserActions)
- Add 1 new route (/profile)
- Create 1 new page component (ProfilePage)
- Deprecate 1 legacy component (ProfileForm)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check**: ✅ PASS

This refactoring aligns with simplicity principles:
- **Single Responsibility**: One wizard component handles both registration and profile editing (eliminates duplication)
- **Existing Infrastructure**: Reuses all existing backend APIs, validation, email services
- **No New Complexity**: No new database tables, no new services, no new dependencies
- **Progressive Enhancement**: Adds features (step saving) without breaking existing functionality

**Complexity Justification**: None needed - this is a simplification refactor

## Project Structure

### Documentation (this feature)
```
specs/002-profile-wizard-refactor/
├── spec.md              # Feature specification ✅
├── plan.md              # This file (implementation plan) ⏳
├── research.md          # Phase 0 output (N/A - no research needed)
├── data-model.md        # Phase 1 output (reuses existing models)
├── quickstart.md        # Phase 1 output (manual testing scenarios)
├── contracts/           # Phase 1 output (API contracts documentation)
│   ├── get-profile.yaml
│   ├── update-profile.yaml
│   ├── verify-email.yaml
│   └── password-notification.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root - Web Application Structure)

**Frontend**:
```
frontend/react-Admin3/
├── src/
│   ├── components/
│   │   ├── User/
│   │   │   ├── RegistrationWizard.js → UserFormWizard.js (RENAME)
│   │   │   ├── ProfileForm.js (DEPRECATE after migration)
│   │   │   ├── SmartAddressInput.jsx (REUSE - existing)
│   │   │   └── ValidatedPhoneInput.js (REUSE - existing)
│   │   └── Navigation/
│   │       └── UserActions.js (UPDATE - add profile route)
│   ├── pages/
│   │   └── ProfilePage.js (CREATE - new)
│   ├── services/
│   │   ├── userService.js (UPDATE - add profile CRUD)
│   │   └── authService.js (UPDATE - add password notification)
│   └── App.js (UPDATE - add /profile route)
└── tests/
    └── components/
        └── User/
            ├── UserFormWizard.test.js (UPDATE from RegistrationWizard.test.js)
            └── ProfilePage.test.js (CREATE)
```

**Backend** (existing - minimal changes):
```
backend/django_Admin3/
└── apps/
    └── users/
        └── views.py (existing - profile CRUD already implemented)
```

**Structure Decision**: Web application (Option 2) - frontend/backend already separated

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE (No research needed)

**Rationale**: All technical decisions already made:
1. **Frontend Framework**: React 18 (existing)
2. **UI Library**: Material-UI v5 (existing)
3. **Form Management**: useState hooks (existing pattern in RegistrationWizard)
4. **Change Detection**: Object diffing (initial state vs current state)
5. **API Communication**: Axios (existing)
6. **Routing**: React Router v6 (existing)
7. **Backend APIs**: Django REST Framework (existing endpoints)

**No unknowns or NEEDS CLARIFICATION markers** - proceeding directly to Phase 1.

## Phase 1: Design & Contracts
*Prerequisites: research.md complete (N/A)*

### 1. Data Model (data-model.md)

**Entities** (all existing - no schema changes):

**User Profile**:
- Source: `backend/apps/users/models.py` (User, Profile models)
- Fields: first_name, last_name, email, title, email_verified, email_verification_token
- Relationships: User 1:1 Profile, User 1:1 HomeAddress, User 1:1 WorkAddress (optional)

**Home Address**:
- Source: `backend/apps/users/models.py` (HomeAddress model)
- Fields: building, street, district, town, county, postcode, state, country
- Validation: Required fields based on country (dynamic via addressMetadataService)

**Work Address** (Optional):
- Source: `backend/apps/users/models.py` (WorkAddress model)
- Fields: company, department, building, street, district, town, county, postcode, state, country
- Validation: Same as Home Address

**Contact Numbers**:
- Source: `backend/apps/users/models.py` (ContactNumbers model)
- Fields: home_phone, work_phone, mobile_phone
- Format: {phone_code}{phone_number}

**Delivery Preferences**:
- Source: Profile model
- Fields: send_invoices_to (HOME|WORK), send_study_material_to (HOME|WORK)

**State Transitions**:
- Email verified: false → (verification link clicked) → true
- Password: (change detected) → trigger notification email

### 2. API Contracts (contracts/)

**Contract 1: GET /api/users/profile/**
```yaml
endpoint: GET /api/users/profile/
authentication: JWT (required)
request: {}
response:
  200 OK:
    user:
      id: string
      first_name: string
      last_name: string
      email: string
    profile:
      title: string
      send_invoices_to: "HOME" | "WORK"
      send_study_material_to: "HOME" | "WORK"
    home_address:
      building: string
      street: string
      district: string
      town: string
      county: string
      postcode: string
      state: string
      country: string
    work_address: {...} (nullable)
    contact_numbers:
      home_phone: string
      work_phone: string
      mobile_phone: string
  401 Unauthorized: {detail: "Authentication required"}
  404 Not Found: {detail: "Profile not found"}
```

**Contract 2: PATCH /api/users/profile/**
```yaml
endpoint: PATCH /api/users/profile/
authentication: JWT (required)
request:
  user: (optional)
    first_name: string
    last_name: string
    email: string
  profile: (optional)
    title: string
    send_invoices_to: "HOME" | "WORK"
    send_study_material_to: "HOME" | "WORK"
  home_address: (optional)
    [any subset of address fields]
  work_address: (optional)
    [any subset of address fields or {} to clear]
  contact_numbers: (optional)
    [any subset of phone fields]
  password: string (optional - if provided, triggers notification)
response:
  200 OK:
    [same structure as GET]
    email_verification_sent: boolean (true if email changed)
    password_notification_sent: boolean (true if password changed)
  400 Bad Request: {field: ["Error message"]}
  401 Unauthorized: {detail: "Authentication required"}
  409 Conflict: {email: ["Email already in use"]}
```

**Contract 3: POST /api/users/verify-email/**
```yaml
endpoint: POST /api/users/verify-email/
authentication: JWT (required)
request:
  email: string
response:
  200 OK:
    detail: "Verification email sent"
    verification_token_expires: datetime (ISO 8601)
  400 Bad Request: {email: ["Invalid email"]}
  429 Too Many Requests: {detail: "Rate limit exceeded"}
```

**Contract 4: POST /api/auth/password-notification/**
```yaml
endpoint: POST /api/auth/password-notification/
authentication: JWT (required)
request: {}
response:
  200 OK:
    detail: "Password change notification sent"
    email_sent_to: string
  401 Unauthorized: {detail: "Authentication required"}
  500 Server Error: {detail: "Email send failed"}
```

### 3. Frontend Component Contracts

**UserFormWizard Component Props**:
```typescript
interface UserFormWizardProps {
  mode: 'registration' | 'profile';           // Determines wizard behavior
  initialData?: {                              // Pre-fill data (profile mode only)
    user: {first_name, last_name, email};
    profile: {title, send_invoices_to, send_study_material_to};
    home_address: {...};
    work_address: {...};
    contact_numbers: {...};
  };
  onSuccess?: (result: any) => void;          // Success callback
  onError?: (error: string) => void;          // Error callback
  onSwitchToLogin?: () => void;               // Registration mode only
}
```

**State Management**:
```javascript
// Change tracking state
const [initialFormState, setInitialFormState] = useState({});
const [currentFormState, setCurrentFormState] = useState({});

// Compute changed fields
const getChangedFields = () => {
  const changes = {};
  Object.keys(currentFormState).forEach(key => {
    if (JSON.stringify(currentFormState[key]) !== JSON.stringify(initialFormState[key])) {
      changes[key] = currentFormState[key];
    }
  });
  return changes;
};
```

### 4. Test Scenarios (quickstart.md)

**Quickstart Scenario 1: Edit Profile**
```
1. Login as existing user (test@example.com / password123)
2. Click "Profile" in user menu
3. Verify wizard opens with pre-filled data
4. Edit first_name in Step 1: "John" → "Jonathan"
5. Click "Save Progress"
6. Verify success message appears
7. Verify backend updated only first_name field
```

**Quickstart Scenario 2: Email Change Verification**
```
1. Login and open profile wizard
2. Step 1: Change email to new-email@example.com
3. Click "Next" or "Save Progress"
4. Verify alert appears: "Verification email sent to new-email@example.com"
5. Check email inbox for verification message
6. Verify can continue editing other steps
```

**Quickstart Scenario 3: Password Change Notification**
```
1. Login and navigate to Step 5 (Security)
2. Enter new password: "NewSecure123!"
3. Confirm password: "NewSecure123!"
4. Click "Save Changes"
5. Verify success message: "Password updated successfully"
6. Check email for "Password Reset Completed" notification
```

**Quickstart Scenario 4: Incremental Saves**
```
1. Open profile wizard
2. Step 1: Edit first_name, leave last_name unchanged
3. Save step
4. Step 2: Edit home_street, leave other address fields unchanged
5. Save step
6. Verify backend received only first_name and home_street in requests
```

**Quickstart Scenario 5: Registration Still Works**
```
1. Logout
2. Navigate to /register
3. Complete all wizard steps
4. Verify new account created
5. Verify all fields saved (not incremental in registration mode)
```

### 5. Update Agent Context

**Command**: `.specify/scripts/bash/update-agent-context.sh` (for CLAUDE.md)

**New Content to Add**:
```markdown
## Profile Management Wizard (Feature 002)

**Component**: UserFormWizard (renamed from RegistrationWizard)
**Modes**:
- Registration: New user account creation
- Profile: Authenticated user profile editing

**Key Patterns**:
- Dual-mode component with mode prop
- Change detection: diff initial vs current state
- Incremental saves: PATCH only changed fields
- Email verification trigger on email change
- Password notification on password change

**Files**:
- Component: frontend/react-Admin3/src/components/User/UserFormWizard.js
- Page: frontend/react-Admin3/src/pages/ProfilePage.js
- Services: userService.js, authService.js

**APIs Used**:
- GET /api/users/profile/ (fetch user data)
- PATCH /api/users/profile/ (partial update)
- POST /api/users/verify-email/ (trigger verification)
- POST /api/auth/password-notification/ (password change email)
```

**Output**: Updated CLAUDE.md (if exists) or create new agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load base template**: `.specify/templates/tasks-template.md`

2. **Generate tasks from Phase 1 design**:
   - From API contracts (contracts/*.yaml):
     - Contract test tasks (verify request/response schemas)
     - Mock service integration tasks

   - From data-model.md:
     - No new models (existing)
     - State transition logic tasks (email verification flag, password change detection)

   - From quickstart.md:
     - Integration test tasks (one per scenario)
     - Manual testing validation tasks

   - Component refactoring tasks:
     - Rename RegistrationWizard → UserFormWizard
     - Add mode prop implementation
     - Implement change detection logic
     - Add profile data pre-filling
     - Implement incremental save
     - Add email verification flow
     - Add password notification flow

   - Service layer tasks:
     - Add getUserProfile() to userService
     - Add updateUserProfile() to userService
     - Add sendPasswordResetNotification() to authService

   - Integration tasks:
     - Create ProfilePage component
     - Update UserActions navigation
     - Add /profile route
     - Update tests

3. **Ordering Strategy**:
   - **Setup Phase**: Component rename, import updates
   - **Service Layer**: Add API service methods (parallel)
   - **Core Implementation**: Mode prop, change detection, data pre-filling
   - **Feature Implementation**: Incremental save, email verification, password notification
   - **Integration**: ProfilePage, routing, navigation
   - **Testing**: Unit tests, integration tests, manual testing
   - **Cleanup**: Deprecate ProfileForm, remove unused code

4. **Parallelization** (mark with [P]):
   - API service methods (different files)
   - Test file creation (different files)
   - Component prop additions (independent features)

**Estimated Output**:
- **Total tasks**: 50-60 numbered tasks
- **Phases**: 10 phases (Setup, Service Layer, Mode Logic, Data Loading, Incremental Save, Email Verification, Password Notification, Integration, Testing, Cleanup)
- **Parallel tasks**: ~15-20 tasks marked [P]
- **User Stories mapped**: 5 main scenarios from spec.md

**Task Breakdown by Phase**:
1. **Setup** (5 tasks): Rename component, update imports
2. **Service Layer** (3 tasks): Add API methods (parallel)
3. **Mode Logic** (6 tasks): Dual-mode prop implementation
4. **Data Loading** (6 tasks): Profile fetch and pre-fill
5. **Incremental Save** (6 tasks): Change detection, partial updates
6. **Email Verification** (5 tasks): Detection, trigger, UI alerts
7. **Password Notification** (4 tasks): Detection, trigger, notifications
8. **Integration** (4 tasks): ProfilePage, routing, navigation
9. **Testing** (12 tasks): Unit, integration, manual tests
10. **Cleanup** (5 tasks): Deprecate ProfileForm, remove legacy code

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md with 50-60 tasks)
**Phase 4**: Implementation (execute tasks following TDD - tests first, then implementation)
**Phase 5**: Validation (run test suite, execute quickstart.md scenarios, performance validation)

**Performance Validation Criteria** (from spec.md Success Criteria):
- Profile load < 500ms ✓
- Step save < 1 second ✓
- Email delivery < 30 seconds ✓
- Field validation < 100ms ✓
- 100% only changed fields saved ✓

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - this is a simplification refactor:
- Reduces code duplication (one wizard vs two separate forms)
- Reuses existing backend infrastructure
- No new database tables or services
- Pure component-level refactoring

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (N/A - no research needed)
- [x] Phase 1: Design complete (contracts, data-model, quickstart documented)
- [x] Phase 2: Task planning complete (approach described - ready for /tasks)
- [ ] Phase 3: Tasks generated (/tasks command execution pending)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (simplification refactor)
- [x] Post-Design Constitution Check: PASS (no new complexity)
- [x] All NEEDS CLARIFICATION resolved (none in spec)
- [x] Complexity deviations documented (none)

**Deliverables Created**:
- [x] plan.md (this file)
- [x] data-model.md (documented in Phase 1 section above)
- [x] contracts/*.yaml (documented in Phase 1 section above)
- [x] quickstart.md (test scenarios documented in Phase 1 section above)
- [ ] tasks.md (pending /tasks command execution)

---

## Next Steps

✅ **Implementation plan is complete and ready for task generation!**

**Execute**: `/speckit.tasks` to generate the detailed task breakdown (tasks.md) with 50-60 numbered, prioritized tasks organized across 10 implementation phases.

The plan provides:
- Clear technical context (React 18, Material-UI, Django REST Framework)
- Comprehensive API contracts (4 endpoints documented)
- Data model validation (existing models, no schema changes)
- Manual testing scenarios (5 quickstart test cases)
- Task generation strategy (10 phases, 50-60 tasks)

**Status**: ✅ READY FOR TASK GENERATION

