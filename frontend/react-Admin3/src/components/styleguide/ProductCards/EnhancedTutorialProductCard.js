import React, { useState } from 'react';
import {
  Box,
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
  Avatar,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Radio
} from '@mui/material';
import {
  School,
  AddShoppingCart,
  Star,
  AccessTime,
  CalendarMonthOutlined,
  InfoOutline
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const EnhancedTutorialProductCard = ({ variant = "tutorial-product", ...props }) => {
	const [selectedOptions, setSelectedOptions] = useState({
		materials: false,
		recording: false,
	});
	const theme = useTheme();
	const basePrice = 299;
	const materialsPrice = 99;
	const recordingPrice = 149;
	const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing

	const calculateTotal = () => {
		let total = basePrice;
		if (selectedOptions.materials) total += materialsPrice;
		if (selectedOptions.recording) total += recordingPrice;
		return total;
	};

	const handleOptionChange = (option) => {
		setSelectedOptions((prev) => ({
			...prev,
			[option]: !prev[option],
		}));
	};

	return (
		<Card
			elevation={2}
			variant={variant}
			className="product-card d-flex flex-column"
			{...props}>
			<CardHeader
				title={
					<Typography variant="h5" textAlign="left">
						Birmingham
					</Typography>
				}
				subheader={
					<Typography variant="subtitle1" textAlign="left">
						CS1 Tutorial
					</Typography>
				}
				avatar={
					<Avatar sx={{ backgroundColor: theme.palette.md3.onPrimary }}>
						<School />
					</Avatar>
				}
			/>
			<CardContent>
				{/* Enhanced Chips Section - More prominent */}
				<Box className="product-chips">
					<Chip label="CS1" variant="filled" color="primary" />
					<Chip label="2024A" variant="filled" color="secondary" />
				</Box>

				<Box sx={{ mb: 2 }}>
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						sx={{ mb: 1 }}>
						<CalendarMonthOutlined
							sx={{ fontSize: 16, color: "text.secondary" }}
						/>
						<Typography variant="caption">March 15-16, 2025</Typography>
					</Stack>

					<Stack direction="row" spacing={1} alignItems="center">
						<AccessTime sx={{ fontSize: 16, color: "text.secondary" }} />
						<Typography variant="caption">2 days • 9am-5pm</Typography>
					</Stack>
				</Box>

				<Divider sx={{ my: 2 }} />
			</CardContent>

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

export default EnhancedTutorialProductCard;