# Basic Mode MJML Editor Design

**Date**: 2026-02-25
**Branch**: 20260220-email-system-admin
**Status**: Approved

## Overview

Add a "Basic Mode" to the MJML email template editor that provides a markdown-like editing experience with a toolbar. Basic Mode is the default for users who need to edit email content without knowing MJML. The existing raw MJML editor becomes "Advanced Mode."

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| DB storage | Both element templates AND user markdown source | Staff customize MJML styling; users preserve markdown for re-editing |
| Mode switching | Forward-only escalation (Basic → Advanced, no return) | Reverse-engineering MJML to markdown is unreliable |
| Element types | Fixed set of 9, customizable MJML templates | Predictable parser, staff control styling without code changes |
| Conversion | Client-side (frontend) | Matches existing client-side mjml-browser compilation pattern |
| Editor | CodeMirror + custom MUI toolbar | Zero new deps, toolbar inserts markdown syntax at cursor |

## Element Types

9 fixed element types, seeded via data migration:

| Element Type | Markdown Syntax | Block/Inline | Placeholders |
|---|---|---|---|
| `heading_1` | `# text` | Block | `{{content}}` |
| `heading_2` | `## text` | Block | `{{content}}` |
| `heading_3` | `### text` | Block | `{{content}}` |
| `paragraph` | Text between blank lines | Block | `{{content}}` |
| `table` | `\| col \| col \|` pipe syntax | Block | `{{headers}}`, `{{rows}}` |
| `bold` | `**text**` | Inline | `{{content}}` |
| `italic` | `*text*` | Inline | `{{content}}` |
| `link` | `[text](url)` | Inline | `{{content}}`, `{{url}}` |
| `horizontal_divider` | `---` | Block | (none) |

**Block elements** produce complete `<mj-text>` or `<mj-divider>` tags.
**Inline elements** produce HTML fragments inside a block's `{{content}}`.

## Architecture

### Data Flow

```
Markdown (Basic Mode editor)
    │
    ├── markdownToMjml(markdown, elements) ← element templates from DB
    │
    ▼
MJML content string
    │
    ├── Injected into CONTENT_PLACEHOLDER in MJML shell
    │
    ▼
mjml-browser compiles to HTML (500ms debounce)
    │
    ▼
MjmlPreviewPane (iframe)
```

### Mode Behavior

- **On load**: If `basic_mode_content` is non-empty → Basic Mode. Otherwise → Advanced Mode.
- **Basic → Advanced**: Confirmation dialog. Converts markdown → MJML. Clears `basic_mode_content`. Irreversible.
- **Advanced → Basic**: Disabled.
- **Save (Basic)**: Sends `{ basic_mode_content: <markdown>, mjml_content: <compiled MJML> }`
- **Save (Advanced)**: Sends `{ mjml_content: <MJML>, basic_mode_content: '' }`

### Parser Pipeline

```
Markdown string
    → Split into blocks (by blank lines)
    → Classify each block (heading? table? paragraph? divider?)
    → Process inline formatting within each block (bold, italic, link)
    → Look up element template from cached DB elements
    → Substitute placeholders into templates
    → Concatenate all MJML blocks → final MJML string
```

**Block classification** (by first line pattern):

| Pattern | Classification |
|---|---|
| `^# (.+)` | heading_1 |
| `^## (.+)` | heading_2 |
| `^### (.+)` | heading_3 |
| `^---$` or `^***$` | horizontal_divider |
| `^\|.+\|` (followed by separator line) | table |
| Everything else | paragraph |

**Inline processing order** (within block content):
1. Bold: `**text**` → substitute into bold template
2. Italic: `*text*` (not preceded by `*`) → substitute into italic template
3. Link: `[text](url)` → substitute into link template

**Edge cases**:
- Empty lines between blocks are separators, stripped
- Template placeholders like `{{ order.total }}` pass through untouched
- Unknown syntax becomes a paragraph

## UI Design

### Toolbar Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [Basic Mode ▼]  │  H1  H2  H3  │  B  I  │  🔗  │  ━━  │  ⊞   │
│   mode toggle   │   headings    │ format │ link │ divid│ table │
└──────────────────────────────────────────────────────────────────┘
```

### Toolbar Button Behaviors

| Button | Inserts | Selection Behavior |
|---|---|---|
| H1 | `# ` | Prefix at line start. If text selected, wraps: `# selected text` |
| H2 | `## ` | Same |
| H3 | `### ` | Same |
| **B** | `**text**` | Wraps selection. No selection → inserts `**bold**` with "bold" selected |
| *I* | `*text*` | Wraps selection. No selection → inserts `*italic*` with "italic" selected |
| Link | `[text](url)` | If selected, wraps: `[selected](url)`. Otherwise `[link text](url)` |
| Divider | `\n---\n` | Inserts with surrounding blank lines |
| Table | Template | Inserts 2-column starter: `\| Column 1 \| Column 2 \|\n\| --- \| --- \|\n\| data \| data \|` |

### Component Structure

```
EmailTemplateMjmlEditor (modified)
├── Mode toggle (MUI Select)
├── BasicModeToolbar (new — only in Basic Mode)
│   └── MUI IconButtons with Tooltips
├── CodeMirror (markdown() or xml() based on mode)
├── Save button / Unsaved changes chip (unchanged)
└── MjmlPreviewPane (unchanged)
```

## Backend Changes

### New Model: EmailMjmlElement

```python
class EmailMjmlElement(models.Model):
    ELEMENT_TYPES = [
        ('heading_1', 'Heading 1'),
        ('heading_2', 'Heading 2'),
        ('heading_3', 'Heading 3'),
        ('paragraph', 'Paragraph'),
        ('table', 'Table'),
        ('bold', 'Bold'),
        ('italic', 'Italic'),
        ('link', 'Link'),
        ('horizontal_divider', 'Horizontal Divider'),
    ]

    element_type = CharField(max_length=50, choices=ELEMENT_TYPES, unique=True)
    display_name = CharField(max_length=100)
    description = TextField(blank=True)
    mjml_template = TextField()  # MJML with {{content}} etc.
    is_active = BooleanField(default=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_mjml_element'
```

### EmailTemplate Model Addition

```python
basic_mode_content = models.TextField(blank=True, default='')
```

### New API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/email/mjml-elements/` | List all active elements (no pagination) |
| `PUT` | `/api/email/mjml-elements/{id}/` | Update element template (IsSuperUser) |

No create/delete — fixed set seeded via data migration.

### Data Migration

Seeds 9 elements with default MJML templates:
- `heading_1`: `<mj-text padding-top="32px" padding-bottom="16px" align="center" css-class="email-title" font-size="21px"><span style="color:#2c3e50;margin:0;font-size:21px;font-weight:600">{{content}}</span></mj-text>`
- `heading_2`: Same structure, font-size 18px
- `heading_3`: Same structure, font-size 16px
- `paragraph`: `<mj-text padding-bottom="24px" align="left" css-class="content-text"><span>{{content}}</span></mj-text>`
- `table`: Full styled table with `{{headers}}` and `{{rows}}`
- `bold`: `<strong>{{content}}</strong>`
- `italic`: `<em>{{content}}</em>`
- `link`: `<a href="{{url}}" style="color:#3498db">{{content}}</a>`
- `horizontal_divider`: `<mj-divider border-color="#dee2e6" padding="16px 0" />`

## VM Changes (useEmailTemplateMjmlEditorVM)

### New State
```typescript
editorMode: 'basic' | 'advanced'
basicModeContent: string
elements: EmailMjmlElement[]  // fetched on mount, cached
```

### New Methods
```typescript
setEditorMode(mode: 'basic' | 'advanced'): void
handleBasicContentChange(content: string): void  // debounced → markdownToMjml → preview
fetchElements(): Promise<void>
```

### Modified Methods
```typescript
initContent(mjmlContent: string, basicModeContent: string): void
handleSave(): Promise<void>  // now includes basic_mode_content
```

## File Changes Summary

| Layer | File | Change |
|---|---|---|
| Backend model | `email_system/models/email_mjml_element.py` | New file |
| Backend model | `email_system/models/__init__.py` | Import new model |
| Backend model | `email_system/models/email_template.py` | Add `basic_mode_content` field |
| Backend migration | `email_system/migrations/XXXX_add_basic_mode.py` | Schema + seed data |
| Backend serializer | `email_system/serializers/email_mjml_element.py` | New file |
| Backend serializer | `email_system/serializers/email_template.py` | Add `basic_mode_content` to fields |
| Backend views | `email_system/views/email_mjml_element.py` | New file |
| Backend urls | `email_system/urls.py` | Register new viewset |
| Frontend service | `services/emailService.ts` | Add `getMjmlElements()`, `updateMjmlElement()` |
| Frontend types | `types/email/emailMjmlElement.types.ts` | New file |
| Frontend parser | `utils/email/markdownToMjml.ts` | New file |
| Frontend test | `utils/email/markdownToMjml.test.ts` | New file |
| Frontend component | `components/admin/email/templates/BasicModeToolbar.tsx` | New file |
| Frontend VM | `useEmailTemplateMjmlEditorVM.ts` | Mode, basicContent, elements state |
| Frontend component | `EmailTemplateMjmlEditor.tsx` | Mode toggle, conditional rendering |

## Future Extensions (Not In Scope)

- Button/CTA element type
- Image element type
- `{{ PLACEHOLDER }}` element type
- Admin UI for editing element templates (currently API-only)
- Undo/redo in Basic Mode toolbar
