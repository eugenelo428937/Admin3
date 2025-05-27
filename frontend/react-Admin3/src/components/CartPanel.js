import React from "react";
import { Offcanvas, Button, ListGroup, Row, Col } from "react-bootstrap";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { X, Trash3, CartCheck } from "react-bootstrap-icons";
import "../styles/cart_panel.css";

const CartPanel = ({ show, handleClose }) => {
  const { cartItems, clearCart, removeFromCart } = useCart();
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

  return (
		<Offcanvas show={show} onHide={handleClose} placement="end">
			<Offcanvas.Header closeButton>
				<Offcanvas.Title>Shopping Cart</Offcanvas.Title>
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
										<div>
											<strong>
												{item.subject_code
													? `${item.subject_code} - `
													: ""}
												{item.product_name}
												<br />
												<span className="text-muted" style={{fontSize: '0.9em'}}>Product Code: {item.product_code}</span>
											</strong>
											<br />
											Quantity: {item.quantity}
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
