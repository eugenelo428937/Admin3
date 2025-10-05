import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Typography,
	Box,
	Chip,
	Stack,
	Alert,
	CircularProgress,
	Avatar,
	Radio,
	FormControlLabel,
	Tooltip,
	SpeedDial,
	SpeedDialAction,
	SpeedDialIcon,
	Backdrop,
	Badge,
} from "@mui/material";
import {
	AddShoppingCart,
	School,
	CalendarMonthOutlined,
	ViewModule,
	LocationOn,
	InfoOutline,
} from "@mui/icons-material";
import { useTutorialChoice } from "../../../../contexts/TutorialChoiceContext";
import { useCart } from "../../../../contexts/CartContext";
import tutorialService from "../../../../services/tutorialService";
import { formatPrice } from "../../../../utils/vatUtils";
import {
	buildTutorialMetadata,
	buildTutorialProductData,
	buildTutorialPriceData
} from "../../../../utils/tutorialMetadataBuilder";
import TutorialChoiceDialog from "./TutorialChoiceDialog";
import "../../../../styles/product_card.css";

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Uses TutorialChoiceContext for managing selections
 */
const TutorialProductCard = React.memo(
	({
		subjectCode,
		subjectName,
		location,
		productId,
		product,
		variations: preloadedVariations = null,
		onAddToCart = null,
	}) => {
		const [variations, setVariations] = useState(preloadedVariations || []);
		const [loading, setLoading] = useState(!preloadedVariations);
		const [error, setError] = useState(null);
		const [showChoiceDialog, setShowChoiceDialog] = useState(false);
		const [isHovered, setIsHovered] = useState(false);
		const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
		const [speedDialOpen, setSpeedDialOpen] = useState(false);

		const {
			getSubjectChoices,
			showChoicePanelForSubject,
		markChoicesAsAdded,
	} = useTutorialChoice();

		const { addToCart, updateCartItem, cartItems } = useCart();

		// Get current choices for this subject
		const subjectChoices = getSubjectChoices(subjectCode);
		const hasChoices = Object.keys(subjectChoices).length > 0;
		const choiceCount = Object.keys(subjectChoices).length;

		// Calculate total tutorials in cart for this subject
		const tutorialsInCartCount = useMemo(() => {
			if (!cartItems || cartItems.length === 0) return 0;

			// Filter cart items for this subject
			const tutorialItems = cartItems.filter(item =>
				item.subject_code === subjectCode &&
				item.product_type === "tutorial"
			);

			// Count total choices across all tutorial items
			return tutorialItems.reduce((total, item) => {
				// Check if item has metadata with choice count
				const metadata = item.metadata || item.priceInfo?.metadata;
				if (metadata && metadata.totalChoiceCount) {
					return total + metadata.totalChoiceCount;
				}
				// Fallback: count each item as 1
				return total + 1;
			}, 0);
		}, [cartItems, subjectCode]);

		// SpeedDial event handlers - memoized to prevent unnecessary re-renders
		const handleSpeedDialOpen = useCallback(() => setSpeedDialOpen(true), []);
		const handleSpeedDialClose = useCallback(() => setSpeedDialOpen(false), []);

		const handleAddToCart = useCallback(async () => {
		setSpeedDialOpen(false);

		if (!hasChoices) {
			console.warn("Cannot add to cart: no choices selected");
			return;
		}

		// Get actual price from first choice
		const primaryChoice = Object.values(subjectChoices).find(c => c);
		const actualPrice = primaryChoice?.variation?.prices?.find(
			p => p.price_type === "standard"
		)?.amount || product.price;

		// Build metadata using utility function
		const tutorialMetadata = buildTutorialMetadata(
			subjectChoices,
			subjectCode,
			location,
			actualPrice
		);

		if (!tutorialMetadata) {
			console.warn("No tutorial metadata generated");
			return;
		}

		// Build product and price data using utility functions
		const productData = buildTutorialProductData(
			productId,
			subjectCode,
			subjectName,
			location
		);

		const priceData = buildTutorialPriceData(
			actualPrice,
			tutorialMetadata
		);

		try {
			// 🔍 Lookup: Check if cart already has an item for this subject
			const existingCartItem = cartItems.find(item =>
				item.subject_code === subjectCode &&
				item.product_type === "tutorial"
			);

			if (existingCartItem) {
				// ⬆️ Merge: Update existing cart item with new choices
				console.log('🛒 [TutorialProductCard] Merging with existing cart item:', existingCartItem.id);
				await updateCartItem(existingCartItem.id, productData, priceData);
			} else {
				// ➕ Create: Add new cart item
				console.log('🛒 [TutorialProductCard] Creating new cart item');
				await addToCart(productData, priceData);
			}

			// ✅ Mark choices as added (state transition: isDraft false)
			markChoicesAsAdded(subjectCode);
		} catch (error) {
			console.error('❌ [TutorialProductCard] Error adding to cart:', error);
			// TODO: Show user error feedback
		}
	}, [addToCart, updateCartItem, cartItems, markChoicesAsAdded, hasChoices, subjectChoices, product, productId, subjectCode, subjectName, location]);

		const handleSelectTutorial = useCallback(() => {
			setSpeedDialOpen(false);
			setShowChoiceDialog(true);
		}, []);

		const handleViewSelections = useCallback(() => {
			setSpeedDialOpen(false);
			showChoicePanelForSubject(subjectCode);
		}, [subjectCode, showChoicePanelForSubject]);

		// SpeedDial actions configuration - memoized to prevent unnecessary re-renders
		const speedDialActions = useMemo(() => [
			{
				key: "addToCart",
				icon: <AddShoppingCart />,
				name: "Add to Cart",
				show: hasChoices,
				onClick: handleAddToCart
			},
			{
				key: "selectTutorial",
				icon: (
					<Badge
						badgeContent={tutorialsInCartCount > 0 ? tutorialsInCartCount : null}
						color="success"
					>
						<CalendarMonthOutlined />
					</Badge>
				),
				name: "Select Tutorial",
				show: true,
				onClick: handleSelectTutorial
			},
			{
				key: "viewSelections",
				icon: <ViewModule />,
				name: "View selections",
				show: hasChoices,
				onClick: handleViewSelections
			},
		].filter(action => action.show), [hasChoices, tutorialsInCartCount, handleAddToCart, handleSelectTutorial, handleViewSelections]);

		useEffect(() => {
			// Only fetch if variations weren't preloaded
			if (!preloadedVariations && productId && subjectCode) {
				const fetchTutorialVariations = async () => {
					try {
						setLoading(true);
						const data = await tutorialService.getTutorialVariations(
							productId,
							subjectCode
						);
						setVariations(data || []);
						setError(null);
					} catch (err) {
						console.error("Error fetching tutorial variations:", err);
						setError("Failed to load tutorial variations");
					} finally {
						setLoading(false);
					}
				};

				fetchTutorialVariations();
			} else if (preloadedVariations) {
				setVariations(preloadedVariations);
				setLoading(false);
			}
		}, [productId, subjectCode, preloadedVariations]);

		const getSummaryInfo = () => {
			const totalEvents = variations.reduce(
				(sum, variation) => sum + (variation.events?.length || 0),
				0
			);
			const distinctDescriptions = [
				...new Set(
					variations
						.map((v) => v.description_short || v.description)
						.filter(Boolean)
				),
			];
			const distinctVenues = [
				...new Set(
					variations
						.flatMap((v) => v.events || [])
						.map((e) => e.venue)
						.filter(Boolean)
				),
			];

			return { totalEvents, distinctDescriptions, distinctVenues };
		};

		const summaryInfo = getSummaryInfo();

		const handleMouseEnter = () => {
			setIsHovered(true);
		};

		const handleMouseLeave = () => {
			setIsHovered(false);
		};

		if (loading) {
			return (
				<Card
					elevation={2}
					variant="tutorial-product"
					className="d-flex flex-column">
					<CardContent
						className="d-flex justify-content-center align-items-center"
						sx={{ height: "200px" }}>
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center">
							<CircularProgress />
							<Typography variant="body2" sx={{ mt: 2 }}>
								Loading tutorial options...
							</Typography>
						</Box>
					</CardContent>
				</Card>
			);
		}

		if (error) {
			return (
				<Card
					elevation={2}
					variant="tutorial-product"
					className="d-flex flex-column justify-content-between">
					<CardContent>
						<Alert severity="error">{error}</Alert>
					</CardContent>
				</Card>
			);
		}

		// For regular tutorial products with choices/events, use the full interface
		return (
			<>
				<Card
					elevation={2}
					variant="tutorial-product"
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					sx={{
						transform: isHovered ? "scale(1.02)" : "scale(1)",
						transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
						width: "100%",
						margin: 0,
						padding: 0,
						display: "flex",
						flexDirection: "column",
						height: "100%",
					}}
					className="d-flex flex-column">
					{/* Floating Badges */}
					<Box className="floating-badges-container">
						<Chip
							label={product.subject_code || subjectCode}
							size="small"
							className="subject-badge"
							role="img"
							aria-label={`Subject: ${
								product.subject_code || subjectCode
							}`}
						/>
						<Chip
							label="25S"
							size="small"
							className="session-badge"
							role="img"
							aria-label="Exam session: 25S"
						/>
					{tutorialsInCartCount > 0 && (
						<Chip
							label={`${tutorialsInCartCount} in cart`}
							size="small"
							className="cart-count-badge"
							color="success"
							role="img"
							aria-label={`${tutorialsInCartCount} tutorials in cart`}
						/>
					)}
					</Box>
					<CardHeader
						className="product-header"
						sx={{
							width: "100%",
							margin: 0,
							padding: 0,
							"& .MuiCardHeader-root": {
								width: "100%",
							},
						}}
						title={
							<Typography
								variant="h4"
								textAlign="left"
								className="product-title">
								{location}
							</Typography>
						}
						subheader={
							<Typography
								variant="subtitle1"
								textAlign="left"
								className="product-subtitle">
								{subjectCode} Tutorial
							</Typography>
						}
						avatar={
							<Avatar className="product-avatar">
								<School className="product-avatar-icon" />
							</Avatar>
						}
					/>

					<CardContent
						sx={{
							width: "100%",
							margin: 0,
							flex: 1,
							display: "flex",
							flexDirection: "column",
							justifyContent: "flex-start",
						}}>
						{/* Tutorial Information Section */}
						<Box className="tutorial-info-section">
							<Stack direction="column" className="info-row">
								<Stack
									direction="row"
									alignItems="center"
									className="info-title">
									<CalendarMonthOutlined className="info-icon" />
									<Typography variant="caption" className="info-text">
										Tutorials available:
									</Typography>
								</Stack>
								<Typography variant="caption" className="info-sub-text">
									• {summaryInfo.totalEvents} ({variations.length}{" "}
									variations,{" "}
									{hasChoices
										? choiceCount + " selected"
										: "0 selected"}
									)
								</Typography>
							</Stack>

							<Stack direction="column" className="info-row">
								<Stack
									direction="row"
									alignItems="center"
									className="info-title">
									<ViewModule className="info-icon" />
									<Typography variant="caption" className="info-text">
										Format:
									</Typography>
								</Stack>
								{summaryInfo.distinctDescriptions.map((desc, index) => (
									<Typography
										key={index}
										variant="caption"
										className="info-sub-text">
										• {desc}
									</Typography>
								))}
							</Stack>

							<Stack direction="column" className="info-row">
								<Stack
									direction="row"
									alignItems="center"
									className="info-title">
									<LocationOn className="info-icon" />
									<Typography variant="caption" className="info-text">
										Venue:
									</Typography>
								</Stack>
								{summaryInfo.distinctVenues.map((venue, index) => (
									<Typography
										key={index}
										variant="caption"
										className="info-sub-text">
										• {venue}
									</Typography>
								))}
							</Stack>
						</Box>

						{variations.length === 0 ? (
							<Box className="text-center text-muted">
								<Typography variant="body2" color="text.secondary">
									No tutorial variations available for this subject and
									location.
								</Typography>
							</Box>
						) : null}
					</CardContent>

					<CardActions>
						{/* Discount Options Section - matches theme structure */}
						<Box className="price-container">
							<Box className="discount-options">
								<Typography
									variant="subtitle2"
									className="discount-title">
									Discount Options
								</Typography>
								<Box className="discount-radio-group">
									<FormControlLabel
										className="discount-radio-option"
										control={
											<Radio
												checked={selectedPriceType === "retaker"}
												onClick={() =>
													setSelectedPriceType(
														selectedPriceType === "retaker"
															? ""
															: "retaker"
													)
												}
												size="small"
											/>
										}
										label={
											<Typography
												variant="subtitle2"
												className="discount-label">
												Retaker
											</Typography>
										}
									/>
									<FormControlLabel
										className="discount-radio-option"
										control={
											<Radio
												checked={selectedPriceType === "additional"}
												onClick={() =>
													setSelectedPriceType(
														selectedPriceType === "additional"
															? ""
															: "additional"
													)
												}
												size="small"
											/>
										}
										label={
											<Typography
												variant="subtitle2"
												className="discount-label">
												Additional Copy
											</Typography>
										}
									/>
								</Box>
							</Box>
							{/* Price & Action Section - matches theme structure */}
							<Box className="price-action-section">
								<Box className="price-info-row">
									<Typography variant="h3" className="price-display">
										{selectedPriceType === "retaker" && product.retaker_price
											? formatPrice(product.retaker_price)
											: selectedPriceType === "additional" && product.additional_copy_price
											? formatPrice(product.additional_copy_price)
											: product.price
											? formatPrice(product.price)
											: "£299.00"}
									</Typography>
									<Tooltip title="Show price details">
										<Button size="small" className="info-button">
											<InfoOutline />
										</Button>
									</Tooltip>
								</Box>
								<Box className="price-details-row">
									<Typography
										variant="fineprint"
										className="price-level-text"
										color="text.secondary">
										{selectedPriceType === "retaker" ||
										selectedPriceType === "additional"
											? "Discount applied"
											: "Standard pricing"}
									</Typography>
									<Typography
										variant="fineprint"
										className="vat-status-text"
										color="text.secondary">
										{product.vat_status_display || "Price includes VAT"}
									</Typography>
								</Box>
							</Box>
						</Box>
					</CardActions>

					{/* SpeedDial for Tutorial Actions */}
					{variations.length > 0 && (
						<>
							<Backdrop
								open={speedDialOpen}
								onClick={handleSpeedDialClose}
								sx={{
									position: 'fixed',
									zIndex: (theme) => theme.zIndex.speedDial - 1
								}}
							/>
							<SpeedDial
								ariaLabel="Tutorial Actions"
							sx={{ position: 'absolute', bottom: 16, right: 16 }}
								icon={
									<Badge
										badgeContent={tutorialsInCartCount > 0 ? tutorialsInCartCount : null}
										color="success"
										invisible={speedDialOpen}
									>
										<SpeedDialIcon />
									</Badge>
								}
								direction="up"
								open={speedDialOpen}
								onOpen={handleSpeedDialOpen}
								onClose={(event, reason) => {
									// Prevent auto-close on mouse leave or blur
									// Only allow manual close via backdrop, escape, or action clicks
									return;
								}}
								FabProps={{
									onClick: () => setSpeedDialOpen(!speedDialOpen)
								}}>
								{speedDialActions.map((action) => (
									<SpeedDialAction
										key={action.key}
										icon={action.icon}
										slotProps={{
											tooltip: {
												open: true,
												title: action.name,
											},
										}}
										sx={{
											"& .MuiSpeedDialAction-staticTooltipLabel": {
												whiteSpace: "nowrap",
												maxWidth: "none",
											},
										}}
										aria-label={action.name}
										onClick={action.onClick}
									/>
								))}
							</SpeedDial>
						</>
					)}
				</Card>

				{/* Tutorial Choice Dialog */}
				<TutorialChoiceDialog
					open={showChoiceDialog}
					onClose={() => setShowChoiceDialog(false)}
					subjectCode={subjectCode}
					subjectName={subjectName}
					location={location}
					variations={variations}
					productId={productId}
				/>
			</>
		);
	}
);

TutorialProductCard.propTypes = {
	subjectCode: PropTypes.string.isRequired,
	subjectName: PropTypes.string.isRequired,
	location: PropTypes.string.isRequired,
	productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
		.isRequired,
	product: PropTypes.object.isRequired,
	variations: PropTypes.array,
	onAddToCart: PropTypes.func,
};

export default TutorialProductCard;