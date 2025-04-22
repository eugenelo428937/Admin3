// src/components/ActEdNavbar.js
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Container, Button, Nav, Navbar, Image, NavDropdown } from "react-bootstrap";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { House, QuestionCircle, Cart, PersonCircle, Download, Search } from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/navbar.css";
import productService from "../services/productService";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

const ActEdNavbar = () => {
	// State for authentication status
	const { isAuthenticated, user, isLoading, login, register, logout } =
		useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showRegisterModal, setShowRegisterModal] = useState(false);
	const [subjects, setSubjects] = useState([]); // New state for storing subjects
	const [loadingSubjects, setLoadingSubjects] = useState(true); // Track loading state
	const navigate = useNavigate();

	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});

	const [registerData, setRegisterData] = useState({
		username: "",
		first_name: "",
		last_name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});

	// eslint-disable-next-line
	const [message, setMessage] = useState("");

	// Error and loading states
	const [loginError, setLoginError] = useState("");
	const [registerError, setRegisterError] = useState("");

	// Fetch available subjects when component mounts
	useEffect(() => {
		fetchSubjects();
	}, []);

	// Function to fetch subjects
	const fetchSubjects = useCallback(async () => {
		try {
			const params = new URLSearchParams();
			setLoadingSubjects(true);
			// Fetch products from the API
			const data = await productService.getAvailableProducts(params);
			console.log(data);
			if (data.filters) {
				setSubjects(data.filters.subjects || []);
			} else {
				console.log("No filters data returned from API");
				setSubjects([]); // Set empty array if no filters
			}
			console.log(data.filters.subjects);
			setLoadingSubjects(false);
		} catch (error) {
			console.error("Error fetching subjects:", error);
			setLoadingSubjects(false);
		}
	}, []);

	// Handle navigating to product list with subject filter
	const handleSubjectClick = (subjectCode) => {
		const searchParams = new URLSearchParams(window.location.search);
		searchParams.set("subject", subjectCode);
		console.log("Navigating with subject:", searchParams.toString());
		navigate(`/products?${searchParams.toString()}`);
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

	// const handleShow = () => setShowLoginModal(true);

	const handleInputChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};
	const handleRegisterInputChange = (e) => {
		setRegisterData({
			...registerData,
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

	// Handle register
	const handleRegister = async (e) => {
		e.preventDefault();
		if (registerData.password !== registerData.confirmPassword) {
			setRegisterError("Passwords do not match");
			return;
		}
		try {
			await register({
				username: registerData.email,
				first_name: registerData.first_name,
				last_name: registerData.last_name,
				email: registerData.email,
				password: registerData.password,
			});
			setShowRegisterModal(false);
			setRegisterData({
				username: "",
				first_name: "",
				last_name: "",
				email: "",
				password: "",
				confirmPassword: "",
			});
		} catch (err) {
			setRegisterError(err.message || "Registration failed");
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
		setShowRegisterModal(true);
	};

	const switchToLogin = () => {
		setRegisterError("");
		setShowRegisterModal(false);
		setShowLoginModal(true);
	};

	// Handle user icon click
	const handleUserIconClick = () => {
		if (!isAuthenticated) {
			setShowLoginModal(true);
		}
		// If authenticated, the dropdown will handle showing logout option
	};

	return (
		<div className="navbar-container">
			<div className="d-flex flex-row navbar-top px-3 px-lg-4 px-xl-5 pt-2 pb-1 justify-content-between align-content-end">
				<div className="d-flex flex-row px-1 align-content-center flex-wrap">
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Home">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<House className="bi d-flex flex-row align-items-center" />
								<span className="d-none d-md-block mx-1 fst-normal">
									ActEd Home
								</span>
							</div>
						</Link>
					</div>
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Help">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<QuestionCircle className="bi d-flex flex-row align-items-center"></QuestionCircle>
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
							className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
							<Cart className="bi d-flex flex-row align-items-center"></Cart>
							<span className="d-none d-md-block mx-1 fst-normal">
								Shopping Cart
							</span>
							<span className="position-absolute translate-middle badge rounded-circle bg-danger p-1 notification-dot">
								<span className="position-relative"></span>
								<span className="visually-hidden">
									item(s) in shopping cart
								</span>
							</span>
						</Button>
					</div>
					<div className="ms-lg-2 ms-1 d-flex flex-row align-content-center">
						{isAuthenticated ? (
							<NavDropdown
								title={
									<div className="d-flex align-items-center">
										<PersonCircle className="bi d-flex flex-row align-items-center" />
										<span className="d-none d-md-block mx-1 fst-normal">
											Welcome {user?.first_name || "User"}
										</span>
									</div>
								}
								id="user-dropdown">
								<NavDropdown.Item href="/profile">
									My Profile
								</NavDropdown.Item>
								<NavDropdown.Item href="/orders">
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
								<PersonCircle className="bi d-flex flex-row align-items-center"></PersonCircle>
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
							<Nav.Link
								as={NavLink}
								to="/products"
								onClick={() => handleProductClick()}>
								Products
							</Nav.Link>
							<NavDropdown title="Subjects">
								{loadingSubjects ? (
									<NavDropdown.Item disabled>
										Loading subjects...
									</NavDropdown.Item>
								) : subjects.length > 0 ? (
									subjects.map((subject) => (
										<NavDropdown.Item
											key={subject.id}
											onClick={() =>
												handleSubjectClick(subject.code)
											}>
											{subject.code} - {subject.description}
										</NavDropdown.Item>
									))
								) : (
									<NavDropdown.Item disabled>
										No subjects available
									</NavDropdown.Item>
								)}
							</NavDropdown>
							<Nav.Link as={NavLink} href="#home">
								Distance Learning
							</Nav.Link>
							<Nav.Link as={NavLink} href="#home">
								Tutorials
							</Nav.Link>
							<Nav.Link as={NavLink} href="#home">
								Online Classroom
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
								<Download className="bi d-flex flex-row align-items-center"></Download>
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
								<Search className="bi d-flex flex-row align-items-center"></Search>
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

			{/* Register Modal */}
			<RegisterForm
				show={showRegisterModal}
				onHide={() => setShowRegisterModal(false)}
				registerData={registerData}
				handleRegisterInputChange={handleRegisterInputChange}
				handleRegister={handleRegister}
				registerError={registerError}
				isLoading={isLoading}
				switchToLogin={switchToLogin}
			/>
		</div>
	);
};

export default ActEdNavbar;
