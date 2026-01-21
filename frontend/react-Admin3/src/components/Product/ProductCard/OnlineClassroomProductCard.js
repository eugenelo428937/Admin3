import React, { useState } from "react";
import { formatVatLabel } from '../../../utils/vatUtils';
import { formatPrice } from '../../../utils/priceFormatter';
import { useCart } from "../../../contexts/CartContext";
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


const OnlineClassroomProductCard = React.memo(
	({ product, onAddToCart, variant = "product", producttype = "online-classroom", ...props }) => {
		// Initialize with the first available variation ID instead of hardcoded string
		const [selectedVariation, setSelectedVariation] = useState(
			product.variations?.[0]?.id?.toString() || ""
		);
		const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
		const [isHovered, setIsHovered] = useState(false);
		const [showPriceModal, setShowPriceModal] = useState(false);

		const { cartData } = useCart();

		// Get user's VAT region from cart data
		const userRegion = cartData?.vat_calculations?.region_info?.region || 'UK';

		// Use actual product variations instead of hardcoded options
		const currentVariation = product.variations?.find(
			v => v.id.toString() === selectedVariation
		);

		const handleVariationChange = (event) => {
			setSelectedVariation(event.target.value);
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
								<TableCell align="right">Price</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{product.variations?.map((variation) => (
								<React.Fragment key={variation.id}>
									{variation.prices?.map((price) => {
										return (
											<TableRow key={`${variation.id}-${price.price_type}`}>
												<TableCell>{variation.name}</TableCell>
												<TableCell>{price.price_type}</TableCell>
												<TableCell align="right">
													{formatPrice(price.amount)}
												</TableCell>
											</TableRow>
										);
									})}
								</React.Fragment>
							))}
						</TableBody>
					</Table>
					<Box sx={{ mt: 2 }}>
						<Typography variant="caption" color="text.secondary">
							{product.vat_status_display || 'VAT calculated at checkout based on your location'}
						</Typography>
					</Box>
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
				producttype={producttype}
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
						label={<Typography variant="chip">{product.subject_code}</Typography>}
						size="small"
						className="subject-badge"
						role="img"
						aria-label={`Subject: ${product.subject_code || "CP1"}`}
					/>
					<Chip
						label={<Typography variant="chip">
							{product.exam_session_code ||
							product.session_code ||
							product.exam_session ||
							product.session}
							</Typography>
						 }
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
							{product.subject_code} Online Classroom
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
							value={selectedVariation}
							onChange={handleVariationChange}
							className="variations-group"
							sx={{ margin: 0 }}>
							<Stack spacing={1} sx={{ margin: 0 }}>
								{product.variations?.map((variation) => {
									const standardPrice = variation.prices?.find(
										(p) => p.price_type === "standard"
									);
									return (
										<Box key={variation.id} className="variation-option" sx={{ margin: 0 }}>
											<FormControlLabel
												value={variation.id.toString()}
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
																	selectedVariation === variation.id.toString() ? 600 : 400
																}>
																{variation.name}
															</Typography>
															{standardPrice && (
																<Typography
																	variant="body2"
																	color="primary.main"
																	fontWeight={600}>
																	£{standardPrice.amount}
																</Typography>
															)}
														</Box>														
													</Box>
												}
												className="variation-control"
											/>
										</Box>
									);
								})}
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
								<Typography variant="price" className="price-display">
									{(() => {
										if (!currentVariation) return "£0.00";

										const standardPrice = currentVariation.prices?.find(p => p.price_type === "standard");
										const retakerPrice = currentVariation.prices?.find(p => p.price_type === "retaker");
										const additionalPrice = currentVariation.prices?.find(p => p.price_type === "additional");

										if (selectedPriceType === "retaker" && retakerPrice) {
											return `£${retakerPrice.amount}`;
										} else if (selectedPriceType === "additional" && additionalPrice) {
											return `£${additionalPrice.amount}`;
										} else if (standardPrice) {
											return `£${standardPrice.amount}`;
										}
										return "£0.00";
									})()}
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
									{product.vat_status_display || "Price includes VAT"}
								</Typography>
							</Box>
							<Button
								variant="contained"
								className="add-to-cart-button"
								onClick={() => {
									if (!onAddToCart || !currentVariation) return;

									// Get the appropriate price based on selected price type
									const priceType = selectedPriceType || "standard";
									const priceObj = currentVariation.prices?.find(p => p.price_type === priceType);

									// Build metadata with is_digital flag
									const metadata = {
										type: "online_classroom",
										producttype: product.type,
										variationId: currentVariation.id,
										variationName: currentVariation.name,
										variationType: currentVariation.variation_type,
										subjectCode: product.subject_code,
										productName: product.product_name,
										is_digital: true, // Online Classroom is always digital
									};

									// Construct context similar to MaterialProductCard
									const context = {
										// Use actual integer variation ID from database
										variationId: currentVariation.id,
										variationName: currentVariation.name,
										priceType: priceType,
										actualPrice: priceObj?.amount || "0.00",
										metadata: metadata,
									};

									onAddToCart(product, context);
								}}
								disabled={!currentVariation}>
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