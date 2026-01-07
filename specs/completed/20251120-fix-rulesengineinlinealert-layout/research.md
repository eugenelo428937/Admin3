# Research: Fix RulesEngineInlineAlert Layout Props

**Date**: 2025-12-15
**Feature**: 20251120-fix-rulesengineinlinealert-layout

---

## Issue 1: Theme maxWidth Constraint

### Investigation

Examined `frontend/react-Admin3/src/theme/theme.js`:

```javascript
// Lines 304-360 contain MuiAlert overrides
MuiAlert: {
  styleOverrides: {
    root: {
      maxWidth: "20rem",  // This is the problem (≈320px)
      // ... other styles
    }
  }
}
```

### Impact

- Any width value > 320px is ignored
- `fullWidth={true}` has no effect since 100% resolves to parent width but is then capped
- Custom widths like `width="400px"` or `width="50%"` are constrained

### Solution

Override `maxWidth` at the component level using MUI's `sx` prop:

```javascript
// In getAlertStyles() - when width props are provided
if (fullWidth || width) {
  styles.maxWidth = 'none';  // Remove theme constraint
  styles.width = fullWidth ? '100%' : width;
}
```

---

## Issue 2: CSS Float in Flex Containers

### Investigation

Examined the usage context in `Home.js` (lines 266-277):

```javascript
<Container
  sx={{
    display: "flex",
    flexDirection: "column",
    // ...
  }}
>
  <RulesEngineInlineAlert float={true} floatPosition="right" />
  {/* Other content */}
</Container>
```

### CSS Float Behavior

CSS `float` has **no effect** inside flex containers. According to CSS spec:
- Float only affects inline-level content in block-level containers
- Flex items ignore float property entirely
- This is why content still shifts down - the Alert is a flex item, not floated

### Alternatives Evaluated

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| CSS Float | Simple syntax | Doesn't work in flex | Rejected |
| `position: absolute` | Works in flex | Requires parent `position: relative` | **Selected** |
| Flexbox `align-self` | Native to flex | Can't "wrap" content around | Rejected |
| Grid positioning | Powerful | Complex for this use case | Rejected |

### Solution

Replace float implementation with absolute positioning:

```javascript
const getContainerStyles = () => {
  const styles = {};

  if (float) {
    styles.position = 'absolute';
    styles.zIndex = 10;

    switch (floatPosition) {
      case 'right':
        styles.right = 0;
        styles.top = 0;
        break;
      case 'center':
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        styles.top = 0;
        break;
      case 'left':
      default:
        styles.left = 0;
        styles.top = 0;
        break;
    }
  }

  return styles;
};
```

**Important**: Parent component must have `position: relative` for this to work. Document this requirement in component JSDoc.

---

## Issue 3: Width Applied to Wrong Element

### Investigation

Current implementation in `RulesEngineInlineAlert.js`:

```javascript
// getContainerStyles() - applies width to Box
const getContainerStyles = () => {
  if (fullWidth) styles.width = '100%';
  else if (width) styles.width = width;
  // ...
};

// getAlertStyles() - ALSO applies width to Alert
const getAlertStyles = () => {
  if (fullWidth) styles.width = '100%';
  else if (width) styles.width = width;
  // ...
};
```

### Impact

- Width is set on both elements
- Theme's `maxWidth: "20rem"` on Alert overrides the inline width
- Container expands but Alert stays at 320px max

### Solution

1. Apply width ONLY to Alert component
2. Override theme's `maxWidth` when custom width is provided
3. Let container size naturally to fit Alert content

```javascript
const getAlertStyles = () => {
  const styles = {
    mb: 2,
    alignItems: 'start',
    justifyContent: 'start'
  };

  // Width handling - override theme maxWidth
  if (fullWidth) {
    styles.width = '100%';
    styles.maxWidth = 'none';  // Critical: override theme constraint
  } else if (width) {
    styles.width = width;
    styles.maxWidth = 'none';  // Critical: override theme constraint
  }
  // If no width props, theme defaults apply (maxWidth: 20rem)

  return styles;
};
```

---

## Test Coverage Analysis

### Current Coverage

Existing tests in `RulesEngineInlineAlert.test.js`:
- Loading state
- Empty messages
- Message format 1 (ProductList)
- Message format 2 (CartReviewStep)
- Collapse/expand functionality
- Severity variants
- HTML rendering
- Multiple messages

### Missing Coverage

No tests for layout props:
- `fullWidth` prop
- `width` prop
- `float` prop
- `floatPosition` prop
- `showMoreLess` with width props
- Prop precedence (fullWidth vs width)

### Recommended Test Additions

```javascript
// Test fullWidth prop
test('applies fullWidth style correctly', () => {
  const { container } = render(
    <RulesEngineInlineAlert messages={[mockMessage]} fullWidth={true} />
  );
  const alert = container.querySelector('[role="alert"]');
  expect(alert).toHaveStyle({ width: '100%' });
});

// Test custom width prop
test('applies custom width style correctly', () => {
  const { container } = render(
    <RulesEngineInlineAlert messages={[mockMessage]} width="400px" />
  );
  const alert = container.querySelector('[role="alert"]');
  expect(alert).toHaveStyle({ width: '400px' });
});

// Test default props maintain theme behavior
test('default props maintain existing behavior', () => {
  const { container } = render(
    <RulesEngineInlineAlert messages={[mockMessage]} />
  );
  const alert = container.querySelector('[role="alert"]');
  // Should not have explicit width/maxWidth overrides
  // Theme default of 20rem should apply
});
```

---

## Affected Files Summary

| File | Change Type | Risk Level |
|------|-------------|------------|
| `RulesEngineInlineAlert.js` | Modify | Medium |
| `RulesEngineInlineAlert.test.js` | Add tests | Low |
| `Home.js` | Possibly add `position: relative` to parent | Low |
| `theme.js` | Optional: Add comment | Very Low |

---

## Decision Summary

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Override maxWidth in component | Clean, isolated, preserves theme defaults | Theme variant (more complex) |
| Use absolute positioning for float | Works in flex containers | CSS float (doesn't work) |
| Apply width to Alert only | Prevents double-application conflict | Apply to both (causes conflict) |
| Add position:relative to parent in Home.js | Required for absolute positioning | Redesign float behavior (overkill) |
