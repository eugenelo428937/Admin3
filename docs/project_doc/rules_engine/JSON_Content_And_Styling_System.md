# JSON Content And Styling System Documentation

## Overview

The Admin3 rules engine now supports a sophisticated JSON-based content system with staff-configurable styling. This system allows for dynamic content rendering using Material UI components with database-driven styling that can be managed through the Django admin interface.

## Architecture

### Content Format Types

The rules engine supports two content formats:
- **HTML** (`html`): Traditional HTML string content
- **JSON** (`json`): Structured JSON content with Material UI component mapping

### JSON Content Structure

JSON content follows this structure:

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
      "text": "By proceeding with checkout, you agree to our **[Terms of Service](/terms)** and acknowledge that your order details will be processed.",
      "className": "terms-body"
    },
    {
      "type": "list",
      "className": "terms-list",
      "items": [
        "All sales are final",
        "Course materials will be delivered digitally",
        "Access expires after exam session completion"
      ]
    }
  ]
}
```

### Supported JSON Element Types

1. **Typography** (`typography`)
   - Properties: `variant`, `text`, `className`
   - Supports markdown: `**bold**` and `[link text](url)`

2. **Box** (`box`)
   - Properties: `text`, `className`
   - Container element for styled content blocks

3. **List** (`list`) 
   - Properties: `items` (array), `className`
   - Renders as Material UI List with ListItems

4. **Container** (`container`)
   - Properties: `text`, `className`
   - Material UI Container component

### Variable Substitution

JSON content supports variable substitution throughout the structure:

```json
{
  "elements": [
    {
      "type": "typography",
      "text": "Hello {{user_name}}, your order total is {{order_total}}",
      "variant": "body1"
    }
  ]
}
```

Variables are processed recursively through all JSON properties.

## Database Models

### Enhanced MessageTemplate

```python
class MessageTemplate(models.Model):
    content_format = models.CharField(
        max_length=10,
        choices=[('html', 'HTML'), ('json', 'JSON')],
        default='html'
    )
    json_content = models.JSONField(null=True, blank=True)
    # ... other fields
```

### Styling System Models

#### ContentStyleTheme
Defines reusable style themes:

```python
class ContentStyleTheme(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
```

#### ContentStyle
Individual style definitions within themes:

```python
class ContentStyle(models.Model):
    theme = models.ForeignKey(ContentStyleTheme, on_delete=models.CASCADE)
    css_class = models.CharField(max_length=100)
    element_type = models.CharField(max_length=50, blank=True)
    custom_styles = models.JSONField(default=dict)
    priority = models.IntegerField(default=0)
```

#### MessageTemplateStyle
Links message templates to style themes:

```python
class MessageTemplateStyle(models.Model):
    template = models.OneToOneField(MessageTemplate, on_delete=models.CASCADE)
    theme = models.ForeignKey(ContentStyleTheme, on_delete=models.CASCADE)
    custom_overrides = models.JSONField(default=dict, blank=True)
```

## API Endpoints

### Template Styles Endpoint
`GET /api/rules/template-styles/`

Query parameters:
- `template_id`: Message template ID
- `theme_id`: Style theme ID (optional)

Returns structured CSS-in-JS style objects:

```json
{
  "styles": {
    "terms-title": {
      "color": "#1976d2",
      "fontWeight": "bold",
      "marginBottom": "16px"
    },
    "terms-body": {
      "fontSize": "14px",
      "lineHeight": 1.6,
      "color": "#333"
    }
  }
}
```

## Frontend Components

### JsonContentRenderer
Basic JSON content renderer:

```javascript
import JsonContentRenderer from '../Common/JsonContentRenderer';

<JsonContentRenderer content={jsonContent} />
```

### DynamicJsonContentRenderer  
Enhanced renderer with dynamic styling:

```javascript
import DynamicJsonContentRenderer from '../Common/DynamicJsonContentRenderer';

<DynamicJsonContentRenderer 
  content={jsonContent}
  templateId={templateId}
  themeId={themeId}
/>
```

## Usage Examples

### Creating JSON Content in Django Admin

1. Create or edit a MessageTemplate
2. Set `content_format` to "JSON"  
3. Add JSON structure to `json_content` field
4. Optionally create styling theme and link via MessageTemplateStyle

### Frontend Integration

```javascript
// In CheckoutSteps.js
const handleRulesResponse = (response) => {
  if (response.actions?.length > 0) {
    const acknowledgeActions = response.actions.filter(
      action => action.action_type === 'require_acknowledgment'
    );
    
    acknowledgeActions.forEach(action => {
      if (action.content_format === 'json') {
        setJsonContent(action.json_content);
        setTemplateId(action.template_id);
      }
    });
  }
};

// Render JSON content
{jsonContent && (
  <DynamicJsonContentRenderer 
    content={jsonContent}
    templateId={templateId}
  />
)}
```

## Management Commands

### Setup JSON Content System
```bash
python manage.py setup_json_content_system
```

This command:
- Creates default style themes
- Sets up common CSS classes
- Converts existing HTML templates to JSON format
- Creates example templates for testing

## Best Practices

### JSON Content Structure
- Use semantic element types (typography, box, list, container)
- Apply consistent className patterns
- Keep nesting minimal for better performance
- Use variables for dynamic content

### Styling System
- Create reusable themes for consistency
- Use priority levels for style precedence
- Leverage custom_overrides for template-specific adjustments
- Test styles across different screen sizes

### Variable Usage
- Use descriptive variable names
- Document available variables for content creators
- Handle missing variables gracefully
- Consider performance impact of complex variable processing

## Testing

### Test Pages
- `/test-json-content/` - Tests JSON content rendering
- `/test-dynamic-styling/` - Tests dynamic styling system
- Checkout flow with T&C acceptance

### API Testing
```bash
# Test template styles endpoint
curl "http://localhost:8888/api/rules/template-styles/?template_id=1"

# Test rules engine with JSON content
curl -X POST "http://localhost:8888/api/rules/evaluate/" \
  -H "Content-Type: application/json" \
  -d '{"entry_point": "checkout_terms", "context": {...}}'
```

## Troubleshooting

### Common Issues
1. **JSON Validation Errors**: Ensure valid JSON structure in admin
2. **Missing Styles**: Check theme is active and properly linked
3. **Variable Not Substituting**: Verify variable name matches context keys
4. **Styling Not Applied**: Check CSS class names and priority levels

### Debug Tools
- Django admin interface for content management
- Browser developer tools for style inspection
- Django shell for testing variable substitution
- Test pages for isolated component testing

## Migration Notes

When migrating from HTML to JSON content:
1. Backup existing HTML content
2. Convert HTML structure to equivalent JSON elements
3. Create appropriate style themes
4. Test rendering in development environment
5. Update frontend components to handle both formats during transition