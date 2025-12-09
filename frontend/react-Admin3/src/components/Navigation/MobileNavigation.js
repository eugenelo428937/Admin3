// src/components/MobileNavigation.js
import React, { useState } from "react";
import { Nav } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../contexts/CartContext";
import { NavigateBefore, ExpandMore, Search, ShoppingCartOutlined, Login, AccountCircle } from "@mui/icons-material";
import { IconButton, Badge } from "@mui/material";

const MobileNavigation = ({
	open,
	onClose,
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
	onOpenSearch,
	onOpenCart,
	onOpenAuth,
}) => {
	const { isSuperuser, isApprentice, isStudyPlus, isAuthenticated } = useAuth();
	const { cartCount } = useCart();
	const navigate = useNavigate();

	// Navigation state management
	const [navigationStack, setNavigationStack] = useState([
		{ type: "main", title: "Menu" },
	]);

	// Handle navigation and close mobile menu
	const handleNavigation = (path, params = {}) => {
		if (params && Object.keys(params).length > 0) {
			const searchParams = new URLSearchParams(params);
			navigate(`${path}?${searchParams.toString()}`);
		} else {
			navigate(path);
		}
		if (onClose) onClose(); // Close mobile menu
	};

	// Navigate to a new panel
	const navigateToPanel = (panelType, title, data = null) => {
		setNavigationStack((prev) => [...prev, { type: panelType, title, data }]);
	};

	// Navigate back one level
	const navigateBack = () => {
		if (navigationStack.length > 1) {
			setNavigationStack((prev) => prev.slice(0, -1));
		}
	};

	// Get current panel
	const currentPanel = navigationStack[navigationStack.length - 1];

	// Close navigation and reset stack
	const closeNavigation = () => {
		setNavigationStack([{ type: "main", title: "Menu" }]);
		if (onClose) onClose();
	};

	// Don't render if not open
	if (!open) return null;

	// Reusable header component
	const MobileNavHeader = ({ title = "", showBackButton = false }) => (
		<div className="mobile-nav-header" style={{
			display: "flex",
			flexDirection: "column",
			alignItems:"start",
			padding: "2rem",
    		paddingTop: "1.2rem",
			gap: "0.5rem",
			borderBottom: "1px solid rgba(255, 255, 255, 0.12)"
		}}>
			{/* Top row - Action icons on left */}
			<div style={{ display: "flex", alignItems: "center", minHeight: "40px" }}>
				{/* Search, Cart, Login icons */}
				<div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
					{/* Search Icon */}
					<IconButton
						onClick={() => {
							if (onOpenSearch) {
								onOpenSearch();
								closeNavigation();
							}
						}}
						size="medium"
						sx={{ padding: "6px", color: "white" }}
						aria-label="search">
						<Search fontSize="medium" />
					</IconButton>

					{/* Cart Icon */}
					<IconButton
						onClick={() => {
							if (onOpenCart) {
								onOpenCart();
								closeNavigation();
							}
						}}
						size="medium"
						sx={{ padding: "6px", color: "white" }}
						aria-label="shopping cart">
						<Badge badgeContent={cartCount} color="primary" max={99}>
							<ShoppingCartOutlined fontSize="medium" />
						</Badge>
					</IconButton>

					{/* Login/Profile Icon */}
					<IconButton
						onClick={() => {
							if (onOpenAuth) {
								onOpenAuth();
								closeNavigation();
							}
						}}
						size="medium"
						sx={{ padding: "6px", color: "white" }}
						aria-label={isAuthenticated ? "profile" : "login"}>
						{isAuthenticated ? <AccountCircle fontSize="medium" /> : <Login fontSize="medium" />}
					</IconButton>
				</div>
			</div>

			{/* Bottom row - Back button and Title (only show when on sub-panel) */}
			{showBackButton && (
				<div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
					{/* Back button */}
					<IconButton onClick={navigateBack} size="medium" sx={{ padding: "6px", color: "white" }} aria-label="go back">
						<NavigateBefore fontSize="medium" />
					</IconButton>

					{/* Title */}
					{title && (
						<div className="mobile-nav-title" style={{ flex: 1, fontSize: "1.1rem", fontWeight: "500", color: "white" }}>
							{title}
						</div>
					)}
				</div>
			)}
		</div>
	);

	// Main navigation panel
	const MainPanel = () => (
		<div className="mobile-nav-content">
			<MobileNavHeader title="" showBackButton={false} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<NavLink
						to="/home"
						className="mobile-nav-link"
						onClick={closeNavigation}>
						<span>Home</span>
					</NavLink>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => navigateToPanel("subjects", "Subjects")}>
						<span>Subjects</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => navigateToPanel("products", "Products")}>
						<span>Products</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() =>
							navigateToPanel("distance-learning", "Distance Learning")
						}>
						<span>Distance Learning</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => navigateToPanel("tutorials", "Tutorials")}>
						<span>Tutorials</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={(e) => {
							handleMarkingVouchersClick(e);
							handleNavigation("/products", { group: "8" });
						}}>
						<span>Marking Vouchers</span>
					</div>
				</li>

				{/* Conditional sections based on user permissions */}
				{isApprentice && (
					<li className="mobile-nav-list-item">
						<div
							className="mobile-nav-link"
							style={{ opacity: 0.6, cursor: "not-allowed" }}>
							<span>Apprenticeships</span>
						</div>
					</li>
				)}

				{isStudyPlus && (
					<li className="mobile-nav-list-item">
						<div
							className="mobile-nav-link"
							style={{ opacity: 0.6, cursor: "not-allowed" }}>
							<span>Study Plus</span>
						</div>
					</li>
				)}

				{/* Admin section for superusers */}
				{isSuperuser && (
					<li className="mobile-nav-list-item">
						<div
							className="mobile-nav-link"
							onClick={() => navigateToPanel("admin", "Admin")}>
							<span>Admin</span>
							<span className="mobile-nav-arrow">
								<ExpandMore />
							</span>
						</div>
					</li>
				)}
			</ul>
		</div>
	);

	// Subjects panel
	const SubjectsPanel = () => (
		<div className="mobile-nav-content">
			<MobileNavHeader title="Subjects" showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() =>
							navigateToPanel(
								"subjects-core-principles",
								"Core Principles",
								subjects.filter((s) => /^(CB|CS|CM)/.test(s.code))
							)
						}>
						<span>Core Principles</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() =>
							navigateToPanel(
								"subjects-core-practices",
								"Core Practices",
								subjects.filter((s) => /^CP[1-3]$/.test(s.code))
							)
						}>
						<span>Core Practices</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() =>
							navigateToPanel(
								"subjects-specialist-principles",
								"Specialist Principles",
								subjects.filter((s) => /^SP/.test(s.code))
							)
						}>
						<span>Specialist Principles</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() =>
							navigateToPanel(
								"subjects-specialist-advanced",
								"Specialist Advanced",
								subjects.filter((s) => /^SA/.test(s.code))
							)
						}>
						<span>Specialist Advanced</span>
						<span className="mobile-nav-arrow">
							<ExpandMore />
						</span>
					</div>
				</li>
			</ul>
		</div>
	);

	// Subject category panel (Core Principles, etc.)
	const SubjectCategoryPanel = ({ data }) => (
		<div className="mobile-nav-content">
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				{data &&
					data.map((subject) => (
						<li key={subject.id} className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() => {
									handleSubjectClick(subject.code);
									closeNavigation();
								}}>
								<span>
									{subject.code} - {subject.description}
								</span>
							</div>
						</li>
					))}
			</ul>
		</div>
	);

	// Products panel
	const ProductsPanel = () => (
		<div className="mobile-nav-content">
			<MobileNavHeader title="Products" showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => {
							handleProductClick();
							handleNavigation("/products");
						}}>
						<span>View All Products</span>
					</div>
				</li>
				{loadingProductGroups ? (
					<li className="mobile-nav-list-item">
						<div className="mobile-nav-link" style={{ opacity: 0.6 }}>
							<span>Loading products...</span>
						</div>
					</li>
				) : (
					navbarProductGroups &&
					navbarProductGroups.map((group) => (
						<li
							key={group.id || group.name}
							className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() =>
									navigateToPanel("product-group", group.name, group)
								}>
								<span>{group.name}</span>
								<span className="mobile-nav-arrow">
									<ExpandMore />
								</span>
							</div>
						</li>
					))
				)}
			</ul>
		</div>
	);

	// Product group panel
	const ProductGroupPanel = ({ data }) => (
		<div className="mobile-nav-content">
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => {
							handleProductGroupClick(data.name);
							closeNavigation();
						}}>
						<span>View All {data.name}</span>
					</div>
				</li>
				{data.products && data.products.length > 0 ? (
					data.products.map((product) => (
						<li key={product.id} className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() => {
									handleSpecificProductClick(product.id);
									closeNavigation();
								}}>
								<span>{product.shortname}</span>
							</div>
						</li>
					))
				) : (
					<li className="mobile-nav-list-item">
						<div className="mobile-nav-link" style={{ opacity: 0.6 }}>
							<span>No products available</span>
						</div>
					</li>
				)}
			</ul>
		</div>
	);

	// Distance Learning panel
	const DistanceLearningPanel = () => (
		<div className="mobile-nav-content">
			<MobileNavHeader title="Distance Learning" showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => {
							handleNavigation("/products", {
								distance_learning: "true",
							});
						}}>
						<span>View All Distance Learning</span>
					</div>
				</li>
				{loadingDistanceLearning ? (
					<li className="mobile-nav-list-item">
						<div className="mobile-nav-link" style={{ opacity: 0.6 }}>
							<span>Loading distance learning...</span>
						</div>
					</li>
				) : (
					distanceLearningData &&
					distanceLearningData.map((group) => (
						<li
							key={group.id || group.name}
							className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() =>
									navigateToPanel(
										"distance-learning-group",
										group.name,
										group
									)
								}>
								<span>{group.name}</span>
								<span className="mobile-nav-arrow">
									<ExpandMore />
								</span>
							</div>
						</li>
					))
				)}
			</ul>
		</div>
	);

	// Tutorials panel
	const TutorialsPanel = () => (
		<div className="mobile-nav-content">
			<MobileNavHeader title="Tutorials" showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => {
							handleNavigation("/products?main_category=Tutorials");
						}}>
						<span>View All Tutorials</span>
					</div>
				</li>
				{loadingTutorial ? (
					<li className="mobile-nav-list-item">
						<div className="mobile-nav-link" style={{ opacity: 0.6 }}>
							<span>Loading tutorials...</span>
						</div>
					</li>
				) : tutorialData ? (
					<>
						{tutorialData.Location && (
							<li className="mobile-nav-list-item">
								<div
									className="mobile-nav-link"
									onClick={() =>
										navigateToPanel(
											"tutorial-location",
											"Location",
											tutorialData.Location
										)
									}>
									<span>Location</span>
									<span className="mobile-nav-arrow">
										<ExpandMore />
									</span>
								</div>
							</li>
						)}
						{tutorialData.Format && tutorialData.Format.length > 0 && (
							<li className="mobile-nav-list-item">
								<div
									className="mobile-nav-link"
									onClick={() =>
										navigateToPanel(
											"tutorial-format",
											"Format",
											tutorialData.Format
										)
									}>
									<span>Format</span>
									<span className="mobile-nav-arrow">
										<ExpandMore />
									</span>
								</div>
							</li>
						)}
						{tutorialData["Online Classroom"] &&
							tutorialData["Online Classroom"].length > 0 && (
								<li className="mobile-nav-list-item">
									<div
										className="mobile-nav-link"
										onClick={() =>
											navigateToPanel(
												"tutorial-online",
												"Online Classroom",
												tutorialData["Online Classroom"]
											)
										}>
										<span>Online Classroom</span>
										<span className="mobile-nav-arrow">
											<ExpandMore />
										</span>
									</div>
								</li>
							)}
					</>
				) : (
					<li className="mobile-nav-list-item">
						<div className="mobile-nav-link" style={{ opacity: 0.6 }}>
							<span>No tutorial data available</span>
						</div>
					</li>
				)}
			</ul>
		</div>
	);

	// Tutorial category panels
	const TutorialCategoryPanel = ({ data, type }) => (
		<div className="mobile-nav-content">
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				{type === "format" ? (
					data.map((format) => (
						<li key={format.filter_type} className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() => {
									handleProductGroupClick(format.group_name);
									closeNavigation();
								}}>
								<span>{format.name}</span>
							</div>
						</li>
					))
				) : type === "online" ? (
					data.map((variation) => (
						<li key={variation.id} className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() => {
									handleProductVariationClick(variation.id);
									closeNavigation();
								}}>
								<span>{variation.description || variation.name}</span>
							</div>
						</li>
					))
				) : (
					// Location type - both left and right products
					<>
						{data.left &&
							data.left.map((product) => (
								<li key={product.id} className="mobile-nav-list-item">
									<div
										className="mobile-nav-link"
										onClick={() => {
											handleSpecificProductClick(product.id);
											closeNavigation();
										}}>
										<span>{product.shortname}</span>
									</div>
								</li>
							))}
						{data.right &&
							data.right.map((product) => (
								<li key={product.id} className="mobile-nav-list-item">
									<div
										className="mobile-nav-link"
										onClick={() => {
											handleSpecificProductClick(product.id);
											closeNavigation();
										}}>
										<span>{product.shortname}</span>
									</div>
								</li>
							))}
					</>
				)}
			</ul>
		</div>
	);

	// Admin panel
	const AdminPanel = () => (
		<div className="mobile-nav-content">
			<MobileNavHeader title="Admin" showBackButton={true} />
			<ul className="mobile-nav-list" style={{ paddingLeft: "1rem" }}>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => handleNavigation("/admin/exam-sessions")}>
						<span>Exam Sessions</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => handleNavigation("/admin/subjects")}>
						<span>Subjects</span>
					</div>
				</li>
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => handleNavigation("/admin/products")}>
						<span>Products</span>
					</div>
				</li>
			</ul>
		</div>
	);

	// Render current panel content
	const renderCurrentPanel = () => {
		switch (currentPanel.type) {
			case "main":
				return <MainPanel />;
			case "subjects":
				return <SubjectsPanel />;
			case "subjects-core-principles":
			case "subjects-core-practices":
			case "subjects-specialist-principles":
			case "subjects-specialist-advanced":
				return <SubjectCategoryPanel data={currentPanel.data} />;
			case "products":
				return <ProductsPanel />;
			case "product-group":
			case "distance-learning-group":
				return <ProductGroupPanel data={currentPanel.data} />;
			case "distance-learning":
				return <DistanceLearningPanel />;
			case "tutorials":
				return <TutorialsPanel />;
			case "tutorial-location":
				return (
					<TutorialCategoryPanel
						data={currentPanel.data}
						type="location"
					/>
				);
			case "tutorial-format":
				return (
					<TutorialCategoryPanel data={currentPanel.data} type="format" />
				);
			case "tutorial-online":
				return (
					<TutorialCategoryPanel data={currentPanel.data} type="online" />
				);
			case "admin":
				return <AdminPanel />;
			default:
				return <MainPanel />;
		}
	};

	// Handle clicks on the panel content area
	const handlePanelClick = (e) => {
		// Only close if clicking on the panel background, not on links or interactive elements
		if (
			e.target.classList.contains("mobile-nav-panel") ||
			e.target.classList.contains("mobile-nav-list")
		) {
			closeNavigation();
		}
	};

	return (
		<div className={`mobile-navigation-container ${open ? "open" : ""}`}>
			<div className="mobile-nav-backdrop" onClick={closeNavigation}></div>
			<div
				className={`mobile-nav-panel slide-right ${open ? "active" : ""}`}
				onClick={handlePanelClick}>
				{renderCurrentPanel()}
			</div>
		</div>
	);
};

export default MobileNavigation;
