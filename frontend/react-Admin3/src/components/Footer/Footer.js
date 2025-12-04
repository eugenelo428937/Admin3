import React, { useState, useEffect } from "react";
import {
   Box,
   Grid,
   Typography,
   Stack,
   IconButton,
   useTheme,
} from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
   FaFacebook,
   FaTwitter,
   FaLinkedin,
   FaYoutube,
   FaComments,
} from "react-icons/fa";
import colorTheme from "../../theme/colorTheme";
import productService from "../../services/productService";
import {
   navSelectSubject,
   navSelectProductGroup,
   navSelectProduct,
} from "../../store/slices/filtersSlice";

// Subject category filters (same as NavigationMenu.js)
const SUBJECT_CATEGORIES = {
   corePrinciples: {
      header: "Core Principles",
      filter: (s) => /^(CB|CS|CM)/.test(s.code),
   },
   corePractices: {
      header: "Core Practices",
      filter: (s) => /^CP[1-3]$/.test(s.code),
   },
   specialistAdvanced: {
      header: "Specialist Advanced",
      filter: (s) => /^SA/.test(s.code),
   },
   specialistPrinciples: {
      header: "Specialist Principles",
      filter: (s) => /^SP/.test(s.code),
   },
};

const SUPPORT_LINKS = [
   { label: "FAQ", to: "/faq" },
   { label: "Student Brochure 2026 Exam", to: "/brochure-2026" },
   { label: "Materials Application Form", to: "/materials-application" },
   { label: "Tutorial Application Form", to: "/tutorial-application" },
];

const SOCIAL_MEDIA = [
   {
      icon: FaFacebook,
      label: "Facebook",
      url: "https://www.facebook.com/bppacted",
   },
   { icon: FaTwitter, label: "Twitter", url: "https://twitter.com/bppacted" },
   {
      icon: FaLinkedin,
      label: "LinkedIn",
      url: "https://www.linkedin.com/company/bpp-actuarial-education",
   },
   {
      icon: FaYoutube,
      label: "YouTube",
      url: "https://www.youtube.com/bppacted",
   },
   { icon: FaComments, label: "Comments", url: "/contact" },
];

const BOTTOM_LINKS = [
   { label: "General Terms of Use", to: "/terms-of-use" },
   { label: "Cookie Use", to: "/cookie-policy" },
   { label: "Complaints", to: "/complaints" },
];

// Reusable header component with captionBold typography
const SectionSubHeader = ({ children }) => (
  <Typography
     variant="captionSemiBold"
     sx={{
        color: colorTheme.bpp.granite["030"],
        mb: 0.36,
        display: "block",        
     }}
  >
     {children}
  </Typography>
);

// Reusable header component with captionBold typography
const SectionHeader = ({ children }) => (
   <Typography
      variant="captionSemiBold"
      sx={{
         color: colorTheme.bpp.granite["020"],
         mb: 0.6,
         display: "block",
         borderBottom: `1px solid ${colorTheme.bpp.granite["070"]}`,
      }}
   >
      {children}
   </Typography>
);

// Reusable header component with captionBold typography
const MainSectionHeader = ({ children }) => (
   <Typography
      variant="captionBold"
      sx={{
         color: colorTheme.bpp.granite["010"],
         mb: 1.2,
         display: "block",
         borderBottom: `1px solid ${colorTheme.bpp.granite["050"]}`,
      }}
   >
      {children}
   </Typography>
);
// Reusable link component with caption2 typography
const FooterLink = ({ to, onClick, children, external = false }) => {
   const linkStyles = {
      color: colorTheme.bpp.granite["030"],
      textDecoration: "none",
      display: "block",
      py: 0.25,
      "&:hover": {
         color: colorTheme.bpp.granite["000"],
         textDecoration: "underline",
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
   <Box sx={{ textAlign: "left" }}>
      <MainSectionHeader>Subjects</MainSectionHeader>
      <Box
         sx={{
            columnCount: 2,
         }}
      >
         <Stack sx={{ paddingBottom: 1 }}>
            <SectionHeader>
               {SUBJECT_CATEGORIES.corePrinciples.header}
            </SectionHeader>
            <Box>
               {subjects
                  ?.filter(SUBJECT_CATEGORIES.corePrinciples.filter)
                  .map((subject) => (
                     <FooterLink
                        key={subject.id}
                        to={`/products?subject_code=${subject.code}`}
                        onClick={() => handleSubjectClick?.(subject.code)}
                     >
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                           <Box sx={{ textWrap: "nowrap" }}>{subject.code}&nbsp;-&nbsp;</Box>
                           <Box sx={{ textWrap: "pretty" }}>{subject.description}</Box>
                        </Box>
                     </FooterLink>
                  ))}
            </Box>
         </Stack>

         <Stack sx={{ paddingBottom: 1 }}>
            <SectionHeader>
               {SUBJECT_CATEGORIES.specialistAdvanced.header}
            </SectionHeader>
            <Box>
               {subjects
                  ?.filter(SUBJECT_CATEGORIES.specialistAdvanced.filter)
                  .map((subject) => (
                     <FooterLink
                        key={subject.id}
                        to={`/products?subject_code=${subject.code}`}
                        onClick={() => handleSubjectClick?.(subject.code)}
                     >
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                           <Box sx={{ textWrap: "nowrap" }}>{subject.code}&nbsp;-&nbsp;</Box>
                           <Box sx={{ textWrap: "pretty" }}>{subject.description}</Box>
                        </Box>
                     </FooterLink>
                  ))}
            </Box>
         </Stack>
         <Stack sx={{ paddingBottom: 1 }}>
            <SectionHeader>
               {SUBJECT_CATEGORIES.corePractices.header}
            </SectionHeader>
            <Box>
               {subjects
                  ?.filter(SUBJECT_CATEGORIES.corePractices.filter)
                  .map((subject) => (
                     <FooterLink
                        key={subject.id}
                        to={`/products?subject_code=${subject.code}`}
                        onClick={() => handleSubjectClick?.(subject.code)}
                     >
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                           <Box sx={{ textWrap: "nowrap" }}>{subject.code}&nbsp;-&nbsp;</Box>
                           <Box sx={{ textWrap: "pretty" }}>{subject.description}</Box>
                        </Box>
                     </FooterLink>
                  ))}
            </Box>
         </Stack>
         <Stack sx={{ paddingBottom: 1 }}>
            <SectionHeader>
               {SUBJECT_CATEGORIES.specialistPrinciples.header}
            </SectionHeader>
            <Box>
               {subjects
                  ?.filter(SUBJECT_CATEGORIES.specialistPrinciples.filter)
                  .map((subject) => (
                     <FooterLink
                        key={subject.id}
                        to={`/products?subject_code=${subject.code}`}
                        onClick={() => handleSubjectClick?.(subject.code)}
                     >
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                           <Box sx={{ textWrap: "nowrap" }}>{subject.code}&nbsp;-&nbsp;</Box>
                           <Box sx={{ textWrap: "pretty" }}>{subject.description}</Box>
                        </Box>
                     </FooterLink>
                  ))}
            </Box>
         </Stack>
      </Box>
   </Box>
);

// Products Section
const ProductsSection = ({
   productGroups,
   handleProductGroupClick,
   handleSpecificProductClick,
}) => (
   <Box sx={{ textAlign: "left" }}>
      <MainSectionHeader>Products</MainSectionHeader>
      <Grid container spacing={2}>
         <Grid size={{ xs: 4 }}>
            <Stack>
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
            </Stack>
         </Grid>
         <Grid size={{ xs: 4 }}>
            <Stack>
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
            </Stack>
         </Grid>
         <Grid size={{ xs: 4 }}>
            <Stack>
               <SectionHeader>Marking Products</SectionHeader>
               {productGroups?.markingProducts?.map((product) => (
                  <FooterLink
                     key={product.id}
                     to={`/products/${product.id}`}
                     onClick={() => handleSpecificProductClick?.(product.id)}
                  >
                     {product.shortname}
                  </FooterLink>
               ))}
            </Stack>
         </Grid>

         <Grid size={{ xs: 12 }}>
            <SectionHeader>Tutorial</SectionHeader>
            <Grid container spacing={2}>
               <Grid size={{ xs: 8 }}>
                  <SectionSubHeader>Location</SectionSubHeader>
                  <Box
                     sx={{
                        columnCount: 3,
                     }}
                  >
                     {productGroups?.tutorialLocations?.map((product) => (
                        <FooterLink
                           key={product.id}
                           to={`/products/${product.id}`}
                           onClick={() =>
                              handleSpecificProductClick?.(product.id)
                           }
                        >
                           {product.shortname}
                        </FooterLink>
                     ))}
                  </Box>
               </Grid>
               <Grid size={{ xs: 4 }}>
                  <SectionSubHeader>Format</SectionSubHeader>
                  {productGroups?.tutorialFormats?.map((format) => (
                     <FooterLink
                        key={format.filter_type}
                        to={`/products?group=${format.group_name}`}
                        onClick={() =>
                           handleProductGroupClick?.(format.group_name)
                        }
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
   <Box sx={{ textAlign: "left" }}>
      <MainSectionHeader>Support</MainSectionHeader>
      <Stack spacing={0.1} alignItems="flex-start">
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
   <Stack direction="row" spacing={0.2} justifyContent="flex-start">
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
                  "&:hover": {
                     color: colorTheme.bpp.granite["000"],
                     backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
               }}
            >
               <IconComponent size={18} />
            </IconButton>
         );
      })}
   </Stack>
);

// Copyright Section
const CopyrightSection = () => (
   <Box>
      <Typography
         variant="caption2"
         sx={{ color: colorTheme.bpp.granite["030"] }}
      >
         Copyright &copy; 2026 BPP Actuarial Education - Part of the BPP
         Professional Education Group -{" "}
      </Typography>
      <Typography
         variant="caption2"
         component="a"
         href="mailto:acted@bpp.com"
         sx={{
            color: colorTheme.bpp.granite["030"],
            textDecoration: "none",
            "&:hover": {
               color: colorTheme.bpp.granite["000"],
               textDecoration: "underline",
            },
         }}
      >
         acted@bpp.com
      </Typography>
   </Box>
);

// Bottom Links Section
const BottomLinksSection = () => (
   <Stack
      direction="row"
      spacing={1}
      divider={
         <Typography
            variant="caption2"
            sx={{ color: colorTheme.bpp.granite["040"] }}
         >
            |
         </Typography>
      }
      justifyContent="flex-start"
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
   const theme = useTheme();
   // Local state for navigation data
   const [subjects, setSubjects] = useState([]);
   const [navbarProductGroups, setNavbarProductGroups] = useState([]);

   // Fetch navigation data on mount
   useEffect(() => {
      const fetchNavigationData = async () => {
         try {
            const data = await productService.getNavigationData();
            // Filter to only show active subjects (backend already filters, but this is a safety measure)
            const activeSubjects = (data.subjects || []).filter(
               (subject) => subject.active !== false
            );
            setSubjects(activeSubjects);
            setNavbarProductGroups(data.navbarProductGroups || []);
         } catch (error) {
            console.error("Error fetching footer navigation data:", error);
         }
      };
      fetchNavigationData();
   }, []);

   // Transform navbarProductGroups into productGroups structure for ProductsSection
   // navbarProductGroups is an array of group objects: { name: 'Group Name', products: [...] }
   const getProductsByGroupName = (groupName) => {
      const group = navbarProductGroups.find((g) => g.name === groupName);
      return group?.products || [];
   };

   const productGroups = {
      coreStudyMaterials: getProductsByGroupName("Core Study Materials"),
      revisionMaterials: getProductsByGroupName("Revision Materials"),
      markingProducts: [
         ...getProductsByGroupName("Marking"),
         ...getProductsByGroupName("Voucher"),
      ],
      tutorialLocations: getProductsByGroupName("Tutorial"),
      tutorialFormats: [
         {
            filter_type: "classroom",
            group_name: "Classroom",
            name: "Classroom",
         },
         { filter_type: "online", group_name: "Online", name: "Online" },
         {
            filter_type: "distance",
            group_name: "Distance Learning",
            name: "Distance Learning",
         },
      ],
   };

   // Handle navigating to product list with subject filter
   const handleSubjectClick = (subjectCode) => {
      dispatch(navSelectSubject(subjectCode));
      navigate("/products");
   };

   // Handle navigating to product list with product group filter
   const handleProductGroupClick = (groupName) => {
      dispatch(navSelectProductGroup(groupName));
      navigate("/products");
   };

   // Handle navigating to product list with specific product filter
   const handleSpecificProductClick = (productId) => {
      dispatch(navSelectProduct(productId));
      navigate("/products");
   };

   return (
      <Box
         component="footer"
         sx={{
            backgroundColor: theme.palette.bpp.granite["080"],
            pt: theme.liftkit.spacing.lg,
            px: theme.liftkit.spacing.xl,
         }}
      >
         <Grid container spacing={2}>
            {/* Top-Left: Main Content (Subjects, Products, Support) */}
            <Grid size={{ xs: 12, md: 10 }}>
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                     <SubjectsSection
                        subjects={subjects}
                        handleSubjectClick={handleSubjectClick}
                     />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                     <ProductsSection
                        productGroups={productGroups}
                        handleProductGroupClick={handleProductGroupClick}
                        handleSpecificProductClick={handleSpecificProductClick}
                     />
                  </Grid>
               </Grid>
            </Grid>

            {/* Top-Right: Support */}
            <Grid size={{ xs: 12, md: 2 }}>
               <SupportSection />
            </Grid>

            {/* Bottom Copyright */}
            <Grid
               size={{ xs: 12, md: 12 }}
               sx={{
                  justifyItems: "start",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
               }}
            >
               <SocialMediaSection />
               <CopyrightSection /> <BottomLinksSection />
            </Grid>
         </Grid>
      </Box>
   );
};

export default Footer;
