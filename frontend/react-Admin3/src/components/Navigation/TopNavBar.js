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
import AuthModal from "./AuthModal";
import CartPanel from "../Ordering/CartPanel";
import TopNavActions from "./TopNavActions";
import SearchModal from "./SearchModal";

const TopNavBar = () => {
	// State for authentication status
	const {
		isAuthenticated,
		user,
		logout,
	} = useAuth();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const [showCartPanel, setShowCartPanel] = useState(false);
	const [showSearchModal, setShowSearchModal] = useState(false);

	// Listen for navigation state to auto-trigger auth modal
	useEffect(() => {
		if (location.state?.showLogin && !isAuthenticated) {
			setShowAuthModal(true);
			// Clear the state to prevent repeated triggering
			navigate(location.pathname, { replace: true, state: null });
		}
	}, [location, isAuthenticated, navigate]);

	const { cartCount, refreshCart } = useCart();

	// Close cart panel and refresh cart when user authenticates
	useEffect(() => {
		if (isAuthenticated) {
			setShowCartPanel(false);
			// Refresh cart to recalculate VAT with user profile
			refreshCart().catch(err => {
				console.error('Failed to refresh cart after login:', err);
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]); // Only run when isAuthenticated changes, not when refreshCart changes

	// Listen for custom event to show auth modal (from CartPanel checkout)
	useEffect(() => {
		const handleShowAuthModal = () => {
			if (!isAuthenticated) {
				setShowAuthModal(true);
			}
		};

		window.addEventListener("show-login-modal", handleShowAuthModal);

		return () => {
			window.removeEventListener("show-login-modal", handleShowAuthModal);
		};
	}, [isAuthenticated]);

	// Handle closing the auth modal
	const handleCloseAuthModal = () => {
		setShowAuthModal(false);
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


	// Handle user icon click
	const handleUserIconClick = () => {
		if (!isAuthenticated) {
			setShowAuthModal(true);
		}
		// If authenticated, the dropdown will handle showing logout option
	};

	// Handle opening the search modal
	const handleOpenSearchModal = () => {
		setShowSearchModal(true);
	};

	// Handle closing the search modal
	const handleCloseSearchModal = () => {
		setShowSearchModal(false);
	};

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
						<Link to="/styleguide">
							<div className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
								<HelpIcon className="bi d-flex flex-row align-items-center"></HelpIcon>
								<span className="d-none d-md-block mx-1 body">
									Help
								</span>
							</div>
						</Link>
					</div>
				</div>

				{/* Right Group - TopNavActions (Brochure and Search) */}
				<div className="d-flex flex-row px-3 px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
					<TopNavActions onOpenSearch={handleOpenSearchModal} />
				</div>
			</div>

			{/* Search Modal */}
			<SearchModal 
				open={showSearchModal} 
				onClose={handleCloseSearchModal} 
			/>

			{/* Auth Modal */}
			<AuthModal
				open={showAuthModal}
				onClose={handleCloseAuthModal}
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