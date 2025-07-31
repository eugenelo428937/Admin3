# Material-UI Theme Debugging Guide

## Overview
This guide helps debug Material-UI theme issues, specifically for the BalancedProductCard component.

## Common Issues and Solutions

### 1. Theme Not Loading
**Symptoms**: Console shows `undefined` for theme values
**Solutions**:
- Verify ThemeProvider wraps your component
- Check theme import path
- Ensure theme is properly exported

### 2. Styles Not Applying
**Symptoms**: Theme values exist but styles don't show in browser
**Solutions**:
- Check CSS specificity conflicts
- Verify component structure matches theme variants
- Use browser dev tools to inspect computed styles

### 3. Browser Dev Tools Debugging Steps

#### Step A: Check Console Logs
1. Open browser dev tools (F12)
2. Look for the "Theme Debug" console logs
3. Verify theme values are correct:
   ```javascript
   {
     md3Available: true,
     onPrimary: "#ffffff",
     variant: "material-product"
   }
   ```

#### Step B: Inspect Element
1. Right-click on the Avatar in CardHeader
2. Select "Inspect Element"
3. Check Applied Styles:
   - Should see `background-color: #ffffff` (or rgb(255, 255, 255))
   - If not, check for overriding styles

#### Step C: Check Theme Variants
1. Inspect the Card element
2. Look for applied CSS classes
3. Verify theme variant styles are being applied

### 4. Debugging Components

#### Use ThemeTest Component
```javascript
import ThemeTest from './ThemeTest';

// Add to your component hierarchy to test theme
<ThemeTest />
```

#### Manual Theme Testing
```javascript
const theme = useTheme();
console.log('Full theme:', theme);
console.log('MD3 palette:', theme.palette.md3);
```

### 5. Common Fix Patterns

#### Force Style Application
If theme isn't applying, use sx prop to force it:
```javascript
<Avatar sx={{ 
  backgroundColor: theme.palette.md3.onPrimary,
  // Add !important if needed
  '& .MuiAvatar-root': {
    backgroundColor: `${theme.palette.md3.onPrimary} !important`
  }
}}>
```

#### Check Component Variants
Ensure your Card has the correct variant:
```javascript
<Card variant="material-product">
```

### 6. Browser-Specific Issues

#### Hot Reload Problems
- Clear browser cache
- Restart development server
- Check for console errors

#### CSS Module Conflicts
- Check if CSS modules are overriding MUI styles
- Use more specific selectors in theme
- Consider using `!important` declarations

### 7. Verification Checklist

- [ ] Theme provider is wrapping the component
- [ ] Theme object contains expected values
- [ ] Component structure matches theme variant expectations
- [ ] No console errors related to theme
- [ ] Browser dev tools show applied styles
- [ ] CSS specificity conflicts resolved

## Testing Approach

1. **Add debug logging** to verify theme availability
2. **Use ThemeTest component** to isolate theme issues
3. **Check browser dev tools** for applied styles
4. **Compare with working components** in the same app
5. **Test with simplified structure** if complex nesting causes issues

## Quick Fixes

### For Avatar backgroundColor Issue:
```javascript
// Instead of relying on theme variant
<Avatar sx={{ backgroundColor: theme.palette.md3.onPrimary }}>

// Or with fallback
<Avatar sx={{ 
  backgroundColor: theme.palette.md3?.onPrimary || '#ffffff' 
}}>
```

### For CardActions Layout Issues:
```javascript
// Ensure proper nesting structure
<CardActions>
  <Box className="discount-options">
    {/* Discount content */}
  </Box>
  <Box>
    {/* Price and action content */}
  </Box>
</CardActions>
```