import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { formatPrice } from '../../../utils/priceFormatter';
import { formatVatLabel } from '../../../utils/vatUtils';
import {
	Button,
	Chip,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	FormControlLabel,
	Typography,
	Box,
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
	Avatar,
	Stack,
	Radio,
	RadioGroup,
} from "@mui/material";
import {
	InfoOutline,
	AddShoppingCart,
	LibraryBooksSharp,
} from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { useCart } from "../../../contexts/CartContext";
import BaseProductCard from "../../Common/BaseProductCard";
import MarkingProductCard from "./MarkingProductCard";
import MarkingVoucherProductCard from "./MarkingVoucherProductCard";
import TutorialProductCard from "./Tutorial/TutorialProductCard";
import OnlineClassroomProductCard from "./OnlineClassroomProductCard";
import BundleCard from "./BundleCard";
import "../../../styles/product_card.css";

const MaterialProductCard = React.memo(
	({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
		const [selectedVariation, setSelectedVariation] = useState("");
		const [showPriceModal, setShowPriceModal] = useState(false);
		const [selectedPriceType, setSelectedPriceType] = useState("");
		const [isHovered, setIsHovered] = useState(false);
		const theme = useTheme();
		const cardRef = useRef(null);

		const { cartData } = useCart();

		// Get user's VAT region from cart data
		const userRegion = cartData?.vat_calculations?.region_info?.region || 'UK';

		const handleMouseEnter = useCallback(() => {
			setIsHovered(true);
		}, []);

		const handleMouseLeave = useCallback(() => {
			setIsHovered(false);
		}, []);

		// Memoize expensive calculations
		const productTypeCheck = useMemo(
			() => ({
				isTutorial: product.type === "Tutorial",
				isMarking: product.type === "Markings",
				isMarkingVoucher:
					product.type === "MarkingVoucher" ||
					product.is_voucher === true ||
					product.product_name?.toLowerCase().includes("voucher") ||
					(product.code && product.code.startsWith("VOUCHER")),
				isOnlineClassroom:
					product.product_name
						?.toLowerCase()
						.includes("online classroom") ||
					product.product_name?.toLowerCase().includes("recording") ||
					product.learning_mode === "LMS",
				isBundle:
					product.type === "Bundle" ||
					product.product_name?.toLowerCase().includes("bundle") ||
					product.product_name?.toLowerCase().includes("package") ||
					product.is_bundle === true,
			}),
			[
				product.type,
				product.product_name,
				product.learning_mode,
				product.is_bundle,
				product.is_voucher,
				product.code,
			]
		);

		// Memoize variation calculations
		const variationInfo = useMemo(() => {
			const hasVariations =
				product.variations && product.variations.length > 0;
			const singleVariation =
				product.variations && product.variations.length === 1
					? product.variations[0]
					: null;

			const currentVariation = hasVariations
				? selectedVariation
					? product.variations.find(
							(v) => v.id.toString() === selectedVariation
					  )
					: singleVariation || product.variations[0]
				: singleVariation;


			return { hasVariations, singleVariation, currentVariation };
		}, [product.variations, selectedVariation]);

	// Initialize selectedVariation when product loads
	useEffect(() => {
		if (product.variations && product.variations.length > 0 && !selectedVariation) {
			setSelectedVariation(product.variations[0].id.toString());
		}
	}, [product.id, product.essp_id]); // Only when product changes

		// Memoize price calculation to avoid recalculating on every render
		const getPrice = useMemo(() => {
			return (variation, priceType) => {
				if (!variation || !variation.prices) return null;
				const priceObj = variation.prices.find(
					(p) => p.price_type === priceType
				);
				if (!priceObj) return null;

				return (
					<div className="d-flex flex-row align-items-end">
						<Typography variant="h6" className="fw-lighter w-100">
							{formatPrice(priceObj.amount)}
						</Typography>

						<Tooltip
							title="Show all price types"
							placement="top"
							className="d-flex flex-row align-self-start">
							<InfoOutline
								role="button"
								className="text-secondary mx-1 fw-light"
								onClick={() => setShowPriceModal(true)}
								style={{
									cursor: "pointer",
									fontSize: "1rem",
								}}
								aria-label="Show price information"
							/>
						</Tooltip>
					</div>
				);
			};
		}, [product.type]);

		const {
			isTutorial,
			isMarking,
			isMarkingVoucher,
			isOnlineClassroom,
			isBundle,
		} = productTypeCheck;
		const { hasVariations, currentVariation } = variationInfo;

		const hasPriceType = (variation, priceType) => {
			if (!variation || !variation.prices) return false;
			return variation.prices.some((p) => p.price_type === priceType);
		};

		// Reset price type if current selection is not available for the current variation
		useEffect(() => {
			if (currentVariation && selectedPriceType) {
				if (!hasPriceType(currentVariation, selectedPriceType)) {
					setSelectedPriceType("");
				}
			}
		}, [currentVariation, selectedPriceType]);

		// For Tutorial products, use the specialized component
		if (isTutorial && !isOnlineClassroom) {
			return (
				<TutorialProductCard
					subjectCode={product.subject_code}
					subjectName={product.subject_name || product.product_name}
					location={product.shortname || product.product_name}
					productId={product.essp_id || product.id || product.product_id}
					product={product}
					variations={product.variations}
					onAddToCart={onAddToCart}
				/>
			);
		}

		// For Marking Voucher products, use the specialized component
		if (isMarkingVoucher) {
			return (
				<MarkingVoucherProductCard
					voucher={product}
					onAddToCart={onAddToCart}
				/>
			);
		}

		// For Markings products, use the specialized component
		if (isMarking) {
			return (
				<MarkingProductCard
					product={product}
					onAddToCart={onAddToCart}
					allEsspIds={allEsspIds}
					bulkDeadlines={bulkDeadlines}
				/>
			);
		}

		// For Online Classroom products, use the specialized component
		if (isOnlineClassroom) {
			return (
				<OnlineClassroomProductCard
					product={product}
					onAddToCart={onAddToCart}
				/>
			);
		}

		// For Bundle products, use the specialized component
		if (isBundle) {
			return <BundleCard bundle={product} onAddToCart={onAddToCart} />;
		}

		const handlePriceTypeChange = (priceType) => {
			if (selectedPriceType === priceType) {
				setSelectedPriceType("");
			} else {
				setSelectedPriceType(priceType);
			}
		};

		const handleVariationChange = (event) => {
			setSelectedVariation(event.target.value);
		};

		const renderPriceModal = () => (
			<Dialog
				open={showPriceModal}
				onClose={() => setShowPriceModal(false)}
				maxWidth="md"
				fullWidth>
				<DialogTitle>
					Price Information
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
								<TableCell>Variation</TableCell>
								<TableCell>Price Type</TableCell>
								<TableCell align="right">Price</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{product.variations &&
								product.variations.map(
									(variation) =>
										variation.prices &&
										variation.prices.map((price) => {
											return (
												<TableRow
													key={`${variation.id}-${price.price_type}`}>
													<TableCell>{variation.name}</TableCell>
													<TableCell>{price.price_type}</TableCell>
													<TableCell align="right">
														{formatPrice(price.amount)}
													</TableCell>
												</TableRow>
											);
										})
								)}
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

		// Render Regular Product Content
		const renderRegularContent = () => (
			<>
				<CardContent>
					{/* Enhanced Variations Section - Better hierarchy */}
					<Box className="product-variations">
						<Typography variant="subtitle2" className="variations-title">
							Product Variations
						</Typography>

						{hasVariations && (
							<RadioGroup
								value={selectedVariation}
								onChange={handleVariationChange}
								className="variations-group">
								<Stack spacing={1}>
									{product.variations.map((variation) => {
										const standardPrice = variation.prices?.find(
											(p) => p.price_type === "standard"
										);
										return (
											<Box
												key={variation.id}
												className="variation-option"
												sx={{
													borderColor:
														selectedVariation ===
														variation.id.toString()
															? "primary.main"
															: "divider",
													backgroundColor:
														selectedVariation ===
														variation.id.toString()
															? "primary.50"
															: "transparent",
												}}>
												<FormControlLabel
													value={variation.id.toString()}
													control={<Radio size="small" />}
													label={
														<Typography
															variant="body2"
															className="variation-label"
															fontWeight={
																selectedVariation ===
																variation.id.toString()
																	? 600
																	: 400
															}>
															{variation.name}
														</Typography>
													}
													className="variation-control"
												/>
												{standardPrice && (
													<Typography
														variant="body2"
														color="primary.main"
														className="variation-price"
														fontWeight={600}>
														{formatPrice(standardPrice.amount)}
													</Typography>
												)}
											</Box>
										);
									})}

									{/* Buy Both Option */}
									{product.buy_both &&
										product.variations &&
										product.variations.length > 1 && (
											<Box
												className="variation-option buy-both-option"
												sx={{
													borderColor: "secondary.main",
													backgroundColor: "secondary.50",
												}}>
												<FormControlLabel
													value="buy_both"
													control={
														<Radio
															size="small"
															color="secondary"
														/>
													}
													label={
														<Typography
															variant="body2"
															className="variation-label buy-both-label"
															color="secondary.main">
															{product.variations[0]
																?.description_short ||
																product.variations[0]
																	?.name}{" "}
															+{" "}
															{product.variations[1]
																?.description_short ||
																product.variations[1]?.name}
														</Typography>
													}
													className="variation-control"
												/>
												{(() => {
													const price1 =
														product.variations[0]?.prices?.find(
															(p) => p.price_type === "standard"
														);
													const price2 =
														product.variations[1]?.prices?.find(
															(p) => p.price_type === "standard"
														);
													if (price1 && price2) {
														const totalPrice =
															parseFloat(price1.amount) +
															parseFloat(price2.amount);
														return (
															<Typography
																variant="body2"
																color="secondary.main"
																className="variation-price buy-both-price"
																fontWeight={600}>
																{formatPrice(
																	totalPrice.toString()
																)}
															</Typography>
														);
													}
													return null;
												})()}
											</Box>
										)}
								</Stack>
							</RadioGroup>
						)}
					</Box>
				</CardContent>
				<CardActions>
					<Box className="price-container">
						{/* Left Column - Discount Options */}
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
												handlePriceTypeChange("retaker")
											}
											size="small"
											disabled={
												!hasPriceType(currentVariation, "retaker")
											}
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
												handlePriceTypeChange("additional")
											}
											size="small"
											disabled={
												!hasPriceType(
													currentVariation,
													"additional"
												)
											}
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

						{/* Right Column - Price & Action Section */}
						<Box className="price-action-section">
							{/* Price and Info Button Row */}
							<Box className="price-info-row">
								<Typography variant="h3" className="price-display">
									{(() => {
										// Handle Buy Both option
										if (selectedVariation === "buy_both") {
											const priceType =
												selectedPriceType || "standard";
											const price1 =
												product.variations[0]?.prices?.find(
													(p) => p.price_type === priceType
												);
											const price2 =
												product.variations[1]?.prices?.find(
													(p) => p.price_type === priceType
												);
											if (price1 && price2) {
												const totalPrice =
													parseFloat(price1.amount) +
													parseFloat(price2.amount);
												return formatPrice(totalPrice.toString());
											}
											return "-";
										}

										if (!currentVariation) return "-";
										const priceType = selectedPriceType || "standard";
										const priceObj = currentVariation.prices?.find(
											(p) => p.price_type === priceType
										);
										return priceObj
											? formatPrice(priceObj.amount)
											: "-";
									})()}
								</Typography>
								<Tooltip title="Show price details">
									<Button
										size="small"
										className="info-button"
										onClick={() => setShowPriceModal(true)}>
										<InfoOutline />
									</Button>
								</Tooltip>
							</Box>

							{/* Status Text */}
							<Box className="price-details-row">
								<Typography
									variant="fineprint"
									className="price-level-text"
									color="text.secondary">
									{selectedVariation === "buy_both"
										? "Bundle pricing - both variations"
										: selectedPriceType === "retaker"
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

							{/* Add to Cart Button - Always at bottom */}
							<Button
								variant="contained"
								className="add-to-cart-button"
								onClick={() => {
									const priceType = selectedPriceType || "standard";

									// Handle Buy Both option
									if (selectedVariation === "buy_both") {
										// Add both variations to cart
										const variation1 = product.variations[0];
										const variation2 = product.variations[1];
										const price1 = variation1?.prices?.find(
											(p) => p.price_type === priceType
										);
										const price2 = variation2?.prices?.find(
											(p) => p.price_type === priceType
										);

										if (
											variation1 &&
											variation2 &&
											price1 &&
											price2
										) {
											// Add first variation with metadata
											const metadata1 = {
												type: "material",
												productType: product.type,
												variationId: variation1.id,
												variationName: variation1.name,
												variationType: variation1.variation_type,
												subjectCode: product.subject_code,
												productName: product.product_name,
											};
											// Add is_digital flag for eBook variations
											if (variation1.variation_type === "eBook") {
												metadata1.is_digital = true;
											}

											onAddToCart(product, {
												variationId: variation1.id,
												variationName: variation1.name,
												priceType: priceType,
												actualPrice: price1.amount,
												metadata: metadata1,
											});

											// Add second variation with metadata
											const metadata2 = {
												type: "material",
												productType: product.type,
												variationId: variation2.id,
												variationName: variation2.name,
												variationType: variation2.variation_type,
												subjectCode: product.subject_code,
												productName: product.product_name,
											};
											// Add is_digital flag for eBook variations
											if (variation2.variation_type === "eBook") {
												metadata2.is_digital = true;
											}

											onAddToCart(product, {
												variationId: variation2.id,
												variationName: variation2.name,
												priceType: priceType,
												actualPrice: price2.amount,
												metadata: metadata2,
											});
										}
										return;
									}

									// Handle single variation
									if (!currentVariation) return;
									const priceObj = currentVariation.prices?.find(
										(p) => p.price_type === priceType
									);

									// Build metadata
									const metadata = {
										type: "material",
										productType: product.type,
										variationId: currentVariation.id,
										variationName: currentVariation.name,
										variationType: currentVariation.variation_type,
										subjectCode: product.subject_code,
										productName: product.product_name,
									};
									// Add is_digital flag for eBook variations
									if (currentVariation.variation_type === "eBook") {
										metadata.is_digital = true;
									}

									onAddToCart(product, {
										variationId: currentVariation.id,
										variationName: currentVariation.name,
										priceType: priceType,
										actualPrice: priceObj?.amount,
										metadata: metadata,
									});
								}}
								disabled={
									!currentVariation && selectedVariation !== "buy_both"
								}>
								<AddShoppingCart />
							</Button>
						</Box>
					</Box>
				</CardActions>
			</>
		);

		return (
			<ThemeProvider theme={theme}>
				<BaseProductCard
					ref={cardRef}
					elevation={2}
					variant="product"
					productType="material"
					className="d-flex flex-column"
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					sx={{
						transform: isHovered ? "scale(1.02)" : "scale(1)",
						transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
					}}>
					{/* Floating Badges */}
					<Box className="floating-badges-container">
						<Chip
							label={product.subject_code}
							size="small"
							className="subject-badge"
							role="img"
							aria-label={`Subject: ${product.subject_code}`}
						/>
						{(product.exam_session_code ||
							product.session_code ||
							product.exam_session ||
							product.session) && (
							<Chip
								label={
									product.exam_session_code ||
									product.session_code ||
									product.exam_session ||
									product.session
								}
								size="small"
								className="session-badge"
								role="img"
								aria-label={`Exam session: ${
									product.exam_session_code ||
									product.session_code ||
									product.exam_session ||
									product.session
								}`}
							/>
						)}
					</Box>
					{/* Enhanced Header */}
					<CardHeader
						className="product-header"
						title={
							<Typography
								variant="h4"
								textAlign="left"
								className="product-title">
								{product.product_name}
							</Typography>
						}
						subheader={
							<Typography
								variant="subtitle1"
								textAlign="left"
								className="product-subtitle">
								{/* Removed exam session code from subheader */}
							</Typography>
						}
						avatar={
							<Avatar className="product-avatar">
								<LibraryBooksSharp className="product-avatar-icon" />
							</Avatar>
						}
					/>

					{renderRegularContent()}
					{renderPriceModal()}
				</BaseProductCard> </ThemeProvider>
		);
	},
	// Custom comparison function for better memoization
	(prevProps, nextProps) => {
		// Only re-render if product data actually changes
		return (
			prevProps.product?.id === nextProps.product?.id &&
			prevProps.product?.essp_id === nextProps.product?.essp_id &&
			prevProps.product?.variations === nextProps.product?.variations &&
			prevProps.product?.prices === nextProps.product?.prices &&
			prevProps.onAddToCart === nextProps.onAddToCart
		);
	}
);

MaterialProductCard.displayName = 'MaterialProductCard';

export default MaterialProductCard;
