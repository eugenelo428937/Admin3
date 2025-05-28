// src/components/OrderHistory.js
import React, { useEffect, useState } from "react";
import cartService from "../services/cartService";
import { Container, Table, Alert, Spinner } from "react-bootstrap";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await cartService.fetchOrders();
        setOrders(res.data || []);
      } catch (err) {
        setError("Failed to load order history.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <Spinner animation="border" className="mt-4" />;
  if (error) return <Alert variant="danger" className="mt-4">{error}</Alert>;
  if (!orders.length) return <Alert variant="info" className="mt-4">No orders found.</Alert>;

  return (
    <Container className="mt-4">
      <h2>Order History</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{new Date(order.created_at).toLocaleString()}</td>
              <td>                <ul className="mb-0">
                  {order.items && order.items.map((item) => (
                    <li key={item.id}>
                      {item.product_name || item.product}
                      <br />
                      <span className="text-muted" style={{fontSize: '0.9em'}}>Product Code: {item.product_code}</span>
                      <br />
                      Quantity: {item.quantity}
                      {item.price_type && item.price_type !== 'standard' && (
                        <>
                          <br />
                          <span className="badge bg-secondary">
                            {item.price_type === 'retaker' ? 'Retaker' : 
                             item.price_type === 'additional' ? 'Additional Copy' : 
                             item.price_type}
                          </span>
                        </>
                      )}
                      {item.actual_price && (
                        <>
                          <br />
                          <span className="text-success fw-bold">£{item.actual_price}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default OrderHistory;
