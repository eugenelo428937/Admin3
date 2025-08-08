import React, { useState, useEffect, useRef } from "react";
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
	FormGroup,
	Tooltip,
	Radio,
} from "@mui/material";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import {
	School,
	AddShoppingCart,
	Star,
	AccessTime,
	CalendarMonthOutlined,
	InfoOutline,
	ViewModule,
	LocationOn,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
const actions = [
	{ icon: <ViewModule />, name: "View Selection" },
	{ icon: <CalendarMonthOutlined />, name: "Select Tutorial" },
	{ icon: <AddShoppingCart />, name: "Add to Cart" },
	
];
const EnhancedTutorialProductCard = ({
	variant = "tutorial-product",
	hasTutorialSelection = false,
	onOpenTutorialSelection,
	onViewSelection,
	onAddToCart,
	...props
}) => {
	const [selectedOptions, setSelectedOptions] = useState({
		materials: false,
		recording: false,
	});
    const [isHovered, setIsHovered] = useState(false);
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const [overlayCenter, setOverlayCenter] = useState({ x: 0, y: 0 });
    const speedDialWrapperRef = useRef(null);
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

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	const handleSpeedDialOpen = () => {		
			setSpeedDialOpen(true);		
	};

	const handleSpeedDialClose = () => setSpeedDialOpen(false);

	const handleFabClick = () => {
		if (!hasTutorialSelection) {
			if (typeof onOpenTutorialSelection === "function") {
				onOpenTutorialSelection();
			}
			return;
		}
		setSpeedDialOpen((prev) => !prev);
	};

	const recalcOverlayCenter = () => {
		try {
			const wrapper = speedDialWrapperRef.current;
			if (!wrapper) return;
			const fab = wrapper.querySelector?.(".MuiFab-root");
			const target = fab || wrapper;
			const rect = target.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			setOverlayCenter({ x: centerX, y: centerY });
		} catch (_) {
			// ignore
		}
	};

	useEffect(() => {
		if (speedDialOpen) {
			recalcOverlayCenter();
			const onResize = () => recalcOverlayCenter();
			const onScroll = () => recalcOverlayCenter();
			window.addEventListener("resize", onResize);
			window.addEventListener("scroll", onScroll, true);
			return () => {
				window.removeEventListener("resize", onResize);
				window.removeEventListener("scroll", onScroll, true);
			};
		}
	}, [speedDialOpen]);

	return (
		<Card
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			sx={{
                position: "relative",
				transform: isHovered ? "scale(1.02)" : "scale(1)",
				transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
				title={
					<Typography
						variant="h4"
						textAlign="left"
						className="product-title">
						Birmingham
					</Typography>
				}
				subheader={
					<Typography
						variant="subtitle1"
						textAlign="left"
						className="product-subtitle">
						CS1 Tutorial
					</Typography>
				}
				avatar={
					<Avatar className="product-avatar">
						<School className="product-avatar-icon" />
					</Avatar>
				}
			/>
			<CardContent>
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
							• 6 (4 available, 1 partially booked)
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
						<Typography variant="caption" className="info-sub-text">
							• 3 full days
						</Typography>
						<Typography variant="caption" className="info-sub-text">
							• 6-day bundle
						</Typography>
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
						<Typography variant="caption" className="info-sub-text">
							• BPP Birmingham
						</Typography>
						<Typography variant="caption" className="info-sub-text">
							• Birmingham Vue Cinema
						</Typography>
					</Stack>
				</Box>
				{/* Action buttons merged into Speed Dial below */}
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

						<Box
							sx={{ position: "relative", width: "100%", zIndex: 9000 }}>
							<SpeedDial
								ariaLabel="Tutorial actions"
								icon={<SpeedDialIcon />}
								direction="up"
								onOpen={handleSpeedDialOpen}
								onClose={handleSpeedDialClose}
								open={speedDialOpen}
								FabProps={{
									size: "medium",
									color: "primary",
									onClick: handleFabClick,
								}}
								sx={{
									position: "absolute",
									bottom: 0,
									right: 0,
									zIndex: 9000,
								}}
								className="tutorial-speed-dial">
                                {actions.map((action) => (
									<SpeedDialAction
										key={action.name}
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
                                        onClick={() => {
                                            if (action.name === "View Selection" && typeof onViewSelection === "function") {
                                                onViewSelection();
                                            } else if (action.name === "Select Tutorial" && typeof onOpenTutorialSelection === "function") {
                                                onOpenTutorialSelection();
                                            } else if (action.name === "Add to Cart" && typeof onAddToCart === "function") {
                                                onAddToCart();
                                            }
                                            handleSpeedDialClose();
                                        }}
									/>
								))}
								{/* <SpeedDialAction
									icon={<ViewModule />}
									tooltipTitle="View Selection"
									sx={{
										title: action.name,
									}}
									onClick={() => {
										if (typeof onViewSelection === "function")
											onViewSelection();
										handleSpeedDialClose();
									}}
								/>
								<SpeedDialAction
									icon={<School />}
									tooltipTitle="Select Tutorial"
									onClick={() => {
										if (typeof onOpenTutorialSelection === "function")
											onOpenTutorialSelection();
										handleSpeedDialClose();
									}}
								/>
								<SpeedDialAction
									icon={<AddShoppingCart />}
									tooltipTitle="Add to Cart"
									onClick={() => {
										if (typeof onAddToCart === "function")
											onAddToCart();
										handleSpeedDialClose();
									}}
								/> */}
							</SpeedDial>
						</Box>
					</Box>
				</Box>
			</CardActions>
            {speedDialOpen && (
                <Box
                    onClick={handleSpeedDialClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: (theme) => theme.zIndex.speedDial - 1,
                        pointerEvents: 'auto',
                        backgroundImage: `radial-gradient( circle at 98% 96%, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.20) 120px, rgba(0,0,0,0.12) 240px, rgba(0,0,0,0.06) 420px, rgba(0,0,0,0.0) 65% )`,
                        transition: 'background 200ms ease-out',
                    }}
                />
            )}
		</Card>
	);
};

export default EnhancedTutorialProductCard;
