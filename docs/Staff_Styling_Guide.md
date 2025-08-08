# Staff Guide: Configuring Message Styles

## 🎨 Quick Start Guide

This guide shows staff members how to customize the appearance of Terms & Conditions, holiday notices, and other messages **without needing any coding knowledge**.

All changes are made through the Django admin interface and apply immediately.

## 📍 Accessing the Style System

1. **Login to Admin**: Go to your admin URL (usually `/admin/`) and login with your staff account
2. **Find Style Management**: Look for the "**Rules Engine**" section in the admin menu
3. **Key Sections**:
   - **Content Style Themes** - Manage color schemes and themes
   - **Content Styles** - Individual styling rules
   - **Message Template Styles** - Apply themes to specific messages

## 🎯 Common Tasks

### Changing Message Colors

**Example: Make holiday notices more prominent**

1. Go to **Content Styles** in the admin
2. Find "**Holiday Alert Box**" (or create a new style)
3. Edit the color fields:
   - **Background Color**: `#fff8e1` (light orange)
   - **Text Color**: `#e65100` (dark orange)
   - **Border Color**: `#ffcc02` (gold)
4. **Save** - changes apply immediately

### Adding New Styling Themes

**Example: Create a "Spring 2025" theme**

1. Go to **Content Style Themes**
2. Click "**Add Content Style Theme**"
3. Fill in:
   - **Name**: `Spring 2025 Theme`
   - **Description**: `Fresh green theme for spring promotions`
   - **Is Active**: ✅ (checked)
4. **Save**
5. Create styles for this theme (see next section)

### Creating Custom Styles

**Example: Special styling for urgent messages**

1. Go to **Content Styles**
2. Click "**Add Content Style**"
3. **Basic Information**:
   - **Name**: `Urgent Message Box`
   - **Element Type**: `box`
   - **Category**: `warning`
   - **Theme**: Select your theme
   - **CSS Class Selector**: `urgent-message`
   - **Priority**: `200` (higher priority)
4. **Colors**:
   - **Background Color**: `#ffebee`
   - **Text Color**: `#c62828`
   - **Border Color**: `#f44336`
5. **Layout**:
   - **Padding**: `20px`
   - **Border Width**: `2px`
   - **Border Radius**: `8px`
6. **Advanced** (optional):
   ```json
   {
     "boxShadow": "0 4px 12px rgba(244, 67, 54, 0.3)",
     "fontWeight": "600"
   }
   ```
7. **Save**

### Applying Themes to Messages

**Example: Apply Holiday Theme to summer notices**

1. Go to **Message Template Styles**
2. Click "**Add Message Template Style**" or edit existing
3. Select:
   - **Message Template**: `summer_holiday_2025`
   - **Theme**: `Holiday Theme`
4. **Custom Styles** (optional): Select additional style overrides
5. **Save**

## 🛠️ Style Properties Reference

### Colors
Use any of these formats:
- **Hex colors**: `#ffffff`, `#ff5722`
- **RGB colors**: `rgb(255, 87, 34)`
- **RGBA colors**: `rgba(255, 87, 34, 0.8)`
- **Named colors**: `red`, `blue`, `lightgray`

### Spacing
Specify spacing in pixels:
- **Single value**: `16px` (all sides)
- **Two values**: `16px 20px` (vertical horizontal)
- **Four values**: `16px 20px 12px 24px` (top right bottom left)

### Common CSS Classes

Target these classes for specific elements:

| Class | Used For | Example |
|-------|----------|---------|
| `alert alert-warning` | Warning messages | Holiday notices |
| `alert alert-info` | Information messages | General announcements |
| `terms-conditions-content` | T&C containers | Terms & Conditions |
| `holiday-alert` | Holiday notices | Summer holidays |
| `holiday-tips` | Holiday information | Important holiday info |

## 📊 Style Priority Rules

When multiple styles could apply, the system follows this order:

1. **Highest**: Template-specific custom styles
2. **High**: Theme styles with CSS class selectors
3. **Medium**: Theme styles for element types
4. **Low**: Global styles with CSS class selectors
5. **Lowest**: Global styles for element types

**Tip**: Use higher priority numbers (200, 300) to ensure your styles take precedence.

## 🎨 Default Themes Available

### Default Theme
- Clean, professional styling
- Used for general content
- Neutral colors and standard spacing

### Warning Theme  
- Yellow/orange color scheme
- Used for alerts and warnings
- Higher contrast for visibility

### Holiday Theme
- Special holiday styling
- Softer colors with decorative elements
- Used for seasonal announcements

### Terms Theme
- Professional, formal styling
- Used for legal and terms content
- Clear, readable formatting

## 🔧 Advanced Styling

### JSON Custom Styles

For advanced styling, use the **Custom Styles** JSON field:

```json
{
  "boxShadow": "0 8px 32px rgba(0, 0, 0, 0.1)",
  "transition": "all 0.3s ease",
  "borderStyle": "dashed",
  "fontFamily": "Arial, sans-serif",
  "lineHeight": "1.6",
  "textTransform": "uppercase",
  "letterSpacing": "0.5px"
}
```

### Common Advanced Properties

| Property | Purpose | Example |
|----------|---------|---------|
| `boxShadow` | Drop shadows | `"0 4px 8px rgba(0,0,0,0.1)"` |
| `transition` | Smooth animations | `"all 0.3s ease"` |
| `borderStyle` | Border type | `"solid"`, `"dashed"`, `"dotted"` |
| `lineHeight` | Line spacing | `"1.6"`, `"24px"` |
| `textTransform` | Text case | `"uppercase"`, `"lowercase"` |
| `letterSpacing` | Character spacing | `"0.5px"`, `"1px"` |

## 📱 Testing Your Changes

### Test Pages
Use these pages to see your changes immediately:
- `/test-configurable-styles.html` - Complete styling demo
- `/test-all-json-content.html` - Content rendering tests

### What to Test
1. **Load the test page** in your browser
2. **Click the test buttons** for different message types
3. **Verify colors and spacing** look correct
4. **Check different browsers** if needed

### Making Adjustments
If something doesn't look right:
1. Go back to the admin
2. Adjust the style properties
3. Save the changes
4. Refresh the test page
5. Changes apply immediately!

## ❓ Troubleshooting

### My styles aren't showing up
- ✅ Check that **Is Active** is checked
- ✅ Verify the **CSS Class Selector** matches exactly
- ✅ Check the **Priority** number (use higher numbers)
- ✅ Make sure the style is assigned to the right **Theme**

### Colors look wrong
- ✅ Use proper color formats (`#ffffff`, `rgb(255,255,255)`)
- ✅ Check for typos in color values
- ✅ Some colors may look different on different screens

### Changes not applying to messages
- ✅ Check **Message Template Styles** to ensure theme is assigned
- ✅ Verify the **Message Template** is selected correctly
- ✅ Clear browser cache if needed

### Element not styled correctly
- ✅ Check **Element Type** matches what you want to style
- ✅ Verify **CSS Class Selector** if targeting specific elements
- ✅ Check if another style has higher priority

## 💡 Tips and Best Practices

### Design Consistency
- **Use themes** to maintain consistent styling across related messages
- **Follow your brand guidelines** for colors and fonts
- **Test on different screen sizes** (desktop, mobile, tablet)

### User Experience
- **Ensure good contrast** between text and background colors
- **Don't use too many different styles** - keep it simple
- **Make important information stand out** with appropriate styling

### Maintenance
- **Document your changes** in the Description fields
- **Use descriptive names** for styles and themes
- **Test regularly** especially after making multiple changes

## 🚀 Quick Style Recipes

### Urgent Alert Box
```
Background Color: #ffebee
Text Color: #c62828
Border Color: #f44336
Border Width: 2px
Padding: 20px
Custom Styles: {"fontWeight": "600", "boxShadow": "0 4px 12px rgba(244, 67, 54, 0.3)"}
```

### Friendly Information Box
```
Background Color: #e8f5e8
Text Color: #2e7d32
Border Color: #4caf50
Border Radius: 8px
Padding: 16px 20px
Custom Styles: {"borderStyle": "solid"}
```

### Professional Notice
```
Background Color: #f5f5f5
Text Color: #424242
Border Color: #bdbdbd
Border Width: 1px
Padding: 16px
Custom Styles: {"fontFamily": "Arial, sans-serif", "lineHeight": "1.6"}
```

### Holiday Celebration
```
Background Color: #fff3e0
Text Color: #e65100
Border Color: #ff9800
Border Style: dashed (in Custom Styles: {"borderStyle": "dashed"})
Padding: 20px
Custom Styles: {"borderStyle": "dashed", "boxShadow": "0 4px 12px rgba(255, 152, 0, 0.2)"}
```

## 📞 Getting Help

If you need assistance:
1. **Check this guide** for common solutions
2. **Use the test pages** to experiment safely
3. **Contact your developer** for complex customizations
4. **Document what you tried** to help with troubleshooting

Remember: **All changes are reversible!** You can always edit styles again or create new ones if something doesn't work out.

---

*This guide covers the most common styling tasks. For advanced features or custom requirements, consult the full technical documentation.*