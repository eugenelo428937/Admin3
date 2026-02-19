# ActEd eStore - Current Application Issues Report

**Date:** 05/10/2025  
**Purpose:** Documentation of issues requiring attention for online store revamp

## 1. USER INTERFACE & DESIGN

- Outdated visual design
- No responsive design indicators
- Dated typography

## 2. NAVIGATION & USABILITY

- navigation relies on hover-activated dropdowns hinder usability and accessibility
- Limited visual feedback: Unclear which menu items are clickable vs. static headers


## 3. INFORMATION ARCHITECTURE

- Lengthy instructional text blocks overwhelm users before they can browse products
- No progressive disclosure: All information presented upfront rather than contextually when needed


---

## 4. SHOPPING EXPERIENCE

### Issues Identified:
- **Empty cart provides no guidance**: Shopping cart page is bare when empty with no suggestions or next steps
- **No visual product representations**: Product listings lack images or visual identifiers
- **Limited filtering/search**: No apparent search functionality or filtering options on listing pages
- **Complex booking process**: Tutorial booking requires understanding multiple choice priorities and location preferences upfront

### Impact:
- Abandoned carts
- Confused customers
- Lost sales opportunities

---

## 5. CONTENT & COMMUNICATION

### Issues Identified:
- **Jargon-heavy language**: Assumes users understand terms like "Materials Application form", "reduced-rates", "Tuition Bulletin"
- - **Multiple ordering methods**: Confusing options between online ordering, email forms, and application forms
- **Temporal information issues**: References to "April 2026" and "2025 exams" may become outdated
- - **Buried important information**: Key details like pricing and availability hidden below fold

### Impact:
- User confusion and uncertainty
- Support inquiries increase
- Potential for ordering errors

---

## 6. FORMS & INPUT

### Issues Identified:
- **Complex form interfaces**: Tutorial request form shows all options at once (multiple checkboxes, locations)
- - **No auto-save functionality**: Risk of losing form data if user navigates away
- **Limited validation feedback**: No clear indication of required vs. optional fields
- **Checkbox grid layout**: Location selection uses text-based checkboxes that are hard to scan

### Impact:
- Form abandonment
- Data entry errors
- User frustration

---

## 7. ACCESSIBILITY & STANDARDS

### Issues Identified:
- **Poor semantic structure**: Inconsistent use of headings and page structure
- **Limited keyboard navigation**: Dropdown menus likely problematic for keyboard-only users
- **No skip navigation links**: Cannot bypass repetitive navigation elements
- **Color-only indicators**: Traffic light system (red/yellow/green) for course availability relies solely on color
- 
### Impact:
- Excludes users with disabilities
- Legal compliance risks
- Reduced market reach

---

## 8. TECHNICAL & PERFORMANCE

### Issues Identified:
- **URL structure**: Uses `.fwx` extension suggesting outdated server technology
- **Session management concerns**: Warning about cart being "reset due to long period of inactivity"
- - **No loading indicators**: Unclear when pages are processing or loading content

### Impact:
- Perceived poor performance
- User uncertainty during operations
- Technical debt accumulation

---

## 9. MOBILE & RESPONSIVE DESIGN

### Issues Identified:
- **Fixed-width layout**: No apparent responsive breakpoints
- **Sidebar navigation**: Left sidebar likely problematic on smaller screens
- **Small click targets**: Links and buttons appear too small for touch interfaces
- **Horizontal scrolling risk**: Table layouts (pricing table) likely require scrolling on mobile
- 
### Impact:
- Poor mobile user experience
- Lost mobile customers (growing market segment)
- - Competitive disadvantage

---

## 10. E-COMMERCE FEATURES

### Issues Identified:
- **No wish list functionality**: Cannot save items for later consideration
- **No comparison tools**: Cannot compare different course options
- **Limited payment information**: Unclear payment options until late in checkout
- **No order tracking**: No visible way to check order status
- **No customer reviews**: No social proof or ratings for courses

### Impact:
- Reduced engagement
- Lower conversion rates
- Missed cross-selling opportunities

---

## 11. HELP & SUPPORT

### Issues Identified:
- **"Help Me Please!" widget**: Appears as an afterthought in sidebar rather than integrated support
- - **No live chat**: No immediate support options visible
- **FAQ buried**: Help content not easily accessible
- **No contextual help**: No tooltips or inline explanations for complex options

### Impact:
- Increased support call volume
- Customer frustration
- Higher support costs

---

## 12. BRANDING & TRUST

### Issues Identified:
- **Minimal branding**: Limited use of ActEd/BPP branding beyond header logo
- **No trust signals**: Missing security badges, testimonials, or accreditation information
- **Copyright only in footer**: Minimal company information visible
- **Bare-bones footer**: Limited useful information in footer area

### Impact:
- Reduced trust and credibility
- Missed branding opportunities
- Lower conversion confidence

---

## Priority Recommendations

### High Priority (Immediate Action Required):
1. Implement responsive/mobile-first design
2. Fix navigation and menu functionality
3. Add search and filtering capabilities
4. Simplify checkout and booking processes
5. Improve accessibility compliance

### Medium Priority (3-6 Months):
1. Redesign visual interface with modern aesthetics
2. Restructure information architecture
3. Add e-commerce features (wish list, reviews, comparison)
4. 4. Implement better help and support systems
5. Enhance form usability

### Low Priority (Future Enhancements):
1. Add personalization features
2. Implement advanced analytics
3. Create mobile application
4. Add social media integration

---

## Conclusion

The current ActEd eStore application exhibits significant deficiencies across all major areas of modern web application design and functionality. A comprehensive revamp is essential to:

- Meet current web standards and user expectations
- Improve conversion rates and sales performance
- Reduce support costs and user frustration
- Maintain competitive positioning in the market
- Ensure accessibility and legal compliance

**Recommendation:** Proceed with full application redesign and redevelopment using modern web technologies, user-centered design principles, and industry best practices.

---

**Report Prepared By:** UX Analysis Team  
**Review Date:** May 10, 2025  
**Next Steps:** Present findings to stakeholders and initiate project planning phase

## Technical Issues: Database Schema

**FoxPro Limitations:**
- Not fully ACID compliant (corruption possible, no FK constraints)
- Fixed-width schema
  - Products table: 10 deadline columns (80 bytes wasted for non-marking products)
  - Empty fields consume same storage as filled fields
- Redundant data
  - First name, last name, contact duplicated across tables
  - Updates require modification in multiple locations

**Schema Design:**
- Not normalized (FoxPro is not relational)
- Entity integrity issues (e.g., "binder" field irrelevant to eBook products)
- Scalability constraints (adding 11th deadline requires schema change)

Technical Issues: Coupled Architecture

**Code Organization:**
- Product layout controlled by SQL SELECT statement

**Rendering:**
- Full DOM re-render per user action
- No partial page updates
- No smooth transitions/animations
- No state management framework