// src/components/ActEdNavbar.js
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Container, Button, Nav, Navbar, Image, NavDropdown, Row, Col } from "react-bootstrap";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { 
	Home as HomeIcon, 
	HelpOutline as HelpIcon, 
	ShoppingCart as CartIcon, 
	AccountCircle as PersonIcon, 
	Download as DownloadIcon, 
	Search as SearchIcon 
} from "@mui/icons-material";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/navbar.css";
import { useProducts } from "../contexts/ProductContext";
import LoginForm from "./LoginForm";
import { useCart } from "../contexts/CartContext";
import CartPanel from "./CartPanel";
import productService from "../services/productService";
import subjectService from "../services/subjectService";

const ActEdNavbar = () => {
	// State for authentication status
	const { isAuthenticated, user, isLoading, login, register, logout } =
		useAuth();
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

	// State for product categories
	const [productCategories, setProductCategories] = useState([]);
	const [loadingCategories, setLoadingCategories] = useState(true);

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

	// Fetch product categories from product group filters
	useEffect(() => {
		const fetchProductCategories = async () => {
			try {
				const filters = await productService.getProductGroupFilters();
				console.log('Product Group Filters:', filters); // Debug log
				
				// Extract all groups from MAIN_CATEGORY filters
				const categoryGroups = [];
				filters.forEach((filter) => {
					if (filter.filter_type === "MAIN_CATEGORY") {
						categoryGroups.push(...filter.groups.map(group => ({
							...group,
							is_core: filter.name.toLowerCase().includes('core'),
							is_revision: filter.name.toLowerCase().includes('revision'),
							is_marking: filter.name.toLowerCase().includes('marking'),
							order_sequence: group.id // Use ID as order sequence for now
						})));
					}
				});
				
				console.log('Processed Product Categories:', categoryGroups); // Debug log
				setProductCategories(categoryGroups);
			} catch (err) {
				console.error('Error fetching product categories:', err);
				setProductCategories([]);
			} finally {
				setLoadingCategories(false);
			}
		};
		fetchProductCategories();
	}, []);

	// Handle navigating to product list with subject filter
	const handleSubjectClick = (subjectCode) => {
		// Navigate with subject_code parameter to match backend expectations
		navigate(`/products?subject_code=${subjectCode}`);
	};

	// Handle navigating to product list with category filter
	const handleProductCategoryClick = (categoryId) => {
		// Navigate with main_category parameter to match ProductList expectations
		navigate(`/products?main_category=${categoryId}`);
	};

	// Handle navigating to product list with subject filter
	const handleProductClick = () => {
		navigate(`/products`);
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

	return (
		<div className="navbar-container">
			<div className="d-flex flex-row navbar-top px-3 px-lg-4 px-xl-5 pt-2 pb-1 justify-content-between align-content-end">
				<div className="d-flex flex-row px-1 align-content-center flex-wrap">
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Home">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<HomeIcon className="bi d-flex flex-row align-items-center" />
								<span className="d-none d-md-block mx-1 fst-normal">
									ActEd Home
								</span>
							</div>
						</Link>
					</div>
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Help">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<HelpIcon className="bi d-flex flex-row align-items-center"></HelpIcon>
								<span className="d-none d-md-block mx-1 fst-normal">
									Help
								</span>
							</div>
						</Link>
					</div>
				</div>

				<div className="d-flex flex-row px-3">
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
								<NavDropdown.Item onClick={() => navigate('/profile')}>
									My Profile
								</NavDropdown.Item>
								<NavDropdown.Item onClick={() => navigate('/orders')}>
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
					className="d-flex flex-row justify-content-between align-items-center">
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
											<div className="fw-bold mb-2 text-primary text-primary">
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
											<div className="fw-bold mb-2 text-primary">
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
											<div className="fw-bold mb-2 text-primary">
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
											<div className="fw-bold mb-2 text-primary">
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
										<Col>
											<div className="fw-bold mb-2 text-primary">
												Core Study Material
											</div>
											{productCategories
												.filter((cat) => cat.is_core)
												.sort(
													(a, b) =>
														a.order_sequence - b.order_sequence
												)
												.map((cat) => (
													<NavDropdown.Item
														key={cat.id}
														onClick={() =>
															handleProductCategoryClick(cat.id)
														}>
														{cat.name}
													</NavDropdown.Item>
												))}
										</Col>
										<Col>
											<div className="fw-bold mb-2 text-primary">
												Revision Materials
											</div>
											{productCategories
												.filter((cat) => cat.is_revision)
												.sort(
													(a, b) =>
														a.order_sequence - b.order_sequence
												)
												.map((cat) => (
													<NavDropdown.Item
														key={cat.id}
														onClick={() =>
															handleProductCategoryClick(cat.id)
														}>
														{cat.name}
													</NavDropdown.Item>
												))}
										</Col>
										<Col>
											<div className="fw-bold mb-2 text-primary">
												Marking
											</div>
											{productCategories
												.filter((cat) => cat.is_marking)
												.sort(
													(a, b) =>
														a.order_sequence - b.order_sequence
												)
												.map((cat) => (
													<NavDropdown.Item
														key={cat.id}
														onClick={() =>
															handleProductCategoryClick(cat.id)
														}>
														{cat.name}
													</NavDropdown.Item>
												))}
										</Col>
									</Row>
								</div>
							</NavDropdown>
							<Nav.Link
								as={NavLink}
								to="/products"
								onClick={() => handleProductClick()}>
								Products
							</Nav.Link>
							<Nav.Link as={NavLink} href="#home">
								Distance Learning
							</Nav.Link>
							<Nav.Link as={NavLink} href="#home">
								Tutorials
							</Nav.Link>
							<Nav.Link as={NavLink} href="#home">
								Apprenticeships
							</Nav.Link>
							<Nav.Link as={NavLink} href="#home">
								Study Plus
							</Nav.Link>
							{isAuthenticated ? (
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
								to="/Search"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<SearchIcon className="bi d-flex flex-row align-items-center"></SearchIcon>
								<span className="d-none d-md-block mx-1 fst-normal">
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
		</div>
	);
};

export default ActEdNavbar;
