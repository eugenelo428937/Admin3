import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Stack, IconButton } from '@mui/material';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaFacebook, FaTwitter, FaLinkedin, FaYoutube, FaComments } from 'react-icons/fa';
import colorTheme from '../../theme/colorTheme';
import productService from '../../services/productService';
import { navSelectSubject, navSelectProductGroup, navSelectProduct } from '../../store/slices/filtersSlice';

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

// Main Footer Component with 2x2 Grid Layout
const Footer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local state for navigation data
  const [subjects, setSubjects] = useState([]);
  const [navbarProductGroups, setNavbarProductGroups] = useState([]);

  // Fetch navigation data on mount
  useEffect(() => {
    const fetchNavigationData = async () => {
      try {
        const data = await productService.getNavigationData();
        setSubjects(data.subjects || []);
        setNavbarProductGroups(data.navbarProductGroups || []);
      } catch (error) {
        console.error('Error fetching footer navigation data:', error);
      }
    };
    fetchNavigationData();
  }, []);

  // Transform navbarProductGroups into productGroups structure for ProductsSection
  // navbarProductGroups is an array of group objects: { name: 'Group Name', products: [...] }
  const getProductsByGroupName = (groupName) => {
    const group = navbarProductGroups.find(g => g.name === groupName);
    return group?.products || [];
  };

  const productGroups = {
    coreStudyMaterials: getProductsByGroupName('Core Study Material'),
    revisionMaterials: getProductsByGroupName('Revision'),
    markingProducts: [
      ...getProductsByGroupName('Marking'),
      ...getProductsByGroupName('Voucher'),
    ],
    tutorialLocations: getProductsByGroupName('Tutorial'),
    tutorialFormats: [
      { filter_type: 'classroom', group_name: 'Classroom', name: 'Classroom' },
      { filter_type: 'online', group_name: 'Online', name: 'Online' },
      { filter_type: 'distance', group_name: 'Distance Learning', name: 'Distance Learning' },
    ],
  };

  // Handle navigating to product list with subject filter
  const handleSubjectClick = (subjectCode) => {
    dispatch(navSelectSubject(subjectCode));
    navigate('/products');
  };

  // Handle navigating to product list with product group filter
  const handleProductGroupClick = (groupName) => {
    dispatch(navSelectProductGroup(groupName));
    navigate('/products');
  };

  // Handle navigating to product list with specific product filter
  const handleSpecificProductClick = (productId) => {
    dispatch(navSelectProduct(productId));
    navigate('/products');
  };

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
