# Basic Mode MJML Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a markdown-based Basic Mode editor with toolbar to the MJML email template editor, with database-stored element templates for customizable MJML output.

**Architecture:** Client-side markdown → MJML conversion using element templates fetched from the backend API. CodeMirror editor with markdown language support and a custom MUI toolbar. Forward-only mode escalation (Basic → Advanced). New `EmailMjmlElement` model stores the 9 fixed element type templates.

**Tech Stack:** Django 6.0, DRF, PostgreSQL, React 19.2, TypeScript, CodeMirror 6, Material-UI v7, mjml-browser

**Design Doc:** `docs/plans/2026-02-25-basic-mode-mjml-editor-design.md`

---

## Phase 1: Backend — EmailMjmlElement Model + Migration

### Task 1: Create EmailMjmlElement Model

**Files:**
- Create: `backend/django_Admin3/email_system/models/email_mjml_element.py`
- Modify: `backend/django_Admin3/email_system/models/__init__.py` (add import)

**Step 1: Create the model file**

```python
# backend/django_Admin3/email_system/models/email_mjml_element.py
from django.db import models


class EmailMjmlElement(models.Model):
    """
    Stores MJML templates for each fixed markdown element type.
    Staff can edit the MJML styling via API without code changes.
    """

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

    element_type = models.CharField(
        max_length=50,
        choices=ELEMENT_TYPES,
        unique=True,
    )
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    mjml_template = models.TextField(
        help_text='MJML template with {{content}}, {{url}}, {{headers}}, {{rows}} placeholders'
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_mjml_element'
        ordering = ['element_type']

    def __str__(self):
        return f'{self.display_name} ({self.element_type})'
```

**Step 2: Add import to models `__init__.py`**

In `backend/django_Admin3/email_system/models/__init__.py`, add after the existing imports:

```python
from .email_mjml_element import EmailMjmlElement
```

**Step 3: Add `basic_mode_content` field to EmailTemplate**

In `backend/django_Admin3/email_system/models/template.py`, after the `mjml_content` field (line ~63), add:

```python
    basic_mode_content = models.TextField(
        blank=True,
        default='',
        help_text='Markdown source for Basic Mode editing. Empty = Advanced Mode only.'
    )
```

**Step 4: Commit**

```bash
git add backend/django_Admin3/email_system/models/email_mjml_element.py \
       backend/django_Admin3/email_system/models/__init__.py \
       backend/django_Admin3/email_system/models/template.py
git commit -m "feat(email): add EmailMjmlElement model and basic_mode_content field"
```

---

### Task 2: Create Migration with Seed Data

**Files:**
- Create: `backend/django_Admin3/email_system/migrations/0008_add_basic_mode_and_mjml_elements.py`

**Step 1: Generate the migration**

```bash
cd backend/django_Admin3
python manage.py makemigrations email_system --name add_basic_mode_and_mjml_elements
```

**Step 2: Edit the generated migration to add seed data**

Add a `RunPython` operation after the auto-generated operations. The seed function creates the 9 default elements:

```python
def seed_mjml_elements(apps, schema_editor):
    EmailMjmlElement = apps.get_model('email_system', 'EmailMjmlElement')

    elements = [
        {
            'element_type': 'heading_1',
            'display_name': 'Heading 1',
            'description': 'Primary heading — centered, 21px, bold',
            'mjml_template': (
                '<mj-text padding-top="32px" padding-bottom="16px" align="center" '
                'css-class="email-title" font-size="21px">'
                '<span style="color:#2c3e50;margin:0;font-size:21px;font-weight:600">'
                '{{content}}</span></mj-text>'
            ),
        },
        {
            'element_type': 'heading_2',
            'display_name': 'Heading 2',
            'description': 'Secondary heading — centered, 18px, bold',
            'mjml_template': (
                '<mj-text padding-top="24px" padding-bottom="12px" align="center" '
                'css-class="email-subtitle" font-size="18px">'
                '<span style="color:#2c3e50;margin:0;font-size:18px;font-weight:600">'
                '{{content}}</span></mj-text>'
            ),
        },
        {
            'element_type': 'heading_3',
            'display_name': 'Heading 3',
            'description': 'Tertiary heading — left-aligned, 16px, bold',
            'mjml_template': (
                '<mj-text padding-top="16px" padding-bottom="8px" align="left" '
                'css-class="email-heading3" font-size="16px">'
                '<span style="color:#2c3e50;margin:0;font-size:16px;font-weight:600">'
                '{{content}}</span></mj-text>'
            ),
        },
        {
            'element_type': 'paragraph',
            'display_name': 'Paragraph',
            'description': 'Body text — left-aligned with bottom padding',
            'mjml_template': (
                '<mj-text padding-bottom="24px" align="left" css-class="content-text">'
                '<span>{{content}}</span></mj-text>'
            ),
        },
        {
            'element_type': 'table',
            'display_name': 'Table',
            'description': 'Styled data table with header row',
            'mjml_template': (
                '<mj-text padding="0 24px 24px 24px" align="left" css-class="order-items">'
                '<table style="width:100%;border-collapse:collapse;margin:0">'
                '<thead><tr style="background-color:#ececee;color:#2c3e50">'
                '{{headers}}</tr></thead>'
                '<tbody>{{rows}}</tbody>'
                '</table></mj-text>'
            ),
        },
        {
            'element_type': 'bold',
            'display_name': 'Bold',
            'description': 'Inline bold text',
            'mjml_template': '<strong>{{content}}</strong>',
        },
        {
            'element_type': 'italic',
            'display_name': 'Italic',
            'description': 'Inline italic text',
            'mjml_template': '<em>{{content}}</em>',
        },
        {
            'element_type': 'link',
            'display_name': 'Link',
            'description': 'Inline hyperlink',
            'mjml_template': '<a href="{{url}}" style="color:#3498db">{{content}}</a>',
        },
        {
            'element_type': 'horizontal_divider',
            'display_name': 'Horizontal Divider',
            'description': 'Visual separator line',
            'mjml_template': '<mj-divider border-color="#dee2e6" padding="16px 0" />',
        },
    ]

    for elem in elements:
        EmailMjmlElement.objects.create(**elem)


def reverse_seed(apps, schema_editor):
    EmailMjmlElement = apps.get_model('email_system', 'EmailMjmlElement')
    EmailMjmlElement.objects.all().delete()
```

Add to `operations` list:

```python
migrations.RunPython(seed_mjml_elements, reverse_seed),
```

**Step 3: Run the migration**

```bash
python manage.py migrate email_system
```

Expected: Tables created, 9 elements seeded.

**Step 4: Commit**

```bash
git add backend/django_Admin3/email_system/migrations/
git commit -m "feat(email): add migration with seed data for MJML elements"
```

---

## Phase 2: Backend — Serializer + ViewSet + URLs

### Task 3: Create EmailMjmlElement Serializer and Update Template Serializer

**Files:**
- Modify: `backend/django_Admin3/email_system/serializers.py`

**Step 1: Add EmailMjmlElementSerializer**

At the top of `serializers.py`, add `EmailMjmlElement` to the model imports (around line 4):

```python
from .models import (
    ...,
    EmailMjmlElement,
)
```

Add the new serializer class (after existing serializers, before `EmailTemplateListSerializer`):

```python
class EmailMjmlElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailMjmlElement
        fields = [
            'id', 'element_type', 'display_name', 'description',
            'mjml_template', 'is_active', 'updated_at',
        ]
        read_only_fields = ['id', 'element_type', 'updated_at']
```

Note: `element_type` is read-only — staff can update the template but not change the type.

**Step 2: Add `basic_mode_content` to template serializers**

In `EmailTemplateSerializer.Meta.fields` (around line 203), add `'basic_mode_content'` after `'mjml_content'`:

```python
'is_master', 'mjml_content', 'basic_mode_content',
```

Also add `'basic_mode_content'` to `EmailTemplateListSerializer.Meta.fields` (around line 180) so the editor knows which mode to open in:

```python
'is_master', 'basic_mode_content',
```

**Step 3: Commit**

```bash
git add backend/django_Admin3/email_system/serializers.py
git commit -m "feat(email): add EmailMjmlElement serializer and basic_mode_content to template serializers"
```

---

### Task 4: Create EmailMjmlElement ViewSet and Register URLs

**Files:**
- Modify: `backend/django_Admin3/email_system/views.py`
- Modify: `backend/django_Admin3/email_system/urls.py`

**Step 1: Add ViewSet to views.py**

Add `EmailMjmlElement` to model imports and `EmailMjmlElementSerializer` to serializer imports at the top of `views.py`.

Add the viewset class (after existing viewsets):

```python
class EmailMjmlElementViewSet(viewsets.ModelViewSet):
    """
    MJML element templates — list all and update individual templates.
    No create/delete — elements are seeded via migration.
    """
    queryset = EmailMjmlElement.objects.filter(is_active=True)
    serializer_class = EmailMjmlElementSerializer
    permission_classes = [IsSuperUser]
    http_method_names = ['get', 'put', 'patch', 'head', 'options']
    pagination_class = None  # Always return all elements (max 9)
```

**Step 2: Register in urls.py**

In `backend/django_Admin3/email_system/urls.py`, add after the existing `router.register` calls:

```python
router.register(r'mjml-elements', views.EmailMjmlElementViewSet)
```

**Step 3: Verify the endpoint works**

```bash
python manage.py runserver 8888
```

Test:
```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8888/api/email/mjml-elements/
```

Expected: JSON array with 9 elements.

**Step 4: Commit**

```bash
git add backend/django_Admin3/email_system/views.py \
       backend/django_Admin3/email_system/urls.py
git commit -m "feat(email): add EmailMjmlElement viewset and URL registration"
```

---

## Phase 3: Frontend — Types + Service

### Task 5: Add Frontend Types

**Files:**
- Create: `frontend/react-Admin3/src/types/email/emailMjmlElement.types.ts`
- Modify: `frontend/react-Admin3/src/types/email/emailTemplate.types.ts`

**Step 1: Create EmailMjmlElement type**

```typescript
// frontend/react-Admin3/src/types/email/emailMjmlElement.types.ts
export interface EmailMjmlElement {
    id: number;
    element_type:
        | 'heading_1'
        | 'heading_2'
        | 'heading_3'
        | 'paragraph'
        | 'table'
        | 'bold'
        | 'italic'
        | 'link'
        | 'horizontal_divider';
    display_name: string;
    description: string;
    mjml_template: string;
    is_active: boolean;
    updated_at: string;
}
```

**Step 2: Add `basic_mode_content` to EmailTemplate type**

In `frontend/react-Admin3/src/types/email/emailTemplate.types.ts`, after the `mjml_content: string;` field, add:

```typescript
    basic_mode_content: string;
```

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/types/email/emailMjmlElement.types.ts \
       frontend/react-Admin3/src/types/email/emailTemplate.types.ts
git commit -m "feat(email): add EmailMjmlElement type and basic_mode_content to EmailTemplate"
```

---

### Task 6: Add Service Methods

**Files:**
- Modify: `frontend/react-Admin3/src/services/emailService.ts`

**Step 1: Add import for the new type**

At the top of `emailService.ts`, add:

```typescript
import { EmailMjmlElement } from '../types/email/emailMjmlElement.types';
```

**Step 2: Add two new methods**

Add after the existing email template methods (after `getSignatureMjml` around line 268):

```typescript
    // MJML Elements
    async getMjmlElements(): Promise<EmailMjmlElement[]> {
        const response = await httpService.get('/email/mjml-elements/');
        return response.data;
    },

    async updateMjmlElement(
        id: number,
        data: Partial<EmailMjmlElement>
    ): Promise<EmailMjmlElement> {
        const response = await httpService.put(`/email/mjml-elements/${id}/`, data);
        return response.data;
    },
```

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/services/emailService.ts
git commit -m "feat(email): add getMjmlElements and updateMjmlElement service methods"
```

---

## Phase 4: Frontend — Markdown-to-MJML Parser (TDD)

### Task 7: Install CodeMirror Markdown Language

**Files:**
- Modify: `frontend/react-Admin3/package.json`

**Step 1: Install the package**

```bash
cd frontend/react-Admin3
npm install @codemirror/lang-markdown @lezer/common
```

`@codemirror/lang-markdown` provides the markdown language support for CodeMirror.
`@lezer/common` is a peer dependency that may already be installed.

**Step 2: Commit**

```bash
git add frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json
git commit -m "feat(email): add @codemirror/lang-markdown dependency"
```

---

### Task 8: Write Parser Tests (RED Phase)

**Files:**
- Create: `frontend/react-Admin3/src/utils/email/markdownToMjml.test.ts`

**Step 1: Write the failing tests**

```typescript
// frontend/react-Admin3/src/utils/email/markdownToMjml.test.ts
import { markdownToMjml } from './markdownToMjml';
import { EmailMjmlElement } from '../../types/email/emailMjmlElement.types';

// Default test elements matching the seed data
const testElements: EmailMjmlElement[] = [
    {
        id: 1,
        element_type: 'heading_1',
        display_name: 'Heading 1',
        description: '',
        mjml_template:
            '<mj-text padding-top="32px" padding-bottom="16px" align="center" css-class="email-title" font-size="21px"><span style="color:#2c3e50;margin:0;font-size:21px;font-weight:600">{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 2,
        element_type: 'heading_2',
        display_name: 'Heading 2',
        description: '',
        mjml_template:
            '<mj-text padding-top="24px" padding-bottom="12px" align="center" css-class="email-subtitle" font-size="18px"><span style="color:#2c3e50;margin:0;font-size:18px;font-weight:600">{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 3,
        element_type: 'heading_3',
        display_name: 'Heading 3',
        description: '',
        mjml_template:
            '<mj-text padding-top="16px" padding-bottom="8px" align="left" css-class="email-heading3" font-size="16px"><span style="color:#2c3e50;margin:0;font-size:16px;font-weight:600">{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 4,
        element_type: 'paragraph',
        display_name: 'Paragraph',
        description: '',
        mjml_template:
            '<mj-text padding-bottom="24px" align="left" css-class="content-text"><span>{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 5,
        element_type: 'table',
        display_name: 'Table',
        description: '',
        mjml_template:
            '<mj-text padding="0 24px 24px 24px" align="left" css-class="order-items"><table style="width:100%;border-collapse:collapse;margin:0"><thead><tr style="background-color:#ececee;color:#2c3e50">{{headers}}</tr></thead><tbody>{{rows}}</tbody></table></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 6,
        element_type: 'bold',
        display_name: 'Bold',
        description: '',
        mjml_template: '<strong>{{content}}</strong>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 7,
        element_type: 'italic',
        display_name: 'Italic',
        description: '',
        mjml_template: '<em>{{content}}</em>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 8,
        element_type: 'link',
        display_name: 'Link',
        description: '',
        mjml_template: '<a href="{{url}}" style="color:#3498db">{{content}}</a>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 9,
        element_type: 'horizontal_divider',
        display_name: 'Horizontal Divider',
        description: '',
        mjml_template: '<mj-divider border-color="#dee2e6" padding="16px 0" />',
        is_active: true,
        updated_at: '',
    },
];

describe('markdownToMjml', () => {
    // --- Block elements ---

    test('converts heading 1', () => {
        const result = markdownToMjml('# Hello World', testElements);
        expect(result).toContain('font-size:21px');
        expect(result).toContain('Hello World');
        expect(result).not.toContain('#');
    });

    test('converts heading 2', () => {
        const result = markdownToMjml('## Sub Heading', testElements);
        expect(result).toContain('font-size:18px');
        expect(result).toContain('Sub Heading');
    });

    test('converts heading 3', () => {
        const result = markdownToMjml('### Small Heading', testElements);
        expect(result).toContain('font-size:16px');
        expect(result).toContain('Small Heading');
    });

    test('converts paragraph text', () => {
        const result = markdownToMjml('Hello this is a paragraph.', testElements);
        expect(result).toContain('content-text');
        expect(result).toContain('Hello this is a paragraph.');
    });

    test('converts horizontal divider', () => {
        const result = markdownToMjml('---', testElements);
        expect(result).toContain('mj-divider');
        expect(result).toContain('border-color="#dee2e6"');
    });

    test('converts table with headers and rows', () => {
        const md = '| Name | Price |\n| --- | --- |\n| Widget | £10 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('<thead>');
        expect(result).toContain('Name');
        expect(result).toContain('Price');
        expect(result).toContain('Widget');
        expect(result).toContain('£10');
    });

    // --- Inline elements ---

    test('converts bold text within paragraph', () => {
        const result = markdownToMjml('This is **bold** text.', testElements);
        expect(result).toContain('<strong>bold</strong>');
        expect(result).toContain('content-text');
    });

    test('converts italic text within paragraph', () => {
        const result = markdownToMjml('This is *italic* text.', testElements);
        expect(result).toContain('<em>italic</em>');
    });

    test('converts link within paragraph', () => {
        const result = markdownToMjml(
            'Visit [our site](https://example.com) today.',
            testElements
        );
        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('>our site</a>');
    });

    // --- Multiple blocks ---

    test('converts multiple blocks separated by blank lines', () => {
        const md = '# Title\n\nSome paragraph text.\n\n---\n\nAnother paragraph.';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('email-title');
        expect(result).toContain('Some paragraph text.');
        expect(result).toContain('mj-divider');
        expect(result).toContain('Another paragraph.');
    });

    // --- Edge cases ---

    test('returns empty string for empty input', () => {
        const result = markdownToMjml('', testElements);
        expect(result).toBe('');
    });

    test('returns empty string for whitespace-only input', () => {
        const result = markdownToMjml('   \n\n   ', testElements);
        expect(result).toBe('');
    });

    test('passes through template placeholders untouched', () => {
        const result = markdownToMjml(
            'Your total is {{ order.total }}.',
            testElements
        );
        expect(result).toContain('{{ order.total }}');
    });

    test('handles bold and italic in same paragraph', () => {
        const result = markdownToMjml(
            'This is **bold** and *italic* text.',
            testElements
        );
        expect(result).toContain('<strong>bold</strong>');
        expect(result).toContain('<em>italic</em>');
    });

    test('handles table with multiple rows', () => {
        const md =
            '| Item | Qty | Price |\n| --- | --- | --- |\n| Widget | 2 | £10 |\n| Gadget | 1 | £25 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('Widget');
        expect(result).toContain('Gadget');
        // Should have 2 data rows
        const rowMatches = result.match(/<tr style="border-bottom/g);
        expect(rowMatches).toHaveLength(2);
    });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=markdownToMjml --watchAll=false
```

Expected: All tests FAIL (module not found).

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/utils/email/markdownToMjml.test.ts
git commit -m "test(email): add markdownToMjml parser tests (RED phase)"
```

---

### Task 9: Implement Parser (GREEN Phase)

**Files:**
- Create: `frontend/react-Admin3/src/utils/email/markdownToMjml.ts`

**Step 1: Implement the parser**

```typescript
// frontend/react-Admin3/src/utils/email/markdownToMjml.ts
import { EmailMjmlElement } from '../../types/email/emailMjmlElement.types';

/**
 * Converts a markdown string to MJML using database-stored element templates.
 *
 * Block elements (heading, paragraph, table, divider) produce complete mj-* tags.
 * Inline elements (bold, italic, link) produce HTML fragments within block content.
 */
export function markdownToMjml(
    markdown: string,
    elements: EmailMjmlElement[]
): string {
    if (!markdown.trim()) return '';

    const elementMap = new Map(elements.map((e) => [e.element_type, e]));
    const blocks = splitIntoBlocks(markdown);

    return blocks.map((block) => convertBlock(block, elementMap)).join('\n');
}

// ─── Block Splitting ────────────────────────────────────────────────

/**
 * Splits markdown into blocks separated by blank lines.
 * Table rows are grouped into a single block.
 */
function splitIntoBlocks(markdown: string): string[] {
    const lines = markdown.split(/\r?\n/);
    const blocks: string[] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
        if (line.trim() === '') {
            if (currentBlock.length > 0) {
                blocks.push(currentBlock.join('\n'));
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    }

    if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
    }

    return blocks;
}

// ─── Block Classification & Conversion ──────────────────────────────

function convertBlock(
    block: string,
    elementMap: Map<string, EmailMjmlElement>
): string {
    const firstLine = block.split('\n')[0];

    // Heading 3 (must check before heading 2 and 1)
    if (/^### (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^### /, '');
        return applyBlockTemplate(elementMap, 'heading_3', processInlines(content, elementMap));
    }

    // Heading 2
    if (/^## (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^## /, '');
        return applyBlockTemplate(elementMap, 'heading_2', processInlines(content, elementMap));
    }

    // Heading 1
    if (/^# (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^# /, '');
        return applyBlockTemplate(elementMap, 'heading_1', processInlines(content, elementMap));
    }

    // Horizontal divider
    if (/^(-{3,}|\*{3,})$/.test(firstLine.trim())) {
        const element = elementMap.get('horizontal_divider');
        return element ? element.mjml_template : '<mj-divider />';
    }

    // Table
    const lines = block.split('\n');
    if (lines.length >= 2 && /^\|.+\|/.test(firstLine) && /^\|[\s\-:|]+\|/.test(lines[1])) {
        return convertTable(lines, elementMap);
    }

    // Default: paragraph
    const content = processInlines(block, elementMap);
    return applyBlockTemplate(elementMap, 'paragraph', content);
}

function applyBlockTemplate(
    elementMap: Map<string, EmailMjmlElement>,
    elementType: string,
    content: string
): string {
    const element = elementMap.get(elementType);
    if (!element) return content;
    return element.mjml_template.replace(/\{\{content\}\}/g, content);
}

// ─── Table Conversion ───────────────────────────────────────────────

function convertTable(
    lines: string[],
    elementMap: Map<string, EmailMjmlElement>
): string {
    const headerCells = parsePipeRow(lines[0]);
    // Line 1 is the separator row (| --- | --- |), skip it
    const dataRows = lines.slice(2).map(parsePipeRow);

    const headersHtml = headerCells
        .map(
            (cell) =>
                `<th style="padding:12px;text-align:center;border:none">${cell}</th>`
        )
        .join('');

    const rowsHtml = dataRows
        .map((row) => {
            const cells = row
                .map(
                    (cell) =>
                        `<td style="padding:15px 12px;border:none;text-align:left">${cell}</td>`
                )
                .join('');
            return `<tr style="border-bottom:1px solid #dee2e6">${cells}</tr>`;
        })
        .join('');

    const element = elementMap.get('table');
    if (!element) return `<table>${headersHtml}${rowsHtml}</table>`;

    return element.mjml_template
        .replace(/\{\{headers\}\}/g, headersHtml)
        .replace(/\{\{rows\}\}/g, rowsHtml);
}

function parsePipeRow(line: string): string[] {
    return line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== '');
}

// ─── Inline Processing ──────────────────────────────────────────────

function processInlines(
    text: string,
    elementMap: Map<string, EmailMjmlElement>
): string {
    let result = text;

    // 1. Bold: **text**
    const boldElement = elementMap.get('bold');
    if (boldElement) {
        result = result.replace(
            /\*\*(.+?)\*\*/g,
            (_, content) => boldElement.mjml_template.replace(/\{\{content\}\}/g, content)
        );
    }

    // 2. Italic: *text* (not preceded by *)
    const italicElement = elementMap.get('italic');
    if (italicElement) {
        result = result.replace(
            /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
            (_, content) => italicElement.mjml_template.replace(/\{\{content\}\}/g, content)
        );
    }

    // 3. Link: [text](url)
    const linkElement = elementMap.get('link');
    if (linkElement) {
        result = result.replace(
            /\[(.+?)\]\((.+?)\)/g,
            (_, content, url) =>
                linkElement.mjml_template
                    .replace(/\{\{content\}\}/g, content)
                    .replace(/\{\{url\}\}/g, url)
        );
    }

    return result;
}
```

**Step 2: Run tests to verify they pass**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=markdownToMjml --watchAll=false
```

Expected: All tests PASS.

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/utils/email/markdownToMjml.ts
git commit -m "feat(email): implement markdownToMjml parser (GREEN phase)"
```

---

## Phase 5: Frontend — BasicModeToolbar Component

### Task 10: Create BasicModeToolbar Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx`

**Step 1: Implement the toolbar**

```typescript
// frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx
import React from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    InsertLink,
    HorizontalRule,
    TableChart,
    Title,
} from '@mui/icons-material';
import { EditorView } from 'codemirror';

interface BasicModeToolbarProps {
    editorView: EditorView | null;
}

type InsertAction = (view: EditorView) => void;

/** Insert text wrapping the current selection, or placeholder text if nothing selected */
function wrapSelection(
    view: EditorView,
    before: string,
    after: string,
    placeholder: string
): void {
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    const text = selected || placeholder;
    const insert = `${before}${text}${after}`;

    view.dispatch({
        changes: { from, to, insert },
        selection: {
            anchor: from + before.length,
            head: from + before.length + text.length,
        },
    });
    view.focus();
}

/** Insert a prefix at the start of the current line */
function prefixLine(view: EditorView, prefix: string): void {
    const { from, to } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const selected = view.state.sliceDoc(from, to);
    const text = selected || 'Heading';
    const insert = `${prefix}${text}`;

    // Replace from line start to end of selection (or just insert prefix at line start)
    view.dispatch({
        changes: { from: line.from, to: Math.max(to, line.from), insert },
        selection: {
            anchor: line.from + prefix.length,
            head: line.from + prefix.length + text.length,
        },
    });
    view.focus();
}

/** Insert text at cursor position */
function insertAtCursor(view: EditorView, text: string): void {
    const { from } = view.state.selection.main;
    view.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + text.length },
    });
    view.focus();
}

const TOOLBAR_ACTIONS: { label: string; icon: React.ReactNode; action: InsertAction; group: string }[] = [
    {
        label: 'Heading 1',
        icon: <Title fontSize="small" />,
        group: 'headings',
        action: (view) => prefixLine(view, '# '),
    },
    {
        label: 'Heading 2',
        icon: <Title sx={{ fontSize: 18 }} />,
        group: 'headings',
        action: (view) => prefixLine(view, '## '),
    },
    {
        label: 'Heading 3',
        icon: <Title sx={{ fontSize: 14 }} />,
        group: 'headings',
        action: (view) => prefixLine(view, '### '),
    },
    {
        label: 'Bold',
        icon: <FormatBold fontSize="small" />,
        group: 'format',
        action: (view) => wrapSelection(view, '**', '**', 'bold'),
    },
    {
        label: 'Italic',
        icon: <FormatItalic fontSize="small" />,
        group: 'format',
        action: (view) => wrapSelection(view, '*', '*', 'italic'),
    },
    {
        label: 'Link',
        icon: <InsertLink fontSize="small" />,
        group: 'link',
        action: (view) => {
            const { from, to } = view.state.selection.main;
            const selected = view.state.sliceDoc(from, to);
            if (selected) {
                const insert = `[${selected}](url)`;
                view.dispatch({
                    changes: { from, to, insert },
                    selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
                });
            } else {
                const insert = '[link text](url)';
                view.dispatch({
                    changes: { from, insert },
                    selection: { anchor: from + 1, head: from + 10 },
                });
            }
            view.focus();
        },
    },
    {
        label: 'Divider',
        icon: <HorizontalRule fontSize="small" />,
        group: 'divider',
        action: (view) => insertAtCursor(view, '\n---\n'),
    },
    {
        label: 'Table',
        icon: <TableChart fontSize="small" />,
        group: 'table',
        action: (view) =>
            insertAtCursor(
                view,
                '\n| Column 1 | Column 2 |\n| --- | --- |\n| data | data |\n'
            ),
    },
];

const BasicModeToolbar: React.FC<BasicModeToolbarProps> = ({ editorView }) => {
    let lastGroup = '';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                p: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper',
            }}
        >
            {TOOLBAR_ACTIONS.map((item, idx) => {
                const showDivider = lastGroup !== '' && item.group !== lastGroup;
                lastGroup = item.group;

                return (
                    <React.Fragment key={item.label}>
                        {showDivider && (
                            <Divider
                                orientation="vertical"
                                flexItem
                                sx={{ mx: 0.5 }}
                            />
                        )}
                        <Tooltip title={item.label}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={!editorView}
                                    onClick={() => editorView && item.action(editorView)}
                                >
                                    {item.icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </React.Fragment>
                );
            })}
        </Box>
    );
};

export default BasicModeToolbar;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx
git commit -m "feat(email): add BasicModeToolbar component with markdown insertion actions"
```

---

## Phase 6: Frontend — VM Changes

### Task 11: Update useEmailTemplateMjmlEditorVM

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/useEmailTemplateMjmlEditorVM.ts`

**Step 1: Update the VM interface**

Replace the existing interface (lines 8-19) with:

```typescript
export type EditorMode = 'basic' | 'advanced';

export interface EmailTemplateMjmlEditorVM {
    mjmlContent: string;
    htmlPreview: string;
    compileError: string | null;
    isDirty: boolean;
    isSaving: boolean;
    shellLoading: boolean;
    editorMode: EditorMode;
    basicModeContent: string;
    elements: EmailMjmlElement[];
    handleContentChange: (content: string) => void;
    handleBasicContentChange: (content: string) => void;
    handleSave: () => Promise<void>;
    initContent: (mjmlContent: string, basicModeContent: string) => void;
    setEditorMode: (mode: EditorMode) => void;
    refreshSignature: () => Promise<void>;
}
```

**Step 2: Add imports**

Add at the top:

```typescript
import { EmailMjmlElement } from '../../../../types/email/emailMjmlElement.types';
import { markdownToMjml } from '../../../../utils/email/markdownToMjml';
```

**Step 3: Add new state variables**

Inside the hook, after the existing state declarations (after line 30), add:

```typescript
    const [editorMode, setEditorModeState] = useState<EditorMode>('advanced');
    const [basicModeContent, setBasicModeContent] = useState<string>('');
    const [elements, setElements] = useState<EmailMjmlElement[]>([]);
```

**Step 4: Add fetchElements effect**

After the existing shell-fetch `useEffect` (after line 63), add:

```typescript
    // Fetch MJML element templates on mount
    useEffect(() => {
        let cancelled = false;
        const fetchElements = async () => {
            try {
                const data = await emailService.getMjmlElements();
                if (!cancelled) setElements(data);
            } catch (err) {
                console.error('Error fetching MJML elements:', err);
            }
        };
        fetchElements();
        return () => { cancelled = true; };
    }, []);
```

**Step 5: Add handleBasicContentChange**

After the existing `handleContentChange` (after line 110), add:

```typescript
    const handleBasicContentChange = useCallback(
        (content: string) => {
            setBasicModeContent(content);
            setIsDirty(true);

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                // Convert markdown → MJML → compile to HTML preview
                const mjml = markdownToMjml(content, elements);
                setMjmlContent(mjml);
                compileMjml(mjml);
            }, 500);
        },
        [compileMjml, elements]
    );
```

**Step 6: Update initContent**

Replace the existing `initContent` (lines 125-132) with:

```typescript
    const initContent = useCallback(
        (mjmlContentArg: string, basicModeContentArg: string) => {
            setMjmlContent(mjmlContentArg);
            setBasicModeContent(basicModeContentArg);

            // Determine initial mode
            if (basicModeContentArg) {
                setEditorModeState('basic');
                // Don't compile yet — elements may not be loaded.
                // The elements-loaded effect will handle initial compilation.
            } else {
                setEditorModeState('advanced');
                compileMjml(mjmlContentArg);
            }
            setIsDirty(false);
        },
        [compileMjml]
    );
```

**Step 7: Add setEditorMode (forward-only escalation)**

```typescript
    const setEditorMode = useCallback(
        (mode: EditorMode) => {
            if (mode === 'advanced' && editorMode === 'basic') {
                // Convert markdown → MJML and switch to advanced
                const mjml = markdownToMjml(basicModeContent, elements);
                setMjmlContent(mjml);
                setBasicModeContent('');
                compileMjml(mjml);
            }
            setEditorModeState(mode);
        },
        [editorMode, basicModeContent, elements, compileMjml]
    );
```

**Step 8: Update handleSave**

Replace the existing `handleSave` (lines 112-123) with:

```typescript
    const handleSave = async () => {
        try {
            setIsSaving(true);

            const payload: Record<string, string> = { mjml_content: mjmlContent };
            if (editorMode === 'basic') {
                payload.basic_mode_content = basicModeContent;
            } else {
                payload.basic_mode_content = '';
            }

            await emailService.patchTemplate(templateId, payload);
            setIsDirty(false);
        } catch (err) {
            console.error('Error saving MJML content:', err);
            setCompileError('Failed to save MJML content. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
```

**Step 9: Add effect to compile basic mode content when elements finish loading**

After the existing `shellLoading` recompile effect (after line 160), add:

```typescript
    // When elements load and we're in basic mode, compile the initial content
    useEffect(() => {
        if (elements.length > 0 && editorMode === 'basic' && basicModeContent) {
            const mjml = markdownToMjml(basicModeContent, elements);
            setMjmlContent(mjml);
            compileMjml(mjml);
        }
    }, [elements.length]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 10: Update the return object**

Replace the return statement (lines 162-173) with:

```typescript
    return {
        mjmlContent,
        htmlPreview,
        compileError,
        isDirty,
        isSaving,
        shellLoading,
        editorMode,
        basicModeContent,
        elements,
        handleContentChange,
        handleBasicContentChange,
        handleSave,
        initContent,
        setEditorMode,
        refreshSignature,
    };
```

**Step 11: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/templates/useEmailTemplateMjmlEditorVM.ts
git commit -m "feat(email): add basic mode state, markdown conversion, and mode switching to VM"
```

---

## Phase 7: Frontend — Editor Component Changes

### Task 12: Update EmailTemplateMjmlEditor Component

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx`

**Step 1: Update imports**

Replace the imports (lines 1-8) with:

```typescript
import React, { useRef, useEffect, useState } from 'react';
import {
    Box, Button, Typography, Chip, CircularProgress,
    Select, MenuItem, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions,
} from '@mui/material';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import MjmlPreviewPane from '../shared/MjmlPreviewPane';
import BasicModeToolbar from './BasicModeToolbar';
import useEmailTemplateMjmlEditorVM from './useEmailTemplateMjmlEditorVM';
```

**Step 2: Update props interface**

```typescript
interface EmailTemplateMjmlEditorProps {
    templateId: number;
    initialContent: string;
    initialBasicModeContent: string;
}
```

**Step 3: Update component body**

Replace the component implementation (lines 15-131) with:

```typescript
const EmailTemplateMjmlEditor: React.FC<EmailTemplateMjmlEditorProps> = ({
    templateId,
    initialContent,
    initialBasicModeContent,
}) => {
    const vm = useEmailTemplateMjmlEditorVM(templateId);
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const initializedRef = useRef<boolean>(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Initialize VM state from props
    useEffect(() => {
        if (!initializedRef.current) {
            vm.initContent(initialContent || '', initialBasicModeContent || '');
            initializedRef.current = true;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Create/recreate CodeMirror when mode changes or on initial mount
    useEffect(() => {
        if (!editorRef.current || !initializedRef.current) return;

        // Destroy previous editor
        if (viewRef.current) {
            viewRef.current.destroy();
            viewRef.current = null;
        }

        const isBasic = vm.editorMode === 'basic';
        const doc = isBasic ? vm.basicModeContent : vm.mjmlContent;
        const lang = isBasic ? markdown() : xml();
        const changeHandler = isBasic
            ? vm.handleBasicContentChange
            : vm.handleContentChange;

        const state = EditorState.create({
            doc: doc || '',
            extensions: [
                basicSetup,
                lang,
                oneDark,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        changeHandler(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({ state, parent: editorRef.current });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [vm.editorMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle mode switch confirmation
    const handleModeChange = (newMode: string) => {
        if (newMode === 'advanced' && vm.editorMode === 'basic') {
            setConfirmDialogOpen(true);
        }
    };

    const confirmSwitchToAdvanced = () => {
        setConfirmDialogOpen(false);
        vm.setEditorMode('advanced');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Select
                        value={vm.editorMode}
                        onChange={(e) => handleModeChange(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="basic">Basic Mode</MenuItem>
                        <MenuItem value="advanced">Advanced Mode</MenuItem>
                    </Select>
                    {vm.shellLoading && (
                        <Chip
                            label="Loading preview shell..."
                            size="small"
                            variant="outlined"
                            icon={<CircularProgress size={14} />}
                        />
                    )}
                    {vm.isDirty && (
                        <Chip
                            label="Unsaved changes"
                            color="warning"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={vm.handleSave}
                        disabled={vm.isSaving || !vm.isDirty}
                    >
                        {vm.isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </Box>
            </Box>

            {/* Basic Mode Toolbar — only shown in basic mode */}
            {vm.editorMode === 'basic' && (
                <BasicModeToolbar editorView={viewRef.current} />
            )}

            {/* Split pane: Editor + Preview */}
            <Box sx={{ display: 'flex', gap: 2, minHeight: 500 }}>
                {/* Left: CodeMirror Editor */}
                <Box
                    sx={{
                        flex: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        '& .cm-editor': {
                            height: '100%',
                            minHeight: 500,
                            textAlign: 'left',
                        },
                        '& .cm-scroller': {
                            overflow: 'auto',
                        },
                        '& .cm-content': {
                            paddingLeft: 0,
                            textAlign: 'left',
                        },
                        '& .cm-line': {
                            paddingLeft: '2px',
                            textAlign: 'left',
                        },
                    }}
                >
                    <div ref={editorRef} style={{ height: '100%', minHeight: 500 }} />
                </Box>

                {/* Right: Preview */}
                <Box sx={{ flex: 1 }}>
                    <MjmlPreviewPane
                        html={vm.htmlPreview}
                        error={vm.compileError}
                    />
                </Box>
            </Box>

            {/* Confirmation Dialog: Basic → Advanced */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Switch to Advanced Mode?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Switching to Advanced Mode will convert your content to MJML.
                        You won't be able to switch back to Basic Mode. Continue?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={confirmSwitchToAdvanced} variant="contained">
                        Switch to Advanced
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
```

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx
git commit -m "feat(email): add Basic/Advanced mode toggle with toolbar and confirmation dialog"
```

---

### Task 13: Update EmailTemplateForm to Pass basicModeContent

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateForm.tsx`

**Step 1: Update the MJML editor invocation**

Find the `EmailTemplateMjmlEditor` usage (around line 282-286) and add the new prop:

```typescript
<EmailTemplateMjmlEditor
    templateId={vm.formData.id}
    initialContent={vm.formData.mjml_content || ''}
    initialBasicModeContent={vm.formData.basic_mode_content || ''}
/>
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateForm.tsx
git commit -m "feat(email): pass basic_mode_content to MJML editor component"
```

---

## Phase 8: Verification

### Task 14: Run Full Test Suite

**Step 1: Run parser tests**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=markdownToMjml --watchAll=false
```

Expected: All parser tests pass.

**Step 2: Run full frontend tests**

```bash
cd frontend/react-Admin3
npm test -- --watchAll=false 2>&1 | tail -20
```

Expected: No new failures (existing 280 failures are pre-existing per MEMORY.md).

**Step 3: Run backend migration check**

```bash
cd backend/django_Admin3
python manage.py showmigrations email_system
```

Expected: Migration 0008 shows as applied.

**Step 4: Commit (if any fixes needed)**

---

### Task 15: Manual Integration Test

**Step 1: Start backend and frontend servers**

```bash
# Terminal 1 (backend)
cd backend/django_Admin3 && python manage.py runserver 8888

# Terminal 2 (frontend)
cd frontend/react-Admin3 && npm start
```

**Step 2: Verify the feature**

1. Navigate to `http://127.0.0.1:3000` → Admin → Email → Templates
2. Edit an existing template → MJML Editor tab
3. Verify it opens in **Advanced Mode** (existing templates have no `basic_mode_content`)
4. Create a new template or edit one — set some `basic_mode_content` via API:
   ```bash
   curl -X PATCH http://127.0.0.1:8888/api/email/templates/1/ \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"basic_mode_content": "# Hello World\n\nThis is a test paragraph.\n\n---\n\n| Item | Price |\n| --- | --- |\n| Widget | £10 |"}'
   ```
5. Refresh the editor — should open in **Basic Mode** with markdown content
6. Verify toolbar buttons insert correct markdown syntax
7. Verify preview pane shows the compiled email
8. Click Save — verify both `basic_mode_content` and `mjml_content` are saved
9. Switch to Advanced Mode — confirm dialog appears
10. Confirm switch — MJML is shown, cannot switch back

**Step 3: Verify MJML elements API**

```bash
curl http://127.0.0.1:8888/api/email/mjml-elements/ \
  -H "Authorization: Bearer <token>"
```

Expected: 9 elements with MJML templates.
