import React from "react";
import {
  Drawer,
  Button,
  List,
  ListItem,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon, Delete as DeleteIcon, ShoppingCart as ShoppingCartIcon } from "@mui/icons-material";
import { generateProductCode } from "../../utils/productCodeGenerator";
import useCartPanelVM from './useCartPanelVM';
import type { CartItem } from '../../types/cart';

interface CartPanelProps {
  show: boolean;
  handleClose?: () => void;
}

const CartPanel: React.FC<CartPanelProps> = React.memo(({ show, handleClose }) => {
  const vm = useCartPanelVM(handleClose);

  return (
		<Drawer
			anchor="right"
			open={show}
			onClose={vm.handleSafeClose}
			ModalProps={{
				keepMounted: false,
			}}
			PaperProps={{
				sx: { width: { xs: '100%', sm: 400 } }
			}}
		>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
				<Typography variant="h6" component="h2">
					Shopping Cart
				</Typography>
				<IconButton onClick={vm.handleSafeClose} edge="end">
					<CloseIcon />
				</IconButton>
			</Box>
			<Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
				{vm.cartItems.length === 0 ? (
					<Typography>Your cart is empty.</Typography>
				) : (
					<>
						<List sx={{ p: 0 }}>
							{vm.cartItems.map((item: CartItem) => (
								<ListItem key={item.id} sx={{ display: 'block', p: 2, borderBottom: 1, borderColor: 'divider' }}>
									<div className="d-flex justify-content-between align-items-center">
										<div className="w-100">
											<strong className="me-2">
												{item.metadata?.type === "tutorial"
													? item.metadata.title
													: item.product_name}
											</strong>
											{item.metadata?.variationName && (
												<>({item.metadata.variationName})</>
											)}
											<br />
											{/* Tutorial-specific display */}
											{item.metadata?.type === "tutorial" ? (
												<>
													<span
														className="text-muted"
														style={{ fontSize: "0.9em" }}>
														{item.metadata.location}
													</span>
													<div
														className="mt-2 mb-2"
														style={{ fontSize: "0.85em" }}>
														{item.metadata.locations ? (
															<>
																<strong>
																	Tutorial Locations (
																	{item.metadata.totalChoiceCount}{" "}
																	total choices):
																</strong>
																{item.metadata.locations.map(
																	(location, locationIndex) => (
																		<div
																			key={locationIndex}
																			className="mt-2 border rounded p-2">
																			<h6 className="mb-2 text-primary">
																				{location.location}
																			</h6>
																			{location.choices.map(
																				(choice, choiceIndex) => (
																					<div
																						key={choiceIndex}
																						className="mt-1 p-2 border rounded"
																						style={{ fontSize: "1em" }}>
																						<div className="d-flex justify-content-between align-items-center mb-1">
																							<strong>
																								{choice.eventTitle || choice.eventCode}
																							</strong>
																							<span
																								className={`badge ${
																									choice.choice === "1st"
																										? "bg-success"
																										: choice.choice === "2nd"
																										? "bg-warning"
																										: "bg-info"
																								}`}>
																								{choice.choice} Choice
																							</span>
																						</div>
																						<ul style={{ fontSize: "1em", paddingLeft: "1rem", marginBottom: "0" }}>
																							{choice.venue && <li>{choice.venue}</li>}
																							{choice.startDate && <li>Start: {new Date(choice.startDate).toLocaleDateString()}</li>}
																							{choice.endDate && <li>End: {new Date(choice.endDate).toLocaleDateString()}</li>}
																						</ul>
																					</div>
																				)
																			)}
																		</div>
																	)
																)}
															</>
														) : item.metadata.choices ? (
															<>
																<strong>
																	Tutorial Choices (
																	{item.metadata.choiceCount || item.metadata.choices.length}
																	):
																</strong>
																{item.metadata.choices.map(
																	(choice, index) => (
																		<div
																			key={index}
																			className="mt-1 p-2 border rounded"
																			style={{ fontSize: "1em" }}>
																			<div className="d-flex justify-content-between align-items-center mb-1">
																				<strong>{choice.eventTitle || choice.eventCode}</strong>
																				<span
																					className={`badge ${
																						choice.choice === "1st"
																							? "bg-success"
																							: choice.choice === "2nd"
																							? "bg-warning"
																							: "bg-info"
																					}`}>
																					{choice.choice} Choice
																				</span>
																			</div>
																			<ul style={{ fontSize: "1em", paddingLeft: "1rem", marginBottom: "0" }}>
																				{choice.venue && <li>{choice.venue}</li>}
																				{choice.startDate && <li>Start: {new Date(choice.startDate).toLocaleDateString()}</li>}
																				{choice.endDate && <li>End: {new Date(choice.endDate).toLocaleDateString()}</li>}
																			</ul>
																		</div>
																	)
																)}
															</>
														) : (
															<>
																<span className="text-muted">
																	Event Code: {item.metadata.eventCode || "N/A"}
																</span>
																<ul className="mt-2 mb-2" style={{ paddingLeft: "1.2rem" }}>
																	{item.metadata.venue && <li>Venue: {item.metadata.venue}</li>}
																	{item.metadata.startDate && <li>Start: {new Date(item.metadata.startDate).toLocaleDateString()}</li>}
																	{item.metadata.endDate && <li>End: {new Date(item.metadata.endDate).toLocaleDateString()}</li>}
																	{item.metadata.choice && (
																		<li>
																			<span
																				className={`badge ${
																					item.metadata.choice === "1st"
																						? "bg-success"
																						: item.metadata.choice === "2nd"
																						? "bg-warning"
																						: "bg-info"
																				}`}>
																				{item.metadata.choice} Choice
																			</span>
																		</li>
																	)}
																</ul>
															</>
														)}
													</div>
												</>
											) : item.product_type === 'marking_voucher' ? (
												<>
													<span className="text-muted" style={{ fontSize: "0.9em" }}>
														Voucher Code: {item.product_code}
													</span>
													<br />
													<span className="badge bg-warning text-dark" style={{ fontSize: "0.75em" }}>
														Marking Voucher
													</span>
													{item.subject_code && (
														<>
															<br />
															<span className="text-muted" style={{ fontSize: "0.85em" }}>
																Subject: {item.subject_code}
															</span>
														</>
													)}
												</>
											) : (
												<>
													<span className="text-muted" style={{ fontSize: "0.9em" }}>
														Product Code: {generateProductCode(item)}
													</span>
													{item.metadata?.addedViaBundle && (
														<>
															<br />
															<span className="badge bg-info text-white" style={{ fontSize: "0.75em" }}>
																From Bundle: {item.metadata.addedViaBundle.bundleName}
															</span>
														</>
													)}
												</>
											)}
											<br />
											Quantity: {item.quantity}
											{item.price_type && item.price_type !== "standard" && (
												<>
													<br />
													<span className="badge bg-secondary">
														{item.price_type === "retaker"
															? "Retaker"
															: item.price_type === "additional"
															? "Additional Copy"
															: item.price_type}
													</span>
												</>
											)}
											{item.actual_price && (
												<>
													<br />
													<span className="text-success fw-bold">
														{vm.getItemPriceDisplay(item)}
													</span>
												</>
											)}
										</div>
										<IconButton
											size="small"
											onClick={() => vm.handleRemoveItem(item)}
											title="Remove from cart"
											edge="end"
										>
											<CloseIcon fontSize="small" />
										</IconButton>
									</div>
								</ListItem>
							))}
						</List>

						{/* Cart Fees */}
						{vm.cartData && vm.cartData.fees && vm.cartData.fees.length > 0 && (
							<>
								<Typography variant="caption" color="text.secondary" sx={{ mt: 3, mb: 2, display: 'block' }}>
									Additional Fees:
								</Typography>
								<List sx={{ p: 0 }}>
									{vm.cartData.fees.map((fee) => (
										<ListItem key={fee.id} sx={{ border: 0, py: 1 }}>
											<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
												<Box>
													<Typography variant="body2">{fee.name}</Typography>
													{fee.description && (
														<Typography variant="caption" color="text.secondary">
															{fee.description}
														</Typography>
													)}
												</Box>
												<Typography variant="body2">{vm.formatPrice(parseFloat(String(fee.amount)))}</Typography>
											</Box>
										</ListItem>
									))}
								</List>
							</>
						)}

						{/* Cart Totals */}
						<Box sx={{ mt: 3, p: 3, borderTop: 1, borderColor: 'divider' }}>
							{/* TODO Phase 8: VATBreakdown component */}
						</Box>
					</>
				)}
			</Box>
			<Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'space-between' }}>
				<Button
					variant="outlined"
					color="error"
					startIcon={<DeleteIcon />}
					onClick={vm.handleClearCart}
					title="Clear cart"
					sx={{ flex: 1 }}
				>
					Clear Cart
				</Button>
				<Button
					variant="contained"
					color="primary"
					startIcon={<ShoppingCartIcon />}
					onClick={vm.handleCheckout}
					sx={{ flex: 1 }}
				>
					Checkout
				</Button>
			</Box>
		</Drawer>
  );
});

export default CartPanel;
