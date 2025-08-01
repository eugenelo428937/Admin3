import React, { useState } from "react";
import {
	Stack,
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	CardActions,
	Button,
	Chip,
	Divider,
	Tooltip,
} from "@mui/material";
import {
	RuleOutlined,
	AddShoppingCart,
	InfoOutline,
	CalendarMonthOutlined,
} from "@mui/icons-material";

// Enhanced Marking Product Card - All Deadlines Available
const MarkingProductCard = () => {
	const [selectedPriceType, setSelectedPriceType] = useState("");

	const mockDeadlines = [
		{
			id: 1,
			deadline: new Date("2025-03-15"),
			recommended_submit_date: new Date("2025-03-10"),
		},
		{
			id: 2,
			deadline: new Date("2025-06-15"),
			recommended_submit_date: new Date("2025-06-10"),
		},
		{
			id: 3,
			deadline: new Date("2025-09-15"),
			recommended_submit_date: new Date("2025-09-10"),
		},
	];

	const now = new Date();
	const upcoming = mockDeadlines.filter((d) => d.deadline > now);
	const expired = mockDeadlines.filter((d) => d.deadline <= now);

	return (
		<Card
			elevation={2}
			className="product-card d-flex flex-column"
			sx={{ maxWidth: 340, height: "fit-content", overflow: "hidden" }}>
			<Box className="floating-badges-container">
				<Chip
					label="CM1"
					size="small"
					className="subject-badge"
					role="img"
					aria-label="Subject: CM1"
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
				title={
					<Box
						display="flex"
						alignItems="center"
						justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1 }}>
							Series X Assignments (Marking)
						</Typography>
						<Box
							sx={{
								backgroundColor: "white",
								borderRadius: "50%",
								p: 1.5,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
							}}>
							<RuleOutlined
								sx={{ fontSize: 16, color: "orange.main" }}
							/>
						</Box>
					</Box>
				}
				className="product-card-header marking-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Stack direction="column" className="info-row">
					<Stack
						direction="row"
						alignItems="center"
						className="info-title">
						<CalendarMonthOutlined className="info-icon" />
						<Typography variant="caption" className="info-text">
							Number of submissions:
						</Typography>
					</Stack>
					<Typography variant="caption" className="info-sub-text">
						• 3
					</Typography>
				</Stack>
				{/* Add Pagination for showing different deadlines messages for demo purposes */}
				<Box
					sx={{
						mt: 2,
						p: 1.5,
						bgcolor: "info.50",
						borderRadius: 1,
						border: 1,
						borderColor: "info.light",
					}}>
					<Stack direction="row" spacing={1} alignItems="flex-start">
						<CalendarMonthOutlined
							sx={{ fontSize: 16, color: "info.main", mt: 0.2 }}
						/>
						<Typography variant="caption" color="info.dark">
							Next deadline: 15/09/2025
						</Typography>
					</Stack>
				</Box>
				<Box
					sx={{
						mt: 2,
						p: 1.5,
						bgcolor: "warning.50",
						borderRadius: 1,
						border: 1,
						borderColor: "info.warning",
					}}>
					<Stack direction="row" spacing={1} alignItems="flex-start">
						<CalendarMonthOutlined
							sx={{ fontSize: 16, color: "info.main", mt: 0.2 }}
						/>
						<Typography variant="caption" color="info.dark">
							Next deadline: 15/09/2025
						</Typography>
						<Typography variant="caption" color="info.dark">
							Deadline due in <b>7</b> days.
						</Typography>
					</Stack>
				</Box>
				<Box
					sx={{
						mt: 2,
						p: 1.5,
						bgcolor: "error.50",
						borderRadius: 1,
						border: 1,
						borderColor: "error.light",
					}}>
					<Stack direction="row" spacing={1} alignItems="flex-start">
						<CalendarMonthOutlined
							sx={{ fontSize: 16, color: "error.main", mt: 0.2 }}
						/>
						<Typography variant="caption" color="error.dark">
							2/3 deadlines expired
						</Typography>
						<Typography variant="caption" color="error.dark">
							Consider using Marking Voucher instead. 
						</Typography>
					</Stack>
				</Box>
				<Box
					sx={{
						mt: 2,
						p: 1.5,
						bgcolor: "error.50",
						borderRadius: 1,
						border: 1,
						borderColor: "error.light",
					}}>
					<Stack direction="row" spacing={1} alignItems="flex-start">
						<CalendarMonthOutlined
							sx={{ fontSize: 16, color: "error.main", mt: 0.2 }}
						/>
						<Typography variant="caption" color="error.dark">
							All deadlines expired
						</Typography>
						<Typography variant="caption" color="error.dark">
							Consider using Marking Voucher instead.
						</Typography>
					</Stack>
				</Box>
			</CardContent>
			<CardActions
				className="product-card-actions"
				sx={{
					px: 2,
					py: 1,
					flexDirection: "column",
					alignItems: "stretch",
					mt: "auto",
					height: "auto !important",
					minHeight: "auto !important",
				}}>
				<Box
					display="flex"
					alignItems="center"
					justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography
							variant="h4"
							fontWeight={700}
							color="primary.main">
							£35.00
						</Typography>
						<Tooltip title="Show price details">
							<Button
								variant="outlined"
								size="small"
								sx={{ minWidth: "auto", px: 1, py: 0.5 }}>
								<InfoOutline sx={{ fontSize: 16 }} />
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
					Standard pricing • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

export default MarkingProductCard;
