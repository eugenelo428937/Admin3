# Feature Specification: New Session Setup Wizard

**Feature Branch**: `20260218-new-session-setup`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Create a New Session Setup wizard accessible from the admin mega menu. A 4-step stepper guides superusers through creating a new exam session, assigning subjects, copying materials/marking/prices from the previous session, and a placeholder for tutorial upload."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a New Exam Session (Priority: P1)

As a superuser, I want to create a new exam session record with a session code, start date, and end date so that I can begin preparing the catalog for the upcoming exam period.

**Why this priority**: This is the foundational step - no other steps can proceed without a valid exam session record. It provides immediate value by eliminating the need to navigate to the separate exam session admin page.

**Independent Test**: Can be fully tested by completing Step 1 of the wizard and verifying the exam session record appears in the catalog_exam_sessions table and on the Exam Sessions admin list page.

**Acceptance Scenarios**:

1. **Given** a superuser is on any page with the admin mega menu visible, **When** they click "New Session Setup" in the admin menu, **Then** they are navigated to the New Session Setup wizard at `/admin/new-session-setup`.
2. **Given** the wizard is open on Step 1, **When** the user fills in a session code, start date, and end date with valid values and clicks "Save & Continue", **Then** a new exam session record is created and the wizard advances to Step 2.
3. **Given** the wizard is on Step 1, **When** the user enters an end date that is before or equal to the start date, **Then** a validation error is displayed and the form is not submitted.
4. **Given** the wizard is on Step 1, **When** the user leaves any required field empty, **Then** the form cannot be submitted and appropriate validation messages are shown.

---

### User Story 2 - Assign Subjects to the New Session (Priority: P1)

As a superuser, I want to assign subjects to the newly created exam session using a transfer list so that I can define which subjects are available for the upcoming exam period. I also want the ability to copy the subject assignments from the most recent previous session to save time.

**Why this priority**: Subject assignment is essential for the session to be usable. The "Copy from previous session" feature saves significant manual effort since most sessions carry forward the same subjects.

**Independent Test**: Can be tested by completing Steps 1 and 2, then verifying that the correct exam_session_subject records are created in the database linking the new session to the selected subjects.

**Acceptance Scenarios**:

1. **Given** Step 1 is complete and the wizard is on Step 2, **When** the step loads, **Then** the heading displays "Subjects for {session_code}" and the left panel shows all active subjects from the catalog.
2. **Given** the transfer list is displayed, **When** the user selects subjects and clicks the "selected to right" button, **Then** those subjects move to the right (assigned) panel.
3. **Given** the transfer list is displayed, **When** the user clicks "all to right", **Then** all available subjects move to the assigned panel.
4. **Given** subjects are in the assigned panel, **When** the user selects some and clicks "selected to left", **Then** those subjects return to the available panel.
5. **Given** subjects are in the assigned panel, **When** the user clicks "all to left", **Then** all subjects return to the available panel.
6. **Given** a previous exam session exists, **When** the user clicks "Copy from {previous_session_code}", **Then** any existing assignments in the right panel are cleared first, and then the subjects from the previous session are populated into the assigned panel (replace behavior, not additive).
7. **Given** subjects are assigned in the right panel, **When** the user clicks "Save & Continue", **Then** exam_session_subject records are created for each assigned subject linked to the new session, and the wizard advances to Step 3.
8. **Given** no subjects are assigned, **When** the user clicks "Save & Continue", **Then** a validation message appears asking the user to assign at least one subject.

---

### User Story 3 - Copy Materials, Marking, Prices, and Create Bundles (Priority: P2)

As a superuser, I want the option to copy all store products (materials and marking items) and their prices from the previous exam session, and create bundles from catalog bundle templates for each new subject, so that I can quickly populate the new session's product catalog without manual re-entry.

**Why this priority**: This is a major time-saver but depends on Steps 1 and 2 being complete. The "Set up later" option allows flexible workflow where pricing and bundles can be adjusted after the initial setup.

**Independent Test**: Can be tested by completing Steps 1-3 with "Proceed", then verifying that store products, prices, and bundles exist for the new session with correctly mapped exam_session_subject IDs.

**Acceptance Scenarios**:

1. **Given** Step 2 is complete and the wizard is on Step 3, **When** the step loads, **Then** a dialog is displayed with the heading "Copy from {previous_session_code}" and two options: "Proceed" and "Set up later".
2. **Given** the copy dialog is shown, **When** the user clicks "Proceed", **Then** the system copies all store products from the previous session, creates new store product records with the new session's exam_session_subject IDs (matched by subject), and copies all associated prices with the new product IDs.
3. **Given** the copy operation includes bundle creation, **When** the user clicks "Proceed", **Then** the system creates store bundles for each new exam_session_subject using the catalog bundle templates (catalog_product_bundles and catalog_product_bundle_products), populating each bundle with the corresponding newly created store products.
4. **Given** the copy operation completes successfully, **When** products, prices, and bundles are created, **Then** a success summary is displayed showing how many products, prices, and bundles were created, and the wizard advances to Step 4.
5. **Given** the copy dialog is shown, **When** the user clicks "Set up later", **Then** no products, prices, or bundles are created and the wizard advances to Step 4.
6. **Given** the previous session has products for subjects that were NOT assigned in Step 2, **When** the user clicks "Proceed", **Then** those products are skipped (only products whose subjects match the new session's assigned subjects are copied).

---

### User Story 4 - Tutorial Placeholder Step (Priority: P3)

As a superuser, I want to see a placeholder step for tutorial setup so that I know this capability is planned and can choose to set it up later or upload tutorial data when the feature is ready.

**Why this priority**: This is a placeholder for future functionality. It completes the wizard flow and communicates the planned capability without blocking the core session setup workflow.

**Independent Test**: Can be tested by navigating to Step 4 and verifying the two buttons ("Upload" and "Set up later") are displayed, and that "Set up later" completes the wizard.

**Acceptance Scenarios**:

1. **Given** the wizard is on Step 4 "Tutorials", **When** the step loads, **Then** two buttons are displayed: "Upload" (disabled or showing "Coming Soon") and "Set up later".
2. **Given** the user is on Step 4, **When** they click "Set up later", **Then** the wizard is completed and the user is redirected to the admin exam sessions list or a completion summary page.
3. **Given** the user is on Step 4, **When** they click "Upload", **Then** a message indicates this feature is not yet available.

---

### User Story 5 - Admin Menu Navigation Entry Point (Priority: P1)

As a superuser, I want a clearly visible "New Session Setup" button in the admin mega menu so that I can quickly access the session setup wizard without navigating through multiple admin pages.

**Why this priority**: This is the entry point to the entire feature. Without it, users cannot discover or access the wizard.

**Independent Test**: Can be tested by logging in as a superuser, opening the admin mega menu, and verifying the "New Session Setup" button is visible and navigates to `/admin/new-session-setup`.

**Acceptance Scenarios**:

1. **Given** a superuser is logged in and the admin mega menu is open, **When** they look at the admin menu, **Then** a "New Session Setup" button is visible in a new row between the existing row 1 (Catalog, Current Products, Filtering, User) and row 2 (Tutorials, Marking, Orders).
2. **Given** the "New Session Setup" button is visible, **When** the user clicks it, **Then** they are navigated to `/admin/new-session-setup` and the mega menu closes.
3. **Given** a non-superuser is logged in, **When** they view the navigation, **Then** the admin mega menu (and therefore the "New Session Setup" button) is not visible.
4. **Given** the "New Session Setup" button is displayed, **When** comparing its appearance to other "View All" buttons in the navigation, **Then** it uses the same styling pattern (navViewAll variant with NavigateNextIcon).

---

### Edge Cases

- What happens if the user refreshes the browser mid-wizard? The wizard should retain awareness of which step was completed (the created exam session ID persists in the URL or component state, but uncommitted transfer list selections would be lost).
- What happens if the previous session has no products to copy in Step 3? The "Proceed" action should complete gracefully with a message indicating zero products were found to copy.
- What happens if a subject was in the previous session but is now marked inactive? Inactive subjects should not appear in the available (left) panel of the transfer list, even if they were in the previous session.
- What happens if the user navigates away from the wizard without completing all steps? Steps already saved (exam session created, subjects assigned) persist in the database. The user can manage these records through the existing individual admin pages.
- What happens if two admins create sessions with the same session code simultaneously? The system should allow it since session_code is not unique (per the current model), but display the new session's details clearly so the admin can verify correctness.
- What happens if the Step 3 copy/create operation fails partway through? The entire operation (products, prices, and bundles) is executed as an all-or-nothing transaction. If any part fails, all records created in that step are rolled back, and the user sees an error message with the option to retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "New Session Setup" button in the admin mega menu, styled consistently with other "View All" navigation buttons, positioned in a new row between existing row 1 and row 2.
- **FR-002**: System MUST restrict access to the New Session Setup wizard to superusers only.
- **FR-003**: System MUST present a 4-step stepper interface for session setup: "Exam Session", "Subjects", "Materials & Marking", and "Tutorials".
- **FR-004**: Step 1 MUST allow the user to enter a session code, start date, and end date, and create a catalog exam session record on save.
- **FR-005**: Step 1 MUST validate that end date is after start date before allowing submission.
- **FR-006**: Step 2 MUST display a transfer list with all active subjects on the left (available) and an empty right panel (assigned).
- **FR-007**: Step 2 MUST provide five action buttons between the panels: "all to right", "selected to right", "Copy from {previous_session_code}", "selected to left", and "all to left".
- **FR-008**: The "Copy from previous session" button MUST clear any existing assignments in the right panel and then populate it with subjects that were linked to the most recent previous exam session (replace, not additive).
- **FR-009**: Step 2 MUST create exam_session_subject records for all assigned subjects when the user saves.
- **FR-010**: Step 3 MUST present a dialog offering to copy store products and prices from the previous session, with "Proceed" and "Set up later" options.
- **FR-011**: When "Proceed" is selected in Step 3, the system MUST copy store products from the previous session, mapping each to the new session's corresponding exam_session_subject (matched by subject), and copy all associated prices to the new products.
- **FR-012**: Products from the previous session whose subjects are not assigned to the new session MUST be skipped during the copy operation.
- **FR-016**: When "Proceed" is selected in Step 3, the system MUST also create store bundles for each new exam_session_subject using the catalog bundle templates (catalog_product_bundles and catalog_product_bundle_products), populated with the corresponding newly created store products.
- **FR-017**: The Step 3 copy/create operation (products, prices, and bundles) MUST execute as an all-or-nothing transaction. If any part fails, all records created in that step MUST be rolled back and the user shown an error with the option to retry.
- **FR-013**: Step 4 MUST display "Upload" and "Set up later" buttons, with "Upload" indicating the feature is not yet implemented.
- **FR-014**: The stepper MUST indicate completed steps visually and allow the user to review (but not re-edit) completed steps.
- **FR-015**: System MUST determine the "previous session" automatically as the most recently created exam session prior to the one being set up.

### Key Entities

- **Exam Session**: A defined exam period with a session code (e.g., "2026-09"), start date, and end date. Created in Step 1.
- **Subject**: An academic subject (e.g., "CB1 - Business Finance") with an active/inactive status. Only active subjects appear in the transfer list.
- **Exam Session Subject**: A link between an exam session and a subject, indicating which subjects are available in that session. Created in Step 2.
- **Store Product**: A purchasable item linking an exam session subject to a specific product variation (e.g., "CM2 eBook for 2026-09"). Optionally copied in Step 3.
- **Price**: A pricing tier (standard, retaker, reduced, additional) for a store product. Copied alongside products in Step 3.
- **Catalog Bundle Template**: A predefined bundle definition (catalog_product_bundles) with associated bundle products (catalog_product_bundle_products). Used as templates to create store bundles for each new exam_session_subject in Step 3.
- **Store Bundle**: A purchasable collection of store products for a specific exam_session_subject. Created from catalog bundle templates in Step 3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A superuser can complete the full 4-step session setup workflow (create session, assign subjects, copy products/prices, acknowledge tutorials) in under 5 minutes.
- **SC-002**: The "Copy from previous session" feature in Step 2 correctly replicates subject assignments from the previous session without manual intervention.
- **SC-003**: The product, price, and bundle creation operation in Step 3 creates accurate records with zero data integrity errors (correct FK mappings, no orphaned prices or bundle products).
- **SC-004**: All newly created exam session records, subject assignments, products, and prices are immediately visible in their respective admin list pages after wizard completion.
- **SC-005**: The wizard is accessible only to superusers; non-superuser access attempts are redirected appropriately.
- **SC-006**: The session setup workflow reduces the number of admin page navigations needed to prepare a new exam session from 4+ separate pages to a single wizard.

## Clarifications

### Session 2026-02-18

- Q: Should Step 3 also copy bundles, or only products and prices? → A: Step 3 should also create bundles for each subject from catalog_product_bundles and catalog_product_bundle_products templates, linked to the new exam_session_subjects. Bundles are created from catalog templates (not copied from previous store bundles).
- Q: If the Step 3 copy/create operation fails partway through, what should happen? → A: All-or-nothing transaction. Roll back all records if any part fails; show error with retry option.
- Q: When "Copy from previous session" is clicked in Step 2, should it replace or add to existing selections? → A: Replace. Clear the assigned panel first, then populate with previous session's subjects.

## Assumptions

- The "previous session" is determined by the most recently created exam session (by creation date or ID ordering), not by session code alphabetical order.
- The product copy in Step 3 copies all non-Tutorial store products (materials and marking items). Tutorial products are handled separately in Step 4 (future).
- Prices are copied with their exact amounts from the previous session; price adjustments are done separately after the wizard completes.
- The transfer list in Step 2 shows subjects ordered by their code (matching the existing alphabetical ordering).
- The wizard is a create-only workflow. Editing individual records after creation is done through the existing admin pages.
- Store product codes are auto-generated on save, so the copy operation does not need to manually construct product codes.
- Only active store products (is_active=true) from the previous session are copied in Step 3. Inactive products are skipped. Newly copied products are created as active.
- Upon completing the wizard (Step 4 "Set up later"), the user is redirected to the admin exam sessions list page (`/admin/exam-sessions`).
