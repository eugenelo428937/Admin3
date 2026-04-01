# MJML Editor: mj-class Support, New Elements & Preview Fix

**Date**: 2026-04-01
**Status**: Approved

## Overview

Enhance the MJML BasicMode editor with mj-class-based styling, alignment controls, lists, callout boxes, and table highlighting. Fix the preview panel to display styles correctly.

## Architecture

Three layers of changes:

1. **Backend** — Fix shell assembly (split styles into two DB components), fix signature MJML wrapping, migration to update element templates and add new element types.
2. **Frontend — markdownToMjml.ts / mjmlToMarkdown.ts** — Parse/reverse new markdown syntax for alignment, lists, callouts, table highlighting.
3. **Frontend — BasicModeToolbar.tsx** — Add toolbar buttons for alignment, lists, callouts.

Data flow unchanged: Markdown → `markdownToMjml()` → MJML with mj-class → `mjml2html()` → HTML preview.

## Fix 1: Preview Styles (Shell Assembly)

### Problem

The shell in `views.py` places the `styles` DB component after `</mj-attributes>`. The user's `<mj-class>` definitions need to be inside `<mj-attributes>`, while `<mj-style>` CSS stays in `<mj-head>`.

### Solution: Split into two DB components

| Component | Name | Contains | Placement |
|-----------|------|----------|-----------|
| `attributes` | Attributes | `<mj-class>` definitions | Inside `<mj-attributes>` |
| `styles` | Styles | `<mj-style>` CSS | Inside `<mj-head>`, after `</mj-attributes>` |

Shell assembly becomes:

```python
shell = (
    '<mjml>\n'
    '  <mj-head>\n'
    '    <mj-attributes>\n'
    '      <mj-all font-family="\'Poppins\', Helvetica, Arial, sans-serif" />\n'
    '      <mj-text font-size="16px" line-height="20px" color="#555555" />\n'
    '      <mj-section padding="0" />\n'
    '      <mj-column padding="0" />\n'
    f'      {parts["attributes"]}\n'
    '    </mj-attributes>\n'
    f'    {parts["styles"]}\n'
    '  </mj-head>\n'
    ...
)
```

Migration creates the new `attributes` component, extracts `<mj-class>` definitions from the existing `styles` component if present.

## Fix 2: Signature MJML (Already Done)

Wrapped the closing salutation `<br/>` content in `<mj-section><mj-column><mj-text>` so it's valid MJML.

## Feature: Alignment Markers

### Markdown Syntax

| Syntax | Alignment | mj-class appended |
|--------|-----------|-------------------|
| `# Title` | Default (left) | (none) |
| `>># Title<<` | Center | `text-center` |
| `>>>> # Title` | Right | `text-right` |
| `# Title<<<<` | Left (explicit) | `text-start` |

### Detection Rules

1. `>>` at start AND `<<` at end → center, strip both markers
2. `>>>>` at start → right, strip prefix
3. `<<<<` at end → left explicit, strip suffix
4. No markers → default

Works on any block element (headings, paragraphs, lists, callouts).

### Implementation

After applying the element template, inject alignment class into `mj-class` attribute:
- `mj-class="h2"` → `mj-class="h2 text-center"`
- If no `mj-class`, add `mj-class="text-center"`

## Feature: Updated Element Templates (Migration)

### Updated Elements

| element_type | Old approach | New template |
|---|---|---|
| `heading_1` | Inline styles + css-class | `<mj-text mj-class="email-title">{{content}}</mj-text>` |
| `heading_2` | Inline styles + css-class | `<mj-text mj-class="h2">{{content}}</mj-text>` |
| `heading_3` | Inline styles + css-class | `<mj-text mj-class="h3">{{content}}</mj-text>` |
| `paragraph` | css-class="content-text" | `<mj-text>{{content}}</mj-text>` |
| `table` | Inline styles + css-class | `<mj-text mj-class="table">{{table_html}}</mj-text>` |

### New Elements

| element_type | mj-class | Template |
|---|---|---|
| `unordered_list` | `ul` | `<mj-text mj-class="ul"><ul>{{items}}</ul></mj-text>` |
| `ordered_list` | `ol` | `<mj-text mj-class="ol"><ol>{{items}}</ol></mj-text>` |
| `callout_info` | `callout-info` | `<mj-text mj-class="callout-info">{{content}}</mj-text>` |
| `callout_warning` | `callout-warning` | `<mj-text mj-class="callout-warning">{{content}}</mj-text>` |
| `callout_success` | `callout-success` | `<mj-text mj-class="callout-success">{{content}}</mj-text>` |
| `callout_error` | `callout-error` | `<mj-text mj-class="callout-error">{{content}}</mj-text>` |

## Feature: Lists (ul/ol)

### Markdown Syntax

```
- First item
- Second item
- Third item

1. First step
2. Second step
```

Consecutive lines starting with `- ` or `N. ` form a single list block.

### MJML Output

```xml
<mj-text mj-class="ul">
  <ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
  </ul>
</mj-text>
```

## Feature: Callout Blocks

### Markdown Syntax

```
[!info] Important information here
that continues on the next line.

[!warning] Please check your details.

[!success] Your submission was received.

[!error] Payment failed. Please retry.
```

Contiguous non-blank lines form one callout block (same as paragraph grouping).

### Variants

| Variant | mj-class |
|---------|----------|
| `[!info]` | `callout-info` |
| `[!warning]` | `callout-warning` |
| `[!success]` | `callout-success` |
| `[!error]` | `callout-error` |

## Feature: Table Highlighting

### Markdown Syntax

**Column-level** — in separator row:
```
| Subject | Date |
| ---{!info} | ---{!warning} |
| CB2 | 15.04.2026 |
```

**Row-level** — prefix the row:
```
{!warning}| CB2 | 15.04.2026 |
```

**Cell-level** — prefix inside cell:
```
| CB2 | {!error}15.04.2026 |
```

### Priority

cell > row > column > default (zebra striping)

### Color Map

| Variant | Background Color |
|---------|-----------------|
| `{!info}` | `#d1ecf1` |
| `{!warning}` | `#fff3cd` |
| `{!success}` | `#d4edda` |
| `{!error}` | `#f8d7da` |

## Feature: Toolbar Updates (BasicModeToolbar.tsx)

### New Buttons

| Button | Group | Action |
|--------|-------|--------|
| Align Center | alignment | Wrap current block with `>>` / `<<` |
| Align Right | alignment | Prefix `>>>> ` to current line |
| Unordered List | lists | Insert `- Item` at cursor |
| Ordered List | lists | Insert `1. Item` at cursor |
| Callout (dropdown) | callout | Insert `[!info] ` / `[!warning]` / `[!success]` / `[!error]` |

## Frontend Type Update (emailMjmlElement.types.ts)

Add new element types to the union:

```typescript
element_type:
    | 'heading_1' | 'heading_2' | 'heading_3'
    | 'paragraph' | 'table'
    | 'bold' | 'italic' | 'link'
    | 'horizontal_divider'
    | 'unordered_list' | 'ordered_list'
    | 'callout_info' | 'callout_warning' | 'callout_success' | 'callout_error';
```

## Backend Model Update (EmailMjmlElement)

Add new choices to `ELEMENT_TYPES`:

```python
ELEMENT_TYPES = [
    # existing...
    ('unordered_list', 'Unordered List'),
    ('ordered_list', 'Ordered List'),
    ('callout_info', 'Callout (Info)'),
    ('callout_warning', 'Callout (Warning)'),
    ('callout_success', 'Callout (Success)'),
    ('callout_error', 'Callout (Error)'),
]
```

## Reverse Translation (mjmlToMarkdown.ts)

Update `convertMjBlockToMarkdown` to recognise new mj-class values:
- `mj-class` containing `ul` → extract `<li>` items, emit `- item` lines
- `mj-class` containing `ol` → extract `<li>` items, emit `1. item` lines
- `mj-class` containing `callout-*` → emit `[!variant] text`
- `mj-class` containing `text-center` → wrap with `>>` / `<<`
- `mj-class` containing `text-right` → prefix `>>>> `
- `mj-class` containing `text-start` → suffix `<<<<`
- Classify headings by `mj-class` (`email-title`, `h2`, `h3`) instead of `css-class`
