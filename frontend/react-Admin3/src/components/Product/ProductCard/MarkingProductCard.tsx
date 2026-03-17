import React from "react";
import { formatPrice } from "../../../utils/priceFormatter";
import {
	Alert,
	AlertTitle,
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
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
	Chip,
	Stack,
	Avatar,
	Radio,
	FormControlLabel,
	SpeedDial,
	SpeedDialAction,
	SpeedDialIcon,
	Backdrop,
} from "@mui/material";
import {
	AddShoppingCart,
	Close,
	InfoOutline,
	Warning,
	RuleOutlined,
	CalendarMonthOutlined,
} from "@mui/icons-material";
import useMarkingProductCardVM from "./useMarkingProductCardVM";
import type { ProductCardProps } from "../../../types/browse/browse.types";

const MarkingProductCard: React.FC<ProductCardProps> = React.memo(
	({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
		const vm = useMarkingProductCardVM(product, onAddToCart, allEsspIds, bulkDeadlines);

		const renderPriceModal = () => (
			<Dialog
				open={vm.showPriceModal}
				onClose={() => vm.setShowPriceModal(false)}
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
							{product.vat_status_display || "VAT calculated at checkout based on your location"}
						</Typography>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => vm.setShowPriceModal(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		);

		return (
			<>
				<Card
					elevation={2}
					variant="product"
					producttype="marking"
					className="d-flex flex-column"
					onMouseEnter={vm.handleMouseEnter}
					onMouseLeave={vm.handleMouseLeave}
					sx={{
						transform: vm.isHovered ? "scale(1.02)" : "scale(1)",
						transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
					}}>
					{/* Floating Badges */}
					<Box className="floating-badges-container">
						<Chip
							label={<Typography variant="chip">{product.subject_code}</Typography>}
							size="small"
							className="subject-badge"
							role="img"
							aria-label={`Subject: ${product.subject_code}`}
						/>
						<Chip
							label={
								<Typography variant="chip">
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
							<Typography variant="h4" className="product-title">
								{product.product_name}
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
						<Stack
							direction="column"
							spacing={1}
							className="marking-submissions-info">
							<Stack
								direction="row"
								alignItems="center"
								spacing={1}
								className="submissions-info-row">
								<CalendarMonthOutlined className="submissions-info-icon" />
								<Typography
									variant="body2"
									color="text.secondary"
									className="submissions-info-title">
									Number of submissions:
								</Typography>
								<Typography
									variant="body2"
									className="submissions-info-count">
									{vm.deadlines.length}
								</Typography>
							</Stack>
						</Stack>

						<Alert
							severity={vm.currentDeadlineScenario.type}
							sx={{ textAlign: "left" }}>
							<AlertTitle>{vm.currentDeadlineScenario.message}</AlertTitle>
							{vm.currentDeadlineScenario.submessage}
						</Alert>

						{/* Submission Deadlines Button */}
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								width: "100%",
							}}>
							<Button
								variant="outlined"
								size="small"
								className="submission-deadlines-button"
								onClick={() => vm.setShowModal(true)}
								color={vm.allExpired ? "error" : "primary"}>
								{vm.allExpired
									? "All Deadlines Expired"
									: "Submission Deadlines"}
								{vm.upcoming.length > 0 &&
									` (${vm.upcoming.length} upcoming)`}
							</Button>
						</Box>
					</CardContent>

					<CardActions>
						{/* Discount Options Section - matches theme structure */}
						<Box className="price-container">
							<Box className="discount-options">
								<Typography
									variant="subtitle2"
									className="discount-title">
									Discount Options
								</Typography>
								<Box className="discount-radio-group">
									<FormControlLabel
										className="discount-radio-option"
										control={
											<Radio
												checked={vm.selectedPriceType === "retaker"}
												onClick={() =>
													vm.handlePriceTypeChange("retaker")
												}
												size="small"
												disabled={
													!vm.hasPriceType(
														vm.currentVariation,
														"retaker"
													)
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
												checked={vm.selectedPriceType === "additional"}
												onClick={() =>
													vm.handlePriceTypeChange("additional")
												}
												size="small"
												disabled={
													!vm.hasPriceType(
														vm.currentVariation,
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
							{/* Price & Action Section - matches theme structure */}
							<Box className="price-action-section">
								<Box className="price-info-row">
									<Typography variant="price" className="price-display">
										{(() => {
											const priceData = vm.getPriceData(
												vm.currentVariation,
												"standard"
											);
											return priceData ? priceData.formatted : null;
										})()}
									</Typography>
									<Tooltip title="Show price details">
										<Button
											size="small"
											className="info-button"
											onClick={() => vm.setShowPriceModal(true)}>
											<InfoOutline />
										</Button>
									</Tooltip>
								</Box>
								<Box className="price-details-row">
									<Typography
										variant="fineprint"
										className="price-level-text"
										color="text.secondary">
										{vm.selectedPriceType === "retaker" ||
										vm.selectedPriceType === "additional"
											? "Discount applied"
											: "Standard pricing"}
									</Typography>
									<Typography
										variant="fineprint"
										className="vat-status-text"
										color="text.secondary">
										{product.vat_status_display || "Price includes VAT"}
									</Typography>
								</Box>
								{/* Three-tier conditional: recommended_product -> standard button
								 * Tier 2: Recommended Product SpeedDial - when currentVariation has recommendation
								 * Tier 3: Standard Add to Cart - fallback when no recommendation
								 * Note: MarkingProductCard uses only Tiers 2 and 3 (no buy_both tier)
								 */}
								{vm.currentVariation?.recommended_product ? (
									// Tier 2: SpeedDial with two purchase options
									<>
										<Backdrop
											open={vm.speedDialOpen}
											onClick={() => vm.setSpeedDialOpen(false)}
											sx={{
												position: "fixed",
												zIndex: (theme) => theme.zIndex.speedDial - 1,
											}}
										/>
										<SpeedDial
											ariaLabel="Buy with Recommended"
											className="add-to-cart-speed-dial"
											icon={
												<SpeedDialIcon
													icon={<AddShoppingCart />}
													openIcon={<Close />}
												/>
											}
											onClose={() => vm.setSpeedDialOpen(false)}
											onOpen={() => vm.setSpeedDialOpen(true)}
											open={vm.speedDialOpen}
											direction="up"
											FabProps={{
												disabled:
													vm.allExpired ||
													(vm.hasVariations &&
														!vm.singleVariation &&
														vm.selectedVariations.length === 0),
											}}
											sx={{
												position: "absolute",
												bottom: 18,
												right: 8,
												"& .MuiFab-root": {
													backgroundColor:
														vm.theme.palette.productCards.marking.button,
													boxShadow: "var(--Paper-shadow)",
													"&:hover": {
														backgroundColor:
															vm.theme.palette.productCards.marking
																.buttonHover,
													},
													"&.Mui-disabled": {
														backgroundColor: "grey.400",
													},
												},
											}}>
											{/* Buy Marking Only */}
											<SpeedDialAction
												icon={<AddShoppingCart />}
												slotProps={{
													tooltip: {
														open: true,
														title: "Buy Marking Only",
													},
												}}
												sx={{
													"& .MuiSpeedDialAction-staticTooltipLabel": {
														whiteSpace: "nowrap",
														maxWidth: "none",
													},
													"& .MuiSpeedDialAction-fab": {
														color: "white",
														backgroundColor:
															vm.theme.palette.productCards.marking
																.button,
														"&:hover": {
															backgroundColor:
																vm.theme.palette.productCards
																	.marking.buttonHover,
														},
													},
												}}
												aria-label="Buy marking product only"
												onClick={vm.handleBuyMarkingOnly}
											/>

											{/* Buy with Recommended */}
											<SpeedDialAction
												icon={<AddShoppingCart />}
												slotProps={{
													tooltip: {
														open: true,
														title: (() => {
															const recommendedProduct =
																vm.currentVariation!
																	.recommended_product!;
															const standardPrice =
																vm.getPriceForType(
																	recommendedProduct,
																	"standard"
																);
															return `Buy with ${recommendedProduct.product_short_name} (${
																standardPrice
																	? formatPrice(
																			standardPrice.amount
																	  )
																	: "-"
															})`;
														})(),
													},
												}}
												sx={{
													"& .MuiSpeedDialAction-staticTooltipLabel": {
														whiteSpace: "nowrap",
														maxWidth: "none",
													},
													"& .MuiSpeedDialAction-fab": {
														color: "white",
														backgroundColor:
															vm.theme.palette.productCards.marking
																.button,
														"&:hover": {
															backgroundColor:
																vm.theme.palette.productCards
																	.marking.buttonHover,
														},
													},
												}}
												aria-label="Buy with Recommended"
												onClick={vm.handleBuyWithRecommended}
											/>
										</SpeedDial>
									</>
								) : (
									// Tier 3: Standard Add to Cart Button (existing code)
									<Button
										variant="contained"
										className="add-to-cart-button"
										onClick={vm.handleAddToCart}
										disabled={
											vm.allExpired ||
											(vm.hasVariations &&
												!vm.singleVariation &&
												vm.selectedVariations.length === 0)
										}
										sx={{ alignSelf: "stretch" }}>
										<AddShoppingCart />
									</Button>
								)}
							</Box>
						</Box>
					</CardActions>
					{renderPriceModal()}
				</Card>

				{/* Marking Deadlines Modal */}
				<Dialog
					open={vm.showModal}
					onClose={() => vm.setShowModal(false)}
					maxWidth="lg"
					fullWidth>
					<DialogTitle>Marking Deadlines</DialogTitle>
					<DialogContent>
						<Box sx={{ mb: 2 }}>
							<Typography variant="body2">
								<strong>Subject:</strong> {product.subject_code}
							</Typography>
							<Typography variant="body2">
								<strong>Marking Product:</strong> {product.product_name}
							</Typography>
						</Box>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell></TableCell>
									<TableCell align="center">
										Recommended Submission Date
									</TableCell>
									<TableCell align="center">Deadline</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{[...vm.parsedDeadlines]
									.sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
									.map((d, i) => {
										const now = new Date();
										const isRecommendedExpired =
											d.recommended_submit_date < now;
										const isDeadlineExpired = d.deadline < now;
										return (
											<TableRow key={i}>
												<TableCell align="center">
													{d.name}
												</TableCell>
												<TableCell
													align="center"
													sx={{
														color: isRecommendedExpired
															? "error.main"
															: "inherit",
													}}>
													{isRecommendedExpired && (
														<Warning
															sx={{ fontSize: "1rem", mr: 0.5 }}
														/>
													)}
													{d.recommended_submit_date.toLocaleDateString()}
												</TableCell>
												<TableCell
													align="center"
													sx={{
														color: isDeadlineExpired
															? "error.main"
															: "inherit",
													}}>
													{isDeadlineExpired && (
														<Warning
															sx={{ fontSize: "1rem", mr: 0.5 }}
														/>
													)}
													{d.deadline.toLocaleDateString()}
												</TableCell>
											</TableRow>
										);
									})}
							</TableBody>
						</Table>
					</DialogContent>
					<DialogActions>
						<Button
							variant="outlined"
							onClick={() => vm.setShowModal(false)}>
							Close
						</Button>
						<Button
							variant="contained"
							color="success"
							disabled={vm.allExpired}
							onClick={() => {
								if (vm.expired.length > 0 && !vm.allExpired) {
									vm.setShowExpiredWarning(true);
									vm.setShowModal(false);
								} else {
									vm.addToCartConfirmed();
									vm.setShowModal(false);
								}
							}}
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
							}}>
							<AddShoppingCart sx={{ fontSize: "1.1rem" }} />
							Add to Cart
						</Button>
					</DialogActions>
				</Dialog>

				{/* Expired Deadline Warning Modal */}
				<Dialog
					open={vm.showExpiredWarning}
					onClose={() => vm.setShowExpiredWarning(false)}
					maxWidth="sm">
					<DialogTitle sx={{ color: "warning.main" }}>
						<Warning sx={{ mr: 1 }} />
						Warning: Expired Deadlines
					</DialogTitle>
					<DialogContent>
						<Typography variant="body1" sx={{ mb: 2 }}>
							This marking product has <strong>{vm.expired.length}</strong>{" "}
							expired deadline{vm.expired.length > 1 ? "s" : ""}. Adding
							this product to your cart may not be useful as some
							submission deadlines have already passed.
						</Typography>
						<Typography variant="body1">
							Are you sure you want to continue?
						</Typography>
					</DialogContent>
					<DialogActions>
						<Button
							variant="outlined"
							onClick={() => vm.setShowExpiredWarning(false)}>
							Cancel
						</Button>
						<Button
							variant="contained"
							color="warning"
							onClick={vm.addToCartConfirmed}>
							Add to Cart Anyway
						</Button>
					</DialogActions>
				</Dialog>
			</>
		);
	}
);

export default MarkingProductCard;
