import React from 'react';
import {
	Box,
	Button,
	Container,
	Grid,
	MenuItem,
	MenuList,
	Typography,
	useTheme
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import MegaMenuPopover from './MegaMenuPopover.tsx';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type { AdminNavigationMenuProps, AdminNavLink, AdminCategories } from '../../types/navigation';

const AdminNavigationMenu: React.FC<AdminNavigationMenuProps> = ({ onCollapseNavbar }) => {
	const theme = useTheme() as any;
	const { isSuperuser } = useAuth();

	// Email Admin links
	const emailLinks: AdminNavLink[] = [
		{ label: 'Settings', to: '/admin/email/settings' },
		{ label: 'Templates', to: '/admin/email/templates' },
		{ label: 'Queue', to: '/admin/email/queue' },
		{ label: 'Attachments', to: '/admin/email/attachments' },
		{ label: 'Content Rules', to: '/admin/email/content-rules' },
		{ label: 'Placeholders', to: '/admin/email/placeholders' },
		{ label: 'Closing Salutations', to: '/admin/email/closing-salutations' },
	];

	// Users links
	const usersLinks: AdminNavLink[] = [
		{ label: 'User List', to: '/admin/user-profiles' },
		{ label: 'Staff List', to: '/admin/staff' },
		{ label: 'Student List', to: '/admin/students', disabled: true },
	];

	// Marking links
	const markingLinks: AdminNavLink[] = [
		{ label: 'Marking History', to: '/admin/marking-history', disabled: true },
		{ label: 'Markers', to: '/admin/markers', disabled: true },
	];

	// Tutorials links
	const tutorialLinks: AdminNavLink[] = [
		{ label: 'New Session Setup', to: '/admin/new-session-setup' },
		{ label: 'Events', to: '/admin/tutorial-events', disabled: true },
		{ label: 'Course Templates', to: '/admin/course-templates', disabled: true },
		{ label: 'Instructors', to: '/admin/instructors', disabled: true },
		{ label: 'Locations', to: '/admin/locations', disabled: true },
		{ label: 'Venues', to: '/admin/venues', disabled: true },
		{ label: 'Price Levels', to: '/admin/price-levels', disabled: true },
		{ label: 'Custom Fields', to: '/admin/custom-fields', disabled: true },
	];

	// Admin MegaMenu category definitions (same as public NavigationMenu)
	const adminCategories: AdminCategories = {
		row1: [
			{
				label: 'Catalog',
				enabled: true,
				links: [
					{ label: 'Exam Sessions', to: '/admin/exam-sessions' },
					{ label: 'Subjects', to: '/admin/subjects' },
					{ label: 'Exam Session Subjects', to: '/admin/exam-session-subjects' },
					{ label: 'Products', to: '/admin/products' },
					{ label: 'Product Variations', to: '/admin/product-variations' },
					{ label: 'Product Bundles Template', to: '/admin/product-bundles' },
				],
			},
			{
				label: 'Current products',
				enabled: true,
				links: [
					{ label: 'Products', to: '/admin/store-products' },
					{ label: 'Recommendations', to: '/admin/recommendations' },
					{ label: 'Prices', to: '/admin/prices' },
					{ label: 'Bundles ', to: '/admin/store-bundles' },
				],
			},
			{
				label: 'Filtering',
				enabled: false,
				links: [
					{ label: 'Filter Groups', to: '/admin/filter-groups' },
					{ label: 'Filter Configuration', to: '/admin/filter-config' },
				],
			},
			{
				label: 'Users',
				enabled: true,
				links: [
					{ label: 'User List', to: '/admin/user-profiles' },
					{ label: 'Staff List', to: '/admin/staff' },
				],
			},
		],
		row2: [
			{
				label: 'Tutorials',
				enabled: false,
				links: [
					{ label: 'Tutorial Events', to: '/admin/tutorial-events' },
					{ label: 'Tutorial Sessions', to: '/admin/tutorial-sessions' },
				],
			},
			{
				label: 'Marking',
				enabled: false,
				links: [
					{ label: 'Marking Vouchers', to: '/admin/marking-vouchers' },
					{ label: 'Marking Assignments', to: '/admin/marking-assignments' },
				],
			},
			{
				label: 'Orders',
				enabled: false,
				links: [
					{ label: 'Orders', to: '/admin/orders' },
					{ label: 'Order Items', to: '/admin/order-items' },
				],
			},
			{
				label: 'Email System',
				enabled: true,
				links: [
					{ label: 'Settings', to: '/admin/email/settings' },
					{ label: 'Templates', to: '/admin/email/templates' },
					{ label: 'Queue', to: '/admin/email/queue' },
					{ label: 'Attachments', to: '/admin/email/attachments' },
					{ label: 'Content Rules', to: '/admin/email/content-rules' },
					{ label: 'Placeholders', to: '/admin/email/placeholders' },
				],
			},
		],
	};

	// Render a list of links inside a MegaMenuPopover
	const renderLinkList = (links: AdminNavLink[]) => (
		<MenuList variant={'nav_menu' as any} dense>
			{links.map((link) => (
				<MenuItem
					variant={'nav_menu' as any}
					key={link.to}
					component={NavLink as any}
					to={link.to}
					disabled={link.disabled}
					onClick={() => onCollapseNavbar?.()}
					sx={link.disabled ? { opacity: 0.5 } : undefined}
				>
					{link.label}
					{link.disabled && (
						<Typography
							variant="caption"
							sx={{ ml: 1, fontStyle: 'italic', opacity: 0.7 }}
						>
							(coming soon)
						</Typography>
					)}
				</MenuItem>
			))}
		</MenuList>
	);

	return (
		<Container
			component="nav"
			aria-label="Admin navigation"
			disableGutters
			sx={{
				display: { xs: 'none', md: 'flex' },
				flexWrap: 'wrap',
				alignItems: 'center',
				justifyContent: { xs: 'flex-start' },
				width: 'auto',
				gap: theme.gaps.normal,
			}}
		>
			{/* Home */}
			<Button component={NavLink as any} to="/home" variant={'main_nav_link' as any}>
				<Typography variant={'main_nav_text' as any}>Home</Typography>
			</Button>

			{/* Email Admin */}
			<MegaMenuPopover
				id="email-admin"
				label="Email Admin"
				width={600}
				onClose={onCollapseNavbar}
			>
				<Typography
					variant={'mega-nav-heading' as any}
					sx={{ mb: 1, fontWeight: 'bold' }}
				>
					Email System
				</Typography>
				{renderLinkList(emailLinks)}
			</MegaMenuPopover>

			{/* Users */}
			<MegaMenuPopover
				id="users-admin"
				label="Users"
				width={400}
				onClose={onCollapseNavbar}
			>
				<Typography
					variant={'mega-nav-heading' as any}
					sx={{ mb: 1, fontWeight: 'bold' }}
				>
					User Management
				</Typography>
				{renderLinkList(usersLinks)}
			</MegaMenuPopover>

			{/* Marking */}
			<MegaMenuPopover
				id="marking-admin"
				label="Marking"
				width={400}
				onClose={onCollapseNavbar}
			>
				<Typography
					variant={'mega-nav-heading' as any}
					sx={{ mb: 1, fontWeight: 'bold' }}
				>
					Marking
				</Typography>
				{renderLinkList(markingLinks)}
			</MegaMenuPopover>

			{/* Tutorials */}
			<MegaMenuPopover
				id="tutorials-admin"
				label="Tutorials"
				width={600}
				onClose={onCollapseNavbar}
			>
				<Typography
					variant={'mega-nav-heading' as any}
					sx={{ mb: 1, fontWeight: 'bold' }}
				>
					Tutorial Management
				</Typography>
				{renderLinkList(tutorialLinks)}
			</MegaMenuPopover>

			{/* Admin MegaMenu (same as public nav) */}
			{isSuperuser ? (
				<MegaMenuPopover
					id="admin-menu"
					label="Admin"
					onClose={() => onCollapseNavbar?.()}
				>
					{[adminCategories.row1, adminCategories.row2].map(
						(row, rowIndex) => (
							<React.Fragment key={rowIndex}>
								<Grid
									container
									spacing={3}
									sx={{ mb: 2 }}
								>
									{row.map((category) => (
										<Grid item xs={6} sm={3} key={category.label}>
											<Box
												data-disabled={
													!category.enabled ? 'true' : undefined
												}
												sx={{
													...(!category.enabled && {
														opacity: 0.5,
														pointerEvents: 'none',
													}),
												}}
											>
												<Typography
													variant={'mega-nav-heading' as any}
													sx={{
														mb: 1,
														fontWeight: 'bold',
													}}
												>
													{category.label}
												</Typography>
												<MenuList variant={'nav_menu' as any} dense>
													{category.links.map((link) => (
														<MenuItem
															variant={'nav_menu' as any}
															key={link.to}
															component={NavLink as any}
															to={link.to}
															onClick={() => onCollapseNavbar?.()}
														>
															{link.label}
														</MenuItem>
													))}
												</MenuList>
											</Box>
										</Grid>
									))}
								</Grid>
								{/* New Session Setup button between row1 and row2 */}
								{rowIndex === 0 && (
									<Box sx={{ mb: 2 }}>
										<Button
											variant={'navViewAll' as any}
											component={NavLink as any}
											to="/admin/new-session-setup"
											onClick={() => onCollapseNavbar?.()}
										>
											<Typography variant={'navViewAllText' as any}>
												New Session Setup
											</Typography>
											<NavigateNextIcon />
										</Button>
									</Box>
								)}
							</React.Fragment>
						)
					)}
				</MegaMenuPopover>
			) : null}
		</Container>
	);
};

export default AdminNavigationMenu;
