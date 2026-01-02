import React from "react";
import {
   Box,
   Button,
   Grid,
   MenuItem,
   MenuList,
   Menu,
   Typography,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "@mui/material";
import MegaMenuPopover from "./MegaMenuPopover";

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
}) => {
   const { isSuperuser, isApprentice, isStudyPlus } = useAuth();
   const theme = useTheme();

   // Admin menu state
   const [adminAnchorEl, setAdminAnchorEl] = React.useState(null);
   const adminMenuOpen = Boolean(adminAnchorEl);

   const handleAdminClick = (event) => {
      setAdminAnchorEl(event.currentTarget);
   };

   const handleAdminClose = () => {
      setAdminAnchorEl(null);
   };

   return (
      <Box
         component="nav"
         aria-label="Main navigation"
         sx={{
            display: { xs: "none", md: "flex" },
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: { xs: "flex-start", lg: "space-evenly" },
         }}
      >
         <Button component={NavLink} to="/home">
            <Typography variant="navlink">Home</Typography>
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
               <Grid size={{ xs: 12, md: 3, xl: 2 }}>
                  <Typography variant="navlink" id="core-principles-heading">
                     Core Principles
                  </Typography>
                  <MenuList variant="navmenu" dense aria-labelledby="core-principles-heading">
                     {subjects &&
                        subjects
                           .filter((s) => /^(CB|CS|CM)/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="navmenu"
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {subject.code} - {subject.description}
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
               <Grid size={{ xs: 12, md: 3, xl: 2 }}>
                  <Typography variant="navlink" id="core-practices-heading">
                     Core Practices
                  </Typography>
                  <MenuList variant="navmenu" dense aria-labelledby="core-practices-heading">
                     {subjects &&
                        subjects
                           .filter((s) => /^CP[1-3]$/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="navmenu"
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {subject.code} - {subject.description}
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
               <Grid size={{ xs: 12, md: 3, xl: 2 }}>
                  <Typography
                     variant="navlink"
                     id="specialist-principles-heading"
                  >
                     Specialist Principles
                  </Typography>
                  <MenuList
                     variant="navmenu"
                     dense
                     aria-labelledby="specialist-principles-heading"
                  >
                     {subjects &&
                        subjects
                           .filter((s) => /^SP/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="navmenu"
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {subject.code} - {subject.description}
                              </MenuItem>
                           ))}
                  </MenuList>
               </Grid>
               <Grid size={{ xs: 12, md: 3, xl: 2 }}>
                  <Typography
                     variant="navlink"
                     id="specialist-advanced-heading"
                  >
                     Specialist Advanced
                  </Typography>
                  <MenuList variant="navmenu" dense aria-labelledby="specialist-advanced-heading">
                     {subjects &&
                        subjects
                           .filter((s) => /^SA/.test(s.code))
                           .map((subject) => (
                              <MenuItem
                                 variant="navmenu"
                                 key={subject.id}
                                 onClick={() => {
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
            <Grid container spacing={2}>
               <Grid size={12}>
                  <Button
                     variant="outlined"                     
                     onClick={() => {
                        handleProductClick();
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                     sx={{ mb: 2 }}
                  >
                     View All Products
                  </Button>
               </Grid>
               {loadingProductGroups ? (
                  <Grid size={12}>
                     <Typography color="text.secondary">
                        Loading products...
                     </Typography>
                  </Grid>
               ) : Array.isArray(navbarProductGroups) &&
                 navbarProductGroups.length > 0 ? (
                  navbarProductGroups.map((group) => {
                     // Special handling for Tutorial group - split into two columns
                     if (
                        group.name === "Tutorial" &&
                        group.products &&
                        group.products.length > 0
                     ) {
                        const midPoint = Math.ceil(group.products.length / 2);
                        const leftColumn = group.products.slice(0, midPoint);
                        const rightColumn = group.products.slice(midPoint);

                        return (
                           <Grid
                              key={group.id || group.name}
                              size={{xs: 12, md: 3, xl: 2}}
                           >
                              <Grid container spacing={1}>
                                 <Grid size={6}>
                                    <Typography
                                       variant="navlink"
                                       sx={{
                                          mb: 1,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                       }}
                                       onClick={() => {
                                          handleProductGroupClick(group.name);
                                          onCollapseNavbar &&
                                             onCollapseNavbar();
                                       }}
                                    >
                                       {group.name}
                                    </Typography>
                                    <MenuList variant="navmenu" dense>
                                       {leftColumn.map((product) => (
                                          <MenuItem
                                             variant="navmenu"
                                             key={product.id}
                                             onClick={() => {
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
                                    <MenuList variant="navmenu" dense>
                                       {rightColumn.map((product) => (
                                          <MenuItem
                                             variant="navmenu"
                                             key={product.id}
                                             onClick={() => {
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
                           size={{xs: 12, md: 3, xl: 2}}
                        >
                           <Typography
                              variant="navlink"                              
                              sx={{
                                 mb: 1,                                 
                                 cursor: "pointer",
                              }}
                              onClick={() => {
                                 handleProductGroupClick(group.name);
                                 onCollapseNavbar && onCollapseNavbar();
                              }}
                           >
                              {group.name}
                           </Typography>
                           {group.products && group.products.length > 0 ? (
                              <MenuList variant="navmenu" dense>
                                 {group.products.map((product) => (
                                    <MenuItem
                                       variant="navmenu"
                                       key={product.id}
                                       onClick={() => {
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
                           ) : (
                              <Typography
                                 color="text.secondary"
                                 variant="body2"
                              >
                                 No products available
                              </Typography>
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
            <Grid container spacing={2}>
               <Grid size={12}>
                  <Button
                     variant="outlined"
                     color="primary"
                     component={NavLink}
                     to="/products?distance_learning=true"
                     onClick={() => {
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                     sx={{ mb: 2 }}
                  >
                     View All Distance Learning
                  </Button>
               </Grid>
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
                        size={{ xs: 12, md: 3, xl: 2 }}
                     >
                        <Typography
                           variant="navlink"                           
                           sx={{ mb: 1, cursor: "pointer" }}
                           onClick={() => {
                              handleProductGroupClick(group.name);
                              onCollapseNavbar && onCollapseNavbar();
                           }}
                        >
                           {group.name}
                        </Typography>
                        {group.products && group.products.length > 0 ? (
                           <MenuList variant="navmenu" dense>
                              {group.products.map((product) => (
                                 <MenuItem
                                    variant="navmenu"
                                    key={product.id}
                                    onClick={() => {
                                       handleSpecificProductClick(product.id);
                                       onCollapseNavbar && onCollapseNavbar();
                                    }}
                                 >
                                    {product.shortname}
                                 </MenuItem>
                              ))}
                           </MenuList>
                        ) : (
                           <Typography color="text.secondary" variant="body2">
                              No products available
                           </Typography>
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
               <Grid size={{xs: 12, md: 3, xl: 2}}>
                  <Button
                     component={NavLink}
                     to="/products?group=8"
                     onClick={(e) => {
                        handleMarkingVouchersClick(e);
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                     className="navbar-marking-vouchers"
                     sx={{
                        textTransform: "none",
                        mx: { xl: 2 },
                     }}
                  >
                     <Typography variant="navlink">Marking Vouchers</Typography>
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
               {/* View All Tutorials button */}
               <Grid size={12}>
                  <Button
                     variant="outlined"
                     color="primary"
                     component={NavLink}
                     to="/products?tutorial=true"
                     onClick={() => onCollapseNavbar?.()}
                     sx={{ mb: 2 }}
                  >
                     View All Tutorials
                  </Button>
               </Grid>

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
                     <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography
                           variant="navlink"                           
                           sx={{ mb: 1, fontWeight: "bold" }}
                           id="tutorial-location-heading"
                        >
                           Location
                        </Typography>
                        <Grid container>
                           <Grid size={6}>
                              <MenuList
                                 variant="navmenu"
                                 dense
                                 aria-labelledby="tutorial-location-heading"
                              >
                                 {tutorialData.Location?.left?.length > 0 ? (
                                    tutorialData.Location.left.map(
                                       (product) => (
                                          <MenuItem
                                             variant="navmenu"
                                             key={product.id}
                                             onClick={() => {
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
                              <MenuList variant="navmenu" dense>
                                 {tutorialData.Location?.right?.length > 0 &&
                                    tutorialData.Location.right.map(
                                       (product) => (
                                          <MenuItem
                                             variant="navmenu"
                                             key={product.id}
                                             onClick={() => {
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
                     <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography
                           variant="navlink"                           
                           sx={{ mb: 1, fontWeight: "bold" }}
                           id="tutorial-format-heading"
                        >
                           Format
                        </Typography>
                        <MenuList
                           variant="navmenu"
                           dense
                           aria-labelledby="tutorial-format-heading"
                        >
                           {tutorialData.Format?.length > 0 ? (
                              tutorialData.Format.map((format) => (
                                 <MenuItem
                                    variant="navmenu"
                                    key={format.filter_type}
                                    onClick={() => {
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
            </Grid>
         </MegaMenuPopover>

         {/* Conditional sections */}
         {isApprentice ? (
            <Button
               component={NavLink}
               to="/apprenticeships"
               sx={{
                  color: theme.palette.offwhite?.["000"] || "inherit",
                  textTransform: "none",
                  mx: { xl: 2 },
               }}
            >
               <Typography variant="navlink">Apprenticeships</Typography>
            </Button>
         ) : null}

         {isStudyPlus ? (
            <Button
               component={NavLink}
               to="/study-plus"
               sx={{
                  color: theme.palette.offwhite?.["000"] || "inherit",
                  textTransform: "none",
                  mx: { xl: 2 },
               }}
            >
               <Typography variant="navlink">Study Plus</Typography>
            </Button>
         ) : null}

         {/* Admin Menu */}
         {isSuperuser ? (
            <>
               <Button
                  id="admin-menu-button"
                  aria-controls={adminMenuOpen ? "admin-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={adminMenuOpen ? "true" : undefined}
                  onClick={handleAdminClick}
                  sx={{
                     color: theme.palette.offwhite?.["000"] || "inherit",
                     textTransform: "none",
                     mx: { xl: 2 },
                  }}
               >
                  <Typography variant="navlink">Admin</Typography>
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
                     onClick={() => {
                        handleAdminClose();
                        onCollapseNavbar?.();
                     }}
                  >
                     Exam Sessions
                  </MenuItem>
                  <MenuItem
                     component={NavLink}
                     to="admin/subjects"
                     onClick={() => {
                        handleAdminClose();
                        onCollapseNavbar?.();
                     }}
                  >
                     Subjects
                  </MenuItem>
                  <MenuItem
                     component={NavLink}
                     to="admin/products"
                     onClick={() => {
                        handleAdminClose();
                        onCollapseNavbar?.();
                     }}
                  >
                     Products
                  </MenuItem>
               </Menu>
            </>
         ) : null}
      </Box>
   );
};

export default NavigationMenu;
