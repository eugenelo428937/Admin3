# JSON Content and Staff-Configurable Styling System

## Overview

Admin3 implements a sophisticated JSON-based content management system that allows staff to create, edit, and style message content through Django admin without requiring code changes. This system replaces traditional hardcoded HTML with structured JSON content that maps directly to Material UI components.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [JSON Content Format](#json-content-format)
- [Staff-Configurable Styling](#staff-configurable-styling)
- [Django Models](#django-models)
- [API Endpoints](#api-endpoints)
- [React Components](#react-components)
- [Staff User Guide](#staff-user-guide)
- [Developer Guide](#developer-guide)
- [Migration and Setup](#migration-and-setup)

## Architecture Overview

### Component Stack
```
┌─────────────────────────────────────────────┐
│             React Frontend                   │
│  ┌─────────────────────────────────────────┐ │
│  │     JsonContentRenderer                 │ │
│  │  DynamicJsonContentRenderer             │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                         │
                    API Calls
                         │
┌─────────────────────────────────────────────┐
│             Django Backend                   │
│  ┌─────────────────────────────────────────┐ │
│  │     Rules Engine Views                  │ │
│  │     Message Templates                   │ │
│  │     Content Styles                     │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                         │
                    Database
                         │
┌─────────────────────────────────────────────┐
│             PostgreSQL                       │
│  ┌─────────────────────────────────────────┐ │
│  │  MessageTemplate (JSON content)         │ │
│  │  ContentStyleTheme                      │ │
│  │  ContentStyle                           │ │
│  │  MessageTemplateStyle                   │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Benefits
- **No Code Changes**: All content and styling managed through admin
- **Structured Data**: JSON provides type safety and validation
- **Material UI Integration**: Direct mapping to React components
- **Staff Empowerment**: Non-technical staff can manage content and appearance
- **Consistent Styling**: Theme-based approach ensures brand consistency
- **Real-time Updates**: Changes apply immediately without deployment

## JSON Content Format

### Basic Structure
```json
{
  "message_container": {
    "element": "container",
    "text_align": "left",
    "class": "message-wrapper",
    "title": "h4",
    "text": "Message Title"
  },
  "content": [
    {
      "seq": 1,
      "element": "p",
      "text": "This is a paragraph with **bold text** and [/link](Link Text).",
      "class": "intro-paragraph"
    },
    {
      "seq": 2,
      "element": "ul",
      "text": [
        "First bullet point",
        "Second bullet point",
        "Third bullet point"
      ],
      "class": "bullet-list"
    },
    {
      "seq": 3,
      "element": "box",
      "class": "alert alert-warning",
      "content": [
        {
          "seq": 3.1,
          "element": "h5",
          "text": "**Important Notice**"
        },
        {
          "seq": 3.2,
          "element": "p",
          "text": "This is an important message inside a styled box."
        }
      ]
    }
  ]
}
```

### Element Types

| Element | Description | Properties | Example Use Case |
|---------|-------------|------------|------------------|
| `container` | Layout wrapper | `title`, `text_align`, `class` | Main message wrapper |
| `box` | Flexible container | `class`, `content` | Alert boxes, sections |
| `p` | Paragraph | `text`, `class`, `text_align` | Body text |
| `h1`-`h6` | Headings | `text`, `class`, `text_align` | Section titles |
| `ul`/`ol` | Lists | `text` (array), `class` | Bullet points, numbered lists |
| `li` | List items | `text`, `class` | Individual list items |

### Content Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `seq` | Number | Rendering sequence | `1`, `2.1`, `3` |
| `element` | String | HTML/Component type | `"p"`, `"h4"`, `"box"` |
| `text` | String/Array | Content text | `"Hello"` or `["Item 1", "Item 2"]` |
| `class` | String | CSS classes | `"alert alert-warning"` |
| `text_align` | String | Text alignment | `"left"`, `"center"`, `"right"` |
| `content` | Array | Nested elements | For containers and boxes |

### Markdown Support

JSON content supports markdown-like syntax that gets parsed into React components:

| Markdown | Output | Description |
|----------|--------|-------------|
| `**bold text**` | `<strong>bold text</strong>` | Bold formatting |
| `[/link](Display Text)` | `<Link href="/link">Display Text</Link>` | Clickable links |

## Staff-Configurable Styling

### Theme System

The styling system is built around themes that can be created and managed by staff:

#### Default Themes
- **Default Theme**: Standard styling for general content
- **Warning Theme**: Yellow/orange styling for alerts and warnings  
- **Holiday Theme**: Special styling for holiday notices and announcements
- **Terms Theme**: Professional styling for Terms & Conditions content

### Style Configuration

Staff can configure the following properties through Django admin:

#### Colors
- **Background Color**: Element background (`#ffffff`, `rgba(255,255,255,0.9)`)
- **Text Color**: Text color (`#000000`, `#856404`)
- **Border Color**: Border color (`#dee2e6`, `#ffeaa7`)

#### Layout & Spacing
- **Padding**: Internal spacing (`12px 16px`, `20px`)
- **Margin**: External spacing (`0 0 16px 0`, `10px`)
- **Border Width**: Border thickness (`1px`, `2px`, `0`)
- **Border Radius**: Corner rounding (`4px`, `8px`, `0`)

#### Typography
- **Font Size**: Text size (`14px`, `1.2rem`, `inherit`)
- **Font Weight**: Text weight (`normal`, `bold`, `600`)
- **Text Align**: Text alignment (`left`, `center`, `right`, `justify`)

#### Advanced Styling
Custom CSS properties can be added via JSON field:
```json
{
  "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
  "transition": "all 0.3s ease",
  "transform": "translateY(0)",
  "lineHeight": "1.6"
}
```

### CSS Class Targeting

Styles can target elements by:
1. **CSS Class Selector**: `"alert alert-warning"`, `"terms-conditions-content"`
2. **Element Type**: `"box"`, `"p"`, `"h4"`
3. **Combined**: Element + class combinations

### Priority System

When multiple styles could apply to an element, the system follows this priority order:

1. **Template-specific custom styles** (highest priority)
2. **Theme-based styles for CSS class selectors**
3. **Theme-based styles for element types**
4. **Global styles for CSS class selectors**
5. **Global styles for element types** (lowest priority)

## Django Models

### MessageTemplate
Extended to support multiple content formats:

```python
class MessageTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    content = models.TextField()  # Legacy HTML content
    content_format = models.CharField(
        max_length=10,
        choices=[('html', 'HTML'), ('json', 'JSON'), ('markdown', 'Markdown')],
        default='html'
    )
    json_content = models.JSONField(null=True, blank=True)  # Structured content
    message_type = models.CharField(max_length=20, choices=[...])
    variables = models.JSONField(default=list)
    # ... other fields
```

### ContentStyleTheme
Defines styling themes that can be applied to templates:

```python
class ContentStyleTheme(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### ContentStyle
Individual style configurations:

```python
class ContentStyle(models.Model):
    name = models.CharField(max_length=100, unique=True)
    element_type = models.CharField(max_length=20)  # p, h4, box, etc.
    category = models.CharField(max_length=20)      # alert, warning, terms
    css_class_selector = models.CharField(max_length=200, blank=True)
    theme = models.ForeignKey(ContentStyleTheme, ...)
    
    # Visual properties
    background_color = models.CharField(max_length=20, blank=True)
    text_color = models.CharField(max_length=20, blank=True)
    border_color = models.CharField(max_length=20, blank=True)
    border_width = models.CharField(max_length=10, default='1px')
    border_radius = models.CharField(max_length=10, default='4px')
    padding = models.CharField(max_length=20, default='12px 16px')
    margin = models.CharField(max_length=20, default='0 0 16px 0')
    font_size = models.CharField(max_length=10, blank=True)
    font_weight = models.CharField(max_length=10, blank=True)
    text_align = models.CharField(max_length=10, default='left')
    
    # Advanced styling
    custom_styles = models.JSONField(default=dict, blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=100)
```

### MessageTemplateStyle
Links templates to themes and allows style overrides:

```python
class MessageTemplateStyle(models.Model):
    message_template = models.OneToOneField(MessageTemplate, ...)
    theme = models.ForeignKey(ContentStyleTheme, ...)
    custom_styles = models.ManyToManyField(ContentStyle, blank=True)
```

## API Endpoints

### Template Styles API
**Endpoint**: `/api/rules/acknowledgments/template-styles/`  
**Method**: `GET`  
**Parameters**: `?template_id={id}`

**Response**:
```json
{
  "template_id": "8",
  "template_name": "general_terms_conditions",
  "styles": {
    "terms-conditions-content": {
      "borderWidth": "1px",
      "borderRadius": "4px",
      "padding": "0",
      "margin": "0",
      "backgroundColor": "#f8f9fa"
    },
    "alert alert-warning": {
      "backgroundColor": "#fff3cd",
      "color": "#856404",
      "borderColor": "#ffeaa7"
    }
  },
  "cached_at": "2025-01-15T10:30:00Z"
}
```

### Rules Engine Evaluation
**Endpoint**: `/api/rules/engine/evaluate/`  
**Method**: `POST`  
**Body**:
```json
{
  "entry_point_code": "checkout_terms"
}
```

**Response** (with JSON content):
```json
{
  "success": true,
  "messages": [
    {
      "type": "message",
      "message_type": "terms",
      "title": "Terms & Conditions",
      "content_format": "json",
      "json_content": {
        "message_container": { ... },
        "content": [ ... ]
      }
    }
  ]
}
```

## React Components

### JsonContentRenderer
Basic renderer for JSON content without dynamic styling:

```javascript
import JsonContentRenderer from '../Common/JsonContentRenderer';

<JsonContentRenderer 
  content={message.json_content}
  className="terms-conditions-content"
/>
```

**Props**:
- `content`: JSON content object
- `className`: Additional CSS classes

### DynamicJsonContentRenderer
Advanced renderer with backend-driven styling:

```javascript
import DynamicJsonContentRenderer from '../Common/DynamicJsonContentRenderer';

<DynamicJsonContentRenderer 
  content={message.json_content}
  templateId={message.template_id}
  className="dynamic-message-content"
/>
```

**Props**:
- `content`: JSON content object
- `templateId`: Message template ID for style fetching
- `className`: Additional CSS classes

**Features**:
- Automatically fetches styles from backend API
- Applies dynamic styles based on CSS classes and element types
- Graceful fallback to default styling if API fails
- Real-time style updates when backend configuration changes

### Integration Example

```javascript
// In CheckoutSteps.js
{message.content_format === 'json' && message.json_content ? (
  <DynamicJsonContentRenderer 
    content={message.json_content}
    templateId={message.template_id}
    className="checkout-terms-message"
  />
) : (
  <div 
    dangerouslySetInnerHTML={{ 
      __html: message.content || message.message 
    }} 
  />
)}
```

## Staff User Guide

### Managing Content Themes

1. **Access Django Admin**: Navigate to `/admin/` and login with staff credentials
2. **Content Style Themes**: Go to `Rules engine → Content style themes`
3. **Create New Theme**: Click "Add Content Style Theme"
   - **Name**: Descriptive name (e.g., "Holiday 2025 Theme")
   - **Description**: Purpose and usage notes
   - **Is Active**: Check to enable the theme
4. **Save**: Click "Save" to create the theme

### Creating and Editing Styles

1. **Content Styles**: Go to `Rules engine → Content styles`
2. **Add Content Style**: Click "Add Content Style"
3. **Basic Information**:
   - **Name**: Descriptive name (e.g., "Holiday Alert Box")
   - **Element Type**: Select element (box, p, h4, etc.)
   - **Category**: Content category (warning, holiday, terms)
   - **Theme**: Select parent theme
   - **CSS Class Selector**: Target specific classes (e.g., "alert alert-warning")
   - **Priority**: Higher numbers override lower ones (default: 100)
4. **Colors**:
   - **Background Color**: Hex (#fff3cd) or rgba (rgba(255,243,205,1))
   - **Text Color**: Text color (#856404)
   - **Border Color**: Border color (#ffeaa7)
5. **Layout & Spacing**:
   - **Padding**: Internal spacing (e.g., "16px 20px")
   - **Margin**: External spacing (e.g., "0 0 20px 0")
   - **Border Width**: Border thickness (e.g., "1px", "2px")
   - **Border Radius**: Corner rounding (e.g., "6px")
6. **Typography**:
   - **Font Size**: Text size (e.g., "14px", "1.2rem")
   - **Font Weight**: Text weight (normal, bold, 600)
   - **Text Align**: Text alignment (left, center, right)
7. **Advanced Styling**: JSON field for custom CSS properties
   ```json
   {
     "boxShadow": "0 4px 12px rgba(0, 0, 0, 0.1)",
     "transition": "all 0.3s ease"
   }
   ```
8. **Save**: Click "Save" to apply the style

### Assigning Themes to Templates

1. **Message Template Styles**: Go to `Rules engine → Message template styles`
2. **Add Assignment**: Click "Add Message Template Style"
3. **Configuration**:
   - **Message Template**: Select the template
   - **Theme**: Choose the theme to apply
   - **Custom Styles**: Select specific style overrides (optional)
4. **Save**: Changes apply immediately

### Converting Templates to JSON

For existing HTML templates:

1. **Edit Message Template**: Find the template in `Rules engine → Message templates`
2. **Change Format**: Set "Content Format" to "JSON"
3. **Add JSON Content**: Use the JSON content field to define structured content
4. **Test**: Use the test pages to verify rendering
5. **Save**: Template will use JSON rendering

### Testing Changes

Use the test pages to preview changes:
- `/test-configurable-styles.html`: Complete styling system demo
- `/test-all-json-content.html`: JSON content rendering tests
- `/test-json-content.html`: Basic JSON functionality tests

## Developer Guide

### Adding New Element Types

1. **Update ContentStyle Model**:
```python
ELEMENT_TYPES = [
    # ... existing types
    ('custom_element', 'Custom Element'),
]
```

2. **Add Renderer Case**:
```javascript
// In JsonContentRenderer.js
case 'custom_element':
    return (
        <CustomComponent 
            key={key}
            className={cssClass}
            sx={{ 
                textAlign: text_align,
                ...dynamicStyles
            }}
        >
            {parseText(text)}
        </CustomComponent>
    );
```

3. **Create Migration**:
```bash
python manage.py makemigrations rules_engine
python manage.py migrate
```

### Creating Custom Style Categories

1. **Update Model Choices**:
```python
STYLE_CATEGORIES = [
    # ... existing categories
    ('custom', 'Custom Category'),
]
```

2. **Add Default Styles**:
```python
# In setup_default_styles.py
custom_styles = [
    {
        'name': 'Custom Element Style',
        'element_type': 'custom_element',
        'category': 'custom',
        # ... style properties
    }
]
```

### Variable Processing

JSON content supports variable substitution. Variables are processed recursively:

```python
# In handlers.py
def _process_json_variables(self, json_content, variables, context, action):
    # Recursively process all string values in JSON structure
    # Replace {variable_name} with actual values from context
```

**Usage**:
```json
{
  "text": "Contact **{staff_name}** for assistance."
}
```

Becomes:
```json
{
  "text": "Contact **Customer Services Team** for assistance."
}
```

### Performance Considerations

1. **Style Caching**: API responses include cache timestamps
2. **Lazy Loading**: Styles loaded only when needed
3. **Fallback Rendering**: Graceful degradation if API fails
4. **Database Indexing**: Indexes on frequently queried fields

### Error Handling

1. **Invalid JSON**: Validation in model `clean()` methods
2. **Missing Templates**: Graceful fallback to default rendering
3. **API Failures**: Default styles applied automatically
4. **Invalid CSS**: Styles ignored, defaults used

## Migration and Setup

### Initial Setup

1. **Run Migrations**:
```bash
python manage.py migrate
```

2. **Setup Default Styles**:
```bash
python setup_default_styles.py
```

3. **Convert Existing Templates**:
```bash
python update_tc_template_to_json.py
python convert_summer_holiday_to_json.py
```

### Converting Existing HTML Templates

Use the conversion pattern:

```python
# Template conversion script
json_content = {
    "message_container": {
        "element": "container",
        "class": "template-wrapper"
    },
    "content": [
        # Convert HTML elements to JSON structure
    ]
}

template.content_format = 'json'
template.json_content = json_content
template.save()
```

### Backup Strategy

Before making major changes:

1. **Database Backup**: Backup `acted_rules_message_templates` table
2. **Template Export**: Export existing templates
3. **Test Environment**: Test changes in development first
4. **Rollback Plan**: Keep original HTML content as backup

## Troubleshooting

### Common Issues

1. **Styles Not Applying**:
   - Check template has `MessageTemplateStyle` configuration
   - Verify CSS class selectors match exactly
   - Check style priority values
   - Ensure styles are active (`is_active=True`)

2. **JSON Content Not Rendering**:
   - Verify `content_format` is set to 'json'
   - Check `json_content` field is populated
   - Validate JSON structure
   - Check for JavaScript console errors

3. **Variables Not Substituting**:
   - Verify variable names in template `variables` field
   - Check context data includes variable values
   - Ensure variable syntax: `{variable_name}`

4. **API Errors**:
   - Check Django logs for detailed errors
   - Verify template ID exists
   - Check API endpoint permissions
   - Test with different templates

### Debug Tools

1. **Django Admin**: Inspect model data directly
2. **Browser DevTools**: Check API responses and styling
3. **Test Pages**: Use provided HTML test files
4. **Django Logs**: Check for backend errors
5. **Database Queries**: Inspect generated SQL

### Performance Monitoring

Monitor these metrics:
- API response times for style fetching
- Database query counts for style resolution
- Frontend rendering performance
- Cache hit rates

## Future Enhancements

### Planned Features
- **Visual Style Editor**: WYSIWYG interface for style creation
- **Theme Preview**: Live preview of theme changes
- **Style Templates**: Predefined style sets for common use cases
- **Version Control**: Track changes to themes and styles
- **Import/Export**: Backup and restore theme configurations
- **A/B Testing**: Test different styles with user groups

### Extension Points
- **Custom Elements**: Plugin system for new element types
- **Style Validators**: Custom validation for style properties
- **Theme Inheritance**: Hierarchical theme relationships
- **Conditional Styling**: Styles based on user properties or context
- **Animation Support**: CSS animations and transitions
- **Responsive Breakpoints**: Different styles for mobile/desktop

This comprehensive documentation provides everything needed to understand, use, and extend the JSON content and styling system in Admin3.