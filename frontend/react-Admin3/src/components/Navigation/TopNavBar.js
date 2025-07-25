// src/components/TopNavBar.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button, NavDropdown } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
	Home as HomeIcon,
	HelpOutline as HelpIcon,
	ShoppingCart as CartIcon,
	AccountCircle as PersonIcon,
} from "@mui/icons-material";
import { useCart } from "../../contexts/CartContext";
import LoginForm from "../User/LoginForm";
import CartPanel from "../Ordering/CartPanel";

const TopNavBar = () => {
	// State for authentication status
	const {
		isAuthenticated,
		user,
		isLoading,
		login,
		logout,
	} = useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const [showCartPanel, setShowCartPanel] = useState(false);

	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});

	// Error and loading states
	const [loginError, setLoginError] = useState("");

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

	// Handle closing the modal and resetting form data
	const handleClose = () => {
		setShowLoginModal(false);
		setFormData({
			// Reset form data
			email: "",
			password: "",
		});
	};

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
		<>
			<div className="d-flex flex-row navbar-top px-2 py-1 justify-content-between align-content-end">
				{/* Left Group - ActEd Home and Help */}
				<div className="d-flex flex-row flex-wrap px-3 px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
					<div className="me-lg-2 me-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/Home">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<HomeIcon className="bi d-flex flex-row align-items-center" />
								<span className="d-none d-md-block body fw-light">
									ActEd Home
								</span>
							</div>
						</Link>
					</div>
					<div className="ms-lg-2 ms-1 d-flex flex-row align-content-center flex-wrap">
						<Link to="/style-guide">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<HelpIcon className="bi d-flex flex-row align-items-center"></HelpIcon>
								<span className="d-none d-md-block mx-1 body">
									Help
								</span>
							</div>
						</Link>
					</div>
				</div>

				{/* Right Group - Shopping Cart and Login */}
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
							<span className="d-none d-md-block mx-1 body">
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
										<span className="d-none d-md-block mx-1 body">
											Welcome {user?.first_name || "User"}
										</span>
									</div>
								}
								id="user-dropdown">
								<NavDropdown.Item onClick={() => navigate("/profile")}>
									<span className="body">My Profile</span>
								</NavDropdown.Item>
								<NavDropdown.Item onClick={() => navigate("/orders")}>
									<span className="body">My Orders</span>
								</NavDropdown.Item>
								<NavDropdown.Divider />
								<NavDropdown.Item onClick={handleLogout}>
									<span className="body">Logout</span>
								</NavDropdown.Item>
							</NavDropdown>
						) : (
							<Button
								variant="link"
								onClick={handleUserIconClick}
								className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<PersonIcon
									className="bi d-flex flex-row align-items-center"
									sx={{ fontSize: "1.5em" }}></PersonIcon>
								<span className="d-none d-md-block mx-1 body">
									Login
								</span>
							</Button>
						)}
					</div>
				</div>
			</div>

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
		</>
	);
};

export default TopNavBar;