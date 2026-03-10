import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { NavigateBefore, ExpandMore, Search, MenuBook as KnowledgeBaseIcon } from "@mui/icons-material";
import { IconButton, Tooltip, Drawer, List, ListItem, ListItemButton, ListItemText, Box, Typography, useTheme } from "@mui/material";

const AdminMobileNavigation = ({
	open,
	onClose,
	onOpenSearch,
}) => {
	const { isSuperuser } = useAuth();
	const navigate = useNavigate();
	const theme = useTheme();

	const [navigationStack, setNavigationStack] = useState([
		{ type: "main", title: "Menu" },
	]);

	const handleNavigation = (path) => {
		navigate(path);
		closeNavigation();
	};

	const navigateToPanel = (panelType, title, data = null) => {
		setNavigationStack((prev) => [...prev, { type: panelType, title, data }]);
	};

	const navigateBack = () => {
		if (navigationStack.length > 1) {
			setNavigationStack((prev) => prev.slice(0, -1));
		}
	};

	const currentPanel = navigationStack[navigationStack.length - 1];

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
				borderColor: theme.palette.navigation.mobile.border,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", minHeight: "40px" }}>
				<Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
					<Tooltip title="Knowledge Base">
						<IconButton
							size="medium"
							variant="mobileNavIcon"
							aria-label="knowledge base">
							<KnowledgeBaseIcon fontSize="medium" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Search">
						<IconButton
							onClick={() => {
								if (onOpenSearch) {
									onOpenSearch();
									closeNavigation();
								}
							}}
							size="medium"
							variant="mobileNavIcon"
							aria-label="search">
							<Search fontSize="medium" />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
			{showBackButton && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
					<IconButton onClick={navigateBack} size="medium" variant="mobileNavIcon" aria-label="go back">
						<NavigateBefore fontSize="medium" />
					</IconButton>
					{title && (
						<Typography variant="mainnavlink">
							{title}
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);

	// Link list data
	const emailLinks = [
		{ label: "Settings", to: "/admin/email/settings" },
		{ label: "Templates", to: "/admin/email/templates" },
		{ label: "Queue", to: "/admin/email/queue" },
		{ label: "Attachments", to: "/admin/email/attachments" },
		{ label: "Content Rules", to: "/admin/email/content-rules" },
		{ label: "Placeholders", to: "/admin/email/placeholders" },
		{ label: "Closing Salutations", to: "/admin/email/closing-salutations" },
	];

	const usersLinks = [
		{ label: "User List", to: "/admin/user-profiles" },
		{ label: "Staff List", to: "/admin/staff" },
		{ label: "Student List", to: "/admin/students", disabled: true },
	];

	const markingLinks = [
		{ label: "Marking History", to: "/admin/marking-history", disabled: true },
		{ label: "Markers", to: "/admin/markers", disabled: true },
	];

	const tutorialLinks = [
		{ label: "New Session Setup", to: "/admin/new-session-setup" },
		{ label: "Events", to: "/admin/tutorial-events", disabled: true },
		{ label: "Course Templates", to: "/admin/course-templates", disabled: true },
		{ label: "Instructors", to: "/admin/instructors", disabled: true },
		{ label: "Locations", to: "/admin/locations", disabled: true },
		{ label: "Venues", to: "/admin/venues", disabled: true },
		{ label: "Price Levels", to: "/admin/price-levels", disabled: true },
		{ label: "Custom Fields", to: "/admin/custom-fields", disabled: true },
	];

	const adminLinks = [
		{ label: "Exam Sessions", to: "/admin/exam-sessions" },
		{ label: "Subjects", to: "/admin/subjects" },
		{ label: "Products", to: "/admin/products" },
		{ label: "Store Products", to: "/admin/store-products" },
		{ label: "New Session Setup", to: "/admin/new-session-setup" },
	];

	// Render a link list panel
	const LinkListPanel = ({ links }) => (
		<Box>
			<MobileNavHeader title={currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				{links.map((link) => (
					<ListItem key={link.to} disablePadding>
						<ListItemButton
							disabled={link.disabled}
							onClick={() => handleNavigation(link.to)}
						>
							<ListItemText
								primary={
									<Typography variant="mainnavlink">
										{link.label}
										{link.disabled && (
											<Typography
												component="span"
												variant="caption"
												sx={{ ml: 1, fontStyle: "italic", opacity: 0.7 }}
											>
												(coming soon)
											</Typography>
										)}
									</Typography>
								}
							/>
						</ListItemButton>
					</ListItem>
				))}
			</List>
		</Box>
	);

	// Main panel
	const MainPanel = () => (
		<Box>
			<MobileNavHeader title="" showBackButton={false} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton component={NavLink} to="/home" onClick={closeNavigation}>
						<ListItemText primary={<Typography variant="mainnavlink">Home</Typography>} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("email", "Email Admin")}>
						<ListItemText primary={<Typography variant="mainnavlink">Email Admin</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("users", "Users")}>
						<ListItemText primary={<Typography variant="mainnavlink">Users</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("marking", "Marking")}>
						<ListItemText primary={<Typography variant="mainnavlink">Marking</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => navigateToPanel("tutorials", "Tutorials")}>
						<ListItemText primary={<Typography variant="mainnavlink">Tutorials</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				{isSuperuser && (
					<ListItem disablePadding>
						<ListItemButton onClick={() => navigateToPanel("admin", "Admin")}>
							<ListItemText primary={<Typography variant="mainnavlink">Admin</Typography>} />
							<ExpandMore />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	const renderCurrentPanel = () => {
		switch (currentPanel.type) {
			case "main":
				return <MainPanel />;
			case "email":
				return <LinkListPanel links={emailLinks} />;
			case "users":
				return <LinkListPanel links={usersLinks} />;
			case "marking":
				return <LinkListPanel links={markingLinks} />;
			case "tutorials":
				return <LinkListPanel links={tutorialLinks} />;
			case "admin":
				return <LinkListPanel links={adminLinks} />;
			default:
				return <MainPanel />;
		}
	};

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={closeNavigation}
			aria-label="Admin mobile navigation menu"
			ModalProps={{
				keepMounted: true,
			}}
			sx={{
				'& .MuiDrawer-paper': {
					width: '85%',
					maxWidth: 360,
					backgroundColor: theme.palette.navigation.mobile.background,
				},
			}}
		>
			{renderCurrentPanel()}
		</Drawer>
	);
};

export default AdminMobileNavigation;
