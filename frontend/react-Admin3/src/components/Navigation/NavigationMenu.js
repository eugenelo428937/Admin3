import React from "react";
import { Nav, NavDropdown, Row, Col } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Typography, useTheme } from "@mui/material";
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
      <Nav className="navbar-nav px-md-2 px-lg-2 flex-wrap d-none d-md-flex align-items-center justify-content-lg-evenly justify-content-xs-start" >
         <Nav.Link as={NavLink} to="/home" className="mt-0 mt-lg-1">
            <Typography variant="navlink" color={theme.palette.offwhite["000"]} className="px-2 px-xl-4">
               Home
            </Typography>
         </Nav.Link>
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
                        onClick={handleMarkingVouchersClick}
                        className="navbar-marking-vouchers mx-xl-2"
                     >
                        <span className="title3">Marking Vouchers</span>
                     </Nav.Link>
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
                  Tutorials
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
                     to="/products?tutorial=true"
                     onClick={() => {
                        // Navigation handled by NavLink 'to' prop
                        onCollapseNavbar && onCollapseNavbar();
                     }}
                     className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5"
                  >
                     View All Tutorials
                  </NavDropdown.Item>
               </Row>
               <Row>
                  {loadingTutorial ? (
                     <Col>
                        <div className="text-muted">Loading tutorials...</div>
                     </Col>
                  ) : tutorialData ? (
                     <>
                        {/* Location Column - Split into 2 sub-columns */}
                        <Col>
                           <div className="fw-bolder mb-2 text-primary">
                              Location
                           </div>
                           <div className="row">
                              <div className="col-6">
                                 {tutorialData.Location &&
                                 tutorialData.Location.left &&
                                 tutorialData.Location.left.length > 0 ? (
                                    tutorialData.Location.left.map(
                                       (product) => (
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
                                       )
                                    )
                                 ) : (
                                    <div className="text-muted small">
                                       No locations
                                    </div>
                                 )}
                              </div>
                              <div className="col-6">
                                 {tutorialData.Location &&
                                 tutorialData.Location.right &&
                                 tutorialData.Location.right.length > 0
                                    ? tutorialData.Location.right.map(
                                         (product) => (
                                            <NavDropdown.Item
                                               key={product.id}
                                               onClick={() =>
                                                  handleSpecificProductClick(
                                                     product.id
                                                  )
                                               }
                                            >
                                               {product.shortname}
                                            </NavDropdown.Item>
                                         )
                                      )
                                    : null}
                              </div>
                           </div>
                        </Col>
                        {/* Format Column - Filter links from acted_filter_group where parent='Tutorial' */}
                        <Col>
                           <div className="fw-bolder mb-2 text-primary">
                              Format
                           </div>
                           {tutorialData.Format &&
                           tutorialData.Format.length > 0 ? (
                              tutorialData.Format.map((format) => (
                                 <NavDropdown.Item
                                    key={format.filter_type}
                                    onClick={() => {
                                       handleProductGroupClick(
                                          format.group_name
                                       );
                                       onCollapseNavbar && onCollapseNavbar();
                                    }}
                                 >
                                    {format.name}
                                 </NavDropdown.Item>
                              ))
                           ) : (
                              <div className="text-muted small">
                                 No formats available
                              </div>
                           )}
                        </Col>
                     </>
                  ) : (
                     <Col>
                        <div className="text-muted">
                           No tutorial data available
                        </div>
                     </Col>
                  )}
               </Row>
            </div>
         </NavDropdown>

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
      </Nav>
   );
};

export default NavigationMenu;
