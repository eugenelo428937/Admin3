# MJML Editor: mj-class Support, New Elements & Preview Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mj-class-based styling, alignment controls, lists, callouts, and table highlighting to the MJML BasicMode editor; fix preview panel styles.

**Architecture:** Backend migration adds new `attributes` DB component and updates element templates to use `mj-class`. Shell assembly restructured so `<mj-class>` goes inside `<mj-attributes>` and `<mj-style>` stays in `<mj-head>`. Frontend parser extended with alignment markers, list/callout/table-highlight syntax. Toolbar gains new buttons.

**Tech Stack:** Django 6.0 (migrations, views), React 19.2 + TypeScript, MJML (mjml-browser), CodeMirror, Lucide icons.

**Design doc:** `docs/plans/2026-04-01-mjml-editor-mj-class-design.md`

---

## Task 1: Backend — Add `attributes` component type and create migration

**Files:**
- Modify: `backend/django_Admin3/email_system/models/master_component.py:14-21`
- Create: `backend/django_Admin3/email_system/migrations/0026_add_attributes_component.py`

**Step 1: Update model COMPONENT_TYPES**

In `backend/django_Admin3/email_system/models/master_component.py`, add `'attributes'` to `COMPONENT_TYPES`:

```python
COMPONENT_TYPES = [
    ('master_template', 'Master Template'),
    ('banner', 'Banner'),
    ('footer', 'Footer'),
    ('styles', 'Styles'),
    ('attributes', 'Attributes'),
    ('closing', 'Closing'),
    ('dev_mode_banner', 'Dev Mode Banner'),
]
```

**Step 2: Create migration**

Run: `cd backend/django_Admin3 && python manage.py makemigrations email_system --name add_attributes_component`

This generates the migration for the choices change. Then manually edit the migration to add a `RunPython` operation that creates the `attributes` component with the user's mj-class definitions.

Add this data migration function to the generated file:

```python
def create_attributes_component(apps, schema_editor):
    EmailMasterComponent = apps.get_model('email_system', 'EmailMasterComponent')
    
    # Only create if it doesn't exist
    if not EmailMasterComponent.objects.filter(name='attributes').exists():
        EmailMasterComponent.objects.create(
            name='attributes',
            component_type='attributes',
            display_name='Attributes',
            description='MJML mj-class definitions placed inside <mj-attributes>. Controls element styling via class names.',
            mjml_content=(
                '<mj-class name="email-title" padding-top="32px" padding-bottom="32px" font-size="21px" font-weight="600" color="#4d4d4d" />\n'
                '<mj-class name="h1" padding-top="24px" padding-bottom="24px" font-size="32px" />\n'
                '<mj-class name="h2" padding-top="20px" padding-bottom="20px" font-size="26px" />\n'
                '<mj-class name="h3" padding-top="16px" padding-bottom="16px" font-size="20px" />\n'
                '<mj-class name="primary-button" />\n'
                '<mj-class name="secondary-button" />\n'
                '<mj-class name="link" />\n'
                '<mj-class name="divider" />\n'
                '<mj-class name="table" />\n'
                '<mj-class name="text-center" align="center" />\n'
                '<mj-class name="text-start" align="left" />\n'
                '<mj-class name="text-right" align="right" />\n'
                '<mj-class name="ul" align="left" />\n'
                '<mj-class name="ol" align="left" />\n'
                '<mj-class name="callout-info" />\n'
                '<mj-class name="callout-warning" />\n'
                '<mj-class name="callout-success" />\n'
                '<mj-class name="callout-error" />\n'
                '<mj-class name="callout-section" />\n'
                '<mj-class name="accordian" />\n'
            ),
            is_active=True,
        )


def reverse_create_attributes(apps, schema_editor):
    EmailMasterComponent = apps.get_model('email_system', 'EmailMasterComponent')
    EmailMasterComponent.objects.filter(name='attributes').delete()
```

Add to operations: `migrations.RunPython(create_attributes_component, reverse_create_attributes)`

**Step 3: Run migration**

Run: `cd backend/django_Admin3 && python manage.py migrate email_system`
Expected: Migration applies successfully.

**Step 4: Commit**

```
git add backend/django_Admin3/email_system/models/master_component.py backend/django_Admin3/email_system/migrations/0026_add_attributes_component.py
git commit -m "feat(email): add attributes master component for mj-class definitions"
```

---

## Task 2: Backend — Fix shell assembly to use attributes + styles separately

**Files:**
- Modify: `backend/django_Admin3/email_system/views.py:92-134`

**Step 1: Update the mjml_shell action**

In `backend/django_Admin3/email_system/views.py`, replace the `mjml_shell` method (lines 92-134):

```python
@action(detail=False, methods=['get'], url_path='mjml-shell')
def mjml_shell(self, request):
    """Return the assembled MJML shell (master + banner + attributes + styles + footer)
    with a <!-- CONTENT_PLACEHOLDER --> marker where content goes.
    Frontend caches this and inserts user content for instant preview."""
    from email_system.models import EmailMasterComponent

    parts = {}
    for part_name in ('banner', 'attributes', 'styles', 'footer'):
        component = EmailMasterComponent.objects.filter(
            name=part_name, is_active=True
        ).first()
        if not component or not component.mjml_content:
            return Response(
                {'error': f'DB component not found: {part_name}'},
                status=status.HTTP_404_NOT_FOUND,
            )
        parts[part_name] = component.mjml_content

    shell = (
        '<mjml>\n'
        '  <mj-head>\n'
        '    <mj-title>Email Preview</mj-title>\n'
        '    <mj-attributes>\n'
        '      <mj-all font-family="\'Poppins\', Helvetica, Arial, sans-serif" />\n'
        '      <mj-text font-size="16px" line-height="20px" color="#555555" />\n'
        '      <mj-section padding="0" />\n'
        '      <mj-column padding="0" />\n'
        f'      {parts["attributes"]}\n'
        '    </mj-attributes>\n'
        f'    {parts["styles"]}\n'
        '  </mj-head>\n'
        '  <mj-body background-color="#f3f3f3" width="600px">\n'
        '    <mj-wrapper>\n'
        f'      {parts["banner"]}\n'
        '      <!-- CONTENT_PLACEHOLDER -->\n'
        '      <!-- SIGNATURE_PLACEHOLDER -->\n'
        f'      {parts["footer"]}\n'
        '    </mj-wrapper>\n'
        '  </mj-body>\n'
        '</mjml>'
    )

    return Response({'shell': shell})
```

**Step 2: Verify**

Run: `cd backend/django_Admin3 && python manage.py test email_system -v2 2>&1 | tail -20`
Expected: All existing tests pass.

**Step 3: Commit**

```
git add backend/django_Admin3/email_system/views.py
git commit -m "fix(email): place mj-class attributes inside mj-attributes block in shell"
```

---

## Task 3: Backend — Add new element types to model and create seed migration

**Files:**
- Modify: `backend/django_Admin3/email_system/models/email_mjml_element.py:10-19`
- Create: `backend/django_Admin3/email_system/migrations/0027_update_mjml_elements_mj_class.py`

**Step 1: Update model ELEMENT_TYPES**

In `backend/django_Admin3/email_system/models/email_mjml_element.py`, replace `ELEMENT_TYPES`:

```python
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
    ('unordered_list', 'Unordered List'),
    ('ordered_list', 'Ordered List'),
    ('callout_info', 'Callout (Info)'),
    ('callout_warning', 'Callout (Warning)'),
    ('callout_success', 'Callout (Success)'),
    ('callout_error', 'Callout (Error)'),
]
```

**Step 2: Create data migration**

Run: `cd backend/django_Admin3 && python manage.py makemigrations email_system --name update_mjml_elements_mj_class`

Then edit the generated migration to add a `RunPython` that updates existing templates and creates new ones:

```python
def update_and_seed_elements(apps, schema_editor):
    EmailMjmlElement = apps.get_model('email_system', 'EmailMjmlElement')

    # Update existing elements to use mj-class
    updates = {
        'heading_1': '<mj-text mj-class="email-title">{{content}}</mj-text>',
        'heading_2': '<mj-text mj-class="h2">{{content}}</mj-text>',
        'heading_3': '<mj-text mj-class="h3">{{content}}</mj-text>',
        'paragraph': '<mj-text>{{content}}</mj-text>',
        'table': (
            '<mj-text mj-class="table">'
            '<table style="width:100%;border-collapse:collapse;margin:0">'
            '<thead><tr>{{headers}}</tr></thead>'
            '<tbody>{{rows}}</tbody>'
            '</table></mj-text>'
        ),
    }
    for element_type, template in updates.items():
        EmailMjmlElement.objects.filter(element_type=element_type).update(
            mjml_template=template
        )

    # Create new elements
    new_elements = [
        {
            'element_type': 'unordered_list',
            'display_name': 'Unordered List',
            'description': 'Bullet list',
            'mjml_template': '<mj-text mj-class="ul"><ul>{{items}}</ul></mj-text>',
        },
        {
            'element_type': 'ordered_list',
            'display_name': 'Ordered List',
            'description': 'Numbered list',
            'mjml_template': '<mj-text mj-class="ol"><ol>{{items}}</ol></mj-text>',
        },
        {
            'element_type': 'callout_info',
            'display_name': 'Callout (Info)',
            'description': 'Information callout box',
            'mjml_template': '<mj-text mj-class="callout-info">{{content}}</mj-text>',
        },
        {
            'element_type': 'callout_warning',
            'display_name': 'Callout (Warning)',
            'description': 'Warning callout box',
            'mjml_template': '<mj-text mj-class="callout-warning">{{content}}</mj-text>',
        },
        {
            'element_type': 'callout_success',
            'display_name': 'Callout (Success)',
            'description': 'Success callout box',
            'mjml_template': '<mj-text mj-class="callout-success">{{content}}</mj-text>',
        },
        {
            'element_type': 'callout_error',
            'display_name': 'Callout (Error)',
            'description': 'Error callout box',
            'mjml_template': '<mj-text mj-class="callout-error">{{content}}</mj-text>',
        },
    ]
    for elem in new_elements:
        EmailMjmlElement.objects.get_or_create(
            element_type=elem['element_type'],
            defaults=elem,
        )


def reverse_update(apps, schema_editor):
    EmailMjmlElement = apps.get_model('email_system', 'EmailMjmlElement')
    EmailMjmlElement.objects.filter(element_type__in=[
        'unordered_list', 'ordered_list',
        'callout_info', 'callout_warning', 'callout_success', 'callout_error',
    ]).delete()
```

Add to operations: `migrations.RunPython(update_and_seed_elements, reverse_update)`

**Step 3: Run migration**

Run: `cd backend/django_Admin3 && python manage.py migrate email_system`
Expected: Migration applies successfully.

**Step 4: Run tests**

Run: `cd backend/django_Admin3 && python manage.py test email_system -v2 2>&1 | tail -10`
Expected: All tests pass.

**Step 5: Commit**

```
git add backend/django_Admin3/email_system/models/email_mjml_element.py backend/django_Admin3/email_system/migrations/0027_update_mjml_elements_mj_class.py
git commit -m "feat(email): update element templates to mj-class, add list and callout elements"
```

---

## Task 4: Frontend — Update TypeScript types

**Files:**
- Modify: `frontend/react-Admin3/src/types/email/emailMjmlElement.types.ts`

**Step 1: Add new element types to the union**

Replace the `element_type` union in `frontend/react-Admin3/src/types/email/emailMjmlElement.types.ts`:

```typescript
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
        | 'horizontal_divider'
        | 'unordered_list'
        | 'ordered_list'
        | 'callout_info'
        | 'callout_warning'
        | 'callout_success'
        | 'callout_error';
    display_name: string;
    description: string;
    mjml_template: string;
    is_active: boolean;
    updated_at: string;
}
```

**Step 2: Commit**

```
git add frontend/react-Admin3/src/types/email/emailMjmlElement.types.ts
git commit -m "feat(email): add list and callout element types to TypeScript interface"
```

---

## Task 5: Frontend — Update markdownToMjml with alignment, lists, callouts, table highlighting

**Files:**
- Modify: `frontend/react-Admin3/src/utils/email/markdownToMjml.ts`
- Modify: `frontend/react-Admin3/src/utils/email/markdownToMjml.test.ts`

**Step 1: Update test elements in test file**

In `frontend/react-Admin3/src/utils/email/markdownToMjml.test.ts`, update the `testElements` array. Replace the entire array (lines 5-92) with templates that use `mj-class`:

```typescript
const testElements: EmailMjmlElement[] = [
    {
        id: 1, element_type: 'heading_1', display_name: 'Heading 1', description: '',
        mjml_template: '<mj-text mj-class="email-title">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 2, element_type: 'heading_2', display_name: 'Heading 2', description: '',
        mjml_template: '<mj-text mj-class="h2">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 3, element_type: 'heading_3', display_name: 'Heading 3', description: '',
        mjml_template: '<mj-text mj-class="h3">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 4, element_type: 'paragraph', display_name: 'Paragraph', description: '',
        mjml_template: '<mj-text>{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 5, element_type: 'table', display_name: 'Table', description: '',
        mjml_template:
            '<mj-text mj-class="table"><table style="width:100%;border-collapse:collapse;margin:0"><thead><tr>{{headers}}</tr></thead><tbody>{{rows}}</tbody></table></mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 6, element_type: 'bold', display_name: 'Bold', description: '',
        mjml_template: '<strong>{{content}}</strong>',
        is_active: true, updated_at: '',
    },
    {
        id: 7, element_type: 'italic', display_name: 'Italic', description: '',
        mjml_template: '<em>{{content}}</em>',
        is_active: true, updated_at: '',
    },
    {
        id: 8, element_type: 'link', display_name: 'Link', description: '',
        mjml_template: '<a href="{{url}}" style="color:#3498db">{{content}}</a>',
        is_active: true, updated_at: '',
    },
    {
        id: 9, element_type: 'horizontal_divider', display_name: 'Horizontal Divider', description: '',
        mjml_template: '<mj-divider border-color="#dee2e6" padding="16px 0" />',
        is_active: true, updated_at: '',
    },
    {
        id: 10, element_type: 'unordered_list', display_name: 'Unordered List', description: '',
        mjml_template: '<mj-text mj-class="ul"><ul>{{items}}</ul></mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 11, element_type: 'ordered_list', display_name: 'Ordered List', description: '',
        mjml_template: '<mj-text mj-class="ol"><ol>{{items}}</ol></mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 12, element_type: 'callout_info', display_name: 'Callout (Info)', description: '',
        mjml_template: '<mj-text mj-class="callout-info">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 13, element_type: 'callout_warning', display_name: 'Callout (Warning)', description: '',
        mjml_template: '<mj-text mj-class="callout-warning">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 14, element_type: 'callout_success', display_name: 'Callout (Success)', description: '',
        mjml_template: '<mj-text mj-class="callout-success">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 15, element_type: 'callout_error', display_name: 'Callout (Error)', description: '',
        mjml_template: '<mj-text mj-class="callout-error">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
];
```

**Step 2: Update existing tests to match new templates**

Update these existing test assertions:
- `test('converts heading 1')`: change `expect(result).toContain('font-size:21px')` to `expect(result).toContain('mj-class="email-title"')`
- `test('converts heading 2')`: change `expect(result).toContain('font-size:18px')` to `expect(result).toContain('mj-class="h2"')`
- `test('converts heading 3')`: change `expect(result).toContain('font-size:16px')` to `expect(result).toContain('mj-class="h3"')`
- `test('converts paragraph text')`: change `expect(result).toContain('content-text')` to `expect(result).toContain('<mj-text>')`
- `test('converts bold text within paragraph')`: remove `expect(result).toContain('content-text')` line
- `test('converts multiple blocks')`: change `expect(result).toContain('email-title')` to `expect(result).toContain('mj-class="email-title"')`

**Step 3: Write failing tests for new features**

Append these tests to the `describe('markdownToMjml', ...)` block:

```typescript
// --- Alignment ---

test('center alignment with >> <<', () => {
    const result = markdownToMjml('>> # Title <<', testElements);
    expect(result).toContain('mj-class="email-title text-center"');
    expect(result).toContain('Title');
    expect(result).not.toContain('>>');
    expect(result).not.toContain('<<');
});

test('right alignment with >>>>', () => {
    const result = markdownToMjml('>>>> # Title', testElements);
    expect(result).toContain('mj-class="email-title text-right"');
    expect(result).toContain('Title');
});

test('explicit left alignment with <<<<', () => {
    const result = markdownToMjml('# Title <<<<', testElements);
    expect(result).toContain('mj-class="email-title text-start"');
    expect(result).toContain('Title');
});

test('alignment on paragraph', () => {
    const result = markdownToMjml('>> Hello world <<', testElements);
    expect(result).toContain('mj-class="text-center"');
    expect(result).toContain('Hello world');
});

test('no alignment markers keeps default', () => {
    const result = markdownToMjml('# Plain Title', testElements);
    expect(result).toContain('mj-class="email-title"');
    expect(result).not.toContain('text-center');
    expect(result).not.toContain('text-right');
    expect(result).not.toContain('text-start');
});

// --- Lists ---

test('converts unordered list', () => {
    const result = markdownToMjml('- Item one\n- Item two\n- Item three', testElements);
    expect(result).toContain('mj-class="ul"');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item one</li>');
    expect(result).toContain('<li>Item two</li>');
    expect(result).toContain('<li>Item three</li>');
    expect(result).toContain('</ul>');
});

test('converts ordered list', () => {
    const result = markdownToMjml('1. First\n2. Second\n3. Third', testElements);
    expect(result).toContain('mj-class="ol"');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>First</li>');
    expect(result).toContain('<li>Second</li>');
    expect(result).toContain('</ol>');
});

test('list with inline formatting', () => {
    const result = markdownToMjml('- **Bold item**\n- *Italic item*', testElements);
    expect(result).toContain('<li><strong>Bold item</strong></li>');
    expect(result).toContain('<li><em>Italic item</em></li>');
});

// --- Callouts ---

test('converts info callout', () => {
    const result = markdownToMjml('[!info] Important notice here.', testElements);
    expect(result).toContain('mj-class="callout-info"');
    expect(result).toContain('Important notice here.');
});

test('converts warning callout', () => {
    const result = markdownToMjml('[!warning] Check your details.', testElements);
    expect(result).toContain('mj-class="callout-warning"');
    expect(result).toContain('Check your details.');
});

test('converts success callout', () => {
    const result = markdownToMjml('[!success] Submission received.', testElements);
    expect(result).toContain('mj-class="callout-success"');
});

test('converts error callout', () => {
    const result = markdownToMjml('[!error] Payment failed.', testElements);
    expect(result).toContain('mj-class="callout-error"');
});

test('multiline callout', () => {
    const result = markdownToMjml('[!info] Line one\ncontinues here.', testElements);
    expect(result).toContain('mj-class="callout-info"');
    expect(result).toContain('Line one');
    expect(result).toContain('continues here.');
});

// --- Table highlighting ---

test('column-level highlighting', () => {
    const md = '| Subject | Date |\n| ---{!info} | --- |\n| CB2 | 15.04 |';
    const result = markdownToMjml(md, testElements);
    expect(result).toContain('background-color:#d1ecf1');
});

test('row-level highlighting', () => {
    const md = '| Subject | Date |\n| --- | --- |\n{!warning}| CB2 | 15.04 |';
    const result = markdownToMjml(md, testElements);
    expect(result).toContain('background-color:#fff3cd');
});

test('cell-level highlighting', () => {
    const md = '| Subject | Date |\n| --- | --- |\n| CB2 | {!error}15.04 |';
    const result = markdownToMjml(md, testElements);
    expect(result).toContain('background-color:#f8d7da');
});
```

**Step 4: Run tests to verify failures**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=markdownToMjml --watchAll=false`
Expected: Old tests pass with updated assertions. New tests FAIL.

**Step 5: Implement markdownToMjml changes**

Replace the entire content of `frontend/react-Admin3/src/utils/email/markdownToMjml.ts` with the full implementation. The key additions:

1. **`extractAlignment()`** — detects `>>..<<` (center), `>>>>..` (right), `..<<<<` (left) markers and strips them
2. **`injectAlignment()`** — appends alignment class to `mj-class` attribute in generated MJML
3. **List detection** — consecutive lines matching `^- ` or `^\d+\. ` are grouped into `<ul>`/`<ol>`
4. **Callout detection** — blocks starting with `[!info]`, `[!warning]`, `[!success]`, `[!error]`
5. **Table highlighting** — `{!variant}` markers in separator row (column), row prefix, or cell prefix with color map: info=#d1ecf1, warning=#fff3cd, success=#d4edda, error=#f8d7da
6. **Priority**: cell > row > column > default zebra

See design doc Section "Feature: Alignment Markers", "Feature: Lists", "Feature: Callout Blocks", "Feature: Table Highlighting" for full specification.

The implementation file structure:

```
markdownToMjml()           — entry point, unchanged API
extractAlignment()         — NEW: parse alignment markers from block
injectAlignment()          — NEW: append alignment class to mj-class attr
splitIntoBlocks()          — unchanged
convertBlock()             — UPDATED: calls extractAlignment first, adds list/callout detection
applyBlockTemplate()       — unchanged
applyListTemplate()        — NEW: replaces {{items}} placeholder
convertTable()             — UPDATED: parses {!variant} from separator/row/cell
parsePipeRow()             — unchanged
processInlines()           — unchanged
HIGHLIGHT_COLORS           — NEW: color map constant
```

**Step 6: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=markdownToMjml --watchAll=false`
Expected: All tests pass (old updated + new).

**Step 7: Commit**

```
git add frontend/react-Admin3/src/utils/email/markdownToMjml.ts frontend/react-Admin3/src/utils/email/markdownToMjml.test.ts
git commit -m "feat(email): add alignment, lists, callouts, table highlighting to markdownToMjml"
```

---

## Task 6: Frontend — Update mjmlToMarkdown for reverse translation

**Files:**
- Modify: `frontend/react-Admin3/src/utils/email/mjmlToMarkdown.ts`
- Create: `frontend/react-Admin3/src/utils/email/mjmlToMarkdown.test.ts`

**Step 1: Write failing tests**

Create `frontend/react-Admin3/src/utils/email/mjmlToMarkdown.test.ts`:

```typescript
import { mjmlToMarkdown } from './mjmlToMarkdown';

describe('mjmlToMarkdown', () => {
    test('converts mj-class heading to # markdown', () => {
        const mjml = '<mj-section><mj-column><mj-text mj-class="email-title">Hello</mj-text></mj-column></mj-section>';
        expect(mjmlToMarkdown(mjml)).toBe('# Hello');
    });

    test('converts mj-class h2 to ## markdown', () => {
        const mjml = '<mj-text mj-class="h2">Sub</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('## Sub');
    });

    test('converts mj-class h3 to ### markdown', () => {
        const mjml = '<mj-text mj-class="h3">Small</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('### Small');
    });

    test('converts centered heading', () => {
        const mjml = '<mj-text mj-class="email-title text-center">Title</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('>> # Title <<');
    });

    test('converts right-aligned heading', () => {
        const mjml = '<mj-text mj-class="h2 text-right">Title</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('>>>> ## Title');
    });

    test('converts left-explicit heading', () => {
        const mjml = '<mj-text mj-class="h3 text-start">Title</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('### Title <<<<');
    });

    test('converts unordered list', () => {
        const mjml = '<mj-text mj-class="ul"><ul><li>One</li><li>Two</li></ul></mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('- One\n- Two');
    });

    test('converts ordered list', () => {
        const mjml = '<mj-text mj-class="ol"><ol><li>First</li><li>Second</li></ol></mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('1. First\n2. Second');
    });

    test('converts callout info', () => {
        const mjml = '<mj-text mj-class="callout-info">Important notice.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('[!info] Important notice.');
    });

    test('converts callout warning', () => {
        const mjml = '<mj-text mj-class="callout-warning">Be careful.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('[!warning] Be careful.');
    });

    test('converts plain paragraph', () => {
        const mjml = '<mj-text>Hello world.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('Hello world.');
    });

    test('converts divider', () => {
        const mjml = '<mj-divider border-color="#dee2e6" />';
        expect(mjmlToMarkdown(mjml)).toBe('---');
    });

    test('reverses bold inline', () => {
        const mjml = '<mj-text>This is <strong>bold</strong> text.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('This is **bold** text.');
    });

    test('returns empty for empty input', () => {
        expect(mjmlToMarkdown('')).toBe('');
    });
});
```

**Step 2: Run tests to verify failure**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=mjmlToMarkdown --watchAll=false`
Expected: FAIL (new classification logic not implemented yet).

**Step 3: Implement updated mjmlToMarkdown**

Update `frontend/react-Admin3/src/utils/email/mjmlToMarkdown.ts`. Key changes:

1. **`convertMjBlockToMarkdown()`** — classify by `mj-class` first (fallback to `css-class`):
   - `email-title` → `# `
   - `h2` → `## `
   - `h3` → `### `
   - `ul` → extract `<li>` items, emit `- item` lines
   - `ol` → extract `<li>` items, emit `1. item` lines
   - `callout-*` → emit `[!variant] text`
   - `table` / `order-items` → extract table markdown

2. **`applyAlignmentMarkers()`** — NEW: wraps markdown with alignment markers:
   - `text-center` → `>> md <<`
   - `text-right` → `>>>> md`
   - `text-start` → `md <<<<`

3. **`extractListItems()`** — NEW: extracts `<li>` content from list blocks

**Step 4: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=mjmlToMarkdown --watchAll=false`
Expected: All tests pass.

**Step 5: Commit**

```
git add frontend/react-Admin3/src/utils/email/mjmlToMarkdown.ts frontend/react-Admin3/src/utils/email/mjmlToMarkdown.test.ts
git commit -m "feat(email): update mjmlToMarkdown for mj-class, alignment, lists, callouts"
```

---

## Task 7: Frontend — Add toolbar buttons for alignment, lists, callouts

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx`

**Step 1: Verify dropdown-menu component exists**

Check if `frontend/react-Admin3/src/components/admin/ui/dropdown-menu.tsx` exists. If not:

Run: `cd frontend/react-Admin3 && npx shadcn@latest add dropdown-menu`

**Step 2: Update BasicModeToolbar**

Add new imports: `AlignCenter`, `AlignRight`, `List`, `ListOrdered`, `Info`, `AlertTriangle`, `CheckCircle`, `XCircle` from lucide-react. Import `DropdownMenu*` from shadcn.

Add new toolbar actions (after existing actions, before Divider):
- **Align Center** (group: `alignment`): calls `wrapLineAlignment(view, '>> ', ' <<')` — strips existing markers, wraps line
- **Align Right** (group: `alignment`): calls `wrapLineAlignment(view, '>>>> ', '')`
- **Bullet List** (group: `lists`): inserts `\n- Item\n- Item\n`
- **Numbered List** (group: `lists`): inserts `\n1. Item\n2. Item\n`

Add callout dropdown after the regular buttons:
- `DropdownMenu` with trigger button (Info icon)
- Four `DropdownMenuItem`s: info, warning, success, error
- Each inserts `\n[!variant] Message here.\n`

Add helper `wrapLineAlignment(view, before, after)`:
- Gets current line text
- Strips any existing alignment markers (`>>`, `<<`, `>>>>`, `<<<<`)
- Wraps with new markers
- Dispatches change

**Step 3: Verify TypeScript compiles**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

**Step 4: Commit**

```
git add frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx
git commit -m "feat(email): add alignment, list, callout buttons to BasicMode toolbar"
```

---

## Task 8: Verify end-to-end

**Step 1: Run all backend tests**

Run: `cd backend/django_Admin3 && python manage.py test email_system -v2 2>&1 | tail -10`
Expected: All tests pass.

**Step 2: Run all frontend email tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=email --watchAll=false`
Expected: All tests pass.

**Step 3: Run TypeScript check**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 4: Final commit if any cleanup needed**

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Add `attributes` DB component + migration | model, migration |
| 2 | Fix shell assembly (attributes inside mj-attributes, styles after) | views.py |
| 3 | Update element templates + add list/callout elements | model, migration |
| 4 | Update TypeScript types | types file |
| 5 | markdownToMjml: alignment, lists, callouts, table highlighting | parser + tests |
| 6 | mjmlToMarkdown: reverse translation | reverse parser + tests |
| 7 | BasicModeToolbar: alignment, list, callout buttons | toolbar component |
| 8 | End-to-end verification | all tests |
