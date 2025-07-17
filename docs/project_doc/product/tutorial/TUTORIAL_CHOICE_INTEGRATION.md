# Tutorial Choice System Integration Guide

This guide explains how to integrate the new tutorial choice system into your React application.

## Overview

The tutorial choice system consists of:
1. **TutorialChoiceContext** - Context for managing tutorial selections
2. **TutorialChoiceDialog** - Mobile-first, responsive dialog for selecting tutorials
3. **TutorialChoicePanel** - Collapsible panel for managing selected choices
4. **Updated TutorialProductCard** - Uses context instead of local state

## Integration Steps

### Step 1: Add TutorialChoiceProvider to App.js

Update your `src/App.js` file to include the TutorialChoiceProvider:

```javascript
// Add the import
import { TutorialChoiceProvider } from "./contexts/TutorialChoiceContext";
import TutorialChoicePanel from "./components/TutorialChoicePanel";

// In your App component, wrap your existing providers:
function App() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <AuthProvider>
        <VATProvider>
          <CartProvider>
            <ProductProvider>
              <TutorialChoiceProvider>
                <ErrorBoundary>
                  <div className="App">
                    <ActEdNavbar />
                    <Routes>
                      {/* Your existing routes */}
                    </Routes>
                    
                    {/* Add the Tutorial Choice Panel */}
                    <TutorialChoicePanel />
                  </div>
                </ErrorBoundary>
              </TutorialChoiceProvider>
            </ProductProvider>
          </CartProvider>
        </VATProvider>
      </AuthProvider>
    </GoogleReCaptchaProvider>
  );
}
```

### Step 2: Update CSS for Panel Accommodation

Add CSS to ensure the tutorial choice panel doesn't overlap with other content:

```css
/* Add to your main CSS file */
.App {
  padding-bottom: 80px; /* Space for tutorial choice panel */
}

/* Optional: Add responsive spacing */
@media (max-width: 768px) {
  .App {
    padding-bottom: 100px; /* More space on mobile */
  }
}
```

### Step 3: Import Required Dependencies

Make sure your `package.json` includes the necessary dependencies (already included in your current setup):

```json
{
  "dependencies": {
    "@mui/material": "^7.1.0",
    "@mui/icons-material": "^7.1.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

### Step 4: Verify TutorialProductCard Integration

The updated `TutorialProductCard` should now:
- Use the `useTutorialChoice` hook
- Display a badge when choices are made
- Show the new tutorial choice dialog
- Provide a "View Choices" button when selections exist

### Step 5: Testing the Integration

1. Navigate to a tutorial product page
2. Click "Select Tutorials" to open the dialog
3. Select tutorial events with 1st, 2nd, or 3rd preferences
4. Notice the collapsible panel appears at the bottom
5. Test preference changes in the panel
6. Test adding individual subjects to cart
7. Test adding all subjects to cart

## Features Implemented

### 1. Tutorial Choice Requirements
- ✅ Users can only select 1st, 2nd, or 3rd choice per subject
- ✅ Each subject has individual list of tutorial choices
- ✅ Price calculation charges only for 1st choice per subject
- ✅ Online Classroom products are excluded from choice logic

### 2. Mobile-First Design
- ✅ Responsive dialog with mobile-first approach
- ✅ Fullscreen dialog on mobile devices
- ✅ Touch-friendly interface elements
- ✅ Optimized layout for different screen sizes

### 3. Tutorial Choice Panel
- ✅ Collapsible panel slides up from bottom
- ✅ Shows all selected choices by subject
- ✅ Allows preference alteration (1st, 2nd, 3rd)
- ✅ Individual subject cart additions
- ✅ Bulk "Add All to Cart" functionality

### 4. Enhanced Dialog Layout
- ✅ Events displayed in organized cards
- ✅ No grouping by product variations
- ✅ Clear status indicators (sold out, limited spaces)
- ✅ Expandable details for each event
- ✅ Choice selection buttons for each event

## Usage Examples

### Using the Tutorial Choice Context

```javascript
import { useTutorialChoice } from "../contexts/TutorialChoiceContext";

function MyComponent() {
  const {
    getSubjectChoices,
    addTutorialChoice,
    updateChoiceLevel,
    showChoicePanelForSubject,
    getTotalPrice
  } = useTutorialChoice();

  // Get choices for a specific subject
  const cb1Choices = getSubjectChoices('CB1');
  
  // Add a tutorial choice
  addTutorialChoice('CB1', '1st', eventData);
  
  // Show choice panel for subject
  showChoicePanelForSubject('CB1');
  
  // Get total price (only 1st choices are charged)
  const totalPrice = getTotalPrice();
}
```

### Event Data Structure

The system expects event data in this format:

```javascript
const eventData = {
  eventId: 123,
  eventTitle: "CB1 Tutorial",
  eventCode: "CB1-20-25S",
  venue: "Live Online",
  startDate: "2025-05-27",
  endDate: "2025-07-31",
  variationId: 12,
  variationName: "CB1_LO_6",
  variation: variationObject,
  subjectCode: "CB1",
  subjectName: "CB1",
  location: "Tutorial - Live Online",
  productId: 2971
};
```

## Troubleshooting

### Common Issues

1. **Panel not appearing**: Ensure `TutorialChoiceProvider` wraps your app
2. **Context not found**: Check that components are inside the provider
3. **Styling issues**: Verify CSS is loaded and panel spacing is applied
4. **Mobile responsiveness**: Test on various screen sizes

### Debug Tips

1. Check browser console for errors
2. Use React DevTools to inspect context values
3. Verify localStorage for persisted choices
4. Test with different subjects and events

## Performance Considerations

- Tutorial choices are persisted in localStorage
- Context updates trigger re-renders only for consuming components
- Dialog is rendered only when needed (conditional rendering)
- Panel uses sliding animations for smooth UX

## Accessibility

- Keyboard navigation support
- Screen reader compatibility
- Proper ARIA labels and roles
- High contrast color schemes
- Touch-friendly button sizes

## Future Enhancements

Potential improvements that could be added:

1. **Drag and drop** for reordering preferences
2. **Bulk selection** tools in the dialog
3. **Search and filter** functionality
4. **Calendar view** for event dates
5. **Email notifications** for choice confirmations
6. **Export choices** as PDF or calendar events

## Support

If you encounter issues:
1. Check this documentation
2. Review the component source code
3. Test with minimal examples
4. Check browser compatibility
5. Verify all dependencies are installed