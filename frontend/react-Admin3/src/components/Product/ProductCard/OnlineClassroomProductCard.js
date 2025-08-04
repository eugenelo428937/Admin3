import React, { useState } from "react";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	FormControlLabel,
	Radio,
	RadioGroup,
	Typography,
	Box,
	Stack,
	Avatar,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
} from "@mui/material";
import {
	InfoOutline,
	AddShoppingCart,
	Computer,
} from "@mui/icons-material";
import "../../../styles/product_card.css";


const OnlineClassroomProductCard = React.memo(
	({ product, onAddToCart, variant = "online-product", ...props }) => {
		const [selectedFormat, setSelectedFormat] = useState('live');
		const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
		const [isHovered, setIsHovered] = useState(false);
		const [showPriceModal, setShowPriceModal] = useState(false);

		// Format options for online classroom
		const formatOptions = {
			live: {
				price: 249,
				label: "The Hub (VLE)",
				description: "Tutorial recordings delivered via the BPP Learning Hub",
			},
		};

		const handleFormatChange = (event) => {
			setSelectedFormat(event.target.value);
		};

		const handleMouseEnter = () => {
			setIsHovered(true);
		};

		const handleMouseLeave = () => {
			setIsHovered(false);
		};


		const renderPriceModal = () => (
			<Dialog
				open={showPriceModal}
				onClose={() => setShowPriceModal(false)}
				maxWidth="md"
				fullWidth>
				<DialogTitle>
					<Typography variant="h6">Price Information</Typography>
				</DialogTitle>
				<DialogContent>
					<Box sx={{ mb: 2 }}>
						<Typography variant="body2" color="text.secondary">
							Subject: {product.subject_code}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Product Name: {product.product_name}
						</Typography>
					</Box>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Format</TableCell>
								<TableCell>Price Type</TableCell>
								<TableCell>Price</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{Object.entries(formatOptions).map(([formatKey, format]) => (
								<React.Fragment key={formatKey}>
									<TableRow>
										<TableCell>{format.label}</TableCell>
										<TableCell>Standard</TableCell>
										<TableCell>£{format.price}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>{format.label}</TableCell>
										<TableCell>Retaker</TableCell>
										<TableCell>£{(format.price * 0.8).toFixed(2)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>{format.label}</TableCell>
										<TableCell>Additional Copy</TableCell>
										<TableCell>£{(format.price * 0.5).toFixed(2)}</TableCell>
									</TableRow>
								</React.Fragment>
							))}
						</TableBody>
					</Table>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowPriceModal(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		);


		return (
			<Card
				elevation={2}
				variant={variant}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				sx={{                 
					transform: isHovered ? 'scale(1.02)' : 'scale(1)',
					transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
					display: 'flex',
					flexDirection: 'column',
					height: '100%'
				}}
				className="d-flex flex-column"
				{...props}>
				{/* Floating Badges */}
				<Box className="floating-badges-container">
					<Chip
						label={product.subject_code || "CP1"}
						size="small"
						className="subject-badge"
						role="img"
						aria-label={`Subject: ${product.subject_code || "CP1"}`}
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
						width: '100%', 
						margin: 0, 
						padding: 0,
						'& .MuiCardHeader-root': {
							width: '100%'
						}
					}}
					title={
						<Typography
							variant="h4"
							textAlign="left"
							className="product-title">
							Online Classroom
						</Typography>
					}
					subheader={
						<Typography
							variant="subtitle1"
							textAlign="left"
							className="product-subtitle">
							{product.subject_code} - {product.product_name || "Actuarial Practice"}
						</Typography>
					}
					avatar={
						<Avatar className="product-avatar">
							<Computer className="product-avatar-icon" />
						</Avatar>
					}
				/>

				<CardContent sx={{ alignSelf: 'flex-start', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
					<Box className="product-variations">
						<Typography variant="subtitle2" className="variations-title">
							Access Options
						</Typography>

						<RadioGroup
							value={selectedFormat}
							onChange={handleFormatChange}
							className="variations-group"
							sx={{ margin: 0 }}>
							<Stack spacing={1} sx={{ margin: 0 }}>
								{Object.entries(formatOptions).map(([key, option]) => (
									<Box key={key} className="variation-option" sx={{ margin: 0 }}>
										<FormControlLabel
											value={key}
											control={<Radio size="small" />}
											sx={{ margin: 0 }}
											label={
												<Box className="variation-label">
													<Box
														display="flex"
														justifyContent="space-between"
														alignItems="center">
														<Typography
															variant="body2"
															fontWeight={
																selectedFormat === key ? 600 : 400
															}>
															{option.label}
														</Typography>
														<Typography
															variant="body2"
															color="primary.main"
															fontWeight={600}>
															£{option.price}
														</Typography>
													</Box>
													<Typography
														variant="caption"
														color="text.secondary"
														className="variation-description">
														{option.description}
													</Typography>
												</Box>
											}
											className="variation-control"
										/>
									</Box>
								))}
							</Stack>
						</RadioGroup>
					</Box>
				</CardContent>

				<CardActions sx={{ width: '100%', margin: 0, padding: 2 }}>
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
										? `£${(
												formatOptions[selectedFormat].price * 0.8
										  ).toFixed(2)}`
										: selectedPriceType === "additional"
										? `£${(
												formatOptions[selectedFormat].price * 0.5
										  ).toFixed(2)}`
										: `£${formatOptions[selectedFormat].price}`}
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
									{selectedPriceType === "retaker"
										? "Retaker discount applied"
										: selectedPriceType === "additional"
										? "Additional copy discount applied"
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
				{renderPriceModal()}
			</Card>
		);
	}
);

export default OnlineClassroomProductCard; 