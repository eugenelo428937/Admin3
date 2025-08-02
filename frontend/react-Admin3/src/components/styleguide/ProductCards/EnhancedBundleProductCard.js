import React, { useState } from "react";
import {
	Box,
	FormControlLabel,
	Radio,
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
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	Tooltip,
	buttonBaseClasses,
} from "@mui/material";
import {
	Inventory2,
	AddShoppingCart,
	CheckRounded,
	School,
	LibraryBooks,
	Computer,
	Assessment,
	InfoOutline,
} from "@mui/icons-material";

const EnhancedBundleProductCard = ({
	variant = "bundle-product",
	...props
}) => {
	const [showDetails, setShowDetails] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("");
	const [isHovered, setIsHovered] = useState(false);

	const bundleItems = [
		//     Display the following items in the list :
		//     if the item is an ebook, then display a ebook icon
		//     if printed, then display a printer icon
		//     if marking, then display a marking icon

		//     ASET (2020-2023 Papers) eBook
		// Mock Exam Marking Marking
		// Series X Assignments (Marking) Marking
		// Combined Materials Pack Printed
		// Flash Cards Printed

		{
			icon: <School sx={{ fontSize: 16 }} />,
			name: "ASET (2020-2023 Papers) eBook",
			value: "£299",
		},
		{
			icon: <LibraryBooks sx={{ fontSize: 16 }} />,
			name: "Mock Exam Marking",
			value: "£99",
		},
		{
			icon: <Computer sx={{ fontSize: 16 }} />,
			name: "Series X Assignments (Marking)",
			value: "£199",
		},
		{
			icon: <Assessment sx={{ fontSize: 16 }} />,
			name: "Combined Materials Pack",
			value: "£75",
		},
	];

	const totalValue = 672;
	const bundlePrice = 499;
	const savings = totalValue - bundlePrice;

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	return (
		<Card
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			sx={{                 
				transform: isHovered ? 'scale(1.02)' : 'scale(1)',
				transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
			}}
			{...props}>
			{/* Floating Badges */}
			<Box className="floating-badges-container">
				<Chip
					label="CS1"
					size="small"
					className="subject-badge"
					role="img"
					aria-label="Subject: CS1"
					elevation={4}
				/>
				<Chip
					label="25S"
					size="small"
					className="session-badge"
					role="img"
					aria-label="Exam session: 25S"
					elevation={4}
				/>
			</Box>
			<CardHeader
				className="product-header"
				title={
					<Typography
						variant="h4"
						textAlign="left"
						className="product-title">
						Materials & Marking Bundle
						<Tooltip
							className="title-info-tooltip-button"
							title={
								<Typography
									variant="body2"
									color="white"
									padding="0.618rem"
									className="title-info-tooltip-title">
									The products for the Materials & Marking bundle are
									shown seperately in your shopping cart if there's
									anything you don't want then you can remove it in the
									shopping cart page as normal.
								</Typography>
							}
							slotProps={{
								popper: {
									sx: {
										width: "20rem",
										boxShadow: "var(--Paper-shadow)",
									},
								},
							}}
							placement="bottom-start"
							arrow>
							<Button size="small" className="title-info-button">
								<InfoOutline />
							</Button>
						</Tooltip>
					</Typography>
				}
				avatar={
					<Avatar className="product-avatar">
						<Inventory2 className="product-avatar-icon" />
					</Avatar>
				}
			/>

			<CardContent>
				<Typography variant="body2" className="bundle-details-title">
					What's included ({bundleItems.length} items)
				</Typography>

				<List dense className="bundle-items-list">
					{bundleItems.map((item, index) => (
						<ListItem key={index} className="bundle-list-item">
							<ListItemIcon className="bundle-item-icon">
								<CheckRounded />
							</ListItemIcon>
							<ListItemText
								primary={item.name}
								slotProps={{
									primary: {
										variant: "body2",
										className: "bundle-item-text",
									},
								}}								
							/>
							<Typography
								variant="caption"
								color="text.secondary"
								className="bundle-item-value">
								{item.value}
							</Typography>
						</ListItem>
					))}
				</List>
			</CardContent>

			<CardActions>
				{/* Discount Options Section - matches theme structure */}
				<Box className="price-container">
					<Box className="discount-options">
						<Typography variant="subtitle2" className="discount-title">
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
						<Button variant="contained" className="add-to-cart-button">
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
			</CardActions>
		</Card>
	);
};

export default EnhancedBundleProductCard;
