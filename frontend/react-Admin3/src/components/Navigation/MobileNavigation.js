// src/components/MobileNavigation.js
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../contexts/CartContext";
import { NavigateBefore, ExpandMore, Search, ShoppingCartOutlined, Login, AccountCircle } from "@mui/icons-material";
import { IconButton, Badge, Drawer, List, ListItem, ListItemButton, ListItemText, Box } from "@mui/material";

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

	// Reusable header component
	const MobileNavHeader = ({ title = "", showBackButton = false }) => (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "start",
				p: 2,
				pt: 1.5,
				gap: 0.5,
				borderBottom: 1,
				borderColor: 'rgba(255, 255, 255, 0.12)'
			}}
		>
			{/* Top row - Action icons on left */}
			<Box sx={{ display: "flex", alignItems: "center", minHeight: "40px" }}>
				{/* Search, Cart, Login icons */}
				<Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
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
				</Box>
			</Box>

			{/* Bottom row - Back button and Title (only show when on sub-panel) */}
			{showBackButton && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
					{/* Back button */}
					<IconButton onClick={navigateBack} size="medium" sx={{ padding: "6px", color: "white" }} aria-label="go back">
						<NavigateBefore fontSize="medium" />
					</IconButton>

					{/* Title */}
					{title && (
						<Box sx={{ flex: 1, fontSize: "1.1rem", fontWeight: "500", color: "white" }}>
							{title}
						</Box>
					)}
				</Box>
			)}
		</Box>
	);

	// Main navigation panel
	const MainPanel = () => (
		<Box>
			<MobileNavHeader title="" showBackButton={false} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton component={NavLink} to="/home" onClick={closeNavigation}>
						<ListItemText primary="Home" />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("subjects", "Subjects")}>
						<ListItemText primary="Subjects" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("products", "Products")}>
						<ListItemText primary="Products" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("distance-learning", "Distance Learning")}>
						<ListItemText primary="Distance Learning" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("tutorials", "Tutorials")}>
						<ListItemText primary="Tutorials" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
					{/* Conditional sections based on user permissions */}
				{isApprentice && (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="Apprenticeships" />
						</ListItemButton>
					</ListItem>
				)}

				{isStudyPlus && (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="Study Plus" />
						</ListItemButton>
					</ListItem>
				)}

				{/* Admin section for superusers */}
				{isSuperuser && (
					<ListItem disablePadding>
						<ListItemButton onClick={() => navigateToPanel("admin", "Admin")}>
							<ListItemText primary="Admin" />
							<ExpandMore />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	// Subjects panel
	const SubjectsPanel = () => (
		<Box>
			<MobileNavHeader title="Subjects" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							navigateToPanel(
								"subjects-core-principles",
								"Core Principles",
								subjects.filter((s) => /^(CB|CS|CM)/.test(s.code))
							)
						}>
						<ListItemText primary="Core Principles" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							navigateToPanel(
								"subjects-core-practices",
								"Core Practices",
								subjects.filter((s) => /^CP[1-3]$/.test(s.code))
							)
						}>
						<ListItemText primary="Core Practices" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							navigateToPanel(
								"subjects-specialist-principles",
								"Specialist Principles",
								subjects.filter((s) => /^SP/.test(s.code))
							)
						}>
						<ListItemText primary="Specialist Principles" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							navigateToPanel(
								"subjects-specialist-advanced",
								"Specialist Advanced",
								subjects.filter((s) => /^SA/.test(s.code))
							)
						}>
						<ListItemText primary="Specialist Advanced" />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
			</List>
		</Box>
	);

	// Subject category panel (Core Principles, etc.)
	const SubjectCategoryPanel = ({ data }) => (
		<Box>
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				{data &&
					data.map((subject) => (
						<ListItem key={subject.id} disablePadding>
							<ListItemButton
								onClick={() => {
									handleSubjectClick(subject.code);
									closeNavigation();
								}}>
								<ListItemText primary={`${subject.code} - ${subject.description}`} />
							</ListItemButton>
						</ListItem>
					))}
			</List>
		</Box>
	);

	// Products panel
	const ProductsPanel = () => (
		<Box>
			<MobileNavHeader title="Products" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							handleProductClick();
							handleNavigation("/products");
						}}>
						<ListItemText primary="View All Products" />
					</ListItemButton>
				</ListItem>
				{loadingProductGroups ? (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="Loading products..." />
						</ListItemButton>
					</ListItem>
				) : (
					navbarProductGroups &&
					navbarProductGroups.map((group) => (
						<ListItem key={group.id || group.name} disablePadding>
							<ListItemButton
								onClick={() =>
									navigateToPanel("product-group", group.name, group)
								}>
								<ListItemText primary={group.name} />
								<ExpandMore />
							</ListItemButton>
						</ListItem>
					))
				)}
			</List>
		</Box>
	);

	// Product group panel
	const ProductGroupPanel = ({ data }) => (
		<Box>
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							handleProductGroupClick(data.name);
							closeNavigation();
						}}>
						<ListItemText primary={`View All ${data.name}`} />
					</ListItemButton>
				</ListItem>
				{data.products && data.products.length > 0 ? (
					data.products.map((product) => (
						<ListItem key={product.id} disablePadding>
							<ListItemButton
								onClick={() => {
									handleSpecificProductClick(product.id);
									closeNavigation();
								}}>
								<ListItemText primary={product.shortname} />
							</ListItemButton>
						</ListItem>
					))
				) : (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="No products available" />
						</ListItemButton>
					</ListItem>
				)}
				{/* Add Marking Vouchers link under Marking group */}
				{data.name === "Marking" && (
					<ListItem disablePadding>
						<ListItemButton
							onClick={(e) => {
								handleMarkingVouchersClick(e);
								handleNavigation("/products", { group: "8" });
							}}>
							<ListItemText primary="Marking Vouchers" />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	// Distance Learning panel
	const DistanceLearningPanel = () => (
		<Box>
			<MobileNavHeader title="Distance Learning" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							handleNavigation("/products", {
								distance_learning: "true",
							});
						}}>
						<ListItemText primary="View All Distance Learning" />
					</ListItemButton>
				</ListItem>
				{loadingDistanceLearning ? (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="Loading distance learning..." />
						</ListItemButton>
					</ListItem>
				) : (
					distanceLearningData &&
					distanceLearningData.map((group) => (
						<ListItem key={group.id || group.name} disablePadding>
							<ListItemButton
								onClick={() =>
									navigateToPanel(
										"distance-learning-group",
										group.name,
										group
									)
								}>
								<ListItemText primary={group.name} />
								<ExpandMore />
							</ListItemButton>
						</ListItem>
					))
				)}
			</List>
		</Box>
	);

	// Tutorials panel
	const TutorialsPanel = () => (
		<Box>
			<MobileNavHeader title="Tutorials" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							handleNavigation("/products?main_category=Tutorials");
						}}>
						<ListItemText primary="View All Tutorials" />
					</ListItemButton>
				</ListItem>
				{loadingTutorial ? (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="Loading tutorials..." />
						</ListItemButton>
					</ListItem>
				) : tutorialData ? (
					<>
						{tutorialData.Location && (
							<ListItem disablePadding>
								<ListItemButton
									onClick={() =>
										navigateToPanel(
											"tutorial-location",
											"Location",
											tutorialData.Location
										)
									}>
									<ListItemText primary="Location" />
									<ExpandMore />
								</ListItemButton>
							</ListItem>
						)}
						{tutorialData.Format && tutorialData.Format.length > 0 && (
							<ListItem disablePadding>
								<ListItemButton
									onClick={() =>
										navigateToPanel(
											"tutorial-format",
											"Format",
											tutorialData.Format
										)
									}>
									<ListItemText primary="Format" />
									<ExpandMore />
								</ListItemButton>
							</ListItem>
						)}
						{tutorialData["Online Classroom"] &&
							tutorialData["Online Classroom"].length > 0 && (
								<ListItem disablePadding>
									<ListItemButton
										onClick={() =>
											navigateToPanel(
												"tutorial-online",
												"Online Classroom",
												tutorialData["Online Classroom"]
											)
										}>
										<ListItemText primary="Online Classroom" />
										<ExpandMore />
									</ListItemButton>
								</ListItem>
							)}
					</>
				) : (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary="No tutorial data available" />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	// Tutorial category panels
	const TutorialCategoryPanel = ({ data, type }) => (
		<Box>
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				{type === "format" ? (
					data.map((format) => (
						<ListItem key={format.filter_type} disablePadding>
							<ListItemButton
								onClick={() => {
									handleProductGroupClick(format.group_name);
									closeNavigation();
								}}>
								<ListItemText primary={format.name} />
							</ListItemButton>
						</ListItem>
					))
				) : type === "online" ? (
					data.map((variation) => (
						<ListItem key={variation.id} disablePadding>
							<ListItemButton
								onClick={() => {
									handleProductVariationClick(variation.id);
									closeNavigation();
								}}>
								<ListItemText primary={variation.description || variation.name} />
							</ListItemButton>
						</ListItem>
					))
				) : (
					// Location type - both left and right products
					<>
						{data.left &&
							data.left.map((product) => (
								<ListItem key={product.id} disablePadding>
									<ListItemButton
										onClick={() => {
											handleSpecificProductClick(product.id);
											closeNavigation();
										}}>
										<ListItemText primary={product.shortname} />
									</ListItemButton>
								</ListItem>
							))}
						{data.right &&
							data.right.map((product) => (
								<ListItem key={product.id} disablePadding>
									<ListItemButton
										onClick={() => {
											handleSpecificProductClick(product.id);
											closeNavigation();
										}}>
										<ListItemText primary={product.shortname} />
									</ListItemButton>
								</ListItem>
							))}
					</>
				)}
			</List>
		</Box>
	);

	// Admin panel
	const AdminPanel = () => (
		<Box>
			<MobileNavHeader title="Admin" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton onClick={() => handleNavigation("/admin/exam-sessions")}>
						<ListItemText primary="Exam Sessions" />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => handleNavigation("/admin/subjects")}>
						<ListItemText primary="Subjects" />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => handleNavigation("/admin/products")}>
						<ListItemText primary="Products" />
					</ListItemButton>
				</ListItem>
			</List>
		</Box>
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

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={closeNavigation}
			aria-label="Mobile navigation menu"
			ModalProps={{
				keepMounted: true, // Better mobile performance
			}}
			sx={{
				'& .MuiDrawer-paper': {
					width: '85%',
					maxWidth: 360,
					backgroundColor: 'primary.main',
				},
			}}
		>
			{renderCurrentPanel()}
		</Drawer>
	);
};

export default MobileNavigation;
