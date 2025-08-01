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

	return (
		<>
			<TopNavBar />
			<Navbar
				expand="md"
				expanded={expanded}
				onToggle={setExpanded}
				sticky="top"
				className="navbar navbar-expand-md navbar-main align-content-center justify-content-between px-1 px-lg-4 px-xl-5 pt-md-2 py-lg-2">
				<Container
					fluid
					className="d-flex flex-row justify-content-between align-items-center px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
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

					{/* Right Section - Brochure and Search */}
					<div className="d-flex flex-lg-row flex-column justify-content-md-end justify-content-start align-content-center flex-row ps-md-2 order-0 order-md-4">
						<div className="d-none d-md-block mb-md-1 mb-lg-0">
							<Button
								variant="link"
								to="/Brochure"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<DownloadIcon className="bi d-flex flex-row align-items-center"></DownloadIcon>
								<span className="d-none d-md-block mx-1 fst-normal body">
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
								<span className="d-none d-md-block fst-normal body">
									Search
								</span>
							</Button>
						</div>
					</div>
				</Container>
			</Navbar>

			{/* Search Modal */}
			<SearchModal 
				open={showSearchModal} 
				onClose={handleCloseSearchModal} 
			/>
		</>
	);
};

export default MainNavBar;