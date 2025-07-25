import React from 'react';
import { Nav, NavDropdown, Row, Col } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Typography } from '@mui/material';
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
  handleTutorialFormatClick
}) => {
  const { isSuperuser, isApprentice, isStudyPlus } = useAuth();

  return (
		<Nav className="navbar-nav px-md-2 px-lg-2 flex-wrap d-none d-md-flex">
			<Nav.Link as={NavLink} to="/home">
				<span className="title3 m-left__sm m-right__sm">Home</span>
			</Nav.Link>
			<NavDropdown
				title={<span className="title3">Subjects</span>}
				menuVariant="light"
				renderMenuOnMount={true}
				align="start"
				style={{ position: "relative"}}
				className="m-left__sm m-right__sm">
				<div className="dropdown-submenu">
					<Row>
						<Col xl={3}>
							<div className="mb-2 text-primary heading">
								Core Principles
							</div>
							{subjects && subjects
								.filter((s) => /^(CB|CS|CM)/.test(s.code))
								.map((subject) => (
									<NavDropdown.Item
										key={subject.id}
										onClick={() => handleSubjectClick(subject.code)}>
										<span className="fw-lighter w-100 body">
											{subject.code} - {subject.description}
										</span>
									</NavDropdown.Item>
								))}
						</Col>
						<Col xl={3}>
							<div className="fw-bolder mb-2 text-primary heading">
								Core Practices
							</div>
							{subjects && subjects
								.filter((s) => /^CP[1-3]$/.test(s.code))
								.map((subject) => (
									<NavDropdown.Item
										key={subject.id}
										onClick={() => handleSubjectClick(subject.code)}>
										<span className="fw-lighter w-100 body">
											{subject.code} - {subject.description}
										</span>
									</NavDropdown.Item>
								))}
						</Col>
						<Col xl={3}>
							<div className="fw-bolder mb-2 text-primary heading">
								Specialist Principles
							</div>
							{subjects && subjects
								.filter((s) => /^SP/.test(s.code))
								.map((subject) => (
									<NavDropdown.Item
										key={subject.id}
										onClick={() => handleSubjectClick(subject.code)}>
										<span className="fw-lighter w-100 body">
											{subject.code} - {subject.description}
										</span>
									</NavDropdown.Item>
								))}
						</Col>
						<Col xl={3}>
							<div className="fw-bolder mb-2 text-primary heading">
								Specialist Advanced
							</div>
							{subjects && subjects
								.filter((s) => /^SA/.test(s.code))
								.map((subject) => (
									<NavDropdown.Item
										key={subject.id}
										onClick={() => handleSubjectClick(subject.code)}>
										<span className="fw-lighter w-100 body">
											{subject.code} - {subject.description}
										</span>
									</NavDropdown.Item>
								))}
						</Col>
					</Row>
				</div>
			</NavDropdown>
			<NavDropdown
				title={<span className="title3">Products</span>}
				menuVariant="light"
				renderMenuOnMount={true}
				align="start"
				style={{ position: "relative" }}
				className="m-left__sm m-right__sm">
				<div className="dropdown-submenu">
					<Row>
						<Nav.Link
							as={NavLink}
							to="/products"
							onClick={() => handleProductClick()}
							className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5">
							<span className="title3">View All Products</span>
						</Nav.Link>
					</Row>
					<Row>
						{loadingProductGroups ? (
							<Col>
								<div className="text-muted">Loading products...</div>
							</Col>
						) : (
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
														<div
															className="fw-bolder mb-2 text-primary"
															style={{
																cursor: "pointer",
															}}
															onClick={() =>
																handleProductGroupClick(
																	group.name
																)
															}>
															{group.name}
														</div>
														{leftColumn.map((product) => (
															<NavDropdown.Item
																key={product.id}
																onClick={() =>
																	handleSpecificProductClick(
																		product.id
																	)
																}>
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
																onClick={() =>
																	handleSpecificProductClick(
																		product.id
																	)
																}>
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
										<div
											className="fw-bolder mb-2 text-primary"
											style={{ cursor: "pointer" }}
											onClick={() =>
												handleProductGroupClick(group.name)
											}>
											{group.name}
										</div>
										{group.products && group.products.length > 0 ? (
											group.products.map((product) => (
												<NavDropdown.Item
													key={product.id}
													onClick={() =>
														handleSpecificProductClick(product.id)
													}>
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
						)}
					</Row>
				</div>
			</NavDropdown>
			<NavDropdown
				title={<span className="title3">Distance Learning</span>}
				menuVariant="light"
				renderMenuOnMount={true}
				align="start"
				style={{ position: "relative" }}
				className="m-left__sm m-right__sm">
				<div className="dropdown-submenu">
					<Row>
						<Nav.Link
							as={NavLink}
							to="/products?distance_learning=true"
							onClick={() => {
								// Navigation handled by NavLink 'to' prop
							}}
							className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5">
							View All Distance Learning
						</Nav.Link>
					</Row>
					<Row>
						{loadingDistanceLearning ? (
							<Col>
								<div className="text-muted">
									Loading distance learning...
								</div>
							</Col>
						) : (
							distanceLearningData.map((group) => (
								<Col key={group.id || group.name}>
									<div
										className="fw-bolder mb-2 text-primary"
										style={{ cursor: "pointer" }}
										onClick={() =>
											handleProductGroupClick(group.name)
										}>
										{group.name}
									</div>
									{group.products && group.products.length > 0 ? (
										group.products.map((product) => (
											<NavDropdown.Item
												key={product.id}
												onClick={() =>
													handleSpecificProductClick(product.id)
												}>
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
						)}
					</Row>
				</div>
			</NavDropdown>
			<NavDropdown
				title={<span className="title3">Tutorials</span>}
				menuVariant="light"
				renderMenuOnMount={true}
				align="start"
				style={{ position: "relative" }}
				className="m-left__sm m-right__sm">
				<div className="dropdown-submenu">
					<Row>
						<Nav.Link
							as={NavLink}
							to="/products?tutorial=true"
							onClick={() => {
								// Navigation handled by NavLink 'to' prop
							}}
							className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5">
							View All Tutorials
						</Nav.Link>
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
															onClick={() =>
																handleSpecificProductClick(
																	product.id
																)
															}>
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
																}>
																{product.shortname}
															</NavDropdown.Item>
														)
												  )
												: null}
										</div>
									</div>
								</Col>
								{/* Format Column - Simple filter links */}
								<Col>
									<div className="fw-bolder mb-2 text-primary">
										Format
									</div>
									{tutorialData.Format &&
									tutorialData.Format.length > 0 ? (
										tutorialData.Format.map((format) => (
											<NavDropdown.Item
												key={format.filter_type}
												onClick={() =>
													handleTutorialFormatClick(
														format.group_name
													)
												}>
												{format.name}
											</NavDropdown.Item>
										))
									) : (
										<div className="text-muted small">
											No formats available
										</div>
									)}
								</Col>
								{/* Online Classroom Column */}
								<Col>
									<div className="fw-bolder mb-2 text-primary">
										Online Classroom
									</div>
									{tutorialData["Online Classroom"] &&
									tutorialData["Online Classroom"].length > 0 ? (
										tutorialData["Online Classroom"].map(
											(variation) => (
												<NavDropdown.Item
													key={variation.id}
													onClick={() =>
														handleProductVariationClick(
															variation.id
														)
													}>
													{variation.description || variation.name}
												</NavDropdown.Item>
											)
										)
									) : (
										<div className="text-muted small">
											No online classroom available
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
			<Nav.Link
				as={NavLink}
				to="/products?group=8"
				onClick={handleMarkingVouchersClick}
				className="navbar-marking-vouchers m-left__sm m-right__sm">
				<span className="title3">Marking Vouchers</span>
			</Nav.Link>
			{isApprentice ? (
				<Nav.Link
					as={NavLink}
					href="#home"
					disabled={!isApprentice}
					className="text-muted m-left__sm m-right__sm">
					<span className="title3">Apprenticeships</span>
				</Nav.Link>
			) : null}
			{isStudyPlus ? (
				<Nav.Link
					as={NavLink}
					href="#home"
					disabled={!isStudyPlus}
					className="text-muted m-left__sm m-right__sm">
					<span className="title3">Study Plus</span>
				</Nav.Link>
			) : null}
			{isSuperuser ? (
				<NavDropdown
					title={<span className="title3">Admin</span>}
					id="admin-nav-dropdown"
					className="m-left__sm m-right__sm">
					<NavDropdown.Item as={NavLink} to="admin/exam-sessions">
						<span className="title3">Exam Sessions</span>
					</NavDropdown.Item>
					<NavDropdown.Item as={NavLink} to="admin/subjects">
						<span className="title3">Subjects</span>
					</NavDropdown.Item>
					<NavDropdown.Item as={NavLink} to="admin/products">
						<span className="title3">Products</span>
					</NavDropdown.Item>
				</NavDropdown>
			) : null}
		</Nav>
  );
};

export default NavigationMenu;