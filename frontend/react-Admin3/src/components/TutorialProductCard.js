import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Typography,
	Box,
	Grid,
	Chip,
	Stack,
	Alert,
	CircularProgress,
	Badge,
} from "@mui/material";
import {
	AddShoppingCart,
	QuestionAnswerOutlined,
	ShoppingCart,
} from "@mui/icons-material";
import { useCart } from "../contexts/CartContext";
import { useTutorialChoice } from "../contexts/TutorialChoiceContext";
import tutorialService from "../services/tutorialService";
import TutorialChoiceDialog from "./TutorialChoiceDialog";
import "../styles/product_card.css";
import "../styles/custom-bootstrap.css";

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

		const { addToCart } = useCart();
		const {
			getSubjectChoices,
			getTotalChoices,
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

		if (loading) {
			return (
				<Card
					elevation={2}
					className="product-card d-flex flex-column">
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
					className="product-card d-flex flex-column justify-content-between">
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
					className="product-card tutorial-product-card d-flex flex-column">
					<CardHeader
						title={
							<Box className="d-flex flex-row w-100 align-items-center justify-content-between">
								<Typography variant="h6" className="mb-0">
									{location}
								</Typography>
								<QuestionAnswerOutlined />
							</Box>
						}
						className="product-card-header tutorial-header"
					/>

					<CardContent
						className="product-card-content"
						sx={{ marginTop: "0" }}>
						<Box className="d-flex flex-row w-100 align-items-center mb-2">
							<Chip
								variant="outlined"
								label={product.subject_code}
								clickable={false}
							/>
							{hasChoices && (
								<Badge badgeContent={choiceCount} color="primary">
									<Chip
										variant="filled"
										color="success"
										label="Choices Made"
										size="small"
										sx={{ ml: 1 }}
									/>
								</Badge>
							)}
						</Box>
						
						{variations.length === 0 ? (
							<Box className="text-center text-muted">
								<Typography variant="body2" color="text.secondary">
									No tutorial variations available for this subject and
									location.
								</Typography>
							</Box>
						) : (
							<Box className="tutorial-summary">
								<Box sx={{ mb: 2 }}>
									<Typography variant="body2" sx={{ mb: 1 }}>
										{summaryInfo.totalEvents} tutorial events available
									</Typography>
									
									<Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
										{summaryInfo.distinctDescriptions.slice(0, 2).map((desc, index) => (
											<Chip
												key={index}
												variant="outlined"
												label={desc}
												size="small"
												color="info"
											/>
										))}
										{summaryInfo.distinctDescriptions.length > 2 && (
											<Chip
												variant="outlined"
												label={`+${summaryInfo.distinctDescriptions.length - 2} more`}
												size="small"
												color="default"
											/>
										)}
									</Stack>
									
									<Stack direction="row" spacing={1} flexWrap="wrap">
										{summaryInfo.distinctVenues.slice(0, 2).map((venue, index) => (
											<Chip
												key={index}
												variant="outlined"
												label={venue}
												size="small"
												color="secondary"
											/>
										))}
										{summaryInfo.distinctVenues.length > 2 && (
											<Chip
												variant="outlined"
												label={`+${summaryInfo.distinctVenues.length - 2} more`}
												size="small"
												color="default"
											/>
										)}
									</Stack>
								</Box>
							</Box>
						)}
					</CardContent>

					{variations.length > 0 && (
						<CardActions sx={{ px: 2, py: 1 }}>
							<Grid container spacing={2} alignItems="center">
								<Grid item xs={12} sm={6}>
									{hasChoices && (
										<Typography variant="caption" color="text.secondary">
											{choiceCount} choice(s) selected
										</Typography>
									)}
								</Grid>
								<Grid item xs={12} sm={6}>
									<Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
										<Button
											variant="contained"
											color="secondary"
											size="small"
											onClick={() => setShowChoiceDialog(true)}
										>
											Select Tutorials
										</Button>
										
										{hasChoices && (
											<Button
												variant="contained"
												color="success"
												size="small"
												onClick={() => showChoicePanelForSubject(subjectCode)}
												startIcon={<ShoppingCart />}
											>
												View Choices
											</Button>
										)}
									</Box>
								</Grid>
							</Grid>
						</CardActions>
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
};

export default TutorialProductCard;