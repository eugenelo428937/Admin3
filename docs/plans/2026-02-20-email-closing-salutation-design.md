# Email Closing Salutation Design

**Date:** 2026-02-20
**Branch:** 20260220-email-system-admin

## Problem

Every non-master email template currently hardcodes its closing salutation (e.g. "Kind Regards, THE ACTUARIAL EDUCATION COMPANY (ActEd)") directly in the MJML content files. This means changing the sign-off or signature requires editing each `.mjml` file individually. Staff cannot manage signatures through the admin UI.

## Decision: Separate ClosingSalutation Model (Approach B)

A standalone `ClosingSalutation` model holds reusable signature configurations. Multiple templates can share the same salutation. The model supports two signature types: team names (e.g. "BPP Actuarial (ActEd)") and ordered lists of staff members from the `acted.staff` table.

### Alternatives Considered

- **Approach A — Fields on EmailTemplate:** Simpler but adds many fields to an already large model. No signature reuse across templates.
- **Approach C — JSON field:** Flexible but loses FK integrity for staff references and makes querying harder.

## Data Model

### ClosingSalutation

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | Auto |
| `name` | `CharField(100)` unique | Identifier, e.g. `acted_default` |
| `display_name` | `CharField(200)` | Human-readable, e.g. `ActEd` |
| `sign_off_text` | `CharField(200)` default `"Kind Regards"` | The greeting line |
| `signature_type` | `CharField` choices: `team`, `staff` | Which signature format to use |
| `team_signature` | `CharField(200)` nullable | Used when `signature_type=team` |
| `staff_name_format` | `CharField` choices: `full_name`, `first_name` | How staff names display (template-level, not per-staff) |
| `is_active` | `BooleanField` default `True` | |
| `created_at` | `DateTimeField` auto_now_add | |
| `updated_at` | `DateTimeField` auto_now | |

**Meta:** `db_table = 'utils_email_closing_salutation'`

### ClosingSalutationStaff (through table)

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | Auto |
| `closing_salutation` | FK → `ClosingSalutation` | CASCADE |
| `staff` | FK → `tutorials.Staff` | CASCADE |
| `display_order` | `PositiveIntegerField` default `0` | Ordering |

**Meta:** `db_table = 'utils_email_closing_salutation_staff'`, `unique_together = ['closing_salutation', 'staff']`, `ordering = ['display_order']`

### EmailTemplate Change

Add nullable FK:

```python
closing_salutation = models.ForeignKey(
    'ClosingSalutation',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='templates',
)
```

Master templates (`is_master=True`) leave this null.

## MJML Shell & Preview Pipeline

### Shell Changes

The `mjml_shell` endpoint adds a `<!-- SIGNATURE_PLACEHOLDER -->` marker between content and footer:

```
Banner → <!-- CONTENT_PLACEHOLDER --> → <!-- SIGNATURE_PLACEHOLDER --> → Footer
```

### Signature MJML Generation

A new endpoint `GET /api/email/templates/{id}/signature-mjml/` returns the rendered MJML snippet for the template's assigned closing salutation.

**Team type output:**
```mjml
<mj-section background-color="#ffffff">
  <mj-column width="100%" padding="0" background-color="#ffffff">
    <mj-text align="left" css-class="signature-section" padding="12px 24px">
      Kind Regards,<br/>
      <b>BPP Actuarial (ActEd)</b><br/>
    </mj-text>
  </mj-column>
</mj-section>
```

**Staff type output (full_name format):**
```mjml
<mj-section background-color="#ffffff">
  <mj-column width="100%" padding="0" background-color="#ffffff">
    <mj-text align="left" css-class="signature-section" padding="12px 24px">
      Best regards,<br/>
      <b>Darrell Chainey</b><br/>
      <b>John Smith</b><br/>
    </mj-text>
  </mj-column>
</mj-section>
```

### Frontend Preview Flow

1. Shell fetched on mount (existing) — now includes `<!-- SIGNATURE_PLACEHOLDER -->`
2. Signature MJML fetched for the current template (new call)
3. On compile: `shell.replace(CONTENT_PLACEHOLDER, content).replace(SIGNATURE_PLACEHOLDER, signatureMjml)`
4. When closing salutation assignment changes, re-fetch signature MJML

### Email Send Time

The email sending service generates the signature MJML from the template's `closing_salutation` and injects it the same way before MJML compilation.

## API Endpoints

### New: ClosingSalutation CRUD

```
GET/POST       /api/email/closing-salutations/
GET/PUT/DELETE /api/email/closing-salutations/{id}/
```

Response shape:
```json
{
  "id": 1,
  "name": "acted_default",
  "display_name": "ActEd",
  "sign_off_text": "Kind Regards",
  "signature_type": "team",
  "team_signature": "BPP Actuarial (ActEd)",
  "staff_name_format": "full_name",
  "staff_members": [
    { "id": 1, "staff_id": 5, "display_name": "Darrell Chainey", "display_order": 0 }
  ],
  "is_active": true
}
```

### Modified: EmailTemplate endpoints

- `GET /api/email/templates/{id}/` includes `closing_salutation` (FK ID + nested read-only detail)
- `PATCH /api/email/templates/{id}/` accepts `closing_salutation` as ID

### New: Signature MJML preview

```
GET /api/email/templates/{id}/signature-mjml/
```

Returns `{ "signature_mjml": "<mj-section>...</mj-section>" }` or `{ "signature_mjml": "" }` if none assigned.

## Frontend Admin UI

### Closing Salutations Management Page

**Route:** `/admin/email/closing-salutations`

**List view** — columns: Name, Sign-off Text, Type, Signature Preview, Active, Actions

**Create/Edit form:**
- Name, Display Name, Sign-off text (text input)
- Signature type toggle (Team / Staff)
- If Team: team signature text input
- If Staff: staff name format dropdown (Full Name / First Name) + multi-select staff picker with drag-to-reorder
- Add to admin sidebar under Email section

### Template Edit Page Changes

- Add "Closing Salutation" dropdown on the template edit form
- Shows `display_name` with sign-off preview
- "None" option for master templates
- Changing salutation triggers re-fetch of signature MJML for the preview

### MJML Editor VM Changes

- Fetch signature MJML alongside shell on mount
- New `signatureRef` alongside existing `shellRef`
- `compileMjml` replaces both `CONTENT_PLACEHOLDER` and `SIGNATURE_PLACEHOLDER`

## Data Migration

### Seed Default Salutation

```python
name = "acted_default"
display_name = "ActEd"
sign_off_text = "Kind Regards"
signature_type = "team"
team_signature = "BPP Actuarial (ActEd)"
```

Assign to all existing non-master `EmailTemplate` records.

### MJML File Cleanup

Remove hardcoded signature blocks from all 5 content templates:
- `order_confirmation_content.mjml` (lines 214-221)
- `password_reset_content.mjml` (lines 65-72)
- `password_reset_completed_content.mjml` (lines 53-60)
- `email_verification_content.mjml` (lines 65-72)
- `account_activation_content.mjml` (lines 55-59: "Welcome aboard! / The ActEd Team")

After cleanup, re-run the `import-mjml` action or re-seed migration 0004 to update `mjml_content` in the DB.
