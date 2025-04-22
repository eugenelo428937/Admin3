import React from "react";
import { Offcanvas, Button, ListGroup } from "react-bootstrap";
import { useCart } from "../CartContext";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

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
      <Offcanvas.Body>
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
                        {item.subject_code ? `${item.subject_code} - ` : ""}
                        {item.product_name || item.product_code}
                      </strong>
                      <br />
                      Quantity: {item.quantity}
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeFromCart(item.product)}
                    >
                      Remove
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <Button variant="danger" className="mt-3 w-100" onClick={clearCart}>
              Clear Cart
            </Button>
            <Button
              variant="primary"
              className="mt-2 w-100"
              onClick={handleCheckout}
            >
              Checkout
            </Button>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default CartPanel;
