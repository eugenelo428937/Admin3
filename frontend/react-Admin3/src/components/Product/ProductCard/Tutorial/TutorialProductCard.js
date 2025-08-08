import React, { useState, useEffect } from "react";
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
import tutorialService from "../../../../services/tutorialService";
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
	}) => {
		const [variations, setVariations] = useState(preloadedVariations || []);
		const [loading, setLoading] = useState(!preloadedVariations);
		const [error, setError] = useState(null);
		const [showChoiceDialog, setShowChoiceDialog] = useState(false);
		const [isHovered, setIsHovered] = useState(false);
		const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing

		const {
			getSubjectChoices,
			showChoicePanelForSubject,
		} = useTutorialChoice();

		// Get current choices for this subject
		const subjectChoices = getSubjectChoices(subjectCode);
		const hasChoices = Object.keys(subjectChoices).length > 0;
		const choiceCount = Object.keys(subjectChoices).length;

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
						) : (
							<Box
								className="tutorial-action-buttons"
								sx={{
									display: "flex",
									justifyContent: "center",
									gap: 1,
									flexWrap: "wrap",
								}}>
								<Button
									variant="contained"
									size="small"
									color="primary"
									className="select-tutorial-button"
									onClick={() => setShowChoiceDialog(true)}>
									Select Tutorial
								</Button>
								{hasChoices && (
									<Button
										variant="contained"
										size="small"
										color="secondary"
										className="view-selection-button"
										onClick={() =>
											showChoicePanelForSubject(subjectCode)
										}>
										View Selection
									</Button>
								)}
							</Box>
						)}
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
										{selectedPriceType === "retaker"
											? "£239.20"
											: selectedPriceType === "additional"
											? "£149.50"
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
										Price includes VAT
									</Typography>
								</Box>
								<Button
									variant="contained"
									className="add-to-cart-button">
									<AddShoppingCart />
								</Button>
							</Box>
						</Box>
					</CardActions>
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
};

export default TutorialProductCard;