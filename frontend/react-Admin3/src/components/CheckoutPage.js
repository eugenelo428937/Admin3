import React, { useState } from "react";
import { useCart } from "../CartContext";
import { useNavigate } from "react-router-dom";
import cartService from "../services/cartService";
import { Button, Container, ListGroup, Alert, Spinner } from "react-bootstrap";

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await cartService.checkout();
      setSuccess("Order placed successfully! Thank you for your purchase.");
      setCheckoutComplete(true);
      await clearCart();
      setTimeout(() => navigate("/products"), 2000);
    } catch (err) {
      setError("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkoutComplete) {
    return (
      <Container className="mt-4">
        <Alert variant="success">Order placed successfully! Thank you for your purchase.</Alert>
      </Container>
    );
  }

  if (cartItems.length === 0) {
    return <Container className="mt-4"><Alert variant="info">Your cart is empty.</Alert></Container>;
  }

  return (
    <Container className="mt-4">
      <h2>Checkout</h2>
      <ListGroup className="mb-3">
        {cartItems.map(item => (
          <ListGroup.Item key={item.id}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{item.subject_code ? `${item.subject_code} - ` : ""}{item.product_name || item.product_code}</strong>
                <br />Quantity: {item.quantity}
              </div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Button variant="primary" onClick={handleConfirm} disabled={loading}>
        {loading ? <Spinner animation="border" size="sm" /> : "Confirm Order"}
      </Button>
    </Container>
  );
};

export default CheckoutPage;
