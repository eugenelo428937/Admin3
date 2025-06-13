import React from "react";
import { Offcanvas, Button, ListGroup, Row, Col } from "react-bootstrap";
import { useCart } from "../contexts/CartContext";
import { useVAT } from "../contexts/VATContext";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { X, Trash3, CartCheck } from "react-bootstrap-icons";
import { generateProductCode } from "../utils/productCodeGenerator";
import VATToggle from "./VATToggle";
import "../styles/cart_panel.css";

const CartPanel = ({ show, handleClose }) => {
  const { cartItems, clearCart, removeFromCart } = useCart();
  const { getPriceDisplay, formatPrice, isProductVATExempt } = useVAT();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Handle checkout button click
  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Set redirect flag for post-login
      localStorage.setItem("postLoginRedirect", "/checkout");
      // Show login modal by dispatching a custom event (handled in parent)
      window.dispatchEvent(new CustomEvent("show-login-modal"));
    } else {
      handleClose && handleClose();
      navigate("/checkout");
    }
  };

  // Calculate cart totals with VAT
  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalVAT = 0;
    
    cartItems.forEach(item => {
      const itemPrice = parseFloat(item.actual_price) || 0;
      
      // Check if product is VAT exempt (you might need to add product type to cart items)
      const isVATExempt = isProductVATExempt(item.product_type);
      const priceDisplay = getPriceDisplay(itemPrice, 0.20, isVATExempt);
      
      subtotal += priceDisplay.netPrice * item.quantity;
      totalVAT += priceDisplay.vatAmount * item.quantity;
    });
    
    return {
      subtotal,
      totalVAT,
      total: subtotal + totalVAT
    };
  };

  const cartTotals = calculateCartTotals();

  // Get individual item price display
  const getItemPriceDisplay = (item) => {
    const itemPrice = parseFloat(item.actual_price) || 0;
    const isVATExempt = isProductVATExempt(item.product_type);
    const priceDisplay = getPriceDisplay(itemPrice, 0.20, isVATExempt);
    
    return `${formatPrice(priceDisplay.displayPrice)} ${priceDisplay.label}`;
  };

  return (
		<Offcanvas show={show} onHide={handleClose} placement="end">
			<Offcanvas.Header closeButton>
				<div className="d-flex justify-content-between align-items-center w-100 me-3">
					<Offcanvas.Title>Shopping Cart</Offcanvas.Title>
					<VATToggle size="sm" showLabel={false} className="compact" />
				</div>
			</Offcanvas.Header>
			<Offcanvas.Body className="">
				{cartItems.length === 0 ? (
					<div>Your cart is empty.</div>
				) : (
					<>
						<ListGroup variant="flush">
							{cartItems.map((item) => (
								<ListGroup.Item key={item.id}>
									<div className="d-flex justify-content-between align-items-center">
										<div className="w-100">
											<strong className="me-2">
												{item.metadata?.type === "tutorial"
													? item.metadata.title
													: item.product_name}
											</strong> 
											({item.metadata.variationName})
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
															/* New multi-location format */
															<>
																<strong>
																	Tutorial Locations (
																	{
																		item.metadata
																			.totalChoiceCount
																	}{" "}
																	total choices):
																</strong>
																{item.metadata.locations.map(
																	(
																		location,
																		locationIndex
																	) => (
																		<div
																			key={locationIndex}
																			className="mt-2 border rounded p-2">
																			<h6 className="mb-2 text-primary">
																				{location.location}
																			</h6>
																			{location.choices.map(
																				(
																					choice,
																					choiceIndex
																				) => (
																					<div
																						key={
																							choiceIndex
																						}
																						className="mt-1 p-2 border rounded"
																						style={{
																							fontSize:
																								"1em",
																						}}>
																						<div className="d-flex justify-content-between align-items-center mb-1">
																							<strong>
																								{choice.eventTitle ||
																									choice.eventCode}
																							</strong>
																							<span
																								className={`badge ${
																									choice.choice ===
																									"1st"
																										? "bg-success"
																										: choice.choice ===
																										  "2nd"
																										? "bg-warning"
																										: "bg-info"
																								}`}>
																								{
																									choice.choice
																								}{" "}
																								Choice
																							</span>
																						</div>
																						<ul
																							style={{
																								fontSize:
																									"1em",
																								paddingLeft:
																									"1rem",
																								marginBottom:
																									"0",
																							}}>
																							{choice.venue && (
																								<li>
																									{
																										choice.venue
																									}
																								</li>
																							)}
																							{choice.startDate && (
																								<li>
																									Start:{" "}
																									{new Date(
																										choice.startDate
																									).toLocaleDateString()}
																								</li>
																							)}
																							{choice.endDate && (
																								<li>
																									End:{" "}
																									{new Date(
																										choice.endDate
																									).toLocaleDateString()}
																								</li>
																							)}
																						</ul>
																					</div>
																				)
																			)}
																		</div>
																	)
																)}
															</>
														) : item.metadata.choices ? (
															/* Legacy single-location format */
															<>
																<strong>
																	Tutorial Choices (
																	{item.metadata.choiceCount ||
																		item.metadata.choices
																			.length}
																	):
																</strong>
																{item.metadata.choices.map(
																	(choice, index) => (
																		<div
																			key={index}
																			className="mt-1 p-2 border rounded"
																			style={{
																				fontSize: "1em",
																			}}>
																			<div className="d-flex justify-content-between align-items-center mb-1">
																				<strong>
																					{choice.eventTitle ||
																						choice.eventCode}
																				</strong>
																				<span
																					className={`badge ${
																						choice.choice ===
																						"1st"
																							? "bg-success"
																							: choice.choice ===
																							  "2nd"
																							? "bg-warning"
																							: "bg-info"
																					}`}>
																					{choice.choice}{" "}
																					Choice
																				</span>
																			</div>
																			<ul
																				style={{
																					fontSize: "1em",
																					paddingLeft:
																						"1rem",
																					marginBottom:
																						"0",
																				}}>
																				{choice.venue && (
																					<li>
																						{choice.venue}
																					</li>
																				)}
																				{choice.startDate && (
																					<li>
																						Start:{" "}
																						{new Date(
																							choice.startDate
																						).toLocaleDateString()}
																					</li>
																				)}
																				{choice.endDate && (
																					<li>
																						End:{" "}
																						{new Date(
																							choice.endDate
																						).toLocaleDateString()}
																					</li>
																				)}
																			</ul>
																		</div>
																	)
																)}
															</>
														) : (
															/* Legacy single-choice format */
															<>
																<span className="text-muted">
																	Event Code:{" "}
																	{item.metadata.eventCode ||
																		"N/A"}
																</span>
																<ul
																	className="mt-2 mb-2"
																	style={{
																		paddingLeft: "1.2rem",
																	}}>
																	{item.metadata.venue && (
																		<li>
																			Venue:{" "}
																			{item.metadata.venue}
																		</li>
																	)}
																	{item.metadata.startDate && (
																		<li>
																			Start:{" "}
																			{new Date(
																				item.metadata.startDate
																			).toLocaleDateString()}
																		</li>
																	)}
																	{item.metadata.endDate && (
																		<li>
																			End:{" "}
																			{new Date(
																				item.metadata.endDate
																			).toLocaleDateString()}
																		</li>
																	)}
																	{item.metadata.choice && (
																		<li>
																			<span
																				className={`badge ${
																					item.metadata
																						.choice ===
																					"1st"
																						? "bg-success"
																						: item
																								.metadata
																								.choice ===
																						  "2nd"
																						? "bg-warning"
																						: "bg-info"
																				}`}>
																				{
																					item.metadata
																						.choice
																				}{" "}
																				Choice
																			</span>
																		</li>
																	)}
																</ul>
															</>
														)}
													</div>
												</>
											) : (
												/* Regular product display */
												<>
													<span
														className="text-muted"
														style={{ fontSize: "0.9em" }}>
														Product Code:{" "}
														{generateProductCode(item)}
													</span>													
												</>
											)}
											<br />
											Quantity: {item.quantity}
											{item.price_type &&
												item.price_type !== "standard" && (
													<>
														<br />
														<span className="badge bg-secondary">
															{item.price_type === "retaker"
																? "Retaker"
																: item.price_type ===
																  "additional"
																? "Additional Copy"
																: item.price_type}
														</span>
													</>
												)}
											{item.actual_price && (
												<>
													<br />
													<span className="text-success fw-bold">
														{getItemPriceDisplay(item)}
													</span>
												</>
											)}
										</div>
										<Button
											variant=""
											size="sm"
											onClick={() => removeFromCart(item.product)}
											title="Remove from cart">
											<X
												className="bi d-flex flex-row align-items-center"
												size={18}></X>
										</Button>
									</div>
								</ListGroup.Item>
							))}
						</ListGroup>
						
						{/* Cart Totals */}
						<div className="cart-totals mt-3 p-3 border-top">
							<div className="d-flex justify-content-between">
								<span>Subtotal:</span>
								<span>{formatPrice(cartTotals.subtotal)}</span>
							</div>
							<div className="d-flex justify-content-between">
								<span>VAT:</span>
								<span>{formatPrice(cartTotals.totalVAT)}</span>
							</div>
							<hr className="my-2" />
							<div className="d-flex justify-content-between fw-bold">
								<span>Total:</span>
								<span>{formatPrice(cartTotals.total)}</span>
							</div>
						</div>
					</>
				)}
				<Row className="d-flex flex-row align-items-center justify-content-between mt-3 mx-3 cart-panel-buttons">
					<Button
						variant="danger"
						className="d-flex flex-row flex-wrap align-items-center justify-content-center"
						onClick={clearCart}
						title="Clear cart">
						<Trash3 className="bi d-flex flex-row align-items-center" />
						Clear Cart
					</Button>
					<Button
						variant="primary"
						className="d-flex flex-row flex-wrap align-items-center justify-content-center"
						onClick={handleCheckout}>
						<CartCheck className="bi d-flex flex-row align-items-center" />
						Checkout
					</Button>
				</Row>
			</Offcanvas.Body>
		</Offcanvas>
  );
};

export default CartPanel;
