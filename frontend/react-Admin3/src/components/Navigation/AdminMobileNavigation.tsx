import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavigateBefore, ExpandMore, Search, MenuBook as KnowledgeBaseIcon } from '@mui/icons-material';
import { IconButton, Tooltip, Drawer, List, ListItem, ListItemButton, ListItemText, Box, Typography, useTheme } from '@mui/material';
import useAdminMobileNavigationVM from './useAdminMobileNavigationVM';
import type { AdminMobileNavigationProps, AdminNavLink } from '../../types/navigation';

const AdminMobileNavigation: React.FC<AdminMobileNavigationProps> = ({
	open,
	onClose,
	onOpenSearch,
}) => {
	const vm = useAdminMobileNavigationVM(onClose);
	const theme = useTheme() as any;

	// Reusable header component
	const MobileNavHeader: React.FC<{ title?: string; showBackButton?: boolean }> = ({ title = '', showBackButton = false }) => (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'start',
				p: 2,
				pt: 1.5,
				gap: 0.5,
				borderBottom: 1,
				borderColor: theme.palette.navigation.mobile.border,
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
				<Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
					<Tooltip title="Knowledge Base">
						<IconButton
							size="medium"
							
							aria-label="knowledge base">
							<KnowledgeBaseIcon fontSize="medium" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Search">
						<IconButton
							onClick={() => {
								if (onOpenSearch) {
									onOpenSearch();
									vm.closeNavigation();
								}
							}}
							size="medium"
							
							aria-label="search">
							<Search fontSize="medium" />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
			{showBackButton && (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
					<IconButton onClick={vm.navigateBack} size="medium" variant={'mobileNavIcon' as any} aria-label="go back">
						<NavigateBefore fontSize="medium" />
					</IconButton>
					{title && (
						<Typography variant={'mainnavlink' as any}>
							{title}
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);

	// Render a link list panel
	const LinkListPanel: React.FC<{ links: AdminNavLink[] }> = ({ links }) => (
		<Box>
			<MobileNavHeader title={vm.currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				{links.map((link) => (
					<ListItem key={link.to} disablePadding>
						<ListItemButton
							disabled={link.disabled}
							onClick={() => vm.handleNavigation(link.to)}
						>
							<ListItemText
								primary={
									<Typography variant={'mainnavlink' as any}>
										{link.label}
										{link.disabled && (
											<Typography
												component="span"
												variant="caption"
												sx={{ ml: 1, fontStyle: 'italic', opacity: 0.7 }}
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
	const MainPanel: React.FC = () => (
		<Box>
			<MobileNavHeader title="" showBackButton={false} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton component={NavLink as any} to="/home" onClick={vm.closeNavigation}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Home</Typography>} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('email', 'Email Admin')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Email Admin</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('users', 'Users')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Users</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('marking', 'Marking')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Marking</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('tutorials', 'Tutorials')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Tutorials</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				{vm.isSuperuser && (
					<ListItem disablePadding>
						<ListItemButton onClick={() => vm.navigateToPanel('admin', 'Admin')}>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Admin</Typography>} />
							<ExpandMore />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	const renderCurrentPanel = () => {
		switch (vm.currentPanel.type) {
			case 'main':
				return <MainPanel />;
			case 'email':
				return <LinkListPanel links={vm.emailLinks} />;
			case 'users':
				return <LinkListPanel links={vm.usersLinks} />;
			case 'marking':
				return <LinkListPanel links={vm.markingLinks} />;
			case 'tutorials':
				return <LinkListPanel links={vm.tutorialLinks} />;
			case 'admin':
				return <LinkListPanel links={vm.adminLinks} />;
			default:
				return <MainPanel />;
		}
	};

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={vm.closeNavigation}
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
