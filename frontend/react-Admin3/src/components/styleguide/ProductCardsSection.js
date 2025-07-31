import React, { useState } from "react";
import {
	Box,
	Container,
	Typography,
	Card,
	CardContent,
	CardHeader,
	CardActions,
	Button,
	Chip,
	Badge,
	Divider,
	Stack,
	Grid,
	Paper,
	Avatar,
	Checkbox,
	FormControlLabel,
	Radio,
	RadioGroup,
	Tooltip,
} from "@mui/material";
import {
	School,
	LibraryBooks,
	Rule,
	Computer,
	LocalActivity,
	Inventory2,
	ShoppingCart,
	Star,
	AccessTime,
	LibraryBooksSharp,
	RuleOutlined,
	AddShoppingCart,
	InfoOutline,
	CalendarMonthOutlined,
	Warning,
	SchoolOutlined,
	ComputerOutlined,
	Inventory2Outlined,
	ConfirmationNumberOutlined,
	Assessment,
	Timer,
	Analytics,
	TrendingUp,
} from "@mui/icons-material";
import "../../styles/product_card.css";
import { useTheme } from "@mui/material/styles";
// Import refactored components
import {
	BalancedProductCard,
	EnhancedAssessmentProductCard,
	EnhancedTutorialProductCard,
	EnhancedOnlineClassroomProductCard,
	EnhancedBundleProductCard,
	EnhancedMarkingVoucherProductCard,
	EnhancedCompactCard,
	EnhancedHorizontalCard,
	EnhancedMinimalCard,
	MarkingCardAllAvailable,
	MarkingCardExpiringSoon,
	MarkingCardSomeExpired,
	MarkingCardAllExpired,
} from "./ProductCards";

const ProductCardsSection = () => {
	const theme = useTheme();
	return (
		<Container>
			{/* All Product Types Grid */}
			<Typography variant="h3" sx={{ mb: theme.liftkit.spacing.xs }}>
				All Product Card Types
			</Typography>
			<Typography variant="subtitle1" sx={{ mb: theme.liftkit.spacing.lg }}>
				Enhanced layouts for all product categories with improved hierarchy
				and functionality
			</Typography>

			<Grid container spacing={4} sx={{ mb: 6, alignItems: "flex-start" }}>
				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Study Materials
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Print & eBook variations with discounts
					</Typography>
					<BalancedProductCard />
				</Grid>

				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Tutorial
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						In-person weekend courses
					</Typography>
					<EnhancedTutorialProductCard />
				</Grid>

				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Online Classroom
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Digital recordings & live sessions
					</Typography>
					<EnhancedOnlineClassroomProductCard />
				</Grid>

				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Bundle
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Complete study package deals
					</Typography>
					<EnhancedBundleProductCard />
				</Grid>

				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Marking (Available)
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Deadlines available, no discounts
					</Typography>
					<MarkingCardAllAvailable />
				</Grid>

				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Marking Voucher
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Pre-paid marking credits
					</Typography>
					<EnhancedMarkingVoucherProductCard />
				</Grid>

				<Grid item xs={12} sm={6} lg={4}>
					<Typography variant="h6" gutterBottom>
						Assessment/Mock Exam
					</Typography>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Practice exams with analytics & feedback
					</Typography>
					<EnhancedAssessmentProductCard />
				</Grid>
			</Grid>

			{/* Marking States Showcase */}
			<Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
				Marking Product States
			</Typography>
			<Typography variant="body1" sx={{ mb: 4 }}>
				Different deadline scenarios for marking products
			</Typography>

			<Grid container spacing={3} sx={{ mb: 6 }}>
				<Grid item xs={12} sm={6} lg={3}>
					<Typography variant="h6" gutterBottom>
						All Available
					</Typography>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Multiple upcoming deadlines
					</Typography>
					<MarkingCardAllAvailable />
				</Grid>

				<Grid item xs={12} sm={6} lg={3}>
					<Typography variant="h6" gutterBottom>
						Expiring Soon
					</Typography>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Urgent deadline warning
					</Typography>
					<MarkingCardExpiringSoon />
				</Grid>

				<Grid item xs={12} sm={6} lg={3}>
					<Typography variant="h6" gutterBottom>
						Some Expired
					</Typography>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Mixed availability state
					</Typography>
					<MarkingCardSomeExpired />
				</Grid>

				<Grid item xs={12} sm={6} lg={3}>
					<Typography variant="h6" gutterBottom>
						All Expired
					</Typography>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Product unavailable
					</Typography>
					<MarkingCardAllExpired />
				</Grid>
			</Grid>

			{/* Enhanced Card Variations */}
			<Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
				Enhanced Card Variations
			</Typography>

			<Grid container spacing={3} sx={{ mb: 4 }}>
				{/* Enhanced Compact Card */}
				<Grid item xs={12} md={4}>
					<Typography variant="h6" gutterBottom>
						Enhanced Compact Card
					</Typography>
					<EnhancedCompactCard />
				</Grid>

				{/* Enhanced Horizontal Card */}
				<Grid item xs={12} md={4}>
					<Typography variant="h6" gutterBottom>
						Enhanced Horizontal Layout
					</Typography>
					<EnhancedHorizontalCard />
				</Grid>

				{/* Enhanced Minimal Card */}
				<Grid item xs={12} md={4}>
					<Typography variant="h6" gutterBottom>
						Enhanced Minimal Style
					</Typography>
					<EnhancedMinimalCard />
				</Grid>
			</Grid>

			{/* Original Simple Variations */}
			<Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
				Simple Card Variations
			</Typography>

			<Grid container spacing={3}>
				{/* Compact Card */}
				<Grid item xs={12} md={4}>
					<Typography variant="h6" gutterBottom>
						Compact Card
					</Typography>
					<Card elevation={1}>
						<CardContent sx={{ p: 2 }}>
							<Stack direction="row" spacing={2} alignItems="center">
								<Avatar
									sx={{
										bgcolor: "var(--mui-palette-product-tutorial)",
									}}>
									<School />
								</Avatar>
								<Box sx={{ flexGrow: 1 }}>
									<Typography variant="subtitle2">
										CP1 Tutorial
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Core Principles
									</Typography>
								</Box>
								<Typography variant="h6" color="primary.main">
									£299
								</Typography>
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				{/* Horizontal Card */}
				<Grid item xs={12} md={4}>
					<Typography variant="h6" gutterBottom>
						Horizontal Layout
					</Typography>
					<Card elevation={1}>
						<Stack direction="row">
							<Box
								sx={{
									width: 80,
									bgcolor: "var(--mui-palette-product-material)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "white",
								}}>
								<LibraryBooks sx={{ fontSize: 32 }} />
							</Box>
							<CardContent sx={{ flexGrow: 1, p: 2 }}>
								<Typography variant="subtitle2" gutterBottom>
									Study Materials
								</Typography>
								<Typography
									variant="caption"
									color="text.secondary"
									display="block"
									sx={{ mb: 1 }}>
									Complete resource pack
								</Typography>
								<Typography variant="h6" color="primary.main">
									£99
								</Typography>
							</CardContent>
						</Stack>
					</Card>
				</Grid>

				{/* Minimal Card */}
				<Grid item xs={12} md={4}>
					<Typography variant="h6" gutterBottom>
						Minimal Style
					</Typography>
					<Paper
						variant="outlined"
						sx={{
							p: 2,
							"&:hover": {
								boxShadow: 2,
							},
						}}>
						<Stack spacing={1}>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Box
									sx={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor:
											"var(--mui-palette-product-online)",
									}}
								/>
								<Typography variant="caption" color="text.secondary">
									ONLINE COURSE
								</Typography>
							</Stack>
							<Typography variant="subtitle1">Mock Exams</Typography>
							<Typography variant="h6" color="primary.main">
								£75
							</Typography>
						</Stack>
					</Paper>
				</Grid>
			</Grid>
		</Container>
	);
};

export default ProductCardsSection;
