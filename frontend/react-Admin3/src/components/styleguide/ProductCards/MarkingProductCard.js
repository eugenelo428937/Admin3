import React, { useState, useRef } from "react";
import {
	Stack,
	Box,
	Typography,
	CardContent,
	CardHeader,
	CardActions,
	Button,
	Chip,
	Tooltip,
	Avatar,
	IconButton,
	Backdrop,
	SpeedDial,
	SpeedDialAction,
	SpeedDialIcon,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import {
	RuleOutlined,
	AddShoppingCart,
	InfoOutline,
	CalendarMonthOutlined,
	Circle,
	Close,
	TipsAndUpdatesOutlined,
	FolderCopyOutlined,
	CheckCircle,
} from "@mui/icons-material";
import BaseProductCard from "../../Common/BaseProductCard";

// Enhanced Marking Product Card - Deadline Scenarios with Pagination
const MarkingProductCard = ({ productType = "marking", buttonPage = 0 }) => {
	const [currentScenario, setCurrentScenario] = useState(0);
	const [isHovered, setIsHovered] = useState(false);
	const [speedDialOpen, setSpeedDialOpen] = useState(false);
	const [showCheck, setShowCheck] = useState(false);
	const cardRef = useRef(null);
	const theme = useTheme();

	// Different deadline scenarios for pagination showcase
	const deadlineScenarios = [
		{
			id: 0,
			title: "All Available",
			messageBox: {
				type: "info",
				icon: CalendarMonthOutlined,
				message: "Next deadline: 15/03/2025",
				bgColor: "info.50",
				borderColor: "info.light",
				textColor: "info.dark"
			}
		},
		{
			id: 1,
			title: "Upcoming Soon",
			messageBox: {
				type: "warning",
				icon: CalendarMonthOutlined,
				message: "Next deadline: 15/03/2025",
				submessage: "Deadline due in 7 days.",
				bgColor: "warning.50",
				borderColor: "warning.light",
				textColor: "warning.dark"
			}
		},
		{
			id: 2,
			title: "Some Expired",
			messageBox: {
				type: "error",
				icon: CalendarMonthOutlined,
				message: "2/3 deadlines expired",
				submessage: "Consider using Marking Voucher instead.",
				bgColor: "error.50",
				borderColor: "error.light",
				textColor: "error.dark"
			}
		},
		{
			id: 3,
			title: "All Expired",
			messageBox: {
				type: "error",
				icon: CalendarMonthOutlined,
				message: "All deadlines expired",
				submessage: "Consider using Marking Voucher instead.",
				bgColor: "error.50",
				borderColor: "error.light",
				textColor: "error.dark"
			}
		},
		{
			id: 4,
			title: "No Deadlines",
			messageBox: {
				type: "info",
				icon: CalendarMonthOutlined,
				message: "No upcoming deadlines",
				submessage: "Check back later for new submissions.",
				bgColor: "grey.50",
				borderColor: "grey.300",
				textColor: "grey.700"
			}
		}
	];

	const handleScenarioChange = (index) => {
		setCurrentScenario(index);
	};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	return (
		<ThemeProvider theme={theme}>
			<BaseProductCard
				ref={cardRef}
				elevation={2}
				variant="product"
				productType={productType}
				className="d-flex flex-column"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				sx={{
					transform: isHovered ? 'scale(1.02)' : 'scale(1)',
					transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
				}}>
			{/* Floating Badges */}
			<Box className="floating-badges-container">
				<Chip
					label="CM1"
					size="small"
					className="subject-badge"
					role="img"
					aria-label="Subject: CM1"
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
					<Typography variant="h4" className="product-title">
						Series X Assignments (Marking)
					</Typography>
				}
				
				avatar={
					<Avatar className="product-avatar">
						<RuleOutlined className="product-avatar-icon" />
					</Avatar>
				}
			/>

			<CardContent>
				{/* Number of submissions info */}
				<Stack direction="column" spacing={1} className="marking-submissions-info">
					<Stack direction="row" alignItems="center" spacing={1} className="submissions-info-row">
						<CalendarMonthOutlined className="submissions-info-icon" />
						<Typography variant="body2" color="text.secondary" className="submissions-info-title">
							Number of submissions:
						</Typography>
						<Typography variant="body2" className="submissions-info-count">
						3
					</Typography>
					</Stack>
				</Stack>

				{/* Dynamic deadline message based on current scenario */}
				<Box
					className="marking-deadline-message"
					sx={{
						bgcolor: deadlineScenarios[currentScenario].messageBox.bgColor,
						borderColor: deadlineScenarios[currentScenario].messageBox.borderColor,
					}}>
					<Stack direction="row" alignItems="flex-start" className="deadline-message-content">
						{React.createElement(deadlineScenarios[currentScenario].messageBox.icon, {
							className: "deadline-message-icon",
							sx: { 
								color: deadlineScenarios[currentScenario].messageBox.textColor === "info.dark" ? "info.main" : 
								       deadlineScenarios[currentScenario].messageBox.textColor === "warning.dark" ? "warning.main" :
								       deadlineScenarios[currentScenario].messageBox.textColor === "error.dark" ? "error.main" : "grey.600",
							}
						})}
						<Box className="deadline-message-text">
							<Typography variant="caption" color={deadlineScenarios[currentScenario].messageBox.textColor} className="deadline-message-primary">
								{deadlineScenarios[currentScenario].messageBox.message}
							</Typography>
							{deadlineScenarios[currentScenario].messageBox.submessage && (
								<Typography variant="caption" color={deadlineScenarios[currentScenario].messageBox.textColor} className="deadline-message-secondary">
									{deadlineScenarios[currentScenario].messageBox.submessage}
								</Typography>
							)}
						</Box>
					</Stack>
				</Box>

				{/* Pagination dots */}
				<Box className="marking-pagination-container">
					{deadlineScenarios.map((scenario, index) => (
						<IconButton
							key={scenario.id}
							size="small"
							onClick={() => handleScenarioChange(index)}
							className="pagination-dot-button"
						>
							<Circle
								className={`pagination-dot ${currentScenario === index ? 'active' : 'inactive'}`}
							/>
						</IconButton>
					))}
				</Box>

				{/* Submission Deadlines Button */}
				<Button
					variant="outlined"
					size="small"
					className="submission-deadlines-button"
				>
					Submission Deadlines
				</Button>
			</CardContent>
			<CardActions>
				<Box className="price-container">
					<Box className="price-action-section">
						<Box className="price-info-row">
							<Typography variant="h3" className="price-display">
								£35.00
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
								Standard pricing
							</Typography>
							<Typography
								variant="fineprint"
								className="vat-status-text"
								color="text.secondary">
								Price includes VAT
							</Typography>
						</Box>
						{/* Add to Cart Button - 3 behaviors based on buttonPage */}
						{buttonPage === 0 ? (
							<Button
								variant="contained"
								className="add-to-cart-button"
								aria-label="Add to cart"
								sx={{
									alignSelf: "stretch",
									...(showCheck ? { backgroundColor: "green" } : {}),
								}}>
								{showCheck ? <CheckCircle /> : <AddShoppingCart />}
							</Button>
						) : buttonPage === 1 ? (
							<>
								<Backdrop
									open={speedDialOpen}
									onClick={() => setSpeedDialOpen(false)}
									sx={{
										position: "fixed",
										zIndex: (thm) => thm.zIndex.speedDial - 1,
									}}
								/>
								<SpeedDial
									ariaLabel="Speed Dial for add to cart"
									className="add-to-cart-speed-dial"
									icon={
										<SpeedDialIcon
											icon={<AddShoppingCart />}
											openIcon={<Close />}
										/>
									}
									onClose={() => setSpeedDialOpen(false)}
									onOpen={() => setSpeedDialOpen(true)}
									open={speedDialOpen}
									direction="up"
									sx={{
										position: "absolute",
										bottom: 18,
										right: 8,
										"& .MuiFab-root": {
											backgroundColor: theme.palette.bpp.pink["060"],
											boxShadow: "var(--Paper-shadow)",
											"&:hover": {
												backgroundColor: theme.palette.bpp.pink["080"],
											},
											"& .MuiSpeedDialIcon-root": {
												"& .MuiSvgIcon-root": {
													fontSize: "1.6rem",
												},
											},
										},
									}}>
									<SpeedDialAction
										icon={<AddShoppingCart />}
										slotProps={{
											tooltip: { open: true, title: "Add to Cart" },
										}}
										sx={{
											"& .MuiSpeedDialAction-staticTooltipLabel": {
												whiteSpace: "nowrap",
												maxWidth: "none",
											},
											"& .MuiSpeedDialAction-fab": {
												color: "white",
												backgroundColor: theme.palette.bpp.pink["060"],
												"&:hover": {
													backgroundColor: theme.palette.bpp.pink["080"],
												},
											},
										}}
										aria-label="Add to cart"
									/>
									<SpeedDialAction
										icon={<TipsAndUpdatesOutlined />}
										slotProps={{
											tooltip: { open: true, title: "Buy with Marking Voucher £25" },
										}}
										sx={{
											"& .MuiSpeedDialAction-staticTooltipLabel": {
												whiteSpace: "normal",
												textWrap: "balance",
												minWidth: "200px",
											},
											"& .MuiSpeedDialAction-fab": {
												color: "white",
												backgroundColor: theme.palette.bpp.pink["060"],
												"&:hover": {
													backgroundColor: theme.palette.bpp.pink["080"],
												},
											},
										}}
										aria-label="Buy with Recommended"
										onClick={() => setSpeedDialOpen(false)}
									/>
								</SpeedDial>
							</>
						) : (
							<>
								<Backdrop
									open={speedDialOpen}
									onClick={() => setSpeedDialOpen(false)}
									sx={{
										position: "fixed",
										zIndex: (thm) => thm.zIndex.speedDial - 1,
									}}
								/>
								<SpeedDial
									ariaLabel="Speed Dial for add to cart"
									className="add-to-cart-speed-dial"
									icon={
										<SpeedDialIcon
											icon={<AddShoppingCart />}
											openIcon={<Close />}
										/>
									}
									onClose={() => setSpeedDialOpen(false)}
									onOpen={() => setSpeedDialOpen(true)}
									open={speedDialOpen}
									direction="up"
									sx={{
										position: "absolute",
										bottom: 18,
										right: 8,
										"& .MuiFab-root": {
											backgroundColor: theme.palette.bpp.pink["060"],
											"&:hover": {
												backgroundColor: theme.palette.bpp.pink["080"],
											},
											"& .MuiSpeedDialIcon-root": {
												"& .MuiSvgIcon-root": {
													fontSize: "1.6rem",
												},
											},
										},
									}}>
									<SpeedDialAction
										icon={<AddShoppingCart />}
										slotProps={{
											tooltip: { open: true, title: "Add to Cart" },
										}}
										sx={{
											"& .MuiSpeedDialAction-staticTooltipLabel": {
												whiteSpace: "nowrap",
												maxWidth: "none",
											},
											"& .MuiSpeedDialAction-fab": {
												color: "white",
												backgroundColor: theme.palette.bpp.pink["060"],
												boxShadow: "var(--Paper-shadow)",
												"&:hover": {
													backgroundColor: theme.palette.bpp.pink["080"],
												},
											},
										}}
										aria-label="Add to cart"
										onClick={() => setSpeedDialOpen(false)}
									/>
									<SpeedDialAction
										icon={<FolderCopyOutlined />}
										slotProps={{
											tooltip: { open: true, title: "Buy Both (Marking + Voucher)" },
										}}
										sx={{
											"& .MuiSpeedDialAction-staticTooltipLabel": {
												whiteSpace: "nowrap",
												maxWidth: "none",
											},
											"& .MuiSpeedDialAction-fab": {
												color: "white",
												backgroundColor: theme.palette.bpp.pink["060"],
												"&:hover": {
													backgroundColor: theme.palette.bpp.pink["080"],
												},
											},
										}}
										aria-label="Buy Both (Marking + Voucher)"
										onClick={() => setSpeedDialOpen(false)}
									/>
								</SpeedDial>
							</>
						)}
					</Box>
				</Box>
			</CardActions>
			</BaseProductCard>
		</ThemeProvider>
	);
};

export default MarkingProductCard;
