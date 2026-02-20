# Email System Admin Panel - Design Document

> **Status**: Approved | **Date**: 2026-02-20 | **Author**: Brainstorming Session

## Summary

Add a full-featured admin panel for the email system in the React frontend. Staff users can configure email settings, edit MJML templates with a live preview editor, manage the email queue (duplicate/resend), upload attachments, and build content rules with a visual condition builder.

This is the first feature to adopt **TypeScript + MVVM architecture** for the frontend, establishing a reference pattern for all new code going forward.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MJML storage | Database field (`mjml_content` on EmailTemplate) | Works in containers, enables versioning, no filesystem writes from API |
| MJML editor | CodeMirror 6 + mjml-browser (client-side) | Instant preview, lighter than Monaco, no server roundtrip for compilation |
| Rule editor | Hybrid visual builder + JSON toggle | Visual for simple rules, JSON for power users |
| Navigation | Grouped under "Email System" in sidebar | Keeps 6 sub-sections organized without cluttering the main nav |
| Queue duplicate | Track origin with `duplicated_from` FK | Audit trail for resent emails |
| Frontend architecture | TypeScript + MVVM (custom hooks as ViewModels) | First adopter of new project-wide pattern |
| API pattern | DRF ViewSets + Axios services | Matches existing admin panel pattern |

---

## 1. Backend API Layer

### Model Changes (2 migrations)

**Migration 1 - EmailTemplate**:
- Add `mjml_content` (TextField, blank=True, default='') — stores the MJML source
- Add `mjml_last_synced` (DateTimeField, null=True, blank=True) — tracks when content was imported from file

**Migration 2 - EmailQueue**:
- Add `duplicated_from` (ForeignKey to self, null=True, blank=True, on_delete=SET_NULL, related_name='duplicates')

### .env Addition

```
EMAIL_ATTACHMENT_UPLOAD_PATH=/Admin3/backend/django_Admin3/static/documents
```

### API Endpoints

All endpoints at `/api/email/`, all require `IsSuperUser` permission.

| Endpoint | ViewSet | Methods | Notes |
|----------|---------|---------|-------|
| `/api/email/settings/` | `EmailSettingsViewSet` | CRUD | Masks sensitive values in GET |
| `/api/email/templates/` | `EmailTemplateViewSet` | CRUD | Includes nested attachments/rules in detail |
| `/api/email/templates/{id}/preview/` | custom action | POST | Accepts `mjml_content`, returns compiled HTML via server-side mjml2html |
| `/api/email/templates/{id}/import-mjml/` | custom action | POST | Reads .mjml file, saves to `mjml_content` field |
| `/api/email/attachments/` | `EmailAttachmentViewSet` | CRUD | File upload via multipart/form-data |
| `/api/email/template-attachments/` | `EmailTemplateAttachmentViewSet` | CRUD | Link attachments to templates |
| `/api/email/queue/` | `EmailQueueViewSet` | List/Retrieve | Read-only + custom actions |
| `/api/email/queue/{id}/duplicate/` | custom action | POST | Creates duplicate with user-edited fields |
| `/api/email/queue/{id}/resend/` | custom action | POST | Resets status/scheduled_at/attempts |
| `/api/email/placeholders/` | `EmailContentPlaceholderViewSet` | CRUD | Includes template associations |
| `/api/email/content-rules/` | `EmailContentRuleViewSet` | CRUD | Includes condition builder data |
| `/api/email/template-content-rules/` | `EmailTemplateContentRuleViewSet` | CRUD | Link rules to templates |

### Serializers

Each model gets a serializer. Key serializer details:

- **EmailSettingsSerializer**: Conditionally masks `value` field when `is_sensitive=True` (GET only)
- **EmailTemplateSerializer**: Nested read of attachments and content rules in detail; writable `mjml_content`
- **EmailQueueSerializer**: Read-only; `duplicate` and `resend` actions use separate input serializers
- **EmailAttachmentSerializer**: Handles file upload, auto-detects `mime_type` and `file_size`
- **EmailContentRuleSerializer**: Serializes condition fields for visual builder consumption

### File Upload Flow

1. Frontend sends `multipart/form-data` to `POST /api/email/attachments/`
2. Backend reads `EMAIL_ATTACHMENT_UPLOAD_PATH` from settings (loaded from `.env`)
3. File saved to configured path
4. `file_path` stores relative path: `documents/filename.pdf`
5. `mime_type` auto-detected, `file_size` calculated

---

## 2. Frontend Architecture - TypeScript + MVVM

### TypeScript Setup

- Add `tsconfig.json` at frontend root (strict mode, allowJs for existing code)
- New `.tsx`/`.ts` files coexist with existing `.js` files
- No migration of existing JS components
- Install: `typescript`, `@types/react`, `@types/react-dom`, `@types/react-router-dom`

### MVVM Pattern

```
Model       → Types/interfaces (src/types/) + Axios service (src/services/)
ViewModel   → Custom hooks (useXxxViewModel) — state, API calls, business logic
View        → Pure presentational React components (TSX) — receives everything from VM
```

### File Structure

```
src/
├── types/
│   └── email/
│       ├── emailSettings.types.ts
│       ├── emailTemplate.types.ts
│       ├── emailAttachment.types.ts
│       ├── emailQueue.types.ts
│       ├── emailContentRule.types.ts
│       └── emailPlaceholder.types.ts
│
├── services/
│   └── emailService.ts
│
├── components/admin/email/
│   ├── settings/
│   │   ├── EmailSettingsList.tsx
│   │   └── useEmailSettingsListVM.ts
│   ├── templates/
│   │   ├── EmailTemplateList.tsx
│   │   ├── useEmailTemplateListVM.ts
│   │   ├── EmailTemplateForm.tsx
│   │   ├── useEmailTemplateFormVM.ts
│   │   ├── EmailTemplateMjmlEditor.tsx
│   │   └── useEmailTemplateMjmlEditorVM.ts
│   ├── queue/
│   │   ├── EmailQueueList.tsx
│   │   ├── useEmailQueueListVM.ts
│   │   ├── EmailQueueDetail.tsx
│   │   ├── useEmailQueueDetailVM.ts
│   │   ├── EmailQueueDuplicateForm.tsx
│   │   └── useEmailQueueDuplicateFormVM.ts
│   ├── attachments/
│   │   ├── EmailAttachmentList.tsx
│   │   ├── useEmailAttachmentListVM.ts
│   │   ├── EmailAttachmentForm.tsx
│   │   └── useEmailAttachmentFormVM.ts
│   ├── content-rules/
│   │   ├── EmailContentRuleList.tsx
│   │   ├── useEmailContentRuleListVM.ts
│   │   ├── EmailContentRuleForm.tsx
│   │   └── useEmailContentRuleFormVM.ts
│   ├── placeholders/
│   │   ├── EmailPlaceholderList.tsx
│   │   ├── useEmailPlaceholderListVM.ts
│   │   ├── EmailPlaceholderForm.tsx
│   │   └── useEmailPlaceholderFormVM.ts
│   └── shared/
│       ├── RuleConditionBuilder.tsx
│       ├── useRuleConditionBuilderVM.ts
│       ├── RuleJsonEditor.tsx
│       └── MjmlPreviewPane.tsx
```

### MVVM Example

```typescript
// --- Model (types/email/emailTemplate.types.ts) ---
export interface EmailTemplate {
  id: number;
  name: string;
  template_type: TemplateType;
  display_name: string;
  subject_template: string;
  mjml_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TemplateType = 'order_confirmation' | 'password_reset' | 'password_reset_completed'
  | 'account_activation' | 'newsletter' | 'welcome' | 'reminder' | 'notification'
  | 'marketing' | 'support' | 'custom';

// --- ViewModel (useEmailTemplateListVM.ts) ---
export const useEmailTemplateListVM = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emailService.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEdit = (id: number) => navigate(`/admin/email/templates/${id}/edit`);

  return { templates, loading, error, fetchTemplates, handleEdit };
};

// --- View (EmailTemplateList.tsx) ---
const EmailTemplateList: React.FC = () => {
  const vm = useEmailTemplateListVM();
  useEffect(() => { vm.fetchTemplates(); }, []);

  if (vm.loading) return <CircularProgress />;
  if (vm.error) return <Alert severity="error">{vm.error}</Alert>;

  return (
    <Container>
      <Table>{vm.templates.map(t => <TableRow key={t.id}>...</TableRow>)}</Table>
    </Container>
  );
};
```

### New npm Dependencies

- `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-xml` — CodeMirror 6 editor
- `mjml-browser` — client-side MJML to HTML compilation
- `typescript`, `@types/react`, `@types/react-dom`, `@types/react-router-dom` — TypeScript

---

## 3. Navigation - Grouped Sidebar

Update the admin sidebar to support collapsible groups. Add "Email System" group with sub-items:

- Settings → `/admin/email/settings`
- Templates → `/admin/email/templates`
- Queue → `/admin/email/queue`
- Attachments → `/admin/email/attachments`
- Content Rules → `/admin/email/content-rules`
- Placeholders → `/admin/email/placeholders`

---

## 4. EmailQueue - Duplicate & Resend

### Queue List

Table with status badges (sent/failed/pending/processing/retry/cancelled) and two action buttons per row:
- **Duplicate** (copy icon) → navigates to duplicate form
- **Resend** (refresh icon) → confirmation dialog then resets

Status filter chips at top: All | Pending | Processing | Sent | Failed | Cancelled | Retry

### Duplicate Flow

1. User clicks Duplicate → navigate to `/admin/email/queue/:id/duplicate`
2. API `GET /api/email/queue/:id/` fetches original entry
3. Form pre-fills with original data, **only editable fields**: `to_emails`, `cc_emails`, `bcc_emails`, `from_email`, `reply_to_email`, `subject`
4. All other fields displayed read-only (template, context, priority, html_content)
5. On save → `POST /api/email/queue/:id/duplicate/`
6. Backend creates new EmailQueue with:
   - Copied: template, email_context, html_content, text_content, priority, tags
   - User-edited: to/cc/bcc/from/reply-to/subject
   - Set: `duplicated_from` → original, `status` = pending, `attempts` = 0, `scheduled_at` = now

### Resend Flow

1. User clicks Resend → confirmation dialog
2. On confirm → `POST /api/email/queue/:id/resend/`
3. Backend resets: `status` → pending, `scheduled_at` → now, `attempts` → 0, `last_attempt_at` → null, `next_retry_at` → null, `error_message` → '', `error_details` → null
4. Queue processor picks it up on next run

---

## 5. EmailTemplate - MJML Editor

### Storage

- `mjml_content` (TextField) on EmailTemplate stores the MJML source
- On first load, "Import from File" button reads from `.mjml` file and saves to DB
- EmailService reads `mjml_content` from DB first, falls back to `.mjml` file if empty

### Editor Layout (Tab 2 of Template Form)

Split pane: CodeMirror editor (left) | HTML preview iframe (right)

- CodeMirror 6 with XML syntax highlighting (MJML is XML-based)
- Client-side compilation via `mjml-browser` — instant preview on keystroke (debounced 500ms)
- Compile errors shown as a banner between editor and preview
- "Import from File" button to seed `mjml_content` from the `.mjml` file
- "Save" writes `mjml_content` to DB via API
- Server-side preview endpoint available as fallback (uses production mjml2html pipeline)

### Template Form Tabs

1. **General**: Name, display name, type, subject template, from email, reply-to, priority, queue/tracking/retry settings
2. **MJML Editor**: Split pane CodeMirror + preview
3. **Attachments**: Linked attachments table (add/remove/reorder/conditions)
4. **Content Rules**: Linked rules table (enable/disable/priority override/content override)

---

## 6. EmailContentRule - Hybrid Visual Builder

### Visual Builder Mode (default)

Form-based condition builder:
- **Primary condition row**: [Field dropdown] [Operator dropdown] [Value input]
- **Additional conditions**: Indented rows with AND/OR group toggle
- Add/remove condition buttons
- Field dropdown populated from linked placeholder's template context variables
- Operator dropdown filtered by value type (string/numeric/array/existence)

### JSON Mode (toggle)

- CodeMirror with JSON syntax highlighting
- JSON Schema validation
- Combines primary + additional conditions into single JSON object
- Edits in JSON mode write back to individual fields on save

### Data Mapping

| Visual Builder | Model Field |
|---------------|-------------|
| Primary field dropdown | `condition_field` |
| Primary operator | `condition_operator` |
| Primary value | `condition_value` |
| Additional conditions | `additional_conditions` JSON |
| AND/OR toggle | `additional_conditions.operator` |

### additional_conditions JSON structure

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "user.region", "operator": "equals", "value": "UK" },
    { "field": "order.total", "operator": "greater_than", "value": 50 }
  ]
}
```

---

## 7. EmailSettings - Inline Editing

Key-value settings table with inline editing (no separate form page):
- Click edit icon → row expands into inline edit mode
- Sensitive values (`is_sensitive=true`) display masked in table, actual value shown in edit mode
- Filter chips by `setting_type`: All | SMTP | Queue | Tracking | Template | Security | Performance
- Validation against `validation_rules` JSON schema before save

---

## 8. EmailAttachment - File Upload

### List View

Table: Name, Display Name, Type, Size, Active, Linked Templates

### Form

- Standard fields: name, display_name, type, description, mime_type
- Drag-and-drop file upload zone (accepted: PDF, DOCX, PNG, JPG, max 10MB)
- Optional condition rules (JSON editor, shown when "conditional" is checked)
- Upload saves to `EMAIL_ATTACHMENT_UPLOAD_PATH` from `.env`

### Template Linking

Managed from EmailTemplate form's "Attachments" tab:
- Table of linked attachments with order, required checkbox, condition editor
- "Add Attachment" dropdown selects from existing attachments
- Remove unlinks (doesn't delete the attachment file)

---

## 9. EmailContentPlaceholder

Standard list/form pattern:
- Name, display name, description
- Default content template (CodeMirror editor)
- Content variables (JSON editor)
- Insert position dropdown (replace/before/after/append/prepend)
- Template associations (multi-select)
- Required / allow multiple rules toggles

---

## 10. Testing Strategy

### Backend

- ViewSet tests for each endpoint (CRUD + custom actions)
- Serializer tests for field masking, file upload, condition validation
- Migration tests for new fields
- Permission tests (superuser only)

### Frontend

- ViewModel hook tests (mock service, verify state transitions)
- View component tests (mock ViewModel hook, verify rendering)
- Integration tests for MJML editor (compile, preview, save flow)
- Rule condition builder tests (add/remove/toggle conditions)

---

## Dependencies

### Backend (Python)
- No new dependencies (mjml2html already installed)

### Frontend (npm)
- `typescript` + `@types/react` + `@types/react-dom` + `@types/react-router-dom`
- `@codemirror/view` + `@codemirror/state` + `@codemirror/lang-xml`
- `mjml-browser`
