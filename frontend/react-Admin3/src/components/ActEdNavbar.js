// src/components/ActEdNavbar.js
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Container, Button, Nav, Navbar, Image, NavDropdown, Modal, Form, Alert } from "react-bootstrap";
import InputGroup from "react-bootstrap/InputGroup"
import { LinkContainer } from "react-router-bootstrap";
import { Routes, Route } from "react-router-dom";
import { House, QuestionCircle, Cart, PersonCircle, Download, Search } from "react-bootstrap-icons";
import axios from "axios"; // Make sure to install axios: npm install axios
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/navbar.css";


const ActEdNavbar = () => {
	// State for authentication status
	const { isAuthenticated, user, isLoading, error, login, register, logout } = useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showRegisterModal, setShowRegisterModal] = useState(false);
	const [formData, setFormData] = useState({
		username: "",
		password: "",
	});
	const [registerData, setRegisterData] = useState({
		first_name: "",
		last_name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});

	const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
	const [message, setMessage] = useState("");

	// Error and loading states
	const [loginError, setLoginError] = useState("");
	const [registerError, setRegisterError] = useState("");

	const handleClose = () => {
		setShowLoginModal(false);
		setMessage("");
	};

	const handleShow = () => setShowLoginModal(true);

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
			await login(formData);
			setShowLoginModal(false);
			setFormData((prevState) => ({
				...prevState,
				password: "",
			}));
		} catch (err) {
			// Error handling is managed by useAuth hook
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
				first_name: registerData.first_name,
				last_name: registerData.last_name,
				email: registerData.email,
				password: registerData.password,
			});
			setShowRegisterModal(false);
			setRegisterData({
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
	const handleLogout = async () => {
		try {
			// Optional: Call logout endpoint if your API requires it
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
						<LinkContainer to="/Home">
							<Button
								variant="link"
								className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<House className="bi d-flex flex-row align-items-center"></House>
								<span className="d-none d-md-block mx-1 fst-normal">ActEd Home</span>
							</Button>
						</LinkContainer>
					</div>
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						{/* <LinkContainer to="/Help">
							<Button
								variant="link"
								className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<QuestionCircle className="bi d-flex flex-row align-items-center"></QuestionCircle>
								<span className="d-none d-md-block mx-1 fst-normal">Help</span>
							</Button>
						</LinkContainer> */}
					</div>
				</div>

				<div className="d-flex flex-row px-3">
					<div className="me-lg-2 me-1 d-flex flex-row align-content-center">
						{/* <LinkContainer to="/shopping-cart">
							<Button
								variant="link"
								className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<Cart className="bi d-flex flex-row align-items-center"></Cart>
								<span className="d-none d-md-block mx-1 fst-normal">Shopping Cart</span>
								<span className="position-absolute translate-middle badge rounded-circle bg-danger p-1 notification-dot">
									<span className="position-relative"></span>
									<span className="visually-hidden">item(s) in shopping cart</span>
								</span>
							</Button>
						</LinkContainer> */}
					</div>
					<div className="ms-lg-2 ms-1 d-flex flex-row align-content-center">
						{isAuthenticated ? (
							<NavDropdown
								title={
									<div className="d-flex align-items-center">
										<PersonCircle className="bi d-flex flex-row align-items-center" />
										<span className="d-none d-md-block mx-1 fst-normal">Welcome {user?.first_name || "User"}</span>
									</div>
								}
								id="user-dropdown">
								<NavDropdown.Item href="/profile">My Profile</NavDropdown.Item>
								<NavDropdown.Item href="/orders">My Orders</NavDropdown.Item>
								<NavDropdown.Divider />
								<NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
							</NavDropdown>
						) : (
							<Button
								variant="link"
								onClick={handleUserIconClick}
								className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<PersonCircle className="bi d-flex flex-row align-items-center"></PersonCircle>
								<span className="d-none d-md-block mx-1 fst-normal">Login</span>
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
							<Nav.Link href="#home">Home</Nav.Link>
							<Nav.Link href="#home">Subjects</Nav.Link>
							<Nav.Link href="#home">Distance Learning</Nav.Link>
							<Nav.Link href="#home">Tutorials</Nav.Link>
							<Nav.Link href="#home">Online Classroom</Nav.Link>
							{/* <LinkContainer to="/exam-sessions">
								<Nav.Link>Exam Sessions</Nav.Link>
							</LinkContainer> */}
						</Nav>
					</Navbar.Collapse>
					<div className="d-flex justify-content-md-end justify-content-start align-content-center flex-row ps-md-2 order-0 order-md-4">
						<div className="d-none d-md-block mb-md-1 mb-lg-0">
							<Button
								variant="link"
								to="/Brochure"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<Download className="bi d-flex flex-row align-items-center"></Download>
								<span className="d-none d-md-block mx-1 fst-normal">Brochure</span>
							</Button>
						</div>
						<div>
							<Button
								variant="link"
								to="/Search"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<Search className="bi d-flex flex-row align-items-center"></Search>
								<span className="d-none d-md-block mx-1 fst-normal">Search</span>
							</Button>
						</div>
					</div>
				</Container>
			</Navbar>

			{/* Login Modal */}
			<Modal
				show={showLoginModal}
				onHide={handleClose}>
				<Modal.Header closeButton>
					<Modal.Title>Login</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{loginError && <Alert variant="danger">{loginError}</Alert>}
					<Form onSubmit={handleLogin}>
						<Form.Group className="mb-3">
							<Form.Label>Email</Form.Label>
							<Form.Control
								type="text"
								name="username"
								value={formData.username}
								onChange={handleInputChange}
								required
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Label>Password</Form.Label>
							<Form.Control
								type="password"
								name="password"
								value={formData.password}
								onChange={handleInputChange}
								required
							/>
						</Form.Group>
						<div className="d-flex justify-content-between align-items-center">
							<Button
								variant="primary"
								type="submit"
								disabled={isLoading}>
								{isLoading ? "Logging in..." : "Login"}
							</Button>
							<Button
								variant="link"
								onClick={switchToRegister}>
								Need an account? Register
							</Button>
						</div>
					</Form>
				</Modal.Body>
			</Modal>

			{/* Register Modal */}
			<Modal
				show={showRegisterModal}
				onHide={() => setShowRegisterModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Register</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{registerError && <Alert variant="danger">{registerError}</Alert>}
					<Form onSubmit={handleRegister}>
						<Form.Group className="mb-3">
							<Form.Label>First Name</Form.Label>
							<Form.Control
								type="text"
								name="first_name"
								value={registerData.first_name}
								onChange={handleRegisterInputChange}
								required
							/>
							<Form.Label>Last Name</Form.Label>
							<Form.Control
								type="text"
								name="last_name"
								value={registerData.last_name}
								onChange={handleRegisterInputChange}
								required
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Label>Email address</Form.Label>
							<Form.Control
								type="email"
								name="email"
								value={registerData.email}
								onChange={handleRegisterInputChange}
								required
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Label>Password</Form.Label>
							<Form.Control
								type="password"
								name="password"
								value={registerData.password}
								onChange={handleRegisterInputChange}
								required
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Label>Confirm Password</Form.Label>
							<Form.Control
								type="password"
								name="confirmPassword"
								value={registerData.confirmPassword}
								onChange={handleRegisterInputChange}
								required
							/>
						</Form.Group>
						<div className="d-flex justify-content-between align-items-center">
							<Button
								variant="primary"
								type="submit"
								disabled={isLoading}>
								{isLoading ? "Registering..." : "Register"}
							</Button>
							<Button
								variant="link"
								onClick={switchToLogin}>
								Already have an account? Login
							</Button>
						</div>
					</Form>
				</Modal.Body>
			</Modal>
		</div>
	);
};

export default ActEdNavbar;
