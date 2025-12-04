# Footer Component Implementation Plan

## Overview
Create a comprehensive Footer component (`Footer.js`) using MUI Grid with the specified 2x2 layout structure, typography, and styling from the project's theme system.

## Requirements Summary
- **Layout**: 2x2 Grid structure
- **Typography**: `captionBold` for headers, `caption2` for links
- **Background**: `colorTheme.bpp.granite["080"]` (#3b3b3a)
- **Navigation Pattern**: Follow `NavigationMenu.js` for link generation
- **Content Structure**: As defined in `docs/footer.md`

---

## Task Breakdown

### Task 1: Create Footer Component File Structure

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Actions**:
1. Create new directory: `frontend/react-Admin3/src/components/Footer/`
2. Create new file: `Footer.js`

**Imports Required**:
```javascript
import React from 'react';
import { Box, Grid, Typography, Link, Stack, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { NavLink } from 'react-router-dom';

// Social Media Icons from react-icons (FontAwesome)
import { FaFacebook, FaTwitter, FaLinkedin, FaYoutube, FaComments } from 'react-icons/fa';

// Import colorTheme from theme
import colorTheme from '../../theme/colorTheme';
```

**Verification**: File exists and imports compile without errors.

---

### Task 2: Define Footer Data Constants

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - Subject Categories**:
```javascript
// Subject category filters (same as NavigationMenu.js)
const SUBJECT_CATEGORIES = {
  corePrinciples: {
    header: 'Core Principles',
    filter: (s) => /^(CB|CS|CM)/.test(s.code),
  },
  corePractices: {
    header: 'Core Practices',
    filter: (s) => /^CP[1-3]$/.test(s.code),
  },
  specialistAdvanced: {
    header: 'Specialist Advanced',
    filter: (s) => /^SA/.test(s.code),
  },
  specialistPrinciples: {
    header: 'Specialist Principles',
    filter: (s) => /^SP/.test(s.code),
  },
};
```

**Code - Product Categories**:
```javascript
const PRODUCT_CATEGORIES = {
  coreStudyMaterials: {
    header: 'Core Study Materials',
    // Products will be passed as props and filtered
  },
  revisionMaterials: {
    header: 'Revision Materials',
  },
  markingProducts: {
    header: 'Marking Products + Vouchers',
  },
};
```

**Code - Tutorial Categories**:
```javascript
const TUTORIAL_CATEGORIES = {
  location: {
    header: 'Location',
  },
  format: {
    header: 'Format',
  },
};
```

**Code - Support Links**:
```javascript
const SUPPORT_LINKS = [
  { label: 'FAQ', to: '/faq' },
  { label: 'Student Brochure 2026 Exam', to: '/brochure-2026' },
  { label: 'Materials Application Form', to: '/materials-application' },
  { label: 'Tutorial Application Form', to: '/tutorial-application' },
];
```

**Code - Social Media Icons**:
```javascript
const SOCIAL_MEDIA = [
  { icon: FaFacebook, label: 'Facebook', url: 'https://www.facebook.com/bppacted' },
  { icon: FaTwitter, label: 'Twitter', url: 'https://twitter.com/bppacted' },
  { icon: FaLinkedin, label: 'LinkedIn', url: 'https://www.linkedin.com/company/bpp-actuarial-education' },
  { icon: FaYoutube, label: 'YouTube', url: 'https://www.youtube.com/bppacted' },
  { icon: FaComments, label: 'Comments', url: '/contact' },
];
```

**Code - Bottom Links**:
```javascript
const BOTTOM_LINKS = [
  { label: 'General Terms of Use', to: '/terms-of-use' },
  { label: 'Cookie Use', to: '/cookie-policy' },
  { label: 'Complaints', to: '/complaints' },
];
```

**Verification**: Constants defined and no syntax errors.

---

### Task 3: Create Reusable Styled Components

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - Section Header Component**:
```javascript
// Reusable header component with captionBold typography
const SectionHeader = ({ children }) => (
  <Typography
    variant="captionBold"
    sx={{
      color: colorTheme.bpp.granite["000"], // White text on dark background
      mb: 1,
      display: 'block',
    }}
  >
    {children}
  </Typography>
);
```

**Code - Footer Link Component**:
```javascript
// Reusable link component with caption2 typography
const FooterLink = ({ to, onClick, children, external = false }) => {
  const linkStyles = {
    color: colorTheme.bpp.granite["030"],
    textDecoration: 'none',
    display: 'block',
    py: 0.25,
    '&:hover': {
      color: colorTheme.bpp.granite["000"],
      textDecoration: 'underline',
    },
  };

  if (external) {
    return (
      <Typography
        variant="caption2"
        component="a"
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        sx={linkStyles}
      >
        {children}
      </Typography>
    );
  }

  return (
    <Typography
      variant="caption2"
      component={NavLink}
      to={to}
      onClick={onClick}
      sx={linkStyles}
    >
      {children}
    </Typography>
  );
};
```

**Verification**: Components render correctly with proper typography variants.

---

### Task 4: Implement Subjects Grid Section (Top-Left, 1st Column)

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - SubjectsSection Component**:
```javascript
const SubjectsSection = ({ subjects, handleSubjectClick }) => (
  <Box>
    <SectionHeader>Subjects</SectionHeader>
    <Grid container spacing={2}>
      {/* First row, first column: Core Principles */}
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.corePrinciples.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.corePrinciples.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>

      {/* First row, second column: Core Practices */}
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.corePractices.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.corePractices.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>

      {/* Second row, first column: Specialist Advanced */}
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.specialistAdvanced.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.specialistAdvanced.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>

      {/* Second row, second column: Specialist Principles */}
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.specialistPrinciples.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.specialistPrinciples.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>
    </Grid>
  </Box>
);
```

**Verification**: Subjects section renders correctly with 2x2 grid layout.

---

### Task 5: Implement Products Grid Section (Top-Left, 2nd Column)

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - ProductsSection Component**:
```javascript
const ProductsSection = ({
  productGroups,
  handleProductGroupClick,
  handleSpecificProductClick
}) => (
  <Box>
    <SectionHeader>Products</SectionHeader>
    <Grid container spacing={2}>
      {/* First row: 3 columns */}
      <Grid item xs={4}>
        <SectionHeader>Core Study Materials</SectionHeader>
        {productGroups?.coreStudyMaterials?.map((product) => (
          <FooterLink
            key={product.id}
            to={`/products/${product.id}`}
            onClick={() => handleSpecificProductClick?.(product.id)}
          >
            {product.shortname}
          </FooterLink>
        ))}
      </Grid>

      <Grid item xs={4}>
        <SectionHeader>Revision Materials</SectionHeader>
        {productGroups?.revisionMaterials?.map((product) => (
          <FooterLink
            key={product.id}
            to={`/products/${product.id}`}
            onClick={() => handleSpecificProductClick?.(product.id)}
          >
            {product.shortname}
          </FooterLink>
        ))}
      </Grid>

      <Grid item xs={4}>
        <SectionHeader>Marking Products + Vouchers</SectionHeader>
        {productGroups?.markingProducts?.map((product) => (
          <FooterLink
            key={product.id}
            to={`/products/${product.id}`}
            onClick={() => handleSpecificProductClick?.(product.id)}
          >
            {product.shortname}
          </FooterLink>
        ))}
      </Grid>

      {/* Second row: Tutorial section with 2 sub-columns */}
      <Grid item xs={12}>
        <SectionHeader>Tutorial</SectionHeader>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <SectionHeader>Location</SectionHeader>
            {productGroups?.tutorialLocations?.map((product) => (
              <FooterLink
                key={product.id}
                to={`/products/${product.id}`}
                onClick={() => handleSpecificProductClick?.(product.id)}
              >
                {product.shortname}
              </FooterLink>
            ))}
          </Grid>
          <Grid item xs={6}>
            <SectionHeader>Format</SectionHeader>
            {productGroups?.tutorialFormats?.map((format) => (
              <FooterLink
                key={format.filter_type}
                to={`/products?group=${format.group_name}`}
                onClick={() => handleProductGroupClick?.(format.group_name)}
              >
                {format.name}
              </FooterLink>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  </Box>
);
```

**Verification**: Products section renders correctly with 3-column layout and nested Tutorial section.

---

### Task 6: Implement Support Section (Top-Left, 3rd Column)

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - SupportSection Component**:
```javascript
const SupportSection = () => (
  <Box>
    <SectionHeader>Support</SectionHeader>
    <Stack spacing={0.5}>
      {SUPPORT_LINKS.map((link) => (
        <FooterLink key={link.to} to={link.to}>
          {link.label}
        </FooterLink>
      ))}
    </Stack>
  </Box>
);
```

**Verification**: Support section renders with 4 stacked links.

---

### Task 7: Implement Social Media Section (Top-Right)

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - SocialMediaSection Component**:
```javascript
const SocialMediaSection = () => (
  <Stack direction="row" spacing={1} justifyContent="flex-end">
    {SOCIAL_MEDIA.map((social) => {
      const IconComponent = social.icon;
      return (
        <IconButton
          key={social.label}
          component="a"
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          sx={{
            color: colorTheme.bpp.granite["030"],
            '&:hover': {
              color: colorTheme.bpp.granite["000"],
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <IconComponent size={20} />
        </IconButton>
      );
    })}
  </Stack>
);
```

**Verification**: Social media icons render correctly with hover effects.

---

### Task 8: Implement Copyright Section (Bottom-Left)

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - CopyrightSection Component**:
```javascript
const CopyrightSection = () => (
  <Typography
    variant="caption2"
    sx={{ color: colorTheme.bpp.granite["040"] }}
  >
    Copyright &copy; 2026 BPP Actuarial Education - Part of the BPP Professional Education Group -{' '}
    <Typography
      variant="caption2"
      component="a"
      href="mailto:acted@bpp.com"
      sx={{
        color: colorTheme.bpp.granite["030"],
        textDecoration: 'none',
        '&:hover': {
          color: colorTheme.bpp.granite["000"],
          textDecoration: 'underline',
        },
      }}
    >
      acted@bpp.com
    </Typography>
  </Typography>
);
```

**Verification**: Copyright renders with mailto link.

---

### Task 9: Implement Bottom Links Section (Bottom-Right)

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - BottomLinksSection Component**:
```javascript
const BottomLinksSection = () => (
  <Stack
    direction="row"
    spacing={1}
    divider={
      <Typography variant="caption2" sx={{ color: colorTheme.bpp.granite["040"] }}>
        |
      </Typography>
    }
    justifyContent="flex-end"
  >
    {BOTTOM_LINKS.map((link) => (
      <FooterLink key={link.to} to={link.to}>
        {link.label}
      </FooterLink>
    ))}
  </Stack>
);
```

**Verification**: Bottom links render with pipe separators.

---

### Task 10: Assemble Main Footer Component

**File**: `frontend/react-Admin3/src/components/Footer/Footer.js`

**Code - Main Footer Component**:
```javascript
const Footer = ({
  subjects = [],
  productGroups = {},
  handleSubjectClick,
  handleProductGroupClick,
  handleSpecificProductClick,
}) => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: colorTheme.bpp.granite["080"],
        py: 4,
        px: 3,
        mt: 'auto', // Push to bottom of page
      }}
    >
      {/* Main 2x2 Grid Container */}
      <Grid container spacing={4}>
        {/* Top-Left: Main Content (Subjects, Products, Support) */}
        <Grid item xs={12} md={10}>
          <Grid container spacing={4}>
            {/* Subjects Column */}
            <Grid item xs={12} sm={6} md={4}>
              <SubjectsSection
                subjects={subjects}
                handleSubjectClick={handleSubjectClick}
              />
            </Grid>

            {/* Products Column */}
            <Grid item xs={12} sm={6} md={5}>
              <ProductsSection
                productGroups={productGroups}
                handleProductGroupClick={handleProductGroupClick}
                handleSpecificProductClick={handleSpecificProductClick}
              />
            </Grid>

            {/* Support Column */}
            <Grid item xs={12} sm={6} md={3}>
              <SupportSection />
            </Grid>
          </Grid>
        </Grid>

        {/* Top-Right: Social Media Icons */}
        <Grid item xs={12} md={2}>
          <SocialMediaSection />
        </Grid>

        {/* Bottom-Left: Copyright */}
        <Grid item xs={12} md={6}>
          <CopyrightSection />
        </Grid>

        {/* Bottom-Right: Policy Links */}
        <Grid item xs={12} md={6}>
          <BottomLinksSection />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Footer;
```

**Verification**: Complete Footer component assembles all sections in 2x2 grid.

---

### Task 11: Create Index Export File

**File**: `frontend/react-Admin3/src/components/Footer/index.js`

**Code**:
```javascript
export { default } from './Footer';
```

**Verification**: Footer can be imported from `components/Footer`.

---

### Task 12: Add Footer to App Layout

**File**: Identify main layout file (likely `App.js` or a layout component)

**Actions**:
1. Import Footer component
2. Add Footer after main content
3. Pass required props (subjects, productGroups, handlers)

**Example Integration**:
```javascript
import Footer from './components/Footer';

// In render:
<Footer
  subjects={subjects}
  productGroups={{
    coreStudyMaterials: [...],
    revisionMaterials: [...],
    markingProducts: [...],
    tutorialLocations: [...],
    tutorialFormats: [...],
  }}
  handleSubjectClick={handleSubjectClick}
  handleProductGroupClick={handleProductGroupClick}
  handleSpecificProductClick={handleSpecificProductClick}
/>
```

**Verification**: Footer appears at bottom of page with correct data.

---

### Task 13: Create Unit Tests

**File**: `frontend/react-Admin3/src/components/Footer/__tests__/Footer.test.js`

**Test Cases**:
1. Footer renders without crashing
2. All subject categories render correctly
3. Product sections render correctly
4. Support links render correctly
5. Social media icons render with correct links
6. Copyright text renders correctly
7. Bottom policy links render with separators
8. Click handlers are called correctly
9. Links have correct navigation paths

**Example Test**:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Footer from '../Footer';
import theme from '../../../theme/theme';

const mockSubjects = [
  { id: 1, code: 'CB1', description: 'Business Finance' },
  { id: 2, code: 'CB2', description: 'Business Economics' },
  { id: 3, code: 'SP1', description: 'Health and Care' },
];

const renderFooter = (props = {}) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Footer subjects={mockSubjects} {...props} />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Footer', () => {
  test('renders without crashing', () => {
    renderFooter();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  test('renders subject categories', () => {
    renderFooter();
    expect(screen.getByText('Core Principles')).toBeInTheDocument();
    expect(screen.getByText('Specialist Principles')).toBeInTheDocument();
  });

  test('renders support links', () => {
    renderFooter();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('Student Brochure 2026 Exam')).toBeInTheDocument();
  });

  test('renders copyright', () => {
    renderFooter();
    expect(screen.getByText(/BPP Actuarial Education/)).toBeInTheDocument();
  });

  test('calls handleSubjectClick when subject link clicked', () => {
    const handleSubjectClick = jest.fn();
    renderFooter({ handleSubjectClick });

    fireEvent.click(screen.getByText('CB1 - Business Finance'));
    expect(handleSubjectClick).toHaveBeenCalledWith('CB1');
  });
});
```

**Verification**: All tests pass with `npm test -- Footer`.

---

## Complete Footer.js File

**Full Implementation**:

```javascript
import React from 'react';
import { Box, Grid, Typography, Stack, IconButton } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaLinkedin, FaYoutube, FaComments } from 'react-icons/fa';
import colorTheme from '../../theme/colorTheme';

// Subject category filters (same as NavigationMenu.js)
const SUBJECT_CATEGORIES = {
  corePrinciples: {
    header: 'Core Principles',
    filter: (s) => /^(CB|CS|CM)/.test(s.code),
  },
  corePractices: {
    header: 'Core Practices',
    filter: (s) => /^CP[1-3]$/.test(s.code),
  },
  specialistAdvanced: {
    header: 'Specialist Advanced',
    filter: (s) => /^SA/.test(s.code),
  },
  specialistPrinciples: {
    header: 'Specialist Principles',
    filter: (s) => /^SP/.test(s.code),
  },
};

const SUPPORT_LINKS = [
  { label: 'FAQ', to: '/faq' },
  { label: 'Student Brochure 2026 Exam', to: '/brochure-2026' },
  { label: 'Materials Application Form', to: '/materials-application' },
  { label: 'Tutorial Application Form', to: '/tutorial-application' },
];

const SOCIAL_MEDIA = [
  { icon: FaFacebook, label: 'Facebook', url: 'https://www.facebook.com/bppacted' },
  { icon: FaTwitter, label: 'Twitter', url: 'https://twitter.com/bppacted' },
  { icon: FaLinkedin, label: 'LinkedIn', url: 'https://www.linkedin.com/company/bpp-actuarial-education' },
  { icon: FaYoutube, label: 'YouTube', url: 'https://www.youtube.com/bppacted' },
  { icon: FaComments, label: 'Comments', url: '/contact' },
];

const BOTTOM_LINKS = [
  { label: 'General Terms of Use', to: '/terms-of-use' },
  { label: 'Cookie Use', to: '/cookie-policy' },
  { label: 'Complaints', to: '/complaints' },
];

// Reusable header component with captionBold typography
const SectionHeader = ({ children }) => (
  <Typography
    variant="captionBold"
    sx={{
      color: colorTheme.bpp.granite["000"],
      mb: 1,
      display: 'block',
    }}
  >
    {children}
  </Typography>
);

// Reusable link component with caption2 typography
const FooterLink = ({ to, onClick, children, external = false }) => {
  const linkStyles = {
    color: colorTheme.bpp.granite["030"],
    textDecoration: 'none',
    display: 'block',
    py: 0.25,
    '&:hover': {
      color: colorTheme.bpp.granite["000"],
      textDecoration: 'underline',
    },
  };

  if (external) {
    return (
      <Typography
        variant="caption2"
        component="a"
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        sx={linkStyles}
      >
        {children}
      </Typography>
    );
  }

  return (
    <Typography
      variant="caption2"
      component={NavLink}
      to={to}
      onClick={onClick}
      sx={linkStyles}
    >
      {children}
    </Typography>
  );
};

// Subjects Section with 2x2 inner grid
const SubjectsSection = ({ subjects, handleSubjectClick }) => (
  <Box>
    <SectionHeader>Subjects</SectionHeader>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.corePrinciples.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.corePrinciples.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.corePractices.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.corePractices.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.specialistAdvanced.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.specialistAdvanced.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>
      <Grid item xs={6}>
        <SectionHeader>{SUBJECT_CATEGORIES.specialistPrinciples.header}</SectionHeader>
        {subjects
          ?.filter(SUBJECT_CATEGORIES.specialistPrinciples.filter)
          .map((subject) => (
            <FooterLink
              key={subject.id}
              to={`/products?subject_code=${subject.code}`}
              onClick={() => handleSubjectClick?.(subject.code)}
            >
              {subject.code} - {subject.description}
            </FooterLink>
          ))}
      </Grid>
    </Grid>
  </Box>
);

// Products Section
const ProductsSection = ({
  productGroups,
  handleProductGroupClick,
  handleSpecificProductClick
}) => (
  <Box>
    <SectionHeader>Products</SectionHeader>
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <SectionHeader>Core Study Materials</SectionHeader>
        {productGroups?.coreStudyMaterials?.map((product) => (
          <FooterLink
            key={product.id}
            to={`/products/${product.id}`}
            onClick={() => handleSpecificProductClick?.(product.id)}
          >
            {product.shortname}
          </FooterLink>
        ))}
      </Grid>
      <Grid item xs={4}>
        <SectionHeader>Revision Materials</SectionHeader>
        {productGroups?.revisionMaterials?.map((product) => (
          <FooterLink
            key={product.id}
            to={`/products/${product.id}`}
            onClick={() => handleSpecificProductClick?.(product.id)}
          >
            {product.shortname}
          </FooterLink>
        ))}
      </Grid>
      <Grid item xs={4}>
        <SectionHeader>Marking Products + Vouchers</SectionHeader>
        {productGroups?.markingProducts?.map((product) => (
          <FooterLink
            key={product.id}
            to={`/products/${product.id}`}
            onClick={() => handleSpecificProductClick?.(product.id)}
          >
            {product.shortname}
          </FooterLink>
        ))}
      </Grid>
      <Grid item xs={12}>
        <SectionHeader>Tutorial</SectionHeader>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <SectionHeader>Location</SectionHeader>
            {productGroups?.tutorialLocations?.map((product) => (
              <FooterLink
                key={product.id}
                to={`/products/${product.id}`}
                onClick={() => handleSpecificProductClick?.(product.id)}
              >
                {product.shortname}
              </FooterLink>
            ))}
          </Grid>
          <Grid item xs={6}>
            <SectionHeader>Format</SectionHeader>
            {productGroups?.tutorialFormats?.map((format) => (
              <FooterLink
                key={format.filter_type}
                to={`/products?group=${format.group_name}`}
                onClick={() => handleProductGroupClick?.(format.group_name)}
              >
                {format.name}
              </FooterLink>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  </Box>
);

// Support Section
const SupportSection = () => (
  <Box>
    <SectionHeader>Support</SectionHeader>
    <Stack spacing={0.5}>
      {SUPPORT_LINKS.map((link) => (
        <FooterLink key={link.to} to={link.to}>
          {link.label}
        </FooterLink>
      ))}
    </Stack>
  </Box>
);

// Social Media Section
const SocialMediaSection = () => (
  <Stack direction="row" spacing={1} justifyContent="flex-end">
    {SOCIAL_MEDIA.map((social) => {
      const IconComponent = social.icon;
      return (
        <IconButton
          key={social.label}
          component="a"
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          sx={{
            color: colorTheme.bpp.granite["030"],
            '&:hover': {
              color: colorTheme.bpp.granite["000"],
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <IconComponent size={20} />
        </IconButton>
      );
    })}
  </Stack>
);

// Copyright Section
const CopyrightSection = () => (
  <Typography
    variant="caption2"
    sx={{ color: colorTheme.bpp.granite["040"] }}
  >
    Copyright &copy; 2026 BPP Actuarial Education - Part of the BPP Professional Education Group -{' '}
    <Typography
      variant="caption2"
      component="a"
      href="mailto:acted@bpp.com"
      sx={{
        color: colorTheme.bpp.granite["030"],
        textDecoration: 'none',
        '&:hover': {
          color: colorTheme.bpp.granite["000"],
          textDecoration: 'underline',
        },
      }}
    >
      acted@bpp.com
    </Typography>
  </Typography>
);

// Bottom Links Section
const BottomLinksSection = () => (
  <Stack
    direction="row"
    spacing={1}
    divider={
      <Typography variant="caption2" sx={{ color: colorTheme.bpp.granite["040"] }}>
        |
      </Typography>
    }
    justifyContent="flex-end"
  >
    {BOTTOM_LINKS.map((link) => (
      <FooterLink key={link.to} to={link.to}>
        {link.label}
      </FooterLink>
    ))}
  </Stack>
);

// Main Footer Component
const Footer = ({
  subjects = [],
  productGroups = {},
  handleSubjectClick,
  handleProductGroupClick,
  handleSpecificProductClick,
}) => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: colorTheme.bpp.granite["080"],
        py: 4,
        px: 3,
        mt: 'auto',
      }}
    >
      <Grid container spacing={4}>
        {/* Top-Left: Main Content (Subjects, Products, Support) */}
        <Grid item xs={12} md={10}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={4}>
              <SubjectsSection
                subjects={subjects}
                handleSubjectClick={handleSubjectClick}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={5}>
              <ProductsSection
                productGroups={productGroups}
                handleProductGroupClick={handleProductGroupClick}
                handleSpecificProductClick={handleSpecificProductClick}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SupportSection />
            </Grid>
          </Grid>
        </Grid>

        {/* Top-Right: Social Media Icons */}
        <Grid item xs={12} md={2}>
          <SocialMediaSection />
        </Grid>

        {/* Bottom-Left: Copyright */}
        <Grid item xs={12} md={6}>
          <CopyrightSection />
        </Grid>

        {/* Bottom-Right: Policy Links */}
        <Grid item xs={12} md={6}>
          <BottomLinksSection />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Footer;
```

---

## Summary

| Task | Description | File |
|------|-------------|------|
| 1 | Create file structure | `Footer/Footer.js` |
| 2 | Define data constants | `Footer/Footer.js` |
| 3 | Create styled components | `Footer/Footer.js` |
| 4 | Subjects grid section | `Footer/Footer.js` |
| 5 | Products grid section | `Footer/Footer.js` |
| 6 | Support section | `Footer/Footer.js` |
| 7 | Social media section | `Footer/Footer.js` |
| 8 | Copyright section | `Footer/Footer.js` |
| 9 | Bottom links section | `Footer/Footer.js` |
| 10 | Assemble main component | `Footer/Footer.js` |
| 11 | Create index export | `Footer/index.js` |
| 12 | Add to App layout | `App.js` or layout file |
| 13 | Create unit tests | `Footer/__tests__/Footer.test.js` |

---

## Dependencies
- Material-UI (already installed)
- react-icons (already installed - `"react-icons": "^5.5.0"`)
- react-router-dom (already installed)

## Notes
- Uses existing `colorTheme.bpp.granite["080"]` (#3b3b3a) for background
- Uses `captionBold` variant for headers (fontWeight: 600, fontSize: calc(1em / var(--halfstep)))
- Uses `caption2` variant for links (fontWeight: 400, fontSize: calc(1em / var(--halfstep) / var(--quarterstep)))
- Follows NavigationMenu.js patterns for subject filtering
- Social icons from react-icons (FontAwesome set)
