# eStore Frontend Analysis

## Executive Summary

This document provides an objective analysis of the current eStore frontend implementation, examining table layouts, user interface design, responsiveness, and accessibility. The findings are presented to support informed decision-making regarding potential improvements.

---

## 1. Table Layout Analysis

### 1.1 Current Implementation

The existing eStore uses HTML table-based layouts to display products, with the layout logic controlled by SQL queries and the `products.addonsale` field in Visual FoxPro.

```vbs
SELECT *, RECNO() AS "rec",
  IIF("/PB" $ code .AND. .NOT. "/PB&R" $ code .AND. .NOT. "/PBAR" $ code,
      "A"+fullname,"Z"+fullname) AS "listorder"
FROM "products"
WHERE ...
ORDER BY listorder
INTO CURSOR tmpQuery READWRITE
```

### 1.2 Observations

#### Desktop Experience
- Tables provide a clear, structured view of products on larger screens
- Relationships between printed, ebook, and "Buy Both" options are visually connected
- Column headers help users understand data organisation

#### Mobile and Tablet Considerations
- When viewed on smaller screens, table rows require horizontal scrolling or text wrapping
- Row height increases significantly on narrow viewports to accommodate content
- Text wrapping can lead to word breaks mid-word, affecting readability
- The relationship between Printed/eBook/Buy Both columns becomes less intuitive when cells wrap to multiple lines

### 1.3 Technical Constraints

| Aspect | Current State |
|--------|---------------|
| Layout Control | SQL query and `addonsale` field determine row composition |
| Row Relationships | Products are grouped based on database flags |
| Rendering | Server-side HTML generation |
| Adaptability | Fixed column structure regardless of viewport |

### 1.4 Industry Context

Modern e-commerce platforms commonly use card-based or grid layouts that naturally reflow based on available screen width. This approach allows:

- Fixed card dimensions that maintain internal layout consistency
- Graceful wrapping to fewer columns on narrower screens
- Each product maintains its visual structure across viewport sizes

---

## 2. User Interface Design Assessment

### 2.1 Visual Hierarchy

#### Current State
The AMP ebook and mini ASET products occupy double space in the current layout, giving them higher visual prominence than other products. This creates an informal hierarchy based on technical implementation rather than intentional design.

#### Areas for Consideration
- Visual prominence could be more intentionally designed
- Product importance could be communicated through consistent design patterns
- Grouping related products visually could aid user comprehension

### 2.2 "Buy Both" Semantics

The "Buy Both" feature currently represents two different concepts:

| Scenario | Meaning | Pricing Model |
|----------|---------|---------------|
| Printed + eBook | Different versions of the same product | Normal rate + Additional rate |
| eBook + Marking | Different products recommended together | Both at normal rate |

This dual meaning may benefit from clearer visual differentiation to help users understand what they are purchasing.

### 2.3 Navigation and Feature Access

Some functionality is currently accessible only during specific workflows:

| Feature | Current Access Point |
|---------|---------------------|
| Login | Checkout process |
| Profile Update | Checkout process |
| Password Reset | Checkout process |
| Email Change | Checkout process |
| View Cart | Requires page navigation |

Modern e-commerce sites often provide these functions from a persistent navigation bar, allowing users to access them at any point in their journey.

### 2.4 Information Display

Products display several types of information:

- Pricing with various discount types
- VAT information
- Product descriptions
- Contextual guidance

The challenge lies in presenting this information without overwhelming users, while ensuring all necessary details are accessible when needed.

---

## 3. Responsiveness Analysis

### 3.1 Current Approach

The existing implementation generates server-side HTML with fixed table structures. The same HTML is served regardless of the requesting device.

### 3.2 Viewport Considerations

| Viewport Size | Typical Behaviour |
|---------------|-------------------|
| Desktop (1440px+) | Tables display as intended |
| Tablet (768-1024px) | Horizontal scrolling or significant text wrapping |
| Mobile (425px) | Content may span full screen height for single products |

### 3.3 Modern Responsive Patterns

Contemporary responsive design typically includes:

**Adaptive Layouts**
- Grid systems that adjust column count based on available width
- Example: 4 columns at 1440px, 3 at 1024px, 2 at 768px, 1 at 425px

**Breakpoint Strategy**
- CSS media queries to apply different styles at specific viewport widths
- Progressive enhancement from mobile base styles

**Flexible Components**
- Components that resize and reflow gracefully
- Touch-friendly targets (minimum 44x44 pixels) for mobile users

### 3.4 DOM Rendering Considerations

The current implementation re-renders the entire DOM for user actions and input changes. Modern approaches often include:

- Partial re-rendering of only changed components
- Smooth transitions and animations for visual feedback
- Client-side state management to reduce server round-trips

---

## 4. Accessibility Assessment

### 4.1 Current Metrics

The eStore received an accessibility score of approximately 50% from accessibilityChecker.org. This indicates room for improvement in meeting accessibility standards.

### 4.2 Areas Identified for Enhancement

#### Visual Design Elements
| Element | Consideration |
|---------|---------------|
| Contrast | Text and background combinations may not meet WCAG contrast ratios |
| Typography | Font sizes and spacing could be reviewed for readability |
| Visual Cues | Additional cues beyond colour could help users with colour vision differences |

#### Tutorial Products Section
- The traffic light system (red/amber/green) may present challenges for users with colour blindness
- Alternative indicators (icons, patterns, or text labels) could supplement colour coding
- Tab navigation through tutorial choices could be streamlined

#### Interactive Elements
- Form fields and buttons could benefit from larger touch targets
- Focus indicators could be more prominent for keyboard navigation
- Error messages and validation feedback could be more descriptive

### 4.3 WCAG Compliance Considerations

The Web Content Accessibility Guidelines (WCAG) 2.1 Level AA is the commonly accepted standard for web accessibility. Key areas include:

| Principle | Relevant Considerations |
|-----------|------------------------|
| Perceivable | Colour contrast, text alternatives, adaptable content |
| Operable | Keyboard navigation, sufficient time, seizure prevention |
| Understandable | Readable content, predictable behaviour, input assistance |
| Robust | Compatible with assistive technologies |

---

## 5. Tutorial Products Section

### 5.1 Current Observations

The tutorial products table presents some usability considerations:

- Expanded view can become lengthy
- Traffic light availability indicators rely on colour alone
- Navigating tutorial choices within each row requires multiple tab presses

### 5.2 Request Process

The tutorial request currently goes through the full checkout process, which includes:
- Address entry
- Terms and conditions acceptance
- Other preferences

For tutorial requests (which primarily require special education preferences), a simplified process might reduce friction for users.

---

## 6. Summary of Observations

### Frontend Architecture
- Server-side HTML generation with full page re-renders
- Table-based layouts with database-driven composition
- Limited client-side interactivity

### Visual Design
- Functional but with opportunities for modernisation
- Visual hierarchy determined by technical factors
- Some UI patterns differ from current e-commerce conventions

### Responsiveness
- Designed primarily for desktop viewports
- Tables present challenges on smaller screens
- No viewport-specific optimisations

### Accessibility
- Baseline functionality present
- Several areas could be enhanced to improve compliance
- Colour-dependent indicators could benefit from alternatives

---

## 7. Reference: Modern E-commerce Patterns

For context, research into actuarial education providers (IFoA, ActEX, ThinkActuary) and leading e-commerce sites (Amazon, eBay, Apple) revealed common patterns:

### Product Display
- Card-based layouts with consistent dimensions
- Responsive grids that adapt to viewport width
- Clear product imagery and pricing

### Navigation
- Persistent navigation bar with key functions
- Search functionality readily accessible
- Cart accessible from any page

### User Features
- Account management separate from checkout
- Guest checkout options
- Clear step-by-step checkout processes

---

## 8. Conclusion

This analysis presents an objective assessment of the current eStore frontend. The system serves its functional purpose, and many of the observations relate to opportunities for enhancement rather than critical issues.

The findings can inform discussions about potential improvements, whether through incremental updates to the existing system or consideration of alternative approaches.
