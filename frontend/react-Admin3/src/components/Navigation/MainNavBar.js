// src/components/MainNavBar.js
import React, { useState, useEffect } from "react";
import {
	Container,
	Button,
	Navbar,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
	Download as DownloadIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
// import { useAuth } from "../../hooks/useAuth"; // Now used by child components
import productService from "../../services/productService";
import subjectService from "../../services/subjectService";
import SearchModal from "./SearchModal";
import MobileNavigation from "./MobileNavigation";
import TopNavBar from "./TopNavBar";
import NavbarBrand from "./NavbarBrand";
import NavigationMenu from "./NavigationMenu";
import MainNavActions from "./MainNavActions";
import AuthModal from "./AuthModal";
import CartPanel from "../Ordering/CartPanel";

import "../../styles/navbar.css";
const MainNavBar = () => {
	// Auth hook is no longer needed in MainNavBar - used by child components
	const navigate = useNavigate();
	
	// State for navbar expansion
	const [expanded, setExpanded] = useState(false);
	

	// State for subjects
	const [subjects, setSubjects] = useState([]);

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
	
	// State for auth modal
	const [showAuthModal, setShowAuthModal] = useState(false);
	
	// State for cart panel
	const [showCartPanel, setShowCartPanel] = useState(false);

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
		setExpanded(false); // Close mobile menu
	};

	// Handle navigating to product list with subject filter
	const handleProductClick = () => {
		navigate(`/products`);
		setExpanded(false); // Close mobile menu
	};

	// Handle navigating to product list with product group filter
	const handleProductGroupClick = (groupName) => {
		navigate(`/products?group=${encodeURIComponent(groupName)}`);
		setExpanded(false); // Close mobile menu
	};

	// Handle navigating to product list with specific product filter
	const handleSpecificProductClick = (productId) => {
		navigate(`/products?product=${productId}`);
		setExpanded(false); // Close mobile menu
	};

	// Handle navigating to product variation
	const handleProductVariationClick = (variationId) => {
		navigate(`/products?variation=${variationId}`);
		setExpanded(false); // Close mobile menu
	};

	// Handle navigating to marking vouchers
	const handleMarkingVouchersClick = (e) => {
		e.preventDefault();
		navigate(`/products?group=8`); // Navigate to Marking Vouchers group (id: 8)
		setExpanded(false); // Close mobile menu
	};

	// Handle navigating to tutorial format filters
	const handleTutorialFormatClick = (groupName) => {
		navigate(`/products?tutorial_format=${encodeURIComponent(groupName)}`);
		setExpanded(false); // Close mobile menu
	};

	// Handle opening the search modal
	const handleOpenSearchModal = () => {
		setShowSearchModal(true);
	};

	// Handle closing the search modal
	const handleCloseSearchModal = () => {
		setShowSearchModal(false);
	};
	
	// Handle opening the auth modal
	const handleOpenAuthModal = () => {
		setShowAuthModal(true);
	};
	
	// Handle closing the auth modal
	const handleCloseAuthModal = () => {
		setShowAuthModal(false);
	};
	
	// Handle opening the cart panel
	const handleOpenCartPanel = () => {
		setShowCartPanel(true);
	};
	
	// Handle closing the cart panel
	const handleCloseCartPanel = () => {
		setShowCartPanel(false);
	};

	return (
		<div className="sticky-top">
			<TopNavBar />
			<Navbar
				expand="md"
				expanded={expanded}
				onToggle={setExpanded}
				sticky="top"
				className="navbar navbar-expand-md navbar-main align-content-center justify-content-between p-left__xl p-right__xl pt-md-2 py-lg-2">
				<Container	
					fluid
					className="d-flex flex-row justify-content-between align-items-center">
					{/* Left Section - Brand/Logo */}
					<NavbarBrand />

					<Navbar.Toggle
						className={`navbar-toggler menu-button justify-content-between order-3 order-md-1 ${
							expanded ? "active" : ""
						} me-2`}
						aria-controls="navbar-menu"
						aria-label="Toggle navigation"
						id="navbar-menu-toggle">
						<span className="toggler-icon top-bar"></span>
						<span className="toggler-icon middle-bar"></span>
						<span className="toggler-icon bottom-bar"></span>
					</Navbar.Toggle>

					{/* Center Section - Navigation Menu */}
					<Navbar.Collapse
						id="navbar-menu"
						className="px-md-1 px-0 m-auto justify-content-lg-center justify-content-md-start order-4 order-md-2">
						{/* Desktop Navigation - Hidden on mobile */}
						<NavigationMenu
							subjects={subjects}
							navbarProductGroups={navbarProductGroups}
							distanceLearningData={distanceLearningData}
							tutorialData={tutorialData}
							loadingProductGroups={loadingProductGroups}
							loadingDistanceLearning={loadingDistanceLearning}
							loadingTutorial={loadingTutorial}
							handleSubjectClick={handleSubjectClick}
							handleProductClick={handleProductClick}
							handleProductGroupClick={handleProductGroupClick}
							handleSpecificProductClick={handleSpecificProductClick}
							handleProductVariationClick={handleProductVariationClick}
							handleMarkingVouchersClick={handleMarkingVouchersClick}
							handleTutorialFormatClick={handleTutorialFormatClick}
							onCollapseNavbar={() => setExpanded(false)}
						/>

						{/* Mobile Navigation - Visible only on mobile */}
						<div className="d-md-none">
							<MobileNavigation
								open={expanded}
								onClose={() => setExpanded(false)}
								subjects={subjects}
								navbarProductGroups={navbarProductGroups}
								distanceLearningData={distanceLearningData}
								tutorialData={tutorialData}
								loadingProductGroups={loadingProductGroups}
								loadingDistanceLearning={loadingDistanceLearning}
								loadingTutorial={loadingTutorial}
								handleSubjectClick={handleSubjectClick}
								handleProductClick={handleProductClick}
								handleProductGroupClick={handleProductGroupClick}
								handleSpecificProductClick={handleSpecificProductClick}
								handleProductVariationClick={
									handleProductVariationClick
								}
								handleMarkingVouchersClick={handleMarkingVouchersClick}
								handleTutorialFormatClick={handleTutorialFormatClick}
							/>
						</div>
					</Navbar.Collapse>

					{/* Right Section - MainNavActions (Login and Cart) */}
					<div className="order-0 order-md-4">
						<MainNavActions
							onOpenAuth={handleOpenAuthModal}
							onOpenCart={handleOpenCartPanel}
							onToggleMobileMenu={() => setExpanded(!expanded)}
							isMobile={false}
						/>
					</div>
				</Container>
			</Navbar>

			{/* Search Modal */}
			<SearchModal open={showSearchModal} onClose={handleCloseSearchModal} />

			{/* Auth Modal */}
			<AuthModal open={showAuthModal} onClose={handleCloseAuthModal} />

			{/* Cart Panel */}
			<CartPanel show={showCartPanel} handleClose={handleCloseCartPanel} />
		</div>
	);
};

export default MainNavBar;