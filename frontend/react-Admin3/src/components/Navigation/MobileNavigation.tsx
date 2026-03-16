import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavigateBefore, ExpandMore, Search, ShoppingCartOutlined, Login, AccountCircle } from '@mui/icons-material';
import { IconButton, Badge, Drawer, List, ListItem, ListItemButton, ListItemText, Box, Typography, useTheme } from '@mui/material';
import useMobileNavigationVM from './useMobileNavigationVM.ts';
import type { MobileNavigationProps, NavigationSubject, NavigationProductGroup, TutorialFormat, TutorialOnlineClassroom, NavigationProduct } from '../../types/navigation';

const MobileNavigation: React.FC<MobileNavigationProps> = ({
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
	const vm = useMobileNavigationVM(onClose);
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
			{/* Top row - Action icons on left */}
			<Box sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
				{/* Search, Cart, Login icons */}
				<Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
					{/* Search Icon */}
					<IconButton
						onClick={() => {
							if (onOpenSearch) {
								onOpenSearch();
								vm.closeNavigation();
							}
						}}
						size="medium"
						variant={'mobileNavIcon' as any}
						aria-label="search">
						<Search fontSize="medium" />
					</IconButton>

					{/* Cart Icon */}
					<IconButton
						onClick={() => {
							if (onOpenCart) {
								onOpenCart();
								vm.closeNavigation();
							}
						}}
						size="medium"
						variant={'mobileNavIcon' as any}
						aria-label="shopping cart">
						<Badge badgeContent={vm.cartCount} color="primary" max={99}>
							<ShoppingCartOutlined fontSize="medium" />
						</Badge>
					</IconButton>

					{/* Login/Profile Icon */}
					<IconButton
						onClick={() => {
							if (onOpenAuth) {
								onOpenAuth();
								vm.closeNavigation();
							}
						}}
						size="medium"
						variant={'mobileNavIcon' as any}
						aria-label={vm.isAuthenticated ? 'profile' : 'login'}>
						{vm.isAuthenticated ? <AccountCircle fontSize="medium" /> : <Login fontSize="medium" />}
					</IconButton>
				</Box>
			</Box>

			{/* Bottom row - Back button and Title (only show when on sub-panel) */}
			{showBackButton && (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
					{/* Back button */}
					<IconButton onClick={vm.navigateBack} size="medium" variant={'mobileNavIcon' as any} aria-label="go back">
						<NavigateBefore fontSize="medium" />
					</IconButton>

					{/* Title */}
					{title && (
						<Typography variant={'mainnavlink' as any}>
							{title}
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);

	// Main navigation panel
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
					<ListItemButton onClick={() => vm.navigateToPanel('subjects', 'Subjects')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Subjects</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('products', 'Products')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Products</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('distance-learning', 'Distance Learning')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Distance Learning</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.navigateToPanel('tutorials', 'Tutorials')}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Tutorials</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				{/* Conditional sections based on user permissions */}
				{vm.isApprentice && (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Apprenticeships</Typography>} />
						</ListItemButton>
					</ListItem>
				)}

				{vm.isStudyPlus && (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Study Plus</Typography>} />
						</ListItemButton>
					</ListItem>
				)}

				{/* Admin section for superusers */}
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

	// Subjects panel
	const SubjectsPanel: React.FC = () => (
		<Box>
			<MobileNavHeader title="Subjects" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							vm.navigateToPanel(
								'subjects-core-principles',
								'Core Principles',
								subjects.filter((s) => /^(CB|CS|CM)/.test(s.code))
							)
						}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Core Principles</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							vm.navigateToPanel(
								'subjects-core-practices',
								'Core Practices',
								subjects.filter((s) => /^CP[1-3]$/.test(s.code))
							)
						}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Core Practices</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							vm.navigateToPanel(
								'subjects-specialist-principles',
								'Specialist Principles',
								subjects.filter((s) => /^SP/.test(s.code))
							)
						}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Specialist Principles</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() =>
							vm.navigateToPanel(
								'subjects-specialist-advanced',
								'Specialist Advanced',
								subjects.filter((s) => /^SA/.test(s.code))
							)
						}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>Specialist Advanced</Typography>} />
						<ExpandMore />
					</ListItemButton>
				</ListItem>
			</List>
		</Box>
	);

	// Subject category panel (Core Principles, etc.)
	const SubjectCategoryPanel: React.FC<{ data: NavigationSubject[] }> = ({ data }) => (
		<Box>
			<MobileNavHeader title={vm.currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				{data &&
					data.map((subject) => (
						<ListItem key={subject.id} disablePadding>
							<ListItemButton
								onClick={() => {
									handleSubjectClick(subject.code);
									vm.closeNavigation();
								}}>
								<ListItemText primary={<Typography variant={'mainnavlink' as any}>{`${subject.code} - ${subject.description}`}</Typography>} />
							</ListItemButton>
						</ListItem>
					))}
			</List>
		</Box>
	);

	// Products panel
	const ProductsPanel: React.FC = () => (
		<Box>
			<MobileNavHeader title="Products" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							handleProductClick();
							vm.handleNavigation('/products');
						}}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>View All Products</Typography>} />
					</ListItemButton>
				</ListItem>
				{loadingProductGroups ? (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Loading products...</Typography>} />
						</ListItemButton>
					</ListItem>
				) : (
					navbarProductGroups &&
					navbarProductGroups.map((group) => (
						<ListItem key={group.id || group.name} disablePadding>
							<ListItemButton
								onClick={() =>
									vm.navigateToPanel('product-group', group.name, group)
								}>
								<ListItemText primary={<Typography variant={'mainnavlink' as any}>{group.name}</Typography>} />
								<ExpandMore />
							</ListItemButton>
						</ListItem>
					))
				)}
			</List>
		</Box>
	);

	// Product group panel
	const ProductGroupPanel: React.FC<{ data: NavigationProductGroup }> = ({ data }) => (
		<Box>
			<MobileNavHeader title={vm.currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							handleProductGroupClick(data.name);
							vm.closeNavigation();
						}}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>{`View All ${data.name}`}</Typography>} />
					</ListItemButton>
				</ListItem>
				{data.products && data.products.length > 0 ? (
					data.products.map((product) => (
						<ListItem key={product.id} disablePadding>
							<ListItemButton
								onClick={() => {
									handleSpecificProductClick(product.id);
									vm.closeNavigation();
								}}>
								<ListItemText primary={<Typography variant={'mainnavlink' as any}>{product.shortname}</Typography>} />
							</ListItemButton>
						</ListItem>
					))
				) : (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>No products available</Typography>} />
						</ListItemButton>
					</ListItem>
				)}
				{/* Add Marking Vouchers link under Marking group */}
				{data.name === 'Marking' && (
					<ListItem disablePadding>
						<ListItemButton
							onClick={(e) => {
								handleMarkingVouchersClick(e as any);
								vm.handleNavigation('/products', { group: '8' });
							}}>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Marking Vouchers</Typography>} />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	// Distance Learning panel
	const DistanceLearningPanel: React.FC = () => (
		<Box>
			<MobileNavHeader title="Distance Learning" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							vm.handleNavigation('/products', {
								distance_learning: 'true',
							});
						}}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>View All Distance Learning</Typography>} />
					</ListItemButton>
				</ListItem>
				{loadingDistanceLearning ? (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Loading distance learning...</Typography>} />
						</ListItemButton>
					</ListItem>
				) : (
					distanceLearningData &&
					distanceLearningData.map((group) => (
						<ListItem key={group.id || group.name} disablePadding>
							<ListItemButton
								onClick={() =>
									vm.navigateToPanel(
										'distance-learning-group',
										group.name,
										group
									)
								}>
								<ListItemText primary={<Typography variant={'mainnavlink' as any}>{group.name}</Typography>} />
								<ExpandMore />
							</ListItemButton>
						</ListItem>
					))
				)}
			</List>
		</Box>
	);

	// Tutorials panel
	const TutorialsPanel: React.FC = () => (
		<Box>
			<MobileNavHeader title="Tutorials" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton
						onClick={() => {
							vm.handleNavigation('/products?main_category=Tutorials');
						}}>
						<ListItemText primary={<Typography variant={'mainnavlink' as any}>View All Tutorials</Typography>} />
					</ListItemButton>
				</ListItem>
				{loadingTutorial ? (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>Loading tutorials...</Typography>} />
						</ListItemButton>
					</ListItem>
				) : tutorialData ? (
					<>
						{tutorialData.Location && (
							<ListItem disablePadding>
								<ListItemButton
									onClick={() =>
										vm.navigateToPanel(
											'tutorial-location',
											'Location',
											tutorialData.Location
										)
									}>
									<ListItemText primary={<Typography variant={'mainnavlink' as any}>Location</Typography>} />
									<ExpandMore />
								</ListItemButton>
							</ListItem>
						)}
						{tutorialData.Format && tutorialData.Format.length > 0 && (
							<ListItem disablePadding>
								<ListItemButton
									onClick={() =>
										vm.navigateToPanel(
											'tutorial-format',
											'Format',
											tutorialData.Format
										)
									}>
									<ListItemText primary={<Typography variant={'mainnavlink' as any}>Format</Typography>} />
									<ExpandMore />
								</ListItemButton>
							</ListItem>
						)}
						{tutorialData['Online Classroom'] &&
							tutorialData['Online Classroom'].length > 0 && (
								<ListItem disablePadding>
									<ListItemButton
										onClick={() =>
											vm.navigateToPanel(
												'tutorial-online',
												'Online Classroom',
												tutorialData['Online Classroom']
											)
										}>
										<ListItemText primary={<Typography variant={'mainnavlink' as any}>Online Classroom</Typography>} />
										<ExpandMore />
									</ListItemButton>
								</ListItem>
							)}
					</>
				) : (
					<ListItem disablePadding>
						<ListItemButton disabled>
							<ListItemText primary={<Typography variant={'mainnavlink' as any}>No tutorial data available</Typography>} />
						</ListItemButton>
					</ListItem>
				)}
			</List>
		</Box>
	);

	// Tutorial category panels
	const TutorialCategoryPanel: React.FC<{ data: any; type: string }> = ({ data, type }) => (
		<Box>
			<MobileNavHeader title={vm.currentPanel.title} showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				{type === 'format' ? (
					(data as TutorialFormat[]).map((format) => (
						<ListItem key={format.filter_type} disablePadding>
							<ListItemButton
								onClick={() => {
									handleProductGroupClick(format.group_name);
									vm.closeNavigation();
								}}>
								<ListItemText primary={<Typography variant={'mainnavlink' as any}>{format.name}</Typography>} />
							</ListItemButton>
						</ListItem>
					))
				) : type === 'online' ? (
					(data as TutorialOnlineClassroom[]).map((variation) => (
						<ListItem key={variation.id} disablePadding>
							<ListItemButton
								onClick={() => {
									handleProductVariationClick(variation.id);
									vm.closeNavigation();
								}}>
								<ListItemText primary={<Typography variant={'mainnavlink' as any}>{variation.description || variation.name}</Typography>} />
							</ListItemButton>
						</ListItem>
					))
				) : (
					// Location type - both left and right products
					<>
						{data.left &&
							(data.left as NavigationProduct[]).map((product) => (
								<ListItem key={product.id} disablePadding>
									<ListItemButton
										onClick={() => {
											handleSpecificProductClick(product.id);
											vm.closeNavigation();
										}}>
										<ListItemText primary={<Typography variant={'mainnavlink' as any}>{product.shortname}</Typography>} />
									</ListItemButton>
								</ListItem>
							))}
						{data.right &&
							(data.right as NavigationProduct[]).map((product) => (
								<ListItem key={product.id} disablePadding>
									<ListItemButton
										onClick={() => {
											handleSpecificProductClick(product.id);
											vm.closeNavigation();
										}}>
										<ListItemText primary={<Typography variant={'mainnavlink' as any}>{product.shortname}</Typography>} />
									</ListItemButton>
								</ListItem>
							))}
					</>
				)}
			</List>
		</Box>
	);

	// Admin panel
	const AdminPanel: React.FC = () => (
		<Box>
			<MobileNavHeader title="Admin" showBackButton={true} />
			<List component="nav" sx={{ pl: 2 }}>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.handleNavigation('/admin/exam-sessions')}>
						<ListItemText primary="Exam Sessions" />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.handleNavigation('/admin/subjects')}>
						<ListItemText primary="Subjects" />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding>
					<ListItemButton onClick={() => vm.handleNavigation('/admin/products')}>
						<ListItemText primary="Products" />
					</ListItemButton>
				</ListItem>
			</List>
		</Box>
	);

	// Render current panel content
	const renderCurrentPanel = () => {
		switch (vm.currentPanel.type) {
			case 'main':
				return <MainPanel />;
			case 'subjects':
				return <SubjectsPanel />;
			case 'subjects-core-principles':
			case 'subjects-core-practices':
			case 'subjects-specialist-principles':
			case 'subjects-specialist-advanced':
				return <SubjectCategoryPanel data={vm.currentPanel.data} />;
			case 'products':
				return <ProductsPanel />;
			case 'product-group':
			case 'distance-learning-group':
				return <ProductGroupPanel data={vm.currentPanel.data} />;
			case 'distance-learning':
				return <DistanceLearningPanel />;
			case 'tutorials':
				return <TutorialsPanel />;
			case 'tutorial-location':
				return (
					<TutorialCategoryPanel
						data={vm.currentPanel.data}
						type="location"
					/>
				);
			case 'tutorial-format':
				return (
					<TutorialCategoryPanel data={vm.currentPanel.data} type="format" />
				);
			case 'tutorial-online':
				return (
					<TutorialCategoryPanel data={vm.currentPanel.data} type="online" />
				);
			case 'admin':
				return <AdminPanel />;
			default:
				return <MainPanel />;
		}
	};

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={vm.closeNavigation}
			aria-label="Mobile navigation menu"
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

export default MobileNavigation;
