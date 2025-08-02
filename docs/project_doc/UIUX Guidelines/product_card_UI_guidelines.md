# Product Card UI/UX Guidelines

## Overview
This document outlines the comprehensive design system and implementation rules for the Product Card components in the Admin3 Online Store. The design system has evolved to include seven distinct product card variants, each optimized for specific product types with consistent styling patterns, hover effects, and theme-based architecture.

## Architecture Overview

### Design Philosophy
The product card system follows these core principles:
- **Modular Design**: Clean separation between component logic and styling
- **Theme-Based Variants**: All styling variations managed through theme.js
- **Consistent Interactions**: Unified hover effects and user interactions across all variants
- **Non-BPP Color Palette**: Floating badges use consistent neutral colors across all product types
- **Accessibility First**: Proper contrast ratios and semantic structure
- **Responsive Layout**: Consistent aspect ratios and flexible dimensions

### File Structure
```
src/
├── components/styleguide/ProductCards/
│   ├── BalancedProductCard.js                    # material-product variant
│   ├── EnhancedBundleProductCard.js              # bundle-product variant
│   ├── EnhancedTutorialProductCard.js            # tutorial-product variant
│   ├── EnhancedOnlineClassroomProductCard.js     # online-product variant
│   ├── MarkingProductCard.js                     # marking-product variant
│   ├── EnhancedMarkingVoucherProductCard.js      # marking-voucher-product variant
│   └── EnhancedAssessmentProductCard.js          # assessment-product variant
├── theme/
│   └── theme.js                                  # All styling variants and configurations
└── styles/
    └── liftkit.css                               # Base design system styles
```

## Available Product Card Variants

### 1. BalancedProductCard.js (`material-product`)
- **Primary Use**: Study materials, books, printed/eBook products
- **Key Features**: 
  - Product variation selection (printed, eBook, both)
  - Discount options (retaker, additional copy)
  - Interactive gradient header with mouse tracking
  - Dynamic pricing calculations
- **Theme Color**: Sky blue (BPP color system)
- **Dimensions**: 22rem width, 34rem height

### 2. EnhancedBundleProductCard.js (`bundle-product`)
- **Primary Use**: Product bundles and package deals
- **Key Features**:
  - Bundle items list with individual pricing
  - Total value vs bundle price comparison
  - Discount options with bundle-specific pricing
  - Expandable details section
- **Theme Color**: Green (BPP color system)
- **Dimensions**: 21rem width, 34rem height

### 3. EnhancedTutorialProductCard.js (`tutorial-product`)
- **Primary Use**: Tutorial sessions and educational events
- **Key Features**:
  - Optional add-ons (materials, recordings)
  - Dynamic pricing based on selections
  - Tutorial-specific metadata display
  - Location and scheduling information
- **Theme Color**: Purple (BPP color system)
- **Dimensions**: 21rem width, 34rem height

### 4. EnhancedOnlineClassroomProductCard.js (`online-product`)
- **Primary Use**: Online classroom sessions and VLE content
- **Key Features**:
  - Format selection (live, recorded, hybrid)
  - Platform-specific information
  - Access duration details
  - Interactive content indicators
- **Theme Color**: Cobalt blue (BPP color system)
- **Dimensions**: 21rem width, 34rem height

### 5. MarkingProductCard.js (`marking-product`)
- **Primary Use**: Assignment and exam marking services
- **Key Features**:
  - **Specialized Pagination System**: Shows different deadline scenarios
  - Dynamic deadline messaging with color-coded alerts
  - Submission count display
  - Interactive pagination dots for scenario switching
  - **Unique Class Names**: Uses marking-specific CSS classes
- **Theme Color**: Orange (BPP color system)
- **Dimensions**: 21rem width, 34rem height

### 6. EnhancedMarkingVoucherProductCard.js (`marking-voucher-product`)
- **Primary Use**: Marking vouchers for flexible submission timing
- **Key Features**:
  - **Quantity Selector**: Increment/decrement controls
  - Validity information display
  - Usage guidelines and restrictions
  - Dynamic total pricing
  - **Unique Class Names**: Uses voucher-specific CSS classes
- **Theme Color**: Orange (BPP color system)
- **Dimensions**: 21rem width, 34rem height

### 7. EnhancedAssessmentProductCard.js (`assessment-product`)
- **Primary Use**: Mock exams and practice assessments
- **Key Features**:
  - Exam type selection (standard, adaptive)
  - Attempt quantity configuration (1, 3, 5, unlimited)
  - Assessment features display
  - Performance analytics integration
- **Theme Color**: Purple/Pink gradient (custom implementation)
- **Dimensions**: Flexible dimensions with overflow handling

## Universal Features Across All Variants

### 1. Hover Effects
All product cards implement consistent hover behavior:
```jsx
sx={{                 
    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}}
```
- **Scale Effect**: 1.02x scale on hover
- **Smooth Transition**: Cubic-bezier easing for professional feel
- **State Management**: onMouseEnter/onMouseLeave handlers

### 2. Floating Badge Colors (Non-BPP Palette)
**All product cards use consistent floating badge colors:**
```css
/* Subject Badge */
.subject-badge {
    backgroundColor: "#475569",  /* Steel Blue */
    color: "#f1f5f9",           /* Light text */
    "&:hover": {
        backgroundColor: "#334155" /* Darker steel blue */
    }
}

/* Session Badge */
.session-badge {
    backgroundColor: "#6b7280",  /* Neutral Gray */
    color: "#f9fafb",           /* Light text */
    "&:hover": {
        backgroundColor: "#4b5563" /* Darker gray */
    }
}
```

### 3. Badge Positioning
Floating badges are consistently positioned across all variants:
- **Position**: `top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)"`
- **Alignment**: Right-aligned with `right: liftKitTheme.spacing.sm`
- **Z-Index**: 10 to appear above header content
- **Non-Interactive**: `pointerEvents: "none"` to avoid interference

## Specialized Features by Variant

### MarkingProductCard Unique Features
```jsx
// Pagination system for deadline scenarios
const deadlineScenarios = [
    { id: 0, title: "All Available", messageBox: { type: "info", ... } },
    { id: 1, title: "Upcoming Soon", messageBox: { type: "warning", ... } },
    { id: 2, title: "Some Expired", messageBox: { type: "error", ... } },
    // ... more scenarios
];

// Special class names for marking cards
<Stack className="marking-submissions-info">
    <Stack className="submissions-info-row">
        <Typography className="submissions-info-title">
        <Typography className="submissions-info-count">
    </Stack>
</Stack>

<Box className="marking-deadline-message">
    <Stack className="deadline-message-content">
        <Typography className="deadline-message-primary">
        <Typography className="deadline-message-secondary">
    </Stack>
</Box>

<Box className="marking-pagination-container">
    <IconButton className="pagination-dot-button">
        <Circle className="pagination-dot active|inactive" />
    </IconButton>
</Box>
```

### EnhancedMarkingVoucherProductCard Unique Features
```jsx
// Quantity management with validation
const [quantity, setQuantity] = useState(1);

const handleQuantityChange = (event, value) => {
    if (value >= 1 && value <= 99) {
        setQuantity(value);
    }
};

// Special class names for voucher cards
<Alert className="voucher-info-alert">
    <Typography className="alert-text">
</Alert>

<Box className="voucher-validity-info">
    <Stack className="validity-info-row">
        <Timer className="validity-info-icon" />
        <Typography className="validity-info-text">
    </Stack>
</Box>

<Box className="voucher-quantity-section">
    {/* Quantity controls */}
</Box>
```

## Class Name Requirements for Theme Application

**CRITICAL**: The following CSS class names MUST be used exactly as specified for the theme styling to apply correctly.

### Universal Required Class Names (All Variants)
```jsx
<Card variant={variant}>
    {/* Floating Badges */}
    <Box className="floating-badges-container">          // REQUIRED
        <Chip className="subject-badge" />               // REQUIRED  
        <Chip className="session-badge" />               // REQUIRED
    </Box>
    
    <CardHeader className="product-header">              // REQUIRED
        <Typography className="product-title">          // REQUIRED
        <Typography className="product-subtitle">       // REQUIRED
        <Avatar className="product-avatar">             // REQUIRED
            <Icon className="product-avatar-icon" />     // REQUIRED
        </Avatar>
    </CardHeader>
    
    <CardContent>
        <Box className="product-chips">                  // REQUIRED (if present)
        <Box className="product-variations">            // REQUIRED (if present)
    </CardContent>
    
    <CardActions>
        <Box className="price-container">               // REQUIRED
            <Box className="discount-options">          // REQUIRED (if present)
                <Typography className="discount-title"> // REQUIRED
                <Box className="discount-radio-group">  // REQUIRED
                    <FormControlLabel className="discount-radio-option"> // REQUIRED
                        <Typography className="discount-label"> // REQUIRED
                    </FormControlLabel>
                </Box>
            </Box>
            
            <Box className="price-action-section">      // REQUIRED
                <Box className="price-info-row">        // REQUIRED
                    <Typography className="price-display"> // REQUIRED
                    <Button className="info-button">     // REQUIRED
                </Box>
                <Box className="price-details-row">     // REQUIRED
                    <Typography className="price-level-text"> // REQUIRED
                    <Typography className="vat-status-text"> // REQUIRED
                </Box>
                <Button className="add-to-cart-button"> // REQUIRED
            </Box>
        </Box>
    </CardActions>
</Card>
```

### MarkingProductCard Additional Required Classes
```jsx
// Submissions information
<Stack className="marking-submissions-info">
    <Stack className="submissions-info-row">
        <Icon className="submissions-info-icon">
        <Typography className="submissions-info-title">
        <Typography className="submissions-info-count">
    </Stack>
</Stack>

// Deadline messaging
<Box className="marking-deadline-message">
    <Stack className="deadline-message-content">
        <Icon className="deadline-message-icon">
        <Box className="deadline-message-text">
            <Typography className="deadline-message-primary">
            <Typography className="deadline-message-secondary">
        </Box>
    </Stack>
</Box>

// Pagination system
<Box className="marking-pagination-container">
    <IconButton className="pagination-dot-button">
        <Circle className="pagination-dot active">    // or "inactive"
    </IconButton>
</Box>
```

### EnhancedMarkingVoucherProductCard Additional Required Classes
```jsx
// Voucher information alert
<Alert className="voucher-info-alert">
    <Typography className="alert-text">
</Alert>

// Validity information
<Box className="voucher-validity-info">
    <Stack className="validity-info-row">
        <Icon className="validity-info-icon">
        <Typography className="validity-info-text">
    </Stack>
</Box>

// Quantity section
<Box className="voucher-quantity-section">
    {/* Quantity controls */}
</Box>
```

## Theme Structure and Styling Philosophy

### Styling Architecture
All visual variations are defined in `theme.js` under `MuiCard.variants`:
```javascript
{
    props: { variant: "variant-name" },
    style: {
        // All styling configurations
        minWidth: "21rem",
        maxWidth: "21rem", 
        height: "34rem !important",
        // ... component styling
    }
}
```

### Current Theme Variants
- `material-product` - Sky blue theme (materials, books)
- `tutorial-product` - Purple theme (tutorials, sessions)
- `bundle-product` - Green theme (product bundles)
- `online-product` - Cobalt blue theme (online classroom)
- `marking-product` - Orange theme (marking services)
- `marking-voucher-product` - Orange theme (marking vouchers)
- `assessment-product` - Custom gradient theme (mock exams)

### Color Scheme Application
Each variant uses specific BPP color system shades:
- **Header Background**: Uses shade `020` from chosen color scheme
- **Actions Background**: Uses shade `030` from chosen color scheme
- **Interactive Elements**: Use appropriate color variations for hover states

### Class-Based Styling Approach
- **No Component-Level sx Props**: Layout styling handled via theme classes
- **Dynamic States Only**: sx props reserved for dynamic colors and state changes
- **Consistent Patterns**: All variants follow the same class naming conventions
- **Theme Centralization**: All styling logic centralized in theme.js

## Implementation Guidelines

### 1. Creating New Product Card Components
When creating new product card variants:

1. **Follow the naming convention**: `EnhancedXxxProductCard.js`
2. **Use consistent hover implementation**:
```jsx
const [isHovered, setIsHovered] = useState(false);

<Card 
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    sx={{                 
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
```

3. **Include floating badges with consistent colors**:
```jsx
<Box className="floating-badges-container">
    <Chip label="CS1" className="subject-badge" />
    <Chip label="25S" className="session-badge" />
</Box>
```

4. **Follow the required class name structure** as outlined above

### 2. Adding New Theme Variants
To add a new product card variant in theme.js:

```javascript
{
    props: { variant: "new-product-type" },
    style: {
        minWidth: "21rem",
        maxWidth: "21rem",
        height: "34rem !important",
        overflow: "visible",
        aspectRatio: "5/7",
        boxShadow: "var(--Paper-shadow)",
        justifyContent: "space-between",
        position: "relative",
        
        // Include floating badges styling
        "& .floating-badges-container": {
            // ... consistent badge positioning and colors
        },
        
        // Header styling with chosen BPP color
        "& .product-header": {
            backgroundColor: colorTheme.bpp.{colorScheme}["020"],
            // ... other header styles
        },
        
        // Actions styling with chosen BPP color
        "& .MuiCardActions-root": {
            backgroundColor: colorTheme.bpp.{colorScheme}["030"],
            // ... other actions styles
        }
    }
}
```

### 3. Component Usage Examples
```jsx
// Basic usage
import BalancedProductCard from './components/styleguide/ProductCards/BalancedProductCard';
<BalancedProductCard variant="material-product" />

// Bundle card usage
import EnhancedBundleProductCard from './components/styleguide/ProductCards/EnhancedBundleProductCard';
<EnhancedBundleProductCard variant="bundle-product" />

// Marking card with pagination
import MarkingProductCard from './components/styleguide/ProductCards/MarkingProductCard';
<MarkingProductCard variant="marking-product" />
```

## Responsive Behavior

### Card Dimensions
- **Width**: Fixed at `21-22rem` for consistency (material-product is 22rem, others are 21rem)
- **Height**: Fixed at `34rem` for consistent grid layouts
- **Aspect Ratio**: Mostly `5/7` for optimal visual balance

### Breakpoint Considerations
- **Mobile**: Stack cards vertically, single column
- **Tablet**: 2-column grid layout
- **Desktop**: 3+ column grid layout depending on container width
- **Large Screens**: Maximum 4 columns to maintain readability

## Quality Assurance and Testing

### Visual Testing Checklist
- [ ] Hover effects work smoothly across all variants
- [ ] Floating badge colors are consistent (Steel Blue #475569 and Gray #6b7280)
- [ ] Theme-specific header and actions colors apply correctly
- [ ] Typography scales consistently across variants
- [ ] Interactive states provide clear feedback
- [ ] Card proportions remain consistent in grid layouts

### Functional Testing for Specialized Features
- [ ] MarkingProductCard pagination system cycles through all scenarios
- [ ] MarkingProductCard deadline messages display appropriate colors and icons
- [ ] EnhancedMarkingVoucherProductCard quantity controls work within bounds (1-99)
- [ ] All discount options calculate pricing correctly
- [ ] Add to cart buttons are functional and properly styled

### Accessibility Compliance
- [ ] All floating badges have proper ARIA labels
- [ ] Color contrast ratios meet WCAG 2.1 AA standards
- [ ] Interactive elements are keyboard accessible
- [ ] Screen reader friendly markup and descriptions

## Performance Considerations

### Optimization Strategies
- **React.memo**: Use for expensive component renders
- **State Management**: Minimize unnecessary re-renders
- **Theme Caching**: Theme configurations are loaded once and cached
- **CSS-in-JS Optimization**: Styles are generated at build time where possible

### Bundle Size Management
- **Tree Shaking**: Only import required components
- **Code Splitting**: Lazy load product card variants when possible
- **Icon Optimization**: Use Material-UI icons efficiently

## Troubleshooting

### Common Issues and Solutions

1. **Styles Not Applying**
   - Verify all required class names are present exactly as specified
   - Check that the variant prop matches a defined theme variant
   - Ensure theme.js is properly imported and configured

2. **Hover Effects Not Working**
   - Confirm onMouseEnter/onMouseLeave handlers are implemented
   - Check that isHovered state is properly managed
   - Verify sx prop includes transform and transition styles

3. **Floating Badges Not Visible**
   - Ensure floating-badges-container class is present
   - Check z-index conflicts with other elements
   - Verify badge positioning calculations in theme.js

4. **Inconsistent Card Heights**
   - Confirm height: "34rem !important" in theme variant
   - Check for content overflow issues
   - Verify aspect ratio is properly set

5. **Color Inconsistencies**
   - Use theme colors from BPP system, not hardcoded values
   - Ensure floating badges use consistent non-BPP colors
   - Check that header and actions use correct shade values (020/030)

### Debug Tools
- **React DevTools**: Inspect component props and state
- **Browser DevTools**: Check applied CSS and custom properties
- **Theme Inspector**: Verify theme variant configurations
- **Accessibility Tools**: Test WCAG compliance

---

*This document reflects the current state of the product card system as of the latest update. It should be maintained and updated whenever new variants are added or existing components are modified.*