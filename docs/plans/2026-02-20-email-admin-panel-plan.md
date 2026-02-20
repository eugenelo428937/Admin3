# Email Admin Panel - Implementation Plan

> **Design Doc**: [2026-02-20-email-admin-panel-design.md](2026-02-20-email-admin-panel-design.md)
> **Date**: 2026-02-20

---

## Phase 0: Foundation (TypeScript + Sidebar + API Scaffolding)

### T001: TypeScript Setup
**Files**: `frontend/react-Admin3/tsconfig.json`, `package.json`
**Steps**:
1. Install TypeScript and type packages: `typescript`, `@types/react`, `@types/react-dom`, `@types/react-router-dom`
2. Create `tsconfig.json` with strict mode, `allowJs: true`, JSX support
3. Verify existing JS files still compile and run
4. Run `npm start` to confirm no regressions

### T002: Type Definitions
**Files**: `src/types/email/*.types.ts`
**Steps**:
1. Create `src/types/email/` directory
2. Define interfaces for all 8 email models: `EmailSettings`, `EmailTemplate`, `EmailAttachment`, `EmailTemplateAttachment`, `EmailQueue`, `EmailContentPlaceholder`, `EmailContentRule`, `EmailTemplateContentRule`
3. Define enums/union types: `TemplateType`, `SettingType`, `AttachmentType`, `QueueStatus`, `Priority`, `RuleType`, `ConditionOperator`, `InsertPosition`
4. Define API request/response types for custom actions (duplicate, resend, preview, import-mjml)

### T003: Email Service (Typed Axios)
**Files**: `src/services/emailService.ts`
**Steps**:
1. Create typed Axios service following existing `staffService.js` pattern
2. Methods for all endpoints: settings CRUD, templates CRUD + preview + import-mjml, queue list/detail + duplicate + resend, attachments CRUD (multipart upload), placeholders CRUD, content rules CRUD, template-content-rules CRUD
3. Add `emailUrl` to `src/config.js`
4. Use typed return values from `types/email/`

### T004: Admin Sidebar Component
**Files**: `src/components/admin/AdminSidebar.tsx`, `src/components/admin/AdminLayout.tsx`
**Steps**:
1. Create `AdminLayout.tsx` — wrapper with sidebar + content area using MUI Drawer
2. Create `AdminSidebar.tsx` — collapsible navigation with grouped sections
3. Groups: Catalog (subjects, exam sessions, products), Store (store products, prices, bundles), Email System (settings, templates, queue, attachments, content rules, placeholders), Users (user profiles, staff), Setup (new session setup)
4. Each group is collapsible (MUI List + Collapse)
5. Active route highlighting
6. Superuser guard at layout level

**Note**: This is a NEW component. Currently admin has no sidebar — navigation is via inline links. The sidebar wraps all admin pages. Existing admin routes should continue to work.

### T005: Backend - Model Migrations
**Files**: `email_system/migrations/0002_*.py`
**Steps**:
1. Add `mjml_content` (TextField, blank=True, default='') to EmailTemplate
2. Add `mjml_last_synced` (DateTimeField, null=True, blank=True) to EmailTemplate
3. Add `duplicated_from` (FK to self, null=True, blank=True, on_delete=SET_NULL, related_name='duplicates') to EmailQueue
4. Add `EMAIL_ATTACHMENT_UPLOAD_PATH` to `.env.development` and settings
5. Run `makemigrations` and `migrate`
6. Write tests for new fields

### T006: Backend - Serializers
**Files**: `email_system/serializers.py` (new)
**Steps**:
1. `EmailSettingsSerializer` — masks `value` when `is_sensitive=True` on read; validates against `validation_rules` on write
2. `EmailTemplateSerializer` — includes `mjml_content`; nested read of attachments and content rules for detail view
3. `EmailTemplateListSerializer` — lighter serializer for list view (no mjml_content, no nested relations)
4. `EmailAttachmentSerializer` — handles file upload, auto-populates `mime_type` and `file_size`
5. `EmailTemplateAttachmentSerializer` — validates unique_together
6. `EmailQueueSerializer` — read-only; includes `duplicated_from` reference
7. `EmailQueueDuplicateInputSerializer` — writable fields only: to_emails, cc_emails, bcc_emails, from_email, reply_to_email, subject
8. `EmailContentPlaceholderSerializer` — includes template associations (M2M)
9. `EmailContentRuleSerializer` — serializes condition fields for visual builder
10. `EmailTemplateContentRuleSerializer` — includes effective_priority computed field
11. Write serializer tests

### T007: Backend - ViewSets and URLs
**Files**: `email_system/views.py` (new), `email_system/urls.py` (new), `django_Admin3/urls.py` (update)
**Steps**:
1. `EmailSettingsViewSet` (ModelViewSet) — CRUD with IsSuperUser permission
2. `EmailTemplateViewSet` (ModelViewSet) — CRUD + `@action preview` (POST: accepts mjml_content, returns compiled HTML) + `@action import_mjml` (POST: reads .mjml file, saves to mjml_content)
3. `EmailAttachmentViewSet` (ModelViewSet) — CRUD with file upload (MultiPartParser)
4. `EmailTemplateAttachmentViewSet` (ModelViewSet) — CRUD
5. `EmailQueueViewSet` (mixins: List, Retrieve) — read-only + `@action duplicate` (POST: creates new entry with editable fields + duplicated_from FK) + `@action resend` (POST: resets status/scheduled_at/attempts)
6. `EmailContentPlaceholderViewSet` (ModelViewSet) — CRUD
7. `EmailContentRuleViewSet` (ModelViewSet) — CRUD
8. `EmailTemplateContentRuleViewSet` (ModelViewSet) — CRUD
9. Create `email_system/urls.py` with DRF router
10. Register at `/api/email/` in main `urls.py`
11. Write ViewSet tests for all endpoints including custom actions

---

## Phase 1: EmailSettings Admin

### T008: EmailSettings List (ViewModel)
**Files**: `src/components/admin/email/settings/useEmailSettingsListVM.ts`
**Steps**:
1. State: `settings: EmailSettings[]`, `loading`, `error`, `filterType` (setting_type filter)
2. Actions: `fetchSettings()`, `updateSetting(id, data)`, `toggleActive(id)`, `filterByType(type)`
3. Inline edit state: `editingId`, `editFormData`, `startEdit()`, `cancelEdit()`, `saveEdit()`
4. Write ViewModel unit tests (mock emailService)

### T009: EmailSettings List (View)
**Files**: `src/components/admin/email/settings/EmailSettingsList.tsx`
**Steps**:
1. Filter chips row (All | SMTP | Queue | Tracking | Template | Security | Performance)
2. Table: Key, Type, Display Name, Value (masked if sensitive), Active, Edit button
3. Inline edit mode: row expands with input fields, Save/Cancel buttons
4. Uses `useEmailSettingsListVM()` hook for all state and logic
5. Write View component tests (mock VM hook)

---

## Phase 2: EmailTemplate Admin (Core + MJML Editor)

### T010: Install CodeMirror + mjml-browser
**Files**: `package.json`
**Steps**:
1. Install: `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-xml`, `@codemirror/theme-one-dark`, `codemirror`
2. Install: `mjml-browser`
3. Verify imports work with TypeScript

### T011: EmailTemplate List
**Files**: `src/components/admin/email/templates/EmailTemplateList.tsx`, `useEmailTemplateListVM.ts`
**Steps**:
1. ViewModel: `templates`, `loading`, `error`, pagination, search, `fetchTemplates()`, `handleEdit()`, `handleDelete()`
2. View: Table with Name, Display Name, Type, Subject, Active, Actions (Edit/Delete)
3. Search input for filtering by name/display_name
4. Write tests

### T012: EmailTemplate Form - General Tab
**Files**: `src/components/admin/email/templates/EmailTemplateForm.tsx`, `useEmailTemplateFormVM.ts`
**Steps**:
1. ViewModel: `template`, `formData`, `loading`, `error`, `activeTab`, `isEditMode`, `fetchTemplate()`, `handleChange()`, `handleSubmit()`
2. View: Tabbed layout (MUI Tabs) — Tab 1: General fields
3. General tab fields: name, display_name, template_type (dropdown), subject_template, from_email, reply_to_email, default_priority (dropdown), use_master_template, enable_tracking, enable_queue, max_retry_attempts, retry_delay_minutes, enhance_outlook_compatibility, is_active
4. Create and edit mode (detect via `useParams` id)
5. Write tests

### T013: MJML Editor - Shared Components
**Files**: `src/components/admin/email/shared/MjmlPreviewPane.tsx`
**Steps**:
1. `MjmlPreviewPane` — iframe that renders HTML string with sandbox attributes
2. Responsive split pane (50/50 on desktop, stacked on mobile)
3. Error banner component for compile errors
4. Write tests

### T014: MJML Editor Tab
**Files**: `src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx`, `useEmailTemplateMjmlEditorVM.ts`
**Steps**:
1. ViewModel: `mjmlContent`, `htmlPreview`, `compileError`, `isDirty`, `isSaving`
2. Actions: `handleContentChange()` (debounced 500ms compile via mjml-browser), `handleSave()`, `handleImportFromFile()`
3. View: Split pane — CodeMirror (left) with XML syntax + MjmlPreviewPane (right)
4. Import from File button calls `POST /api/email/templates/{id}/import-mjml/`
5. Save button calls `PATCH /api/email/templates/{id}/` with `mjml_content`
6. Dirty state indicator (unsaved changes warning)
7. Write tests (mock mjml-browser, test debounce, test save flow)

### T015: EmailTemplate Form - Attachments Tab
**Files**: within `EmailTemplateForm.tsx`
**Steps**:
1. Tab 3: Table of linked EmailTemplateAttachments (attachment name, order, required, condition)
2. "Add Attachment" dropdown — fetches available attachments from API
3. Remove button (unlink, not delete)
4. Order input (sortable)
5. Include condition editor (simple JSON input)
6. Write tests

### T016: EmailTemplate Form - Content Rules Tab
**Files**: within `EmailTemplateForm.tsx`
**Steps**:
1. Tab 4: Table of linked EmailTemplateContentRules (rule name, enabled, priority override, content override)
2. "Add Rule" dropdown — fetches available content rules
3. Enable/disable toggle per rule
4. Priority override input
5. Content override editor (text area)
6. Write tests

---

## Phase 3: EmailQueue Admin

### T017: EmailQueue List
**Files**: `src/components/admin/email/queue/EmailQueueList.tsx`, `useEmailQueueListVM.ts`
**Steps**:
1. ViewModel: `queueItems`, `loading`, `error`, `statusFilter`, pagination, `fetchQueue()`, `handleDuplicate(id)`, `handleResend(id)`, `handleResendConfirm()`
2. View: Status filter chips (All | Pending | Processing | Sent | Failed | Cancelled | Retry)
3. Table: Queue ID (truncated), Template, To, Subject (truncated), Status (badge), Sent time, Actions (Duplicate/Resend buttons)
4. Resend confirmation dialog (MUI Dialog)
5. Write tests

### T018: EmailQueue Detail
**Files**: `src/components/admin/email/queue/EmailQueueDetail.tsx`, `useEmailQueueDetailVM.ts`
**Steps**:
1. ViewModel: `queueItem`, `loading`, `error`, `fetchDetail()`
2. View: Read-only display of all fields — organized in sections (Recipients, Content, Status, Timing, Errors)
3. HTML content preview (collapsible iframe)
4. JSON context viewer (collapsible, formatted)
5. Link to duplicated_from entry if exists
6. Write tests

### T019: EmailQueue Duplicate Form
**Files**: `src/components/admin/email/queue/EmailQueueDuplicateForm.tsx`, `useEmailQueueDuplicateFormVM.ts`
**Steps**:
1. ViewModel: `originalItem`, `formData` (editable fields only), `loading`, `error`, `fetchOriginal()`, `handleChange()`, `handleSubmit()`
2. View: Read-only section showing original template/context/priority, editable fields: to_emails (chip input), cc_emails (chip input), bcc_emails (chip input), from_email, reply_to_email, subject
3. Email chip input component — type email, press Enter to add as chip, click X to remove
4. Submit calls `POST /api/email/queue/{id}/duplicate/`
5. Navigate to queue list on success
6. Write tests

---

## Phase 4: EmailAttachment Admin

### T020: EmailAttachment List
**Files**: `src/components/admin/email/attachments/EmailAttachmentList.tsx`, `useEmailAttachmentListVM.ts`
**Steps**:
1. ViewModel: `attachments`, `loading`, `error`, pagination, `fetchAttachments()`, `handleEdit()`, `handleDelete()`
2. View: Table with Name, Display Name, Type, Size (human-readable), Active, Linked Templates count, Actions
3. Write tests

### T021: EmailAttachment Form
**Files**: `src/components/admin/email/attachments/EmailAttachmentForm.tsx`, `useEmailAttachmentFormVM.ts`
**Steps**:
1. ViewModel: `formData`, `file`, `uploadProgress`, `loading`, `error`, `handleFileSelect()`, `handleDrop()`, `handleSubmit()`
2. View: Name, display_name, attachment_type dropdown, description, file upload zone (drag-and-drop + click), mime_type (auto), file_size (auto), is_conditional checkbox, condition_rules (JSON editor if conditional), is_active
3. File upload via `FormData` + multipart request
4. Drag-and-drop zone with accepted file types display
5. Create and edit mode
6. Write tests

---

## Phase 5: EmailContentRule + Placeholder Admin

### T022: RuleConditionBuilder (Shared Component)
**Files**: `src/components/admin/email/shared/RuleConditionBuilder.tsx`, `useRuleConditionBuilderVM.ts`
**Steps**:
1. ViewModel: `conditions`, `operator` (AND/OR), `addCondition()`, `removeCondition()`, `updateCondition()`, `toggleOperator()`, `toJson()`, `fromJson()`
2. View: Primary condition row (field dropdown, operator dropdown, value input)
3. Additional conditions list with AND/OR toggle
4. Add/Remove condition buttons
5. Field dropdown options (hardcoded list of common context fields: items.product_code, user.region, order.total, etc.)
6. Operator dropdown filtered by inferred type
7. Write tests

### T023: RuleJsonEditor (Shared Component)
**Files**: `src/components/admin/email/shared/RuleJsonEditor.tsx`
**Steps**:
1. CodeMirror with JSON language support
2. JSON validation on change (parse + optional schema validation)
3. Error indicator (valid/invalid)
4. Props: value, onChange, schema (optional)
5. Write tests

### T024: EmailContentRule List + Form
**Files**: `src/components/admin/email/content-rules/EmailContentRuleList.tsx`, `useEmailContentRuleListVM.ts`, `EmailContentRuleForm.tsx`, `useEmailContentRuleFormVM.ts`
**Steps**:
1. List ViewModel + View: Table with Name, Rule Type, Placeholder, Priority, Active, Actions
2. Form ViewModel: `formData`, `conditionMode` ('visual' | 'json'), `loading`, `error`, `handleSubmit()`, `toggleConditionMode()`
3. Form View: Name, description, rule_type dropdown, placeholder dropdown, priority, is_exclusive, is_active
4. Condition section: Toggle tabs [Visual Builder | JSON]
5. Visual tab → RuleConditionBuilder; JSON tab → RuleJsonEditor
6. Content template editor (CodeMirror for MJML/HTML content that renders when rule matches)
7. Bidirectional sync between visual builder and JSON (convert on tab switch)
8. Write tests

### T025: EmailPlaceholder List + Form
**Files**: `src/components/admin/email/placeholders/EmailPlaceholderList.tsx`, `useEmailPlaceholderListVM.ts`, `EmailPlaceholderForm.tsx`, `useEmailPlaceholderFormVM.ts`
**Steps**:
1. List ViewModel + View: Table with Name, Display Name, Insert Position, Required, Active, Actions
2. Form ViewModel + View: name, display_name, description, default_content_template (CodeMirror), content_variables (JSON editor), insert_position dropdown, templates (multi-select with chips), is_required, allow_multiple_rules, content_separator, is_active
3. Write tests

---

## Phase 6: Integration + Route Registration

### T026: Route Registration + App.js Updates
**Files**: `src/App.js`
**Steps**:
1. Import all new email admin components
2. Add routes for all email admin pages:
   - `/admin/email/settings`
   - `/admin/email/templates`, `/admin/email/templates/new`, `/admin/email/templates/:id/edit`
   - `/admin/email/queue`, `/admin/email/queue/:id`, `/admin/email/queue/:id/duplicate`
   - `/admin/email/attachments`, `/admin/email/attachments/new`, `/admin/email/attachments/:id/edit`
   - `/admin/email/content-rules`, `/admin/email/content-rules/new`, `/admin/email/content-rules/:id/edit`
   - `/admin/email/placeholders`, `/admin/email/placeholders/new`, `/admin/email/placeholders/:id/edit`
3. Wrap admin routes with `AdminLayout` component (introduces sidebar)
4. Verify existing admin routes still work within the new layout

### T027: End-to-End Integration Testing
**Steps**:
1. Test full CRUD flow for each section via Playwright or manual browser testing
2. Test MJML editor: import from file → edit → preview → save
3. Test queue: duplicate → edit fields → save; resend → confirm → verify reset
4. Test file upload: drag-and-drop → save → verify file on disk
5. Test rule builder: visual mode → add conditions → switch to JSON → verify → save
6. Test admin sidebar navigation across all sections
7. Cross-browser testing (Chrome, Firefox)

---

## Task Dependency Graph

```
T001 (TS Setup) ──┐
                   ├─→ T002 (Types) ──→ T003 (Service)
T005 (Migrations)──┤
                   ├─→ T006 (Serializers) ──→ T007 (ViewSets)
                   │
T004 (Sidebar) ────┤
                   │
T010 (CodeMirror)──┤
                   │
                   └─→ Phase 1-5 (parallel per section after dependencies met)
                       └─→ T026 (Routes) ──→ T027 (Integration)
```

### Parallelization Opportunities
- T001 (TS) + T005 (Migrations) can run in parallel
- T004 (Sidebar) is independent of API work
- After T003 (Service) + T007 (ViewSets): Phases 1-5 can be worked in any order
- Within each phase: ViewModel and View can be developed together (TDD: test VM first, then View)

---

## Estimated Task Count

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 0 | T001-T007 (7) | Foundation: TS, types, service, sidebar, migrations, serializers, viewsets |
| Phase 1 | T008-T009 (2) | EmailSettings admin |
| Phase 2 | T010-T016 (7) | EmailTemplate admin + MJML editor |
| Phase 3 | T017-T019 (3) | EmailQueue admin |
| Phase 4 | T020-T021 (2) | EmailAttachment admin |
| Phase 5 | T022-T025 (4) | ContentRule + Placeholder admin |
| Phase 6 | T026-T027 (2) | Integration + testing |
| **Total** | **27 tasks** | |
