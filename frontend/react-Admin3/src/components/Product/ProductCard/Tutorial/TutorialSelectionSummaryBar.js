import React, { useState } from "react";
import PropTypes from "prop-types";
import {
	Container,
	Grid,
	Paper,
	Button,
	IconButton,
	Typography,
	Box,
	useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CartCheck } from "react-bootstrap-icons";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTutorialChoice } from "../../../../contexts/TutorialChoiceContext";
import { touchButtonStyle, touchIconButtonStyle } from "./tutorialStyles";

/**
 * TutorialSelectionSummaryBar - Persistent summary bar for tutorial choices
 * with expand/collapse states and action buttons.
 *
 * Contract: Displays at bottom center, expands with draft choices, collapses when carted
 * Optimized: Memoized to prevent unnecessary re-renders
 */
const TutorialSelectionSummaryBar = React.memo(
	({ subjectCode, onEdit, onAddToCart, onRemove }) => {
		const theme = useTheme();
		const { getSubjectChoices, getDraftChoices, hasCartedChoices } =
			useTutorialChoice();
		const [isCollapsed, setIsCollapsed] = useState(false);

		// Get all choices for this subject
		const subjectChoices = getSubjectChoices(subjectCode);
		const draftChoices = getDraftChoices(subjectCode);
		const hasCarted = hasCartedChoices(subjectCode);

		// Determine visibility - show if any choices exist
		const hasAnyChoices = Object.keys(subjectChoices).length > 0;

		// Handle collapse button click
		const handleCollapse = () => {
			setIsCollapsed(true);
		};

		// Handle expand (clicking on collapsed bar or adding new choice)
		const handleExpand = () => {
			setIsCollapsed(false);
		};

		// Auto-expand when new choices are added
		React.useEffect(() => {
			if (hasAnyChoices) {
				setIsCollapsed(false);
			}
		}, [Object.keys(subjectChoices).length]);

		if (!hasAnyChoices) {
			return null;
		}

		// Get subject name from first choice (all choices have same subject)
		const firstChoice = Object.values(subjectChoices)[0];
		const subjectName =
			firstChoice?.subjectName || `${subjectCode} - Actuarial Modelling`;

		// Sort and format choice details
		const choiceOrder = ["1st", "2nd", "3rd"];
		const choiceDetails = choiceOrder
			.filter((level) => subjectChoices[level])
			.map((level) => {
				const choice = subjectChoices[level];
				return {
					level,
					location: choice.location,
					eventCode: choice.eventCode,
					isDraft: choice.isDraft,
				};
			});

		if (!hasAnyChoices) {
			return null;
		}

		// Collapsed view: single line with title and close icon
		if (isCollapsed) {
			return (
				<Paper
					elevation={6}
					role="alert"
					onClick={handleExpand}
					sx={{
						backgroundColor: "rgba(99, 50, 185, 0.965)" || "#7950d1",
						color: "#fff",
						width: "100%",
						maxWidth: { xs: "100%", md: "24rem" },
						px: 3,
						py: 1.5,
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						cursor: "pointer",
						"&:hover": {
							backgroundColor: "rgba(99, 50, 185, 0.85)",
						},
					}}>
					<Typography variant="h6" color="inherit">
						{subjectCode} Tutorial Choices
					</Typography>
					<IconButton
						aria-label="Expand"
						color="inherit"
						size="small"
						onClick={(e) => {
							e.stopPropagation();
							handleExpand();
						}}
						sx={touchIconButtonStyle}>
						<ExpandMoreIcon />
					</IconButton>
				</Paper>
			);
		}

		// Expanded view: full details
		return (
			<Paper
				elevation={6}
				role="alert"
				sx={{
					backgroundColor: "rgba(99, 50, 185, 0.965)" || "#7950d1",
					color: "#fff",
					width: "100%",
					maxWidth: { xs: "100%", md: "24rem" },
					px: 3,
					py: 2,
					display: "flex",
					flexDirection: { xs: "column" },
					alignItems: { xs: "flex-start" },
					justifyContent: "space-between",
					gap: 2,
				}}>
				<Grid container>
					{/* Title Row - Full Width */}
					<Grid
						size={12}
						container
						direction="row"
						sx={{
							justifyContent: "space-between",
							alignItems: "center",
							width: "100%",
						}}>
						{/* Subject Title */}
						<Typography variant="h6" color="inherit" align="left">
							{subjectCode} Tutorial Choices
						</Typography>
						{/* Collapse Button */}
						<IconButton
							aria-label="Collapse"
							color="inherit"
							onClick={handleCollapse}
							sx={touchIconButtonStyle}>
							<CloseIcon />
						</IconButton>
					</Grid>

					{/* Choice Details Row */}
					<Grid size={12}>
						<Box sx={{ textAlign: "start" }}>
							{choiceDetails.map((choice, index) => (
								<Box key={choice.level} sx={{ textAlign: "start" }}>
									<Box>
										<Typography
											variant="body2"
											color="inherit">
											{choice.level} - {choice.eventCode} ({choice.location})
										</Typography>
									</Box>

									{!choice.isDraft && (
										<Box className="d-flex flex-row flex-wrap align-items-center">
											<CartCheck className="m-right__xs" />
											<Typography
												variant="caption"
												color="inherit"
												className="p-top__xs">
												Added in Cart
											</Typography>
										</Box>
									)}
								</Box>
							))}
						</Box>
					</Grid>

					{/* Action Buttons Row */}
					<Grid
						size={12}
						container
						direction="row"
						sx={{
							mt: 2,
							justifyContent: "space-between",
							width: "100%",
						}}>
						{/* Edit Button */}
						<IconButton
							color="inherit"
							onClick={onEdit}
							aria-label="Edit tutorial choices"
							sx={touchIconButtonStyle}>
							<EditIcon />
						</IconButton>

						{/* Add to Cart Button */}
						<IconButton
							color="inherit"
							onClick={onAddToCart}
							aria-label="Add tutorial choices to cart"
							sx={touchIconButtonStyle}>
							<AddShoppingCartIcon />
						</IconButton>

						{/* Remove Button */}
						<IconButton
							color="inherit"
							onClick={onRemove}
							aria-label="Remove tutorial choices"
							sx={touchIconButtonStyle}>
							<DeleteIcon />
						</IconButton>
					</Grid>
				</Grid>
			</Paper>
		);
	}
);

TutorialSelectionSummaryBar.displayName = "TutorialSelectionSummaryBar";

TutorialSelectionSummaryBar.propTypes = {
	subjectCode: PropTypes.string.isRequired,
	onEdit: PropTypes.func.isRequired,
	onAddToCart: PropTypes.func.isRequired,
	onRemove: PropTypes.func.isRequired,
};

export default TutorialSelectionSummaryBar;
