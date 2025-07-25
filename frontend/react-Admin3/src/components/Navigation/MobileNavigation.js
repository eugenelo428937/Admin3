// src/components/MobileNavigation.js
import React, { useState } from "react";
import { Nav } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { NavigateBefore, ExpandMore } from "@mui/icons-material";

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
	handleTutorialFormatClick,
}) => {
	const { isSuperuser, isApprentice, isStudyPlus } = useAuth();
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

	// Main navigation panel
	const MainPanel = () => (
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<div className="mobile-nav-title"></div>
			</div>
			<ul className="mobile-nav-list">
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
						onClick={() => {
							handleMarkingVouchersClick();
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">Subjects</div>
			</div>
			<ul className="mobile-nav-list">
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">{currentPanel.title}</div>
			</div>
			<ul className="mobile-nav-list">
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">Products</div>
			</div>
			<ul className="mobile-nav-list">
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">{currentPanel.title}</div>
			</div>
			<ul className="mobile-nav-list">
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">Distance Learning</div>
			</div>
			<ul className="mobile-nav-list">
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">Tutorials</div>
			</div>
			<ul className="mobile-nav-list">
				<li className="mobile-nav-list-item">
					<div
						className="mobile-nav-link"
						onClick={() => {
							handleNavigation("/products", { tutorial: "true" });
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">{currentPanel.title}</div>
			</div>
			<ul className="mobile-nav-list">
				{type === "format" ? (
					data.map((format) => (
						<li key={format.filter_type} className="mobile-nav-list-item">
							<div
								className="mobile-nav-link"
								onClick={() => {
									handleTutorialFormatClick(format.group_name);
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
		<div className="mobile-nav-content p-left__md">
			<div className="mobile-nav-header">
				<button className="mobile-nav-back-btn" onClick={navigateBack}>
					<NavigateBefore />
				</button>
				<div className="mobile-nav-title">Admin</div>
			</div>
			<ul className="mobile-nav-list">
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
