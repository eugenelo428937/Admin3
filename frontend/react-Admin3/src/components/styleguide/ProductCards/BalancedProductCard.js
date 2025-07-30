import React, { useState } from "react";
import {
	Paper,
	Avatar,
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	CardActions,
	Button,
	Chip,
	Divider,
	Checkbox,
	FormGroup,
	FormControlLabel,
	Radio,
	Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
	LibraryBooksSharp,
	AddShoppingCart,
	InfoOutline,
} from "@mui/icons-material";

// Variation B: Enhanced Balanced & Traditional
const BalancedProductCard = ({ variant = "material-product", ...props }) => {
	const [selectedVariations, setSelectedVariations] = useState([]);
	const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
	const theme = useTheme();

	return (
		<Card
			elevation={2}
			variant={variant}
			className="product-card d-flex flex-column"
			{...props}>
			{/* Enhanced Header - Similar to Variation C */}
			<CardHeader
				title={
					<Typography variant="h5" textAlign="left">
						Mini ASET
					</Typography>
				}
				subheader={
					<Typography variant="subtitle1" textAlign="left">
						(April 2024 Paper)
					</Typography>
				}
				avatar={
					<Avatar sx={{ backgroundColor: theme.palette.md3.onPrimary }}>
						<LibraryBooksSharp />
					</Avatar>
				}
			/>

			<CardContent>
				{/* Enhanced Chips Section - More prominent */}
				<Box className="product-chips">
					<Chip label="CS1" variant="filled" color="primary" />
					<Chip label="2024A" variant="filled" color="secondary" />
				</Box>

				{/* Enhanced Variations Section - Better hierarchy */}
				<Box className="product-variations">
					<Typography variant="body2" textAlign="left">
						Product Variations
					</Typography>

					<FormGroup>
						<FormControlLabel
							control={
								<Checkbox size="small" />
							}
							label={
								<Typography variant="subtitle1">
									Printed Version
								</Typography>
							}
						/>
						<FormControlLabel
							control={<Checkbox size="small" />}
							label={
								<Typography variant="subtitle1">
									eBook Version
								</Typography>
							}
						/>
					</FormGroup>
				</Box>
			</CardContent>

			<Divider />

			<CardActions
				className="product-card-actions"
				sx={{
					pt: theme.liftkit.spacing.md,
					px: theme.liftkit.spacing.md,
					flexDirection: "column",
					alignItems: "stretch",
					mt: "auto",
					justifyContent: "space-between",
				}}>
				{/* Enhanced Discount Options */}
				<Box className="discount-options">
					<Typography
						variant="subtitle2"
						color="text.primary"
						textAlign="left"
						className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-start",
							transition: "all 0.2s ease",
							"&:hover": {
								boxShadow: "1px 2px 1px rgba(0, 0, 0, 0.15)",
								backgroundColor: "grey.50",
							},
						}}>
						<FormControlLabel
							control={
								<Radio
									color="primary"
									checked={selectedPriceType === "retaker"}
									onClick={() =>
										setSelectedPriceType(
											selectedPriceType === "retaker"
												? ""
												: "retaker"
										)
									}
									sx={{
										"& .MuiSvgIcon-root": { fontSize: "1rem" },
									}}
								/>
							}
							label={<Typography variant="caption">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={
								<Radio
									color="primary"
									checked={selectedPriceType === "additional"}
									onClick={() =>
										setSelectedPriceType(
											selectedPriceType === "additional"
												? ""
												: "additional"
										)
									}
									sx={{
										"& .MuiSvgIcon-root": { fontSize: "1rem" },
									}}
								/>
							}
							label={
								<Typography variant="caption">
									Additional Copy
								</Typography>
							}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				{/* Enhanced Price & Action */}
				<Box
					display="flex"
					alignItems="center"
					justifyContent="space-between">
					<Box
						display="flex"
						alignItems="center"
						gap={theme.liftkit.spacing.sm}>
						<Typography variant="h4" color="primary.main">
							{selectedPriceType === "retaker"
								? "£36.00"
								: selectedPriceType === "additional"
								? "£22.50"
								: "£45.00"}
						</Typography>
						<Tooltip title="Show price details">
							<Button
								size="small"
								sx={{
									minWidth: "auto",
									px: theme.liftkit.spacing.xs,
									py: theme.liftkit.spacing.xs,
									"&:hover": {
										backgroundColor: theme.palette.bpp.granite["010"],
										boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
									},
								}}>
								<InfoOutline sx={{ fontSize: "1.4rem" }} />
							</Button>
						</Tooltip>
					</Box>
					<Button
						variant="contained"
						color="success"
						sx={{
							borderRadius: "50%",
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
							boxShadow: "0 4px 8px rgba(76, 175, 80, 0.3)",
							"&:hover": {
								boxShadow: "0 6px 12px rgba(76, 175, 80, 0.4)",
								transform: "translateY(-1px)",
							},
						}}>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					{selectedPriceType === "retaker"
						? "Retaker discount applied"
						: selectedPriceType === "additional"
						? "Additional copy discount applied"
						: "Standard pricing"}{" "}
					• Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

export default BalancedProductCard;
