# Implementation Plan: Home Page Product Cards Section

## Overview
Update the Home.js page to add a "Explore our range of products" section with three sleek Material Design 3 styled cards for Study Materials, Marking Service, and Tuition. Each card will navigate to the products page with the appropriate category filter applied.

## Prerequisites
- File to modify: `src/pages/Home.js`
- Redux actions available: `navSelectProductGroup` from `src/store/slices/filtersSlice`
- Navigation: `useNavigate` from react-router-dom (already imported)
- Theme: MUI theme with BPP colors and MD3 system (already available via `useTheme`)

---

## Task 1: Add Redux Import for Navigation Action

**File:** `src/pages/Home.js`

**Location:** Line 8 (after rulesEngineService import)

**Add import:**
```javascript
import { useDispatch } from "react-redux";
import { navSelectProductGroup } from "../store/slices/filtersSlice";
```

**Verification:** No errors on save, imports resolve correctly.

---

## Task 2: Add useDispatch Hook in Component

**File:** `src/pages/Home.js`

**Location:** Inside the `Home` component, after line 13 (`const theme = useTheme();`)

**Add:**
```javascript
const dispatch = useDispatch();
```

**Verification:** Component renders without errors.

---

## Task 3: Add Navigation Handler Functions

**File:** `src/pages/Home.js`

**Location:** After `handleShowMatchingProducts` function (around line 97)

**Add the following handler functions:**
```javascript
// Handle navigation to products page with specific product type filter
const handleProductCategoryClick = (productType) => {
   dispatch(navSelectProductGroup(productType));
   navigate("/products");
};
```

**Verification:** Function is defined, no syntax errors.

---

## Task 4: Define Product Cards Data

**File:** `src/pages/Home.js`

**Location:** After the handler functions (around line 102)

**Add product cards configuration:**
```javascript
// Product category cards data
const productCards = [
   {
      id: "study-materials",
      title: "Study Materials",
      description: "Comprehensive course notes, assignment guides, and study resources designed to help you master actuarial concepts and excel in your exams.",
      filterValue: "Core Study Materials",
      icon: "MenuBook", // MUI icon name
      gradient: "linear-gradient(135deg, #4658ac 0%, #2d3f93 100%)",
   },
   {
      id: "marking-service",
      title: "Marking Service",
      description: "Expert feedback on your practice papers with detailed marking and personalized guidance to improve your exam technique.",
      filterValue: "Marking",
      icon: "RateReview",
      gradient: "linear-gradient(135deg, #006874 0%, #004f58 100%)",
   },
   {
      id: "tuition",
      title: "Tuition",
      description: "Live and recorded tutorials led by experienced actuaries, available in classroom, online, and distance learning formats.",
      filterValue: "Tutorial",
      icon: "School",
      gradient: "linear-gradient(135deg, #76546e 0%, #5c3c55 100%)",
   },
];
```

**Verification:** Array is properly defined with all three cards.

---

## Task 5: Add MUI Icon Imports

**File:** `src/pages/Home.js`

**Location:** At the top of the file with other imports

**Add:**
```javascript
import { MenuBook, RateReview, School, ArrowForward } from "@mui/icons-material";
```

**Verification:** Icons import without errors.

---

## Task 6: Create Icon Mapping Helper

**File:** `src/pages/Home.js`

**Location:** After productCards definition

**Add:**
```javascript
// Icon mapping for product cards
const iconMap = {
   MenuBook: MenuBook,
   RateReview: RateReview,
   School: School,
};
```

**Verification:** Object defined correctly.

---

## Task 7: Replace Existing Card Section with New Design

**File:** `src/pages/Home.js`

**Location:** Replace the entire `{/* SVG Chevron Section with Grid Overlay */}` section (approximately lines 272-428)

**Replace with:**
```jsx
{/* Product Categories Section */}
<Box
   sx={{
      position: "relative",
      py: { xs: 6, md: 8, lg: 10 },
      px: { xs: 2, md: 4, lg: 6 },
      backgroundColor: theme.palette.background.default,
   }}
>
   {/* Section Header */}
   <Box
      sx={{
         textAlign: "center",
         mb: { xs: 4, md: 6 },
      }}
   >
      <Typography
         variant="h4"
         component="h2"
         sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 1,
         }}
      >
         Explore our range of products
      </Typography>
      <Typography
         variant="body1"
         sx={{
            color: theme.palette.text.secondary,
            maxWidth: "600px",
            mx: "auto",
         }}
      >
         Everything you need to succeed in your actuarial exams
      </Typography>
   </Box>

   {/* Product Cards Grid */}
   <Grid
      container
      spacing={3}
      sx={{
         justifyContent: "center",
         alignItems: "stretch",
         maxWidth: "1200px",
         mx: "auto",
      }}
   >
      {productCards.map((card) => {
         const IconComponent = iconMap[card.icon];
         return (
            <Grid key={card.id} size={{ xs: 12, sm: 6, md: 4 }}>
               <Box
                  sx={{
                     height: "100%",
                     display: "flex",
                     flexDirection: "column",
                     borderRadius: 3,
                     overflow: "hidden",
                     backgroundColor: theme.palette.background.paper,
                     boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                     transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                     "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
                     },
                  }}
               >
                  {/* Card Header with Icon */}
                  <Box
                     sx={{
                        background: card.gradient,
                        p: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                     }}
                  >
                     <Box
                        sx={{
                           width: 48,
                           height: 48,
                           borderRadius: 2,
                           backgroundColor: "rgba(255, 255, 255, 0.2)",
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "center",
                        }}
                     >
                        <IconComponent
                           sx={{
                              fontSize: 28,
                              color: "#ffffff",
                           }}
                        />
                     </Box>
                     <Typography
                        variant="h6"
                        sx={{
                           color: "#ffffff",
                           fontWeight: 600,
                        }}
                     >
                        {card.title}
                     </Typography>
                  </Box>

                  {/* Card Content */}
                  <Box
                     sx={{
                        p: 3,
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                     }}
                  >
                     <Typography
                        variant="body2"
                        sx={{
                           color: theme.palette.text.secondary,
                           lineHeight: 1.7,
                           flexGrow: 1,
                           mb: 3,
                        }}
                     >
                        {card.description}
                     </Typography>

                     {/* CTA Button */}
                     <Box
                        component="button"
                        onClick={() => handleProductCategoryClick(card.filterValue)}
                        sx={{
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "center",
                           gap: 1,
                           width: "100%",
                           py: 1.5,
                           px: 3,
                           border: "none",
                           borderRadius: 2,
                           background: card.gradient,
                           color: "#ffffff",
                           fontSize: "0.875rem",
                           fontWeight: 600,
                           cursor: "pointer",
                           transition: "all 0.2s ease",
                           "&:hover": {
                              opacity: 0.9,
                              transform: "scale(1.02)",
                           },
                           "&:active": {
                              transform: "scale(0.98)",
                           },
                        }}
                     >
                        View Products
                        <ArrowForward sx={{ fontSize: 18 }} />
                     </Box>
                  </Box>
               </Box>
            </Grid>
         );
      })}
   </Grid>
</Box>
```

**Verification:**
- Section renders with header "Explore our range of products"
- Three cards display correctly with icons, titles, descriptions
- Cards have hover effects (lift and shadow)
- Buttons are clickable

---

## Task 8: Test Navigation Functionality

**Manual Testing Steps:**

1. **Study Materials Card:**
   - Click "View Products" button
   - Verify navigation to `/products`
   - Verify Redux state has `product_types: ["Core Study Materials"]`

2. **Marking Service Card:**
   - Click "View Products" button
   - Verify navigation to `/products`
   - Verify Redux state has `product_types: ["Marking"]`

3. **Tuition Card:**
   - Click "View Products" button
   - Verify navigation to `/products`
   - Verify Redux state has `product_types: ["Tutorial"]`

**Verification:** All three cards navigate correctly and apply the appropriate filter.

---

## Task 9: Verify Responsive Design

**Test at breakpoints:**

| Breakpoint | Expected Layout |
|------------|-----------------|
| xs (<600px) | Single column, full width cards |
| sm (600-899px) | Two columns |
| md+ (≥900px) | Three columns |

**Verification:** Cards reflow correctly at each breakpoint.

---

## Design Reference Notes

### Material Design 3 Compliance:
- **Elevation:** Cards use subtle shadows that increase on hover
- **Motion:** 0.3s cubic-bezier transitions for smooth interactions
- **Color:** Uses theme primary, tertiary, and MD3 teal colors
- **Typography:** Follows MD3 type scale with proper hierarchy
- **Spacing:** Consistent padding (24px) and margins

### BPP Brand Alignment:
- Uses BPP color palette from colorTheme (primary, tertiary)
- Clean, professional aesthetic matching bpp.com
- White backgrounds with colored accent headers
- Action-oriented button text

---

## Files Modified

1. `src/pages/Home.js` - All changes in this file

## Dependencies

- No new packages required
- Uses existing MUI components and icons
- Uses existing Redux store actions

## Rollback

If needed, revert Home.js to previous state using git:
```bash
git checkout HEAD -- src/pages/Home.js
```
