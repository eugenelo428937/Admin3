# Staff Styling Guide - JSON Content System

## Overview

This guide helps non-technical staff configure and customize the appearance of message content in the Admin3 system without requiring code changes.

## Getting Started

### Accessing the Admin Interface

1. Navigate to the Django admin interface (usually `/admin/`)
2. Log in with your staff credentials
3. Look for the "Rules Engine" section

## Managing Content Themes

### Creating a New Theme

1. Go to **Rules Engine** → **Content Style Themes**
2. Click **Add Content Style Theme**
3. Fill in the required fields:
   - **Name**: Give your theme a descriptive name (e.g., "Blue Professional", "Holiday Theme")
   - **Description**: Explain what this theme is for
   - **Is Active**: Check this box to make the theme available for use

### Viewing Existing Themes

1. Go to **Rules Engine** → **Content Style Themes**
2. You'll see a list of all themes with their status
3. Click on any theme name to edit it

## Managing Individual Styles

### Adding Styles to a Theme

1. Go to **Rules Engine** → **Content Styles**
2. Click **Add Content Style**
3. Configure the style:
   - **Theme**: Select which theme this style belongs to
   - **CSS Class**: Enter the class name (e.g., "terms-title", "warning-box")
   - **Element Type**: Optionally specify element type (typography, box, list, container)
   - **Priority**: Higher numbers take precedence (use 0 for normal, 10 for high priority)
   - **Custom Styles**: Enter style properties as JSON

### Custom Styles JSON Format

The custom styles field accepts CSS properties in JSON format. Here are common examples:

#### Text Styling
```json
{
  "color": "#1976d2",
  "fontSize": "18px",
  "fontWeight": "bold",
  "textAlign": "center"
}
```

#### Spacing and Layout
```json
{
  "margin": "16px 0",
  "padding": "20px",
  "borderRadius": "8px"
}
```

#### Background and Borders
```json
{
  "backgroundColor": "#f5f5f5",
  "border": "1px solid #ddd",
  "borderRadius": "4px"
}
```

#### Combined Example
```json
{
  "color": "#d32f2f",
  "backgroundColor": "#ffebee",
  "padding": "12px 16px",
  "borderRadius": "4px",
  "border": "1px solid #f8bbd9",
  "fontSize": "14px",
  "fontWeight": "500"
}
```

### Common CSS Classes

Here are standard CSS classes used throughout the system:

- **terms-title**: Main headings for terms and conditions
- **terms-body**: Body text for terms content
- **terms-list**: Lists within terms content
- **warning-text**: Warning messages
- **info-box**: Information boxes
- **highlight-text**: Text that needs emphasis
- **button-area**: Button container areas

## Managing Message Content

### Editing Message Templates

1. Go to **Rules Engine** → **Message Templates**
2. Find the template you want to edit
3. Click on the template name

### JSON Content Structure

When **Content Format** is set to "JSON", you can structure your content using these elements:

#### Typography (Text Elements)
```json
{
  "elements": [
    {
      "type": "typography",
      "variant": "h6",
      "text": "Important Notice",
      "className": "warning-title"
    }
  ]
}
```

**Text Variants**: h1, h2, h3, h4, h5, h6, body1, body2, caption

#### Lists
```json
{
  "type": "list",
  "className": "terms-list",
  "items": [
    "First item",
    "Second item",
    "Third item"
  ]
}
```

#### Text Formatting

Use these markdown-style formats within text:
- **Bold text**: `**This will be bold**`
- **Links**: `[Click here](/link-url)`

#### Complete Example
```json
{
  "elements": [
    {
      "type": "typography",
      "variant": "h6",
      "text": "Terms and Conditions",
      "className": "terms-title"
    },
    {
      "type": "typography",
      "variant": "body1",
      "text": "By proceeding, you agree to our **[Terms of Service](/terms)**.",
      "className": "terms-body"
    },
    {
      "type": "list",
      "className": "terms-list",
      "items": [
        "All sales are final",
        "Digital delivery only",
        "Access expires after exam"
      ]
    }
  ]
}
```

## Linking Themes to Messages

### Applying a Theme to a Message

1. Go to **Rules Engine** → **Message Template Styles**
2. Click **Add Message Template Style**
3. Select:
   - **Template**: Choose which message template
   - **Theme**: Choose which style theme to apply
   - **Custom Overrides**: Add specific style overrides if needed

### Custom Overrides

Sometimes you need message-specific styling. Use the custom overrides field:

```json
{
  "terms-title": {
    "color": "#ff5722",
    "fontSize": "20px"
  }
}
```

## Color Guide

### Standard Colors (Safe to Use)

- **Primary Blue**: `#1976d2`
- **Success Green**: `#388e3c`
- **Warning Orange**: `#f57c00`
- **Error Red**: `#d32f2f`
- **Text Gray**: `#333333`
- **Light Gray**: `#757575`
- **Background Gray**: `#f5f5f5`

### Background Colors

- **Light Blue**: `#e3f2fd`
- **Light Green**: `#e8f5e8`
- **Light Orange**: `#fff3e0`
- **Light Red**: `#ffebee`
- **Light Gray**: `#fafafa`

## Testing Your Changes

### Preview Changes

After making styling changes:

1. Save your changes in the admin interface
2. Visit the test pages:
   - `/test-json-content/` - See how content renders
   - `/test-dynamic-styling/` - Test styling system
3. Check the actual checkout process to see terms and conditions

### Common Issues and Solutions

#### Styles Not Appearing
- Check that the theme is marked as "Active"
- Verify the CSS class name matches exactly (case-sensitive)
- Ensure the message template style is properly linked

#### Text Not Formatting
- Check JSON syntax is correct (use quotes around all keys and values)
- Verify the className exists in your content styles
- Make sure the theme is applied to the message template

#### Colors Not Showing
- Use proper hex codes (starting with #)
- Check for typos in color names
- Try using standard web colors first

## Best Practices

### Naming Conventions

- Use descriptive, clear names for themes: "Holiday 2024", "Professional Blue"
- Use consistent CSS class names: "title", "body", "warning", "info"
- Add priority levels for clarity: 0 = normal, 5 = important, 10 = critical

### Content Organization

- Group related styles in the same theme
- Use consistent spacing (multiples of 4px: 4px, 8px, 12px, 16px, 20px)
- Test on different screen sizes
- Keep text readable with good contrast

### Maintenance

- Document why you created specific themes
- Remove unused themes and styles periodically
- Test changes in a development environment first
- Keep backups of working configurations

## Getting Help

If you encounter issues:

1. Check the JSON syntax using an online JSON validator
2. Compare your styles to working examples
3. Contact technical support with:
   - Screenshots of the issue
   - The theme/style configuration you're trying to use
   - Which message template you're working with

## Quick Reference

### Essential JSON Properties
- `color`: Text color (#000000 format)
- `backgroundColor`: Background color
- `fontSize`: Text size (14px, 16px, etc.)
- `fontWeight`: Text weight (normal, bold, 500, 600)
- `padding`: Space inside element (10px, 16px 20px)
- `margin`: Space outside element (10px 0, 16px)
- `textAlign`: Text alignment (left, center, right)
- `borderRadius`: Rounded corners (4px, 8px)

### Common Element Types
- `typography`: For text content
- `box`: For containers
- `list`: For bulleted lists
- `container`: For layout containers