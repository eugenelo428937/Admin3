# Product Card UI/UX Guidelines

## Overview
This document outlines the comprehensive design system and implementation rules for the Material Product Card component in the Admin3 Online Store. The design system is based on the finalized `BalancedProductCard` component and the corresponding theme-based styling architecture.

## Architecture Overview

### Design Philosophy
The product card system follows these core principles:
- **Modular Design**: Clean separation between component logic and styling
- **Theme-Based Variants**: All styling variations managed through theme.js
- **Interactive Elements**: Dynamic gradients and hover effects for enhanced UX
- **Accessibility First**: Proper contrast ratios and semantic structure
- **Responsive Layout**: Consistent aspect ratios and flexible dimensions

### File Structure
```
src/
├── components/styleguide/ProductCards/
│   └── BalancedProductCard.js          # Component logic and structure
├── theme/
│   └── theme.js                        # All styling variants and configurations
└── styles/
    └── liftkit.css                     # Base design system styles
```

## Component Architecture

### 1. Component Structure (BalancedProductCard.js)

#### Core Elements
The component is structured with these main sections:

```jsx
<Card variant={variant}>
  <CardHeader />          // Dynamic gradient header with product info
  <CardContent />         // Product details, chips, and variations
  <CardActions />         // Pricing, discount options, and actions
</Card>
```

#### Key Features
- **Interactive Gradient Header**: Mouse-tracking gradient effects
- **Product Variations**: Radio button selection for different product types
- **Discount Options**: Retaker and Additional Copy pricing
- **Dynamic Pricing**: Real-time price calculations based on selections

### 2. Styling Architecture (theme.js)

#### Variant System
All visual variations are defined in `theme.js` under `MuiCard.variants`:

```javascript
{
  props: { variant: "material-product" },
  style: {
    // All styling configurations
  }
}
```

#### Available Variants
- `material-product` (default) - Sky blue theme
- `tutorial-product` - Purple theme  
- `bundle-product` - Green theme
- `online-product` - Cobalt blue theme
- `marking-product` - Orange theme

### Floating Badge Positioning
Floating badges are positioned between the card header and content using CSS custom properties:
- **Position**: `top: "calc(var(--product-card-header-height) - var(--badge-height) / 2.5)"`
- **Alignment**: Right-aligned with `right: liftKitTheme.spacing.sm`
- **CSS Variables**: Defined in `globals.css`
  - `--product-card-header-height: 7.43rem`
  - `--badge-height: 1.5rem`

## Implementation Rules

### 1. Creating New Product Card Variants

#### Step 1: Theme Configuration
Add new variant in `theme.js` under `MuiCard.variants`:

```javascript
{
  props: { variant: "new-product-type" },
  style: {
    minWidth: "22rem",
    maxWidth: "22rem",
    height: "fit-content",
    overflow: "hidden",
    aspectRatio: "2/3",
    boxShadow: "var(--Paper-shadow)",
    justifyContent: "space-between",
    
    // Header styling
    "& .product-header": {
      backgroundColor: colorTheme.bpp.{colorScheme}["020"],
      // ... other header styles
    },
    
    // Content styling
    "& .MuiCardContent-root": {
      // ... content styles
    },
    
    // Actions styling
    "& .MuiCardActions-root": {
      // ... actions styles
    }
  }
}
```

#### Step 2: Color Scheme Selection
Choose appropriate color from BPP color system:
- `sky` - Blue theme (materials)
- `purple` - Purple theme (tutorials)
- `green` - Green theme (bundles)
- `cobalt` - Blue theme (online products)
- `orange` - Orange theme (marking)
- `granite` - Neutral theme (general use)

#### Header and Actions Color Scheme Requirements
- **Header Background**: Use shade `020` from chosen color scheme
- **Actions Background**: Use shade `030` from chosen color scheme
- **Example for bundle cards**: 
  - Header: `colorTheme.bpp.green["020"]`
  - Actions: `colorTheme.bpp.green["030"]`

#### Step 3: Gradient Configuration
Add color scheme to gradient system in `theme.js`:

```javascript
gradients: {
  colorSchemes: {
    newTheme: {
      primary: "R, G, B",    // Primary color RGB values
      secondary: "R, G, B",  // Secondary color RGB values  
      accent: "R, G, B"      // Accent color RGB values
    }
  }
}
```

### 2. Required CSS Class Names for Theme Application

**CRITICAL**: The following CSS class names MUST be used exactly as specified for the theme styling to apply correctly. These class names are referenced in `theme.js` and are essential for the styling system to work.

#### Required Class Names Structure
```jsx
<Card variant={variant}>
  {/* Floating Badges - positioned between header and content */}
  <Box className="floating-badges-container">    // REQUIRED: Floating badges container
    <Chip className="subject-badge" />           // REQUIRED: Subject badge styling
    <Chip className="session-badge" />           // REQUIRED: Session badge styling
  </Box>
  
  <CardHeader 
    className="product-header"           // REQUIRED: Applies header styling
    title={<Typography className="product-title">Title</Typography>}     // REQUIRED
    subheader={<Typography className="product-subtitle">Subtitle</Typography>} // REQUIRED
    avatar={<Avatar className="product-avatar">
      <Icon className="product-avatar-icon" />  // REQUIRED
    </Avatar>}
  />
  
  <CardContent>
    <Box className="product-chips">      // REQUIRED: Chips container styling
      <Chip />
    </Box>
    
    <Box className="product-variations"> // REQUIRED: Variations container styling
      <Typography className="variations-title">   // REQUIRED
      <Box className="variations-group">  // REQUIRED: Group container
        <Box className="variation-option"> // REQUIRED: Individual option styling
          <FormControlLabel className="variation-label" /> // REQUIRED
        </Box>
      </Box>
    </Box>
  </CardContent>
  
  <CardActions>
    <Box className="price-container">    // REQUIRED: Main price container
      <Box className="discount-options">  // REQUIRED: Discount section
        <Typography className="discount-title">    // REQUIRED
        <Box className="discount-radio-group">     // REQUIRED
          <FormControlLabel className="discount-radio-option"> // REQUIRED
            <Typography className="discount-label" />          // REQUIRED
          </FormControlLabel>
        </Box>
      </Box>
      
      <Box className="price-action-section">      // REQUIRED: Price/action area
        <Box className="price-info-row">          // REQUIRED: Price display row
          <Typography className="price-display">  // REQUIRED: Price text
          <Button className="info-button">        // REQUIRED: Info button
        </Box>
        <Box className="price-details-row">       // REQUIRED: Details row
          <Typography className="price-level-text">    // REQUIRED
          <Typography className="vat-status-text">     // REQUIRED
        </Box>
        <Button className="add-to-cart-button">   // REQUIRED: Cart button
      </Box>
    </Box>
  </CardActions>
</Card>
```

#### Class Name Reference Table

| Component Section | Required Class Name | Purpose | Theme Reference |
|------------------|-------------------|---------|-----------------|
| **Floating Badges** | `floating-badges-container` | Container for floating badges | `"& .floating-badges-container"` |
| | `subject-badge` | Subject badge styling | `"& .subject-badge"` |
| | `session-badge` | Session badge styling | `"& .session-badge"` |
| **Header** | `product-header` | Header container styling | `"& .product-header"` |
| | `product-title` | Main product title | `"& .product-title"` |
| | `product-subtitle` | Product subtitle/details | `"& .product-subtitle"` |
| | `product-avatar` | Avatar container | `"& .product-avatar"` |
| | `product-avatar-icon` | Icon within avatar | `"& .product-avatar-icon"` |
| **Content** | `product-chips` | Chips container | `"& .product-chips"` |
| | `product-variations` | Variations container | `"& .product-variations"` |
| | `variations-title` | Variations section title | `"& .variations-title"` |
| | `variations-group` | Radio group container | `"& .variations-group"` |
| | `variation-option` | Individual variation item | `"& .variation-option"` |
| | `variation-label` | Variation label text | `"& .variation-label"` |
| **Actions** | `price-container` | Main pricing container | `"& .price-container"` |
| | `discount-options` | Discount section | `"& .discount-options"` |
| | `discount-title` | Discount section title | `"& .discount-title"` |
| | `discount-radio-group` | Discount radio container | `"& .discount-radio-group"` |
| | `discount-radio-option` | Individual discount option | `"& .discount-radio-option"` |
| | `discount-label` | Discount option label | `"& .discount-label"` |
| | `price-action-section` | Price and button area | `"& .price-action-section"` |
| | `price-info-row` | Price display row | `"& .price-info-row"` |
| | `price-display` | Price text element | `"& .price-display"` |
| | `info-button` | Information button | `"& .info-button"` |
| | `price-details-row` | Price details container | `"& .price-details-row"` |
| | `price-level-text` | Price level indicator | `"& .price-level-text"` |
| | `vat-status-text` | VAT status text | `"& .vat-status-text"` |
| | `add-to-cart-button` | Add to cart button | `"& .add-to-cart-button"` |

### 3. Styling Rules and Standards

#### Floating Badges Section
- **Position**: `top: "calc(var(--product-card-header-height) - var(--badge-height) / 2.5)"`
- **Alignment**: Right-aligned with `right: liftKitTheme.spacing.sm`
- **Container Class**: `className="floating-badges-container"`
- **Badge Classes**: `className="subject-badge"` and `className="session-badge"`
- **Z-Index**: 10 to appear above header
- **Pointer Events**: `none` to avoid interference with card interactions

#### Header Section
- **Height**: Fixed at `7.43rem` (available as CSS variable `--product-card-header-height`)
- **Required Class**: `className="product-header"`
- **Layout**: Flexbox with title/subtitle on left, avatar on right
- **Background**: Uses theme-specific color from BPP system (shade 020)
- **Interactive Gradient**: Mouse-tracking gradient overlay
- **Typography**: 
  - Title: `variant="h4"` with `className="product-title"`
  - Subtitle: `variant="subtitle1"` with `className="product-subtitle"`

#### Content Section
- **Padding**: Uses `liftKitTheme.spacing.md`
- **Chips**: Horizontal layout with `className="product-chips"`
- **Variations**: Radio group with `className="product-variations"`
- **Spacing**: Consistent use of LiftKit spacing system

#### Actions Section
- **Height**: `10.2rem`  
- **Required Class**: Main container needs `className="price-container"`
- **Layout**: Flexbox column for proper alignment
- **Background**: Uses theme-specific color from BPP system (shade 030)
- **Price Display**: Right-aligned with `className="price-display"`
- **Buttons**: Circular with `className="add-to-cart-button"`

### 4. Component Usage Guidelines

#### Basic Implementation
```jsx
import BalancedProductCard from './components/styleguide/ProductCards/BalancedProductCard';

// Material product (default)
<BalancedProductCard variant="material-product" />

// Tutorial product
<BalancedProductCard variant="tutorial-product" />

// Custom variant
<BalancedProductCard variant="new-product-type" />
```

#### Required Props Structure
```jsx
const productData = {
  title: "Product Name",
  subtitle: "(Session Details)",
  chips: ["CS1", "2024A"],
  variations: {
    printed: { price: 45, label: "Printed Version" },
    ebook: { price: 35, label: "eBook Version" },
    both: { price: 65, label: "Complete Package" }
  }
};
```

### 5. Interactive Features

#### Gradient Effects
- **Mouse Tracking**: Gradients follow cursor position within header
- **Hover States**: Increased opacity and scale effects
- **Smooth Transitions**: Cubic-bezier easing for professional feel
- **Color Schemes**: Theme-specific gradient colors

#### State Management
- **Selected Variation**: Radio button selection for product types
- **Discount Options**: Toggle states for retaker/additional copy pricing
- **Dynamic Pricing**: Real-time price calculations
- **Hover Effects**: Scale transforms and filter effects

### 6. Accessibility Requirements

#### Color Contrast
- **Text on Backgrounds**: Minimum 4.5:1 contrast ratio
- **Interactive Elements**: Clear focus indicators
- **Color Coding**: Never rely solely on color for meaning

#### Semantic Structure
- **Proper HTML5**: Use semantic card structure
- **ARIA Labels**: Descriptive labels for complex interactions
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Meaningful alt text and descriptions

### 7. Responsive Behavior

#### Card Dimensions
- **Width**: Fixed at `21-22rem` for consistency
- **Aspect Ratio**: `2/3` for optimal visual balance
- **Height**: `fit-content` to accommodate varying content

#### Breakpoint Considerations
- **Mobile**: Stack cards vertically
- **Tablet**: 2-column grid layout
- **Desktop**: 3+ column grid layout
- **Large Screens**: Maximum 4 columns to maintain readability

## Design Tokens

### Spacing System (LiftKit)
```javascript
spacing: {
  xs: "0.25rem",
  sm: "0.5rem", 
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem"
}
```

### Typography Scale
- **h4**: Product titles (1.25rem)
- **subtitle1**: Product subtitles (0.875rem)
- **subtitle2**: Section headers (0.75rem)
- **body2**: General content (0.875rem)
- **fineprint**: Legal text (0.625rem)

### Shadow System
- **Paper-shadow**: Base card elevation
- **shadow-sm**: Subtle elements
- **shadow-lg**: High-emphasis elements

## Quality Assurance

### Visual Testing Checklist
- [ ] Gradient effects work smoothly across all variants
- [ ] Color schemes maintain proper contrast ratios
- [ ] Typography scales consistently
- [ ] Interactive states provide clear feedback
- [ ] Card proportions remain consistent

### Functional Testing
- [ ] Radio button selections update pricing correctly
- [ ] Discount toggles calculate proper values
- [ ] Mouse tracking gradients respond accurately
- [ ] Hover effects perform smoothly
- [ ] All variants render consistently

### Cross-Browser Compatibility
- [ ] Gradient CSS properties supported
- [ ] Flexbox layouts work correctly  
- [ ] CSS custom properties function properly
- [ ] Hover effects perform consistently

## Future Considerations

### Extensibility
- **New Product Types**: Follow variant pattern for additions
- **Animation Enhancements**: Consider micro-interactions
- **Theme Variations**: Support for light/dark mode
- **Customization**: Allow user preference overrides

### Performance Optimization
- **Component Memoization**: Use React.memo for expensive renders
- **Gradient Optimization**: Consider CSS-only alternatives
- **Bundle Size**: Monitor theme configuration size
- **Image Optimization**: Optimize any product imagery

## Troubleshooting

### Common Issues
1. **Styles Not Applying**: Verify all required class names are present exactly as specified
2. **Gradient Not Showing**: Check color scheme configuration
3. **Inconsistent Heights**: Verify content structure matches guidelines
4. **Typography Issues**: Ensure theme typography is properly imported
5. **Color Contrast**: Use theme colors, not hardcoded values
6. **Missing Styling**: Check that class names match the reference table exactly

### Debug Tools
- **Browser DevTools**: Inspect CSS custom properties
- **React DevTools**: Check component props and state
- **Accessibility Tools**: Verify WCAG compliance
- **Performance Profiler**: Monitor render performance

---

*This document should be updated whenever the product card design system is modified or extended.*