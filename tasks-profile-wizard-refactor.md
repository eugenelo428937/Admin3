# Tasks: Profile Management Wizard Refactor

**Goal**: Refactor ProfileForm to use RegistrationWizard component pattern for unified registration and profile editing experience with step-by-step saving, email verification, and password change notifications.

**Input**: User requirements and existing components:
- `frontend/react-Admin3/src/components/User/ProfileForm.js` (current clunky implementation)
- `frontend/react-Admin3/src/components/User/RegistrationWizard.js` (wizard pattern to reuse)
- `frontend/react-Admin3/src/components/Navigation/UserActions.js` (profile link trigger)

**Prerequisites**: None (brownfield refactoring of existing components)

## User Requirements Summary

1. **Reuse RegistrationWizard** for profile editing (unified component pattern)
2. **Pre-fill fields** from fetched user profile data
3. **Step-by-step saving** - save only updated fields at each wizard step
4. **Email verification** - trigger verification process if email changed
5. **Password change notification** - send `password_reset_completed` email on password update
6. **Component rename** - rename RegistrationWizard to more appropriate name (UserFormWizard)
7. **Navigation integration** - Profile link in UserActions opens wizard in edit mode

## Format: `[ID] [P?] [Story?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, etc.)
- Include exact file paths in descriptions

## Phase 1: Setup and Preparation

### Story 0: Component Analysis and Planning

- [ ] T001 [US0] Analyze RegistrationWizard component structure and identify mode-specific logic in `frontend/react-Admin3/src/components/User/RegistrationWizard.js`
- [ ] T002 [US0] Analyze ProfileForm API integration patterns for profile fetching and updates in `frontend/react-Admin3/src/components/User/ProfileForm.js`
- [ ] T003 [US0] Document current email verification flow in ProfileForm at lines 550-559 in `frontend/react-Admin3/src/components/User/ProfileForm.js`
- [ ] T004 [US0] Document password reset email triggering requirements for backend integration

## Phase 2: Foundational Changes (MUST complete before user stories)

### Story 0: Service Layer Enhancement

- [ ] T005 [P] [US0] Add `getUserProfile()` method to `frontend/react-Admin3/src/services/userService.js` for fetching current user data
- [ ] T006 [P] [US0] Add `updateUserProfile(profileData)` method to `frontend/react-Admin3/src/services/userService.js` with partial update support
- [ ] T007 [P] [US0] Add `sendPasswordResetCompletedEmail()` method to `frontend/react-Admin3/src/services/authService.js` for password change notifications

## Phase 3: User Story 1 - Rename and Dual-Mode Component

### Story 1: Component Rename (P1 - Critical Foundation)

**Goal**: Rename RegistrationWizard to UserFormWizard to reflect dual purpose (registration + profile editing)

**Test Criteria**:
- Component renamed without breaking existing functionality
- All imports updated across codebase
- Registration flow still works identically

**Tasks**:

- [ ] T008 [US1] Rename `RegistrationWizard` to `UserFormWizard` in `frontend/react-Admin3/src/components/User/RegistrationWizard.js`
- [ ] T009 [US1] Update file path from `RegistrationWizard.js` to `UserFormWizard.js` in `frontend/react-Admin3/src/components/User/`
- [ ] T010 [US1] Update all imports of RegistrationWizard across codebase (search for `import.*RegistrationWizard` and replace with UserFormWizard)
- [ ] T011 [US1] Verify registration page still uses UserFormWizard correctly (test registration flow manually)

## Phase 4: User Story 2 - Dual-Mode Logic Implementation

### Story 2: Mode-Based Behavior (P1 - Critical Foundation)

**Goal**: Add mode prop ('registration' | 'profile') to UserFormWizard to control behavior for registration vs profile editing

**Test Criteria**:
- Mode prop correctly distinguishes registration vs profile editing
- Form validation differs by mode (password optional in profile mode)
- Submit behavior differs by mode (register vs update API calls)
- Success messages differ by mode

**Tasks**:

- [ ] T012 [US2] Add `mode` prop ('registration' | 'profile') with default 'registration' to UserFormWizard component in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T013 [US2] Add `initialData` prop to UserFormWizard for pre-filling profile data in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T014 [US2] Update wizard title to show "Register" for registration mode, "Update Profile" for profile mode in `frontend/react-Admin3/src/components/User/UserFormWizard.js` (around line 1003)
- [ ] T015 [US2] Update submit button text based on mode ("Create Account" vs "Save Changes") in `frontend/react-Admin3/src/components/User/UserFormWizard.js` (around line 1127)
- [ ] T016 [US2] Modify password validation to be optional in profile mode (lines 346-353) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`

## Phase 5: User Story 3 - Profile Data Pre-filling

### Story 3: Data Loading and Pre-filling (P1 - Critical Foundation)

**Goal**: Fetch current user profile data and pre-fill wizard fields when in profile mode

**Test Criteria**:
- Profile data fetched from API on component mount in profile mode
- All wizard fields pre-populated with current user data
- No data fetching in registration mode
- Loading state shown while fetching profile data

**Tasks**:

- [ ] T017 [US3] Add `useEffect` hook to fetch user profile data when mode='profile' in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T018 [US3] Implement profile data fetching using `userService.getUserProfile()` in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T019 [US3] Map fetched profile data to wizard form state (reference ProfileForm lines 148-210) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T020 [US3] Add loading state during profile fetch (show CircularProgress on wizard) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T021 [US3] Handle profile fetch errors with error message display in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T022 [US3] Set work address visibility based on fetched data (reference ProfileForm lines 193-199) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`

## Phase 6: User Story 4 - Step-by-Step Saving

### Story 4: Incremental Save Functionality (P2 - High Priority)

**Goal**: Enable saving at each wizard step, sending only changed fields to backend

**Test Criteria**:
- "Save Progress" button appears in profile mode (not registration mode)
- Only modified fields sent to API on save
- User can navigate between steps after saving
- Success message shown after successful save
- Form state preserved after save (no reset)

**Tasks**:

- [ ] T023 [P] [US4] Add change tracking state to detect modified fields in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T024 [P] [US4] Implement `handleStepSave()` method to save current step data in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T025 [US4] Add "Save Progress" button to wizard navigation (only in profile mode) in `frontend/react-Admin3/src/components/User/UserFormWizard.js` (around line 1090)
- [ ] T026 [US4] Implement diff detection logic to send only changed fields to `userService.updateUserProfile()` in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T027 [US4] Add success toast/snackbar notification after successful step save in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T028 [US4] Preserve form state after save (update initialData with saved values) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`

## Phase 7: User Story 5 - Email Verification Flow

### Story 5: Email Change Verification (P2 - High Priority)

**Goal**: Trigger email verification process when user changes email address in profile mode

**Test Criteria**:
- Email change detected when comparing old vs new email
- Verification email sent via backend API
- Informational alert shown explaining verification requirement
- User can continue editing other fields while email unverified
- Backend handles email verification token generation

**Tasks**:

- [ ] T029 [US5] Detect email changes in profile save flow in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T030 [US5] Trigger email verification API call when email changed (reference ProfileForm approach) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T031 [US5] Display email verification alert after save (reference ProfileForm lines 550-559) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T032 [US5] Add email verification state tracking (`emailVerificationSent`) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T033 [US5] Style verification alert with MarkEmailReadIcon (reference ProfileForm) in `frontend/react-Admin3/src/components/User/UserFormWizard.js`

## Phase 8: User Story 6 - Password Change Notification

### Story 6: Password Reset Email (P2 - High Priority)

**Goal**: Send password_reset_completed email when user changes password in profile mode

**Test Criteria**:
- Password change detected when comparing old vs new password
- Backend API triggered to send password_reset_completed email
- Success notification shown to user
- Email sent only if password actually changed (not just re-entered same password)

**Tasks**:

- [ ] T034 [US6] Detect password changes in profile save flow in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T035 [US6] Call `authService.sendPasswordResetCompletedEmail()` when password changed in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T036 [US6] Display success notification confirming password change and email sent in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T037 [US6] Handle password change email sending errors gracefully in `frontend/react-Admin3/src/components/User/UserFormWizard.js`

## Phase 9: User Story 7 - Navigation Integration

### Story 7: UserActions Profile Link Integration (P2 - High Priority)

**Goal**: Update UserActions Profile link to open UserFormWizard in profile mode

**Test Criteria**:
- Clicking Profile menu item navigates to /profile route
- /profile route renders UserFormWizard in profile mode
- User profile data pre-loaded when wizard opens
- Breadcrumb or back button allows return to previous page

**Tasks**:

- [ ] T038 [US7] Create `/profile` route in React Router configuration (likely in `frontend/react-Admin3/src/App.js` or routes file)
- [ ] T039 [US7] Create `ProfilePage.js` component that renders UserFormWizard with mode='profile' in `frontend/react-Admin3/src/pages/ProfilePage.js`
- [ ] T040 [US7] Verify UserActions Profile button navigates to `/profile` (already implemented at line 49 in `frontend/react-Admin3/src/components/Navigation/UserActions.js`)
- [ ] T041 [US7] Add page title and breadcrumb to ProfilePage in `frontend/react-Admin3/src/pages/ProfilePage.js`

## Phase 10: User Story 8 - ProfileForm Cleanup

### Story 8: Remove Legacy ProfileForm (P3 - Low Priority)

**Goal**: Deprecate and remove old ProfileForm component after migration complete

**Test Criteria**:
- No references to ProfileForm.js in codebase
- All profile editing flows use UserFormWizard
- No broken imports or runtime errors

**Tasks**:

- [ ] T042 [US8] Search codebase for all ProfileForm imports and usages (grep for `ProfileForm`)
- [ ] T043 [US8] Replace remaining ProfileForm usages with UserFormWizard in profile mode
- [ ] T044 [US8] Delete `frontend/react-Admin3/src/components/User/ProfileForm.js` file
- [ ] T045 [US8] Delete `frontend/react-Admin3/src/components/User/CountryAutocomplete.js` if only used by ProfileForm
- [ ] T046 [US8] Delete `frontend/react-Admin3/src/components/User/PhoneCodeAutocomplete.js` if only used by ProfileForm

## Phase 11: Polish & Cross-Cutting Concerns

### Story 9: Testing and Documentation (P3 - Low Priority)

**Goal**: Ensure refactored component is well-tested and documented

**Test Criteria**:
- Unit tests cover registration mode behavior
- Unit tests cover profile mode behavior
- Integration tests verify step-by-step saving
- Email verification and password change flows tested
- Component props documented

**Tasks**:

- [ ] T047 [P] [US9] Create unit tests for UserFormWizard registration mode in `frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.registration.test.js`
- [ ] T048 [P] [US9] Create unit tests for UserFormWizard profile mode in `frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.profile.test.js`
- [ ] T049 [P] [US9] Test step-by-step save functionality with mock API in `frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.profile.test.js`
- [ ] T050 [P] [US9] Test email verification flow with mock API in `frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.profile.test.js`
- [ ] T051 [P] [US9] Test password change notification flow with mock API in `frontend/react-Admin3/src/components/User/__tests__/UserFormWizard.profile.test.js`
- [ ] T052 [US9] Add JSDoc documentation to UserFormWizard component props in `frontend/react-Admin3/src/components/User/UserFormWizard.js`
- [ ] T053 [US9] Update component usage examples in README or documentation
- [ ] T054 [US9] Manual end-to-end testing: Complete registration flow
- [ ] T055 [US9] Manual end-to-end testing: Complete profile update flow with all field types
- [ ] T056 [US9] Manual end-to-end testing: Email change verification flow
- [ ] T057 [US9] Manual end-to-end testing: Password change notification flow

## Dependencies

**User Story Dependencies**:
- US1 (rename) blocks all other stories
- US2 (mode logic) blocks US3, US4, US5, US6, US7
- US3 (data loading) blocks US4, US5, US6
- US7 (navigation) depends on US2, US3
- US8 (cleanup) depends on US7 (must verify all usages migrated)
- US9 (testing) can run in parallel with implementation but should validate final result

**Task Dependencies**:
- T001-T004 (analysis) before all implementation tasks
- T005-T007 (service layer) before US3, US4, US5, US6
- T008-T011 (rename) before all other implementation
- T012-T016 (mode logic) before T017-T057
- T017-T022 (data loading) before T023-T033
- T038-T041 (navigation) requires T012-T022 complete

## Parallel Execution Opportunities

### Analysis Phase (can run in parallel):
```
Task T001: Analyze RegistrationWizard structure
Task T002: Analyze ProfileForm API patterns
Task T003: Document email verification flow
Task T004: Document password reset requirements
```

### Service Layer (can run in parallel):
```
Task T005: Add getUserProfile() to userService
Task T006: Add updateUserProfile() to userService
Task T007: Add sendPasswordResetCompletedEmail() to authService
```

### Testing Phase (can run in parallel):
```
Task T047: Unit tests for registration mode
Task T048: Unit tests for profile mode
Task T049: Test step-by-step save
Task T050: Test email verification
Task T051: Test password notification
```

## Implementation Strategy

**MVP Scope (User Story 1-3)**:
1. Rename component to UserFormWizard
2. Add dual-mode logic (registration/profile)
3. Implement profile data pre-filling
4. Basic profile updates (all fields at once)

**Iteration 2 (User Story 4-6)**:
1. Step-by-step saving with change detection
2. Email verification flow
3. Password change notifications

**Iteration 3 (User Story 7-8)**:
1. Navigation integration
2. Legacy component cleanup

**Iteration 4 (User Story 9)**:
1. Comprehensive testing
2. Documentation

## Validation Checklist

- [x] All user stories have corresponding phases
- [x] All tasks follow checklist format (checkbox, ID, story label, file path)
- [x] Parallel tasks truly independent (different files)
- [x] Dependencies clearly documented
- [x] Service layer tasks before component tasks
- [x] Component rename before all other changes
- [x] Testing phase includes both registration and profile modes
- [x] Manual testing scenarios documented

## Notes

- **Mode prop pattern**: Follow ProfileForm's existing pattern of mode='registration' | 'profile'
- **Change detection**: Compare initialData vs current form state to detect changes
- **Email verification**: Reference ProfileForm lines 550-559 for alert styling
- **Backend integration**: Ensure backend APIs support partial updates (PATCH semantics)
- **Validation rules**: Password optional in profile mode, required in registration mode
- **Component reusability**: Keep wizard steps generic, customize via mode prop rather than duplicating code

## Estimated Complexity

- **Total Tasks**: 57
- **High Priority (P1-P2)**: 46 tasks
- **Low Priority (P3)**: 11 tasks
- **Parallel Opportunities**: 13 tasks can run in parallel
- **User Stories**: 10 (including Story 0 for setup)

**Estimated Timeline**:
- MVP (US0-US3): 3-4 days
- Iteration 2 (US4-US6): 2-3 days
- Iteration 3 (US7-US8): 1-2 days
- Iteration 4 (US9): 2-3 days
- **Total**: 8-12 days

