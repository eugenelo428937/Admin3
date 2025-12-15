# RulesEngineInlineAlert Component

A reusable React component for displaying rules engine messages with collapsible content, configurable width, and positioning options.

## Import

```jsx
import RulesEngineInlineAlert from '../components/Common/RulesEngineInlineAlert';
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `messages` | Array | `[]` | Array of message objects to display |
| `loading` | boolean | `false` | Shows loading spinner when true |
| `loadingMessage` | string | `'Loading information...'` | Custom loading message text |
| `onDismiss` | Function | `undefined` | Callback when alert is dismissed `(index) => void` |
| `fullWidth` | boolean | `false` | Alert container takes full width |
| `width` | string | `null` | Custom width (e.g., `'400px'`, `'50%'`, `'30rem'`) |
| `float` | boolean | `false` | Enables floating positioning |
| `floatPosition` | string | `'left'` | Position when floating: `'left'`, `'right'`, `'center'` |
| `showMoreLess` | boolean | `true` | Shows collapsible expand/collapse functionality |

## Supported Message Formats

The component automatically normalizes different message formats:

### Format 1: Direct Properties (ProductList)
```javascript
{
  title: "Message Title",
  message: "<p>HTML content here</p>",
  variant: "info",        // 'info' | 'warning' | 'error' | 'success'
  template_id: "tmpl_123",
  dismissible: true
}
```

### Format 2: Nested Content (CartReviewStep)
```javascript
{
  message_type: "warning",
  content: {
    title: "Message Title",
    message: "<p>HTML content here</p>"
  },
  template_id: "tmpl_456",
  dismissible: false
}
```

### Format 3: Parsed Wrapper (Home Page Rules Engine)
```javascript
{
  parsed: {
    title: "Message Title",
    message: "<p>HTML content here</p>",
    variant: "info",
    dismissible: true
  },
  template_id: "tmpl_789"
}
```

## Usage Examples

### Basic Usage
```jsx
const messages = [
  {
    title: "Important Notice",
    message: "<p>Please review our updated terms.</p>",
    variant: "info"
  }
];

<RulesEngineInlineAlert messages={messages} />
```

### With Loading State
```jsx
<RulesEngineInlineAlert
  messages={messages}
  loading={isLoading}
  loadingMessage="Checking for important notices..."
/>
```

### Full Width Alert
```jsx
<RulesEngineInlineAlert
  messages={messages}
  fullWidth
/>
```

### Custom Width
```jsx
<RulesEngineInlineAlert
  messages={messages}
  width="30rem"
/>
```

### Float Right
```jsx
<RulesEngineInlineAlert
  messages={messages}
  float
  floatPosition="right"
  width="400px"
/>
```

### Center Positioned
```jsx
<RulesEngineInlineAlert
  messages={messages}
  float
  floatPosition="center"
  width="50%"
/>
```

### Without Expand/Collapse (Full Content Always Visible)
```jsx
<RulesEngineInlineAlert
  messages={messages}
  showMoreLess={false}
/>
```

### With Dismiss Callback
```jsx
const handleDismiss = (index) => {
  console.log(`Message at index ${index} dismissed`);
  // Update your state to remove the message
};

<RulesEngineInlineAlert
  messages={messages}
  onDismiss={handleDismiss}
/>
```

### Combined Options
```jsx
<RulesEngineInlineAlert
  messages={messages}
  width="30rem"
  float
  floatPosition="right"
  showMoreLess={false}
  onDismiss={handleDismiss}
/>
```

## Styling

The component uses Material-UI's `Alert` component with automatic severity mapping:

| Variant | MUI Severity | Color |
|---------|--------------|-------|
| `info` | info | Blue |
| `warning` | warning | Orange |
| `error` | error | Red |
| `success` | success | Green |

## Accessibility

- Expand/collapse buttons include `aria-label` attributes
- Alert component follows Material-UI accessibility standards
- Keyboard navigation supported for interactive elements

## Dependencies

- `@mui/material` - Alert, Box, Container, IconButton, Collapse, Typography, CircularProgress
- `@mui/icons-material` - ExpandMoreIcon, ExpandLessIcon
