// src/components/ActEdNavbar.js
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import {
	Container,
	Button,
	Nav,
	Navbar,
	Image,
	NavDropdown,
	Row,
	Col,
} from "react-bootstrap";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
	Home as HomeIcon,
	HelpOutline as HelpIcon,
	ShoppingCart as CartIcon,
	AccountCircle as PersonIcon,
	Download as DownloadIcon,
	Search as SearchIcon,
	Close as CloseIcon,
} from "@mui/icons-material";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	IconButton,
	Typography,
	Box,
	Paper,
} from "@mui/material";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/navbar.css";
import { useProducts } from "../contexts/ProductContext";
import LoginForm from "./LoginForm";
import { useCart } from "../contexts/CartContext";
import CartPanel from "./CartPanel";
import SearchBox from "./SearchBox";
import SearchResults from "./SearchResults";
import productService from "../services/productService";
import subjectService from "../services/subjectService";

const ActEdNavbar = () => {
	// State for authentication status
	const {
		isAuthenticated,
		user,
		isLoading,
		login,
		register,
		logout,
		isSuperuser,
		isApprentice,
		isStudyPlus,
	} = useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);
	const { products, loading: loadingProducts } = useProducts();
	const navigate = useNavigate();
	const location = useLocation();
	const [showCartPanel, setShowCartPanel] = useState(false);

	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});

	// eslint-disable-next-line
	const [message, setMessage] = useState("");

	// Error and loading states
	const [loginError, setLoginError] = useState("");

	// State for subjects
	const [subjects, setSubjects] = useState([]);
	const [loadingSubjects, setLoadingSubjects] = useState(true);

	// State for navbar product groups
	const [navbarProductGroups, setNavbarProductGroups] = useState([]);
	const [loadingProductGroups, setLoadingProductGroups] = useState(true);

	// State for distance learning dropdown
	const [distanceLearningData, setDistanceLearningData] = useState([]);
	const [loadingDistanceLearning, setLoadingDistanceLearning] = useState(true);

	// State for tutorial dropdown
	const [tutorialData, setTutorialData] = useState(null);
	const [loadingTutorial, setLoadingTutorial] = useState(true);

	// State for search modal
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [searchResults, setSearchResults] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedFilters, setSelectedFilters] = useState({
		subjects: [],
		product_groups: [],
		variations: [],
		products: []
	});
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchError, setSearchError] = useState(null);

	// Listen for navigation state to auto-trigger login modal
	useEffect(() => {
		if (location.state?.showLogin && !isAuthenticated) {
			setShowLoginModal(true);
			// Clear the state to prevent repeated triggering
			navigate(location.pathname, { replace: true, state: null });
		}
	}, [location, isAuthenticated, navigate]);

	// Close cart panel when user authenticates
	useEffect(() => {
		if (isAuthenticated) {
			setShowCartPanel(false);
		}
	}, [isAuthenticated]);

	// Listen for custom event to show login modal (from CartPanel checkout)
	useEffect(() => {
		const handleShowLoginModal = () => {
			if (!isAuthenticated) {
				setShowLoginModal(true);
			}
		};

		window.addEventListener("show-login-modal", handleShowLoginModal);

		return () => {
			window.removeEventListener("show-login-modal", handleShowLoginModal);
		};
	}, [isAuthenticated]);

	// Add keyboard shortcut for search modal (Ctrl+K / Cmd+K)
	useEffect(() => {
		const handleKeyDown = (event) => {
			// Ctrl+K or Cmd+K to open search modal
			if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
				event.preventDefault();
				if (!showSearchModal) {
					setShowSearchModal(true);
				}
			}
			// Escape key to close search modal
			if (event.key === 'Escape' && showSearchModal) {
				handleCloseSearchModal();
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showSearchModal]);

	// Fetch subjects from the new endpoint (fix: use async/await)
	useEffect(() => {
		const fetchSubjects = async () => {
			try {
				const data = await subjectService.getSubjects();
				setSubjects(data);
			} catch (err) {
				setSubjects([]);
			} finally {
				setLoadingSubjects(false);
			}
		};
		fetchSubjects();
	}, []);

	// Fetch navbar product groups with their products
	useEffect(() => {
		const fetchNavbarProductGroups = async () => {
			try {
				const data = await productService.getNavbarProductGroups();
				setNavbarProductGroups(data);
			} catch (err) {
				console.error("Error fetching navbar product groups:", err);
				setNavbarProductGroups([]);
			} finally {
				setLoadingProductGroups(false);
			}
		};
		fetchNavbarProductGroups();
	}, []);

	// Fetch distance learning dropdown data
	useEffect(() => {
		const fetchDistanceLearningData = async () => {
			try {
				const data = await productService.getDistanceLearningDropdown();
				setDistanceLearningData(data);
			} catch (err) {
				console.error("Error fetching distance learning dropdown:", err);
				setDistanceLearningData([]);
			} finally {
				setLoadingDistanceLearning(false);
			}
		};
		fetchDistanceLearningData();
	}, []);

	// Fetch tutorial dropdown data
	useEffect(() => {
		const fetchTutorialData = async () => {
			try {
				const data = await productService.getTutorialDropdown();
				setTutorialData(data);
			} catch (err) {
				console.error("Error fetching tutorial dropdown:", err);
				setTutorialData(null);
			} finally {
				setLoadingTutorial(false);
			}
		};
		fetchTutorialData();
	}, []);

	// Handle navigating to product list with subject filter
	const handleSubjectClick = (subjectCode) => {
		navigate(`/products?subject_code=${subjectCode}`);
	};

	// Handle navigating to product list with category filter
	const handleProductCategoryClick = (categoryId) => {
		navigate(`/products?main_category=${categoryId}`);
	};

	// Handle navigating to product list with subject filter
	const handleProductClick = () => {
		navigate(`/products`);
	};

	// Handle navigating to specific product
	const handleProductItemClick = (productId) => {
		navigate(`/products/${productId}`);
	};

	// Handle navigating to product list with product group filter
	const handleProductGroupClick = (groupName) => {
		navigate(`/products?group=${encodeURIComponent(groupName)}`);
	};

	// Handle navigating to product list with specific product filter
	const handleSpecificProductClick = (productId) => {
		navigate(`/products?product=${productId}`);
	};

	// Handle navigating to product variation
	const handleProductVariationClick = (variationId) => {
		navigate(`/products?variation=${variationId}`);
	};

	// Handle navigating to tutorial format filters
	const handleTutorialFormatClick = (groupName) => {
		navigate(`/products?tutorial_format=${encodeURIComponent(groupName)}`);
	};

	// Handle closing the modal and resetting form data
	const handleClose = () => {
		setShowLoginModal(false);
		setMessage("");
		setFormData({
			// Reset form data
			email: "",
			password: "",
		});
	};

	// const handleShow = () => setShowLoginModal(true;

	const handleInputChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	// Handle login
	const handleLogin = async (e) => {
		e.preventDefault();
		try {
			setLoginError("");
			const result = await login(formData);
			if (result.status === "error") {
				setLoginError(result.message);
			} else {
				setShowLoginModal(false);
				setFormData((prevState) => ({
					...prevState,
					password: "",
				}));
			}
		} catch (err) {
			setLoginError(err.message || "Login failed");
		}
	};

	// Handle logout
	const handleLogout = async (e) => {
		e.preventDefault();
		try {
			await logout();
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	// Toggle between login and register modals
	const switchToRegister = () => {
		setLoginError("");
		setShowLoginModal(false);
		navigate("/register");
	};

	// Handle user icon click
	const handleUserIconClick = () => {
		if (!isAuthenticated) {
			setShowLoginModal(true);
		}
		// If authenticated, the dropdown will handle showing logout option
	};

	const { cartCount } = useCart();

	// Handle search results from SearchBox
	const handleSearchResults = (results, query) => {
		setSearchResults(results);
		setSearchQuery(query || '');
		setSearchError(null);
	};

	// Handle filter selection from SearchResults
	const handleFilterSelect = (filterType, item) => {
		const isSelected = isFilterSelected(filterType, item);
		
		if (isSelected) {
			// Remove filter
			setSelectedFilters(prev => ({
				...prev,
				[filterType]: prev[filterType].filter(selected => selected.id !== item.id)
			}));
		} else {
			// Add filter
			setSelectedFilters(prev => ({
				...prev,
				[filterType]: [...prev[filterType], item]
			}));
		}
	};

	// Check if filter is selected
	const isFilterSelected = (filterType, item) => {
		return selectedFilters[filterType].some(selected => selected.id === item.id);
	};

	// Remove filter
	const handleFilterRemove = (filterType, itemId) => {
		setSelectedFilters(prev => ({
			...prev,
			[filterType]: prev[filterType].filter(item => item.id !== itemId)
		}));
	};

	// Handle "Show Matching Products" button click from SearchResults
	const handleShowMatchingProducts = (results, filters, query) => {
		console.log('🚀 [Navbar] Navigating to search results from modal');
		
		// Use current state if parameters are not provided
		const searchQueryToUse = query || searchQuery;
		const filtersToUse = filters || selectedFilters;
		
		const searchParams = new URLSearchParams();
		
		if (searchQueryToUse?.trim()) {
			searchParams.append('q', searchQueryToUse.trim());
		}
		
		// Add selected filters
		filtersToUse.subjects.forEach(subject => {
			searchParams.append('subjects', subject.code || subject.id);
		});
		
		filtersToUse.product_groups.forEach(group => {
			searchParams.append('groups', group.id);
		});
		
		filtersToUse.variations.forEach(variation => {
			searchParams.append('variations', variation.id);
		});
		
		filtersToUse.products.forEach(product => {
			searchParams.append('products', product.id);
		});

		const finalUrl = `/products?${searchParams.toString()}`;
		
		// Close the modal and navigate
		handleCloseSearchModal();
		navigate(finalUrl);
	};

	// Handle opening the search modal
	const handleOpenSearchModal = () => {
		setShowSearchModal(true);
	};

	// Handle closing the search modal and resetting state
	const handleCloseSearchModal = () => {
		setShowSearchModal(false);
		// Reset search state after a brief delay to avoid visual glitches
		setTimeout(() => {
			setSearchResults(null);
			setSearchQuery('');
			setSelectedFilters({
				subjects: [],
				product_groups: [],
				variations: [],
				products: []
			});
			setSearchError(null);
		}, 300);
	};

	return (
		<div className="navbar-container fixed-top">
			<div className="d-flex flex-row navbar-top px-3 px-lg-4 px-xl-5 pt-2 pb-1 justify-content-between align-content-end">
				<div className="d-flex flex-row px-1 align-content-center flex-wrap px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Home">
							<div className="p-0 me-1 flex-wrap align-items-center d-flex flex-row">
								<HomeIcon className="bi d-flex flex-row align-items-center" />
								<span className="d-none d-md-block mx-1 fst-normal">
									ActEd Home
								</span>
							</div>
						</Link>
					</div>
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Help">
							<div className="p-0 me-1 flex-wrap align-items-center d-flex flex-row">
								<HelpIcon className="bi d-flex flex-row align-items-center"></HelpIcon>
								<span className="d-none d-md-block mx-1 fst-normal">
									Help
								</span>
							</div>
						</Link>
					</div>
				</div>

				<div className="d-flex flex-row px-3 px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
					<div className="me-lg-2 me-1 d-flex flex-row align-content-center">
						<Button
							variant="link"
							className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row"
							onClick={() => setShowCartPanel(true)}>
							<div
								style={{
									position: "relative",
									display: "inline-block",
								}}>
								<CartIcon className="bi d-flex flex-row align-items-center" />
								{cartCount > 0 && (
									<span
										style={{
											position: "absolute",
											top: -2,
											right: -4,
											width: 6,
											height: 6,
											background: "red",
											borderRadius: "50%",
											boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
											zIndex: 2,
											display: "block",
										}}
									/>
								)}
							</div>
							<span className="d-none d-md-block mx-1 fst-normal">
								Shopping Cart
							</span>
							{cartCount > 0 && (
								<span className="ms-1">({cartCount})</span>
							)}
						</Button>
					</div>
					<div className="ms-lg-2 ms-1 d-flex flex-row align-content-center">
						{isAuthenticated ? (
							<NavDropdown
								title={
									<div className="d-flex align-items-center">
										<PersonIcon className="bi d-flex flex-row align-items-center" />
										<span className="d-none d-md-block mx-1 fst-normal">
											Welcome {user?.first_name || "User"}
										</span>
									</div>
								}
								id="user-dropdown">
								<NavDropdown.Item onClick={() => navigate("/profile")}>
									My Profile
								</NavDropdown.Item>
								<NavDropdown.Item onClick={() => navigate("/orders")}>
									My Orders
								</NavDropdown.Item>
								<NavDropdown.Divider />
								<NavDropdown.Item onClick={handleLogout}>
									Logout
								</NavDropdown.Item>
							</NavDropdown>
						) : (
							<Button
								variant="link"
								onClick={handleUserIconClick}
								className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<PersonIcon className="bi d-flex flex-row align-items-center"></PersonIcon>
								<span className="d-none d-md-block mx-1 fst-normal">
									Login
								</span>
							</Button>
						)}
					</div>
				</div>
			</div>
			<Navbar
				expand="md"
				className="navbar navbar-expand-md navbar-main align-content-center justify-content-between px-3 px-lg-4 px-xl-5 pt-md-2 py-2">
				<Container
					fluid
					className="d-flex flex-row justify-content-between align-items-center px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
					<Navbar.Brand
						href="#home"
						className="navbar-brand pe-md-2 order-1 order-md-0">
						<Image
							fluid
							src={require("../assets/ActEdlogo.png")}
							alt="ActEd Logo"
							className="d-none d-md-block"
						/>
						<Image
							fluid
							src={require("../assets/ActEdlogo-S.png")}
							alt="ActEd Logo"
							className="d-md-none"
						/>
					</Navbar.Brand>
					<Navbar.Toggle
						className="navbar-toggler menu-button collapsed justify-content-between order-3 order-md-1"
						type="button"
						data-bs-toggle="collapse"
						data-bs-target="#navbar-menu"
						aria-controls="navbar-menu"
						aria-expanded="false"
						aria-label="Toggle navigation">
						<span className="toggler-icon top-bar"></span>
						<span className="toggler-icon middle-bar"></span>
						<span className="toggler-icon bottom-bar"></span>
					</Navbar.Toggle>
					<Navbar.Collapse
						id="navbar-menu"
						className="px-md-1 px-0 m-auto justify-content-lg-center justify-content-md-start order-4 order-md-2">
						<Nav className="navbar-nav  px-md-2 px-lg-2 flex-wrap">
							<Nav.Link as={NavLink} to="/home">
								Home
							</Nav.Link>
							<NavDropdown
								title="Subjects"
								menuVariant="light"
								renderMenuOnMount={true}
								align="start"
								style={{ position: "relative" }}>
								<div className="dropdown-submenu">
									<Row>
										<Col>
											<div className="fw-bolder mb-2 text-primary text-primary">
												Core Principles
											</div>
											{subjects
												.filter((s) => /^(CB|CS|CM)/.test(s.code))
												.map((subject) => (
													<NavDropdown.Item
														key={subject.id}
														onClick={() =>
															handleSubjectClick(subject.code)
														}>
														{subject.code} - {subject.description}
													</NavDropdown.Item>
												))}
										</Col>
										<Col>
											<div className="fw-bolder mb-2 text-primary">
												Core Practices
											</div>
											{subjects
												.filter((s) => /^CP[1-3]$/.test(s.code))
												.map((subject) => (
													<NavDropdown.Item
														key={subject.id}
														onClick={() =>
															handleSubjectClick(subject.code)
														}>
														{subject.code} - {subject.description}
													</NavDropdown.Item>
												))}
										</Col>
										<Col>
											<div className="fw-bolder mb-2 text-primary">
												Specialist Principles
											</div>
											{subjects
												.filter((s) => /^SP/.test(s.code))
												.map((subject) => (
													<NavDropdown.Item
														key={subject.id}
														onClick={() =>
															handleSubjectClick(subject.code)
														}>
														{subject.code} - {subject.description}
													</NavDropdown.Item>
												))}
										</Col>
										<Col>
											<div className="fw-bolder mb-2 text-primary">
												Specialist Advanced
											</div>
											{subjects
												.filter((s) => /^SA/.test(s.code))
												.map((subject) => (
													<NavDropdown.Item
														key={subject.id}
														onClick={() =>
															handleSubjectClick(subject.code)
														}>
														{subject.code} - {subject.description}
													</NavDropdown.Item>
												))}
										</Col>
									</Row>
								</div>
							</NavDropdown>
							<NavDropdown
								title="Products"
								menuVariant="light"
								renderMenuOnMount={true}
								align="start"
								style={{ position: "relative" }}>
								<div className="dropdown-submenu">
									<Row>
										<Nav.Link
											as={NavLink}
											to="/products"
											onClick={() => handleProductClick()}
											className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5">
											View All Products
										</Nav.Link>
									</Row>
									<Row>
										{loadingProductGroups ? (
											<Col>
												<div className="text-muted">
													Loading products...
												</div>
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
													const leftColumn = group.products.slice(
														0,
														midPoint
													);
													const rightColumn =
														group.products.slice(midPoint);

													return (
														<React.Fragment
															key={group.id || group.name}>
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
																		{leftColumn.map(
																			(product) => (
																				<NavDropdown.Item
																					key={product.id}
																					onClick={() =>
																						handleSpecificProductClick(
																							product.id
																						)
																					}>
																					{
																						product.shortname
																					}
																				</NavDropdown.Item>
																			)
																		)}
																	</Col>
																	<Col lg={6}>
																		<div className="fw-bolder mb-2 text-primary w-50">
																			&nbsp;
																		</div>
																		{rightColumn.map(
																			(product) => (
																				<NavDropdown.Item
																					key={product.id}
																					onClick={() =>
																						handleSpecificProductClick(
																							product.id
																						)
																					}>
																					{
																						product.shortname
																					}
																				</NavDropdown.Item>
																			)
																		)}
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
																handleProductGroupClick(
																	group.name
																)
															}>
															{group.name}
														</div>
														{group.products &&
														group.products.length > 0 ? (
															group.products.map((product) => (
																<NavDropdown.Item
																	key={product.id}
																	onClick={() =>
																		handleSpecificProductClick(
																			product.id
																		)
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
								title="Distance Learning"
								menuVariant="light"
								renderMenuOnMount={true}
								align="start"
								style={{ position: "relative" }}>
								<div className="dropdown-submenu">
									<Row>
										<Nav.Link
											as={NavLink}
											to="/products?distance_learning=true"
											onClick={() =>
												navigate("/products?distance_learning=true")
											}
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
													{group.products &&
													group.products.length > 0 ? (
														group.products.map((product) => (
															<NavDropdown.Item
																key={product.id}
																onClick={() =>
																	handleSpecificProductClick(
																		product.id
																	)
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
								title="Tutorials"
								menuVariant="light"
								renderMenuOnMount={true}
								align="start"
								style={{ position: "relative" }}>
								<div className="dropdown-submenu">
									<Row>
										<Nav.Link
											as={NavLink}
											to="/products?tutorial=true"
											onClick={() =>
												navigate("/products?tutorial=true")
											}
											className="fw-normal mb-2 text-primary ms-1 border border-light w-auto fs-5">
											View All Tutorials
										</Nav.Link>
									</Row>
									<Row>
										{loadingTutorial ? (
											<Col>
												<div className="text-muted">
													Loading tutorials...
												</div>
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
															tutorialData.Location.left.length >
																0 ? (
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
															tutorialData.Location.right
																.length > 0
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
													tutorialData["Online Classroom"].length >
														0 ? (
														tutorialData["Online Classroom"].map(
															(variation) => (
																<NavDropdown.Item
																	key={variation.id}
																	onClick={() =>
																		handleProductVariationClick(
																			variation.id
																		)
																	}>
																	{variation.description ||
																		variation.name}
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
							{isApprentice ? (
								<Nav.Link
									as={NavLink}
									href="#home"
									disabled={!isApprentice}
									className="text-muted">
									Apprenticeships
								</Nav.Link>
							) : null}
							{isStudyPlus ? (
								<Nav.Link
									as={NavLink}
									href="#home"
									disabled={!isStudyPlus}
									className="text-muted">
									Study Plus
								</Nav.Link>
							) : null}
							{isSuperuser ? (
								<NavDropdown title="Admin" id="admin-nav-dropdown">
									<NavDropdown.Item
										as={NavLink}
										to="admin/exam-sessions">
										Exam Sessions
									</NavDropdown.Item>
									<NavDropdown.Item as={NavLink} to="admin/subjects">
										Subjects
									</NavDropdown.Item>
									<NavDropdown.Item as={NavLink} to="admin/products">
										Products
									</NavDropdown.Item>
								</NavDropdown>
							) : null}
						</Nav>
					</Navbar.Collapse>
					<div className="d-flex justify-content-md-end justify-content-start align-content-center flex-row ps-md-2 order-0 order-md-4">
						<div className="d-none d-md-block mb-md-1 mb-lg-0">
							<Button
								variant="link"
								to="/Brochure"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<DownloadIcon className="bi d-flex flex-row align-items-center"></DownloadIcon>
								<span className="d-none d-md-block mx-1 fst-normal">
									Brochure
								</span>
							</Button>
						</div>
						<div>
							<Button
								variant="link"
								onClick={handleOpenSearchModal}
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row"
								title="Search Products">
								<SearchIcon className="bi d-flex flex-row align-items-center"></SearchIcon>
								<span className="d-none d-md-block fst-normal">
									Search
								</span>								
							</Button>
						</div>
					</div>
				</Container>
			</Navbar>

			{/* Login Modal */}
			<LoginForm
				show={showLoginModal}
				onHide={handleClose}
				formData={formData}
				handleInputChange={handleInputChange}
				handleLogin={handleLogin}
				loginError={loginError}
				isLoading={isLoading}
				switchToRegister={switchToRegister}
			/>

			{/* Cart Panel */}
			<CartPanel
				show={showCartPanel}
				handleClose={() => setShowCartPanel(false)}
			/>

			{/* Search Modal */}
			<Dialog
				open={showSearchModal}
				onClose={handleCloseSearchModal}
				aria-labelledby="search-modal-title"
				aria-describedby="search-modal-description"
				maxWidth="lg"
				fullWidth
				className="search-modal"
				elevation={2}				
				disableEscapeKeyDown={false}
				keepMounted={false}>
				<DialogTitle
					id="search-modal-title"
					sx={{
						background: "#dee2e6",
						color: "#495057",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						paddingY: 2,
						paddingX: 3,
					}}>
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<SearchIcon sx={{ marginRight: 1 }} />
						<Typography variant="h6" component="span">
							Search Products
						</Typography>
						<Typography
							variant="caption"
							component="span"
							sx={{ marginLeft: 2, opacity: 0.8 }}></Typography>
					</Box>
					<IconButton
						edge="end"
						color="#495057"
						onClick={handleCloseSearchModal}
						aria-label="close"
						sx={{ color: "#495057" }}>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent
					sx={{												
						backgroundColor: "#f8f9fa",
						padding: 3,
					}}>
					<Paper
						elevation={0}
						sx={{
							paddingTop: 4,
							alignItems: "center",
							marginBottom: 2,							
							backgroundColor: "#E9ECEF00",
						}}
						className="search-box-container">
						<SearchBox
							onSearchResults={handleSearchResults}
							onShowMatchingProducts={handleShowMatchingProducts}
							autoFocus={true}
							placeholder="Search for products, subjects, categories..."
						/>
					</Paper>
					<Paper
						elevation={0}
						sx={{
							paddingY: 0,
							marginLeft: 5,
							marginRight: 5,
							borderRadius: 2,
							backgroundColor: "#E9ECEF00",
						}}
						className="search-results-container">
						<SearchResults
							searchResults={searchResults}
							searchQuery={searchQuery}
							selectedFilters={selectedFilters}
							onFilterSelect={handleFilterSelect}
							onFilterRemove={handleFilterRemove}
							onShowMatchingProducts={handleShowMatchingProducts}
							isFilterSelected={isFilterSelected}
							loading={searchLoading}
							error={searchError}
							maxSuggestions={5}
						/>
					</Paper>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default ActEdNavbar;
