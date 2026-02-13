import React from "react";
import
   {
      Box,
      Button,
      Container,
      Grid,
      MenuItem,
      MenuList,
      Menu,
      Typography,
      useTheme
   } from "@mui/material";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import MegaMenuPopover from "./MegaMenuPopover";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const NavigationMenu = ({
   subjects,
   navbarProductGroups,
   distanceLearningData,
   tutorialData,
   loadingProductGroups,
   loadingDistanceLearning,
   loadingTutorial,
   handleSubjectClick,
   handleProductClick,
   handleProductGroupClick,
   handleSpecificProductClick,
   handleProductVariationClick,
   handleMarkingVouchersClick,
   onCollapseNavbar,
}) =>
{
   const theme = useTheme();
   const { isSuperuser, isApprentice, isStudyPlus } = useAuth();

   // Admin menu state
   const [adminAnchorEl, setAdminAnchorEl] = React.useState(null);
   const adminMenuOpen = Boolean(adminAnchorEl);

   const handleAdminClick = (event) =>
   {
      setAdminAnchorEl(event.currentTarget);
   };

   const handleAdminClose = () =>
   {
      setAdminAnchorEl(null);
   };

   return (
      <Container
         component="nav"
         aria-label="Main navigation"
         disableGutters
         sx={{
            display: { xs: "none", md: "flex" },
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: { xs: "flex-start"},
            width: 'auto',
            gap: theme.gaps?.compact ?? '0.5rem',
         }}
      >
         <Button component={NavLink} to="/home">
            <Typography variant="main_nav_link">Home</Typography>
         </Button>

         {/* Subjects Menu */}
         <MegaMenuPopover
            id="subjects"
            label="Subjects"
            onClose={onCollapseNavbar}
            buttonProps={{
               sx: { mx: { xl: 2 } },
            }}
         >
            <Grid container spacing={1}>
               <Grid size={{ xs: 12, md: 6, xl: 3, xxl: 2 }}>
                  <Typography variant="mega-nav-heading" id="core-principles-heading">
                     Core Principles
                  </Typography>
                  <MenuList
                     variant="nav_menu"
                     dense
                     aria-labelledby="core-principles-heading"
                  >
                     {subjects &&
                        subjects
                           .filter((s) => /^(CB|CS|CM)/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="nav_menu"
                                 key={subject.id}
                                 onClick={() =>
                                 {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 <Typography variant="mega_nav_link">{subject.code} - {subject.description}</Typography>
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
               <Grid size={{ xs: 12, md: 6, xl: 3, xxl: 2 }}>
                  <Typography variant="mega-nav-heading" id="core-practices-heading">
                     Core Practices
                  </Typography>
                  <MenuList
                     variant="nav_menu"
                     dense
                     aria-labelledby="core-practices-heading"
                  >
                     {subjects &&
                        subjects
                           .filter((s) => /^CP[1-3]$/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="nav_menu"
                                 key={subject.id}
                                 onClick={() =>
                                 {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {subject.code} - {subject.description}
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
               <Grid size={{ xs: 12, md: 6, xl: 3, xxl: 2 }}>
                  <Typography
                     variant="mega-nav-heading"
                     id="specialist-principles-heading"
                  >
                     Specialist Principles
                  </Typography>
                  <MenuList
                     variant="nav_menu"
                     dense
                     aria-labelledby="specialist-principles-heading"
                  >
                     {subjects &&
                        subjects
                           .filter((s) => /^SP/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="nav_menu"
                                 key={subject.id}
                                 onClick={() =>
                                 {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {subject.code} - {subject.description}
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
               <Grid size={{ xs: 12, md: 6, xl: 3, xxl: 2 }}>
                  <Typography
                     variant="mega-nav-heading"
                     id="specialist-advanced-heading"
                  >
                     Specialist Advanced
                  </Typography>
                  <MenuList
                     variant="nav_menu"
                     dense
                     aria-labelledby="specialist-advanced-heading"
                  >
                     {subjects &&
                        subjects
                           .filter((s) => /^SA/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="nav_menu"
                                 key={subject.id}
                                 onClick={() =>
                                 {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {subject.code} - {subject.description}
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
            </Grid>
         </MegaMenuPopover>

         {/* Products Menu */}
         <MegaMenuPopover
            id="products"
            label="Products"
            onClose={onCollapseNavbar}
            buttonProps={{
               sx: { mx: { xl: 2 } },
            }}
         >
            <Grid container spacing={2} columns={10}>
               {loadingProductGroups ? (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        Loading products...
                     </Typography>
                  </Grid>
               ) : Array.isArray(navbarProductGroups) &&
                  navbarProductGroups.length > 0 ? (
                  navbarProductGroups.map((group) =>
                  {
                     // Special handling for Tutorial group - split into two columns
                     if (
                        group.name === "Tutorial" &&
                        group.products &&
                        group.products.length > 0
                     )
                     {
                        const midPoint = Math.ceil(group.products.length / 2);
                        const leftColumn = group.products.slice(0, midPoint);
                        const rightColumn = group.products.slice(midPoint);

                        return (
                           <Grid
                              key={group.id || group.name}
                              size={{ xs: 12, md: 2, xl: 2 }}
                           >
                              <Grid container spacing={1}>
                                 <Grid size={6}>
                                    <Typography
                                       variant="mega-nav-heading"
                                       sx={{ mb: 1 }}
                                       onClick={() =>
                                       {
                                          handleProductGroupClick(group.name);
                                          onCollapseNavbar &&
                                             onCollapseNavbar();
                                       }}
                                    >
                                       {group.name}
                                    </Typography>
                                    <MenuList variant="nav_menu" dense>
                                       {leftColumn.map((product) => (
                                          <MenuItem
                                             variant="nav_menu"
                                             key={product.id}
                                             onClick={() =>
                                             {
                                                handleSpecificProductClick(
                                                   product.id
                                                );
                                                onCollapseNavbar &&
                                                   onCollapseNavbar();
                                             }}
                                          >
                                             {product.shortname}
                                          </MenuItem>
                                       ))}
                                    </MenuList>
                                 </Grid>
                                 <Grid size={6}>
                                    <Typography
                                       variant="subtitle2"
                                       sx={{ mb: 1, visibility: "hidden" }}
                                    >
                                       &nbsp;
                                    </Typography>
                                    <MenuList variant="nav_menu" dense>
                                       {rightColumn.map((product) => (
                                          <MenuItem
                                             variant="nav_menu"
                                             key={product.id}
                                             onClick={() =>
                                             {
                                                handleSpecificProductClick(
                                                   product.id
                                                );
                                                onCollapseNavbar &&
                                                   onCollapseNavbar();
                                             }}
                                          >
                                             {product.shortname}
                                          </MenuItem>
                                       ))}
                                    </MenuList>
                                 </Grid>
                              </Grid>
                           </Grid>
                        );
                     }

                     // Regular single column display for other groups
                     return (
                        <Grid
                           key={group.id || group.name}
                           size={{ xs: 12, md: 2, xl: 2 }}
                        >
                           <Typography
                              variant="mega-nav-heading"
                              sx={{
                                 mb: 1,
                                 cursor: "pointer",
                              }}
                              onClick={() =>
                              {
                                 handleProductGroupClick(group.name);
                                 onCollapseNavbar && onCollapseNavbar();
                              }}
                           >
                              {group.name}
                           </Typography>
                           {group.products && group.products.length > 0 ? (
                              <MenuList variant="nav_menu" dense>
                                 {group.products.map((product) => (
                                    <MenuItem
                                       variant="nav_menu"
                                       key={product.id}
                                       onClick={() =>
                                       {
                                          handleSpecificProductClick(
                                             product.id
                                          );
                                          onCollapseNavbar &&
                                             onCollapseNavbar();
                                       }}
                                    >
                                       {product.shortname}
                                    </MenuItem>
                                 ))}
                                 {/* Add Marking Vouchers link under Marking group */}
                                 {group.name === "Marking" && (
                                    <MenuItem
                                       variant="nav_menu"
                                       component={NavLink}
                                       to="/products?group=8"
                                       onClick={(e) =>
                                       {
                                          handleMarkingVouchersClick(e);
                                          onCollapseNavbar && onCollapseNavbar();
                                       }}
                                    >
                                       Marking Vouchers
                                    </MenuItem>
                                 )}
                              </MenuList>
                           ) : (
                              /* If Marking group has no products, still show Marking Vouchers */
                              group.name === "Marking" ? (
                                 <MenuList variant="nav_menu" dense>
                                    <MenuItem
                                       variant="nav_menu"
                                       component={NavLink}
                                       to="/products?group=8"
                                       onClick={(e) =>
                                       {
                                          handleMarkingVouchersClick(e);
                                          onCollapseNavbar && onCollapseNavbar();
                                       }}
                                    >
                                       Marking Vouchers
                                    </MenuItem>
                                 </MenuList>
                              ) : (
                                 <Typography
                                    color="text.secondary"
                                    variant="body2"
                                 >
                                    No products available
                                 </Typography>
                              )
                           )}
                        </Grid>
                     );
                  })
               ) : (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        No products available
                     </Typography>
                  </Grid>
               )}
               <Grid size={{ xs: 12, md: 2, xl: 2 }}>
                  <Button
                     variant="navViewAll"
                     onClick={() =>
                     {
                        handleProductClick();
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                  >
                     <Typography variant="navViewAllText">View All Products</Typography>
                     <NavigateNextIcon />
                  </Button>
               </Grid>
            </Grid>
         </MegaMenuPopover>

         {/* Distance Learning Menu */}
         <MegaMenuPopover
            id="distance-learning"
            label="Distance Learning"
            onClose={onCollapseNavbar}
            buttonProps={{
               sx: { mx: { xl: 2 } },
            }}
         >
            <Grid container spacing={2} columns={10}>
               {loadingDistanceLearning ? (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        Loading distance learning...
                     </Typography>
                  </Grid>
               ) : Array.isArray(distanceLearningData) &&
                  distanceLearningData.length > 0 ? (
                  distanceLearningData.map((group) => (
                     <Grid
                        key={group.id || group.name}
                        size={{ xs: 12, md: 2, xl: 2 }}
                     >
                        <Typography
                           variant="mega-nav-heading"
                           sx={{ mb: 1, cursor: "pointer" }}
                           onClick={() =>
                           {
                              handleProductGroupClick(group.name);
                              onCollapseNavbar && onCollapseNavbar();
                           }}
                        >
                           {group.name}
                        </Typography>
                        {group.products && group.products.length > 0 ? (
                           <MenuList variant="nav_menu" dense>
                              {group.products.map((product) => (
                                 <MenuItem
                                    variant="nav_menu"
                                    key={product.id}
                                    onClick={() =>
                                    {
                                       handleSpecificProductClick(product.id);
                                       onCollapseNavbar && onCollapseNavbar();
                                    }}
                                 >
                                    {product.shortname}
                                 </MenuItem>
                              ))}
                              {/* Add Marking Vouchers link under Marking group */}
                              {group.name === "Marking" && (
                                 <MenuItem
                                    variant="nav_menu"
                                    component={NavLink}
                                    to="/products?group=8"
                                    onClick={(e) =>
                                    {
                                       handleMarkingVouchersClick(e);
                                       onCollapseNavbar && onCollapseNavbar();
                                    }}
                                 >
                                    Marking Vouchers
                                 </MenuItem>
                              )}
                           </MenuList>
                        ) : (
                           /* If Marking group has no products, still show Marking Vouchers */
                           group.name === "Marking" ? (
                              <MenuList variant="nav_menu" dense>
                                 <MenuItem
                                    variant="nav_menu"
                                    component={NavLink}
                                    to="/products?group=8"
                                    onClick={(e) =>
                                    {
                                       handleMarkingVouchersClick(e);
                                       onCollapseNavbar && onCollapseNavbar();
                                    }}
                                 >
                                    Marking Vouchers
                                 </MenuItem>
                              </MenuList>
                           ) : (
                              <Typography color="text.secondary" variant="body2">
                                 No products available
                              </Typography>
                           )
                        )}
                     </Grid>
                  ))
               ) : (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        No distance learning products available
                     </Typography>
                  </Grid>
               )}
               <Grid size={{ xs: 12, md: 3, xl: 2 }}>
                  <Button
                     variant="navViewAll"
                     component={NavLink}
                     to="/products?distance_learning=true"
                     onClick={() =>
                     {
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                  >
                     <Typography variant="navViewAllText">View All Distance Learning</Typography>
                     <NavigateNextIcon />
                  </Button>
               </Grid>
            </Grid>
         </MegaMenuPopover>

         {/* Tutorials Menu */}
         <MegaMenuPopover
            id="tutorials"
            label="Tutorials"
            width={900}
            onClose={onCollapseNavbar}
         >
            <Grid container spacing={2}>
               {/* Tutorial content */}
               {loadingTutorial ? (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        Loading tutorials...
                     </Typography>
                  </Grid>
               ) : tutorialData ? (
                  <>
                     {/* Location Column - Split into 2 sub-columns */}
                     <Grid size={{ xs: 12, md: 4 }}>
                        <Typography
                           variant="mega-nav-heading"
                           sx={{ mb: 1, fontWeight: "bold" }}
                           id="tutorial-location-heading"
                        >
                           Location
                        </Typography>
                        <Grid container>
                           <Grid size={6}>
                              <MenuList
                                 variant="nav_menu"
                                 dense
                                 aria-labelledby="tutorial-location-heading"
                              >
                                 {tutorialData.Location?.left?.length > 0 ? (
                                    tutorialData.Location.left.map(
                                       (product) => (
                                          <MenuItem
                                             variant="nav_menu"
                                             key={product.id}
                                             onClick={() =>
                                             {
                                                handleSpecificProductClick(
                                                   product.id
                                                );
                                                onCollapseNavbar?.();
                                             }}
                                          >
                                             {product.shortname}
                                          </MenuItem>
                                       )
                                    )
                                 ) : (
                                    <Typography
                                       color="text.secondary"
                                       variant="body2"
                                    >
                                       No locations
                                    </Typography>
                                 )}
                              </MenuList>
                           </Grid>
                           <Grid size={6}>
                              <MenuList variant="nav_menu" dense>
                                 {tutorialData.Location?.right?.length > 0 &&
                                    tutorialData.Location.right.map(
                                       (product) => (
                                          <MenuItem
                                             variant="nav_menu"
                                             key={product.id}
                                             onClick={() =>
                                             {
                                                handleSpecificProductClick(
                                                   product.id
                                                );
                                                onCollapseNavbar?.();
                                             }}
                                          >
                                             {product.shortname}
                                          </MenuItem>
                                       )
                                    )}
                              </MenuList>
                           </Grid>
                        </Grid>
                     </Grid>

                     {/* Format Column */}
                     <Grid size={{ xs: 12, md: 4 }}>
                        <Typography
                           variant="meganavheading"
                           sx={{ mb: 1, fontWeight: "bold" }}
                           id="tutorial-format-heading"
                        >
                           Format
                        </Typography>
                        <MenuList
                           variant="nav_menu"
                           dense
                           aria-labelledby="tutorial-format-heading"
                        >
                           {tutorialData.Format?.length > 0 ? (
                              tutorialData.Format.map((format) => (
                                 <MenuItem
                                    variant="nav_menu"
                                    key={format.filter_type}
                                    onClick={() =>
                                    {
                                       handleProductGroupClick(
                                          format.group_name
                                       );
                                       onCollapseNavbar?.();
                                    }}
                                 >
                                    {format.name}
                                 </MenuItem>
                              ))
                           ) : (
                              <Typography
                                 color="text.secondary"
                                 variant="body2"
                              >
                                 No formats available
                              </Typography>
                           )}
                        </MenuList>
                     </Grid>
                  </>
               ) : (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        No tutorial data available
                     </Typography>
                  </Grid>
               )}
               {/* View All Tutorials button */}
               <Grid size={{ xs: 12, md: 4 }}>
                  <Button
                     variant="navViewAll"
                     component={NavLink}
                     to="/products?tutorial=true"
                     onClick={() => onCollapseNavbar?.()}
                     sx={{ mb: 2 }}
                  >
                     <Typography variant="navViewAllText">View All Tutorials</Typography>
                     <NavigateNextIcon />
                  </Button>
               </Grid>
            </Grid>
         </MegaMenuPopover>

         {/* Conditional sections */}
         {isApprentice ? (
            <Button
               variant="navPrimary"
               component={NavLink}
               to="/apprenticeships"
               sx={{ mx: { xl: 2 } }}
            >
               <Typography variant="mega-nav-heading">Apprenticeships</Typography>
            </Button>
         ) : null}

         {isStudyPlus ? (
            <Button
               variant="navPrimary"
               component={NavLink}
               to="/study-plus"
               sx={{ mx: { xl: 2 } }}
            >
               <Typography variant="mega-nav-heading">Study Plus</Typography>
            </Button>
         ) : null}

         {/* Admin Menu */}
         {isSuperuser ? (
            <>
               <Button
                  variant="navPrimary"
                  id="admin-menu-button"
                  aria-controls={adminMenuOpen ? "admin-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={adminMenuOpen ? "true" : undefined}
                  onClick={handleAdminClick}
                  sx={{ mx: { xl: 2 } }}
               >
                  <Typography variant="mega-nav-heading">Admin</Typography>
               </Button>
               <Menu
                  id="admin-menu"
                  anchorEl={adminAnchorEl}
                  open={adminMenuOpen}
                  onClose={handleAdminClose}
                  MenuListProps={{
                     "aria-labelledby": "admin-menu-button",
                  }}
               >
                  <MenuItem
                     component={NavLink}
                     to="admin/exam-sessions"
                     onClick={() =>
                     {
                        handleAdminClose();
                        onCollapseNavbar?.();
                     }}
                  >
                     Exam Sessions
                  </MenuItem>
                  <MenuItem
                     component={NavLink}
                     to="admin/subjects"
                     onClick={() =>
                     {
                        handleAdminClose();
                        onCollapseNavbar?.();
                     }}
                  >
                     Subjects
                  </MenuItem>
                  <MenuItem
                     component={NavLink}
                     to="admin/products"
                     onClick={() =>
                     {
                        handleAdminClose();
                        onCollapseNavbar?.();
                     }}
                  >
                     Products
                  </MenuItem>
               </Menu>
            </>
         ) : null}
      </Container>
   );
};

export default NavigationMenu;
