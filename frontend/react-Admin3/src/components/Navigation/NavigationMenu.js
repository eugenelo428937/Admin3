import React from "react";
import { Nav, NavDropdown, Row, Col } from "react-bootstrap";
import { Box, Button, Grid, MenuItem, MenuList } from '@mui/material';
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Typography, useTheme } from "@mui/material";
import MegaMenuPopover from './MegaMenuPopover';
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
   return (
      <Box
         component="nav"
         aria-label="Main navigation"
         sx={{
            display: { xs: 'none', md: 'flex' },
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', lg: 'space-evenly' },
            px: { md: 2, lg: 2 },
         }}
      >
         <Button
            component={NavLink}
            to="/home"
            sx={{
               color: theme.palette.offwhite?.['000'] || 'inherit',
               textTransform: 'none',
               mt: { xs: 0, lg: 1 },
               px: { xs: 2, xl: 4 },
               '&.active': {
                  fontWeight: 'bold',
               },
            }}
         >
            <Typography variant="navlink">Home</Typography>
         </Button>
         <NavDropdown
            title={
               <Typography
                  variant="navlink"
                  color={theme.palette.offwhite["000"]}
               >
                  Subjects
               </Typography>
            }
            menuVariant="light"
            renderMenuOnMount={true}
            align="start"
            style={{ position: "relative" }}
            className="mx-xl-2"
         >
            <div className="dropdown-submenu">
               <Row>
                  <Col xl={3}>
                     <div className="mb-2 text-primary heading">
                        Core Principles
                     </div>
                     {subjects &&
                        subjects
                           .filter((s) => /^(CB|CS|CM)/.test(s.code))
                           .map((subject) => (
                              <NavDropdown.Item
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 <span>
                                    {subject.code} - {subject.description}
                                 </span>
                              </NavDropdown.Item>
                           ))}
                  </Col>
                  <Col xl={3}>
                     <div className="fw-bolder mb-2 text-primary heading">
                        Core Practices
                     </div>
                     {subjects &&
                        subjects
                           .filter((s) => /^CP[1-3]$/.test(s.code))
                           .map((subject) => (
                              <NavDropdown.Item
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 <span>
                                    {subject.code} - {subject.description}
                                 </span>
                              </NavDropdown.Item>
                           ))}
                  </Col>
                  <Col xl={3}>
                     <div className="fw-bolder mb-2 text-primary heading">
                        Specialist Principles
                     </div>
                     {subjects &&
                        subjects
                           .filter((s) => /^SP/.test(s.code))
                           .map((subject) => (
                              <NavDropdown.Item
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 <span>
                                    {subject.code} - {subject.description}
                                 </span>
                              </NavDropdown.Item>
                           ))}
                  </Col>
                  <Col xl={3}>
                     <div className="fw-bolder mb-2 text-primary heading">
                        Specialist Advanced
                     </div>
                     {subjects &&
                        subjects
                           .filter((s) => /^SA/.test(s.code))
                           .map((subject) => (
                              <NavDropdown.Item
                                 key={subject.id}
                                 onClick={() => {
                                    handleSubjectClick(subject.code);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 <span>
                                    {subject.code} - {subject.description}
                                 </span>
                              </NavDropdown.Item>
                           ))}
                  </Col>
               </Row>
            </div>
         </NavDropdown>
         <NavDropdown
            title={
               <Typography
                  variant="navlink"
                  color={theme.palette.offwhite["000"]}
               >
                  Products
               </Typography>
            }
            menuVariant="light"
            renderMenuOnMount={true}
            align="start"
            style={{ position: "relative" }}
            className="mx-xl-2"
         >
            <div className="dropdown-submenu">
               <Row>
                  <NavDropdown.Item
                     to="/products"
                     onClick={() => {
                        handleProductClick();
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                     className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5"
                  >
                     <span className="title3">View All Products</span>
                  </NavDropdown.Item>
               </Row>
               <Row>
                  {loadingProductGroups ? (
                     <Col>
                        <div className="text-muted">Loading products...</div>
                     </Col>
                  ) : Array.isArray(navbarProductGroups) &&
                    navbarProductGroups.length > 0 ? (
                     navbarProductGroups.map((group) => {
                        // Special handling for Tutorial group - split into two columns
                        if (
                           group.name === "Tutorial" &&
                           group.products &&
                           group.products.length > 0
                        ) {
                           const midPoint = Math.ceil(
                              group.products.length / 2
                           );
                           const leftColumn = group.products.slice(0, midPoint);
                           const rightColumn = group.products.slice(midPoint);

                           return (
                              <React.Fragment key={group.id || group.name}>
                                 <Col lg={3}>
                                    <Row>
                                       <Col lg={6}>
                                          <NavDropdown.Item
                                             className="fw-bolder mb-2 text-primary"
                                             style={{
                                                cursor: "pointer",
                                             }}
                                             onClick={() => {
                                                handleProductGroupClick(
                                                   group.name
                                                );
                                                onCollapseNavbar &&
                                                   onCollapseNavbar();
                                             }}
                                          >
                                             {group.name}
                                          </NavDropdown.Item>
                                          {leftColumn.map((product) => (
                                             <NavDropdown.Item
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
                                             </NavDropdown.Item>
                                          ))}
                                       </Col>
                                       <Col lg={6}>
                                          <div className="fw-bolder mb-2 text-primary w-50">
                                             &nbsp;
                                          </div>
                                          {rightColumn.map((product) => (
                                             <NavDropdown.Item
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
                                             </NavDropdown.Item>
                                          ))}
                                       </Col>
                                    </Row>
                                 </Col>
                              </React.Fragment>
                           );
                        }

                        // Regular single column display for other groups
                        return (
                           <Col key={group.id || group.name}>
                              <NavDropdown.Item
                                 className="fw-bolder mb-2 text-primary"
                                 style={{ cursor: "pointer" }}
                                 onClick={() => {
                                    handleProductGroupClick(group.name);
                                    onCollapseNavbar && onCollapseNavbar();
                                 }}
                              >
                                 {group.name}
                              </NavDropdown.Item>
                              {group.products && group.products.length > 0 ? (
                                 group.products.map((product) => (
                                    <NavDropdown.Item
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
                                    </NavDropdown.Item>
                                 ))
                              ) : (
                                 <div className="text-muted small">
                                    No products available
                                 </div>
                              )}
                           </Col>
                        );
                     })
                  ) : (
                     <Col>
                        <div className="text-muted">No products available</div>
                     </Col>
                  )}
               </Row>
            </div>
         </NavDropdown>
         <NavDropdown
            title={
               <Typography
                  variant="navlink"
                  color={theme.palette.offwhite["000"]}
               >
                  Distance Learning
               </Typography>
            }
            menuVariant="light"
            renderMenuOnMount={true}
            align="start"
            style={{ position: "relative" }}
            className="mx-xl-2"
         >
            <div className="dropdown-submenu">
               <Row>
                  <NavDropdown.Item
                     to="/products?distance_learning=true"
                     onClick={() => {
                        // Navigation handled by NavLink 'to' prop
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                     className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5"
                  >
                     View All Distance Learning
                  </NavDropdown.Item>
               </Row>
               <Row>
                  {loadingDistanceLearning ? (
                     <Col>
                        <div className="text-muted">
                           Loading distance learning...
                        </div>
                     </Col>
                  ) : Array.isArray(distanceLearningData) &&
                    distanceLearningData.length > 0 ? (
                     distanceLearningData.map((group) => (
                        <Col key={group.id || group.name}>
                           <NavDropdown.Item
                              className="fw-bolder mb-2 text-primary"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                 handleProductGroupClick(group.name);
                                 onCollapseNavbar && onCollapseNavbar();
                              }}
                           >
                              {group.name}
                           </NavDropdown.Item>
                           {group.products && group.products.length > 0 ? (
                              group.products.map((product) => (
                                 <NavDropdown.Item
                                    key={product.id}
                                    onClick={() => {
                                       handleSpecificProductClick(product.id);
                                       onCollapseNavbar && onCollapseNavbar();
                                    }}
                                 >
                                    {product.shortname}
                                 </NavDropdown.Item>
                              ))
                           ) : (
                              <div className="text-muted small">
                                 No products available
                              </div>
                           )}
                        </Col>
                     ))
                  ) : (
                     <Col>
                        <div className="text-muted">
                           No distance learning products available
                        </div>
                     </Col>
                  )}
                  <Col>
                     <Nav.Link
                        as={NavLink}
                        to="/products?group=8"
                        onClick={(e) => {
                           handleMarkingVouchersClick(e);
                           onCollapseNavbar && onCollapseNavbar();
                        }}
                        className="navbar-marking-vouchers mx-xl-2"
                     >
                        <span className="title3">Marking Vouchers</span>
                     </Nav.Link>
                  </Col>
               </Row>
            </div>
         </NavDropdown>
         <MegaMenuPopover
            id="tutorials"
            label="Tutorials"
            width={900}
            onClose={onCollapseNavbar}
         >
            <Grid container spacing={2}>
               {/* View All Tutorials button */}
               <Grid item xs={12}>
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
                  <Grid item xs={12}>
                     <Typography color="text.secondary">Loading tutorials...</Typography>
                  </Grid>
               ) : tutorialData ? (
                  <>
                     {/* Location Column - Split into 2 sub-columns */}
                     <Grid item xs={12} sm={6}>
                        <Typography
                           variant="subtitle2"
                           color="primary"
                           sx={{ mb: 1, fontWeight: 'bold' }}
                           id="tutorial-location-heading"
                        >
                           Location
                        </Typography>
                        <Grid container>
                           <Grid item xs={6}>
                              <MenuList dense aria-labelledby="tutorial-location-heading">
                                 {tutorialData.Location?.left?.length > 0 ? (
                                    tutorialData.Location.left.map((product) => (
                                       <MenuItem
                                          key={product.id}
                                          onClick={() => {
                                             handleSpecificProductClick(product.id);
                                             onCollapseNavbar?.();
                                          }}
                                       >
                                          {product.shortname}
                                       </MenuItem>
                                    ))
                                 ) : (
                                    <Typography color="text.secondary" variant="body2">
                                       No locations
                                    </Typography>
                                 )}
                              </MenuList>
                           </Grid>
                           <Grid item xs={6}>
                              <MenuList dense>
                                 {tutorialData.Location?.right?.length > 0 &&
                                    tutorialData.Location.right.map((product) => (
                                       <MenuItem
                                          key={product.id}
                                          onClick={() => {
                                             handleSpecificProductClick(product.id);
                                             onCollapseNavbar?.();
                                          }}
                                       >
                                          {product.shortname}
                                       </MenuItem>
                                    ))}
                              </MenuList>
                           </Grid>
                        </Grid>
                     </Grid>
                     
                     {/* Format Column */}
                     <Grid item xs={12} sm={6}>
                        <Typography
                           variant="subtitle2"
                           color="primary"
                           sx={{ mb: 1, fontWeight: 'bold' }}
                           id="tutorial-format-heading"
                        >
                           Format
                        </Typography>
                        <MenuList dense aria-labelledby="tutorial-format-heading">
                           {tutorialData.Format?.length > 0 ? (
                              tutorialData.Format.map((format) => (
                                 <MenuItem
                                    key={format.filter_type}
                                    onClick={() => {
                                       handleProductGroupClick(format.group_name);
                                       onCollapseNavbar?.();
                                    }}
                                 >
                                    {format.name}
                                 </MenuItem>
                              ))
                           ) : (
                              <Typography color="text.secondary" variant="body2">
                                 No formats available
                              </Typography>
                           )}
                        </MenuList>
                     </Grid>
                  </>
               ) : (
                  <Grid item xs={12}>
                     <Typography color="text.secondary">No tutorial data available</Typography>
                  </Grid>
               )}
            </Grid>
         </MegaMenuPopover>

         {isApprentice ? (
            <Nav.Link
               as={NavLink}
               href="#home"
               disabled={!isApprentice}
               // className="text-muted mx-xl-2"
            >
               <Typography
                  variant="navlink"
                  color={theme.palette.offwhite["000"]}
               >
                  Apprenticeships
               </Typography>
            </Nav.Link>
         ) : null}
         {isStudyPlus ? (
            <Nav.Link
               as={NavLink}
               href="#home"
               disabled={!isStudyPlus}
               className="text-muted mx-xl-2"
            >
               <Typography
                  variant="navlink"
                  color={theme.palette.offwhite["000"]}
               >
                  Study Plus
               </Typography>
            </Nav.Link>
         ) : null}
         {isSuperuser ? (
            <NavDropdown
               title={
                  <Typography
                     variant="navlink"
                     color={theme.palette.offwhite["000"]}
                  >
                     Admin
                  </Typography>
               }
               id="admin-nav-dropdown"
               className="mx-xl-2"
            >
               <NavDropdown.Item
                  as={NavLink}
                  to="admin/exam-sessions"
                  onClick={() => onCollapseNavbar && onCollapseNavbar()}
               >
                  <span className="title3">Exam Sessions</span>
               </NavDropdown.Item>
               <NavDropdown.Item
                  as={NavLink}
                  to="admin/subjects"
                  onClick={() => onCollapseNavbar && onCollapseNavbar()}
               >
                  <span className="title3">Subjects</span>
               </NavDropdown.Item>
               <NavDropdown.Item
                  as={NavLink}
                  to="admin/products"
                  onClick={() => onCollapseNavbar && onCollapseNavbar()}
               >
                  <span className="title3">Products</span>
               </NavDropdown.Item>
            </NavDropdown>
         ) : null}
      </Box>
   );
};

export default NavigationMenu;
