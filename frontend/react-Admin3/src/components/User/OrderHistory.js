// src/components/OrderHistory.js
import React, { useEffect, useState } from "react";
import cartService from "../../services/cartService";
import { generateProductCode } from "../../utils/productCodeGenerator";
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
                    <li key={item.id} className="mb-3">
                      <strong>
                        {item.metadata?.type === 'tutorial' ? item.metadata.title : (item.product_name || item.product)}
                      </strong>
                      <br />
                      
                      {/* Tutorial-specific display */}
                      {item.metadata?.type === 'tutorial' ? (
                        <>
                          <span className="text-muted" style={{fontSize: '0.9em'}}>
                            {item.metadata.subjectCode} - {item.metadata.location}
                          </span>
                          <div className="mt-2 mb-2" style={{fontSize: '0.85em'}}>
                            {item.metadata.locations ? (
                              /* New multi-location format */
                              <>
                                <strong>Tutorial Locations ({item.metadata.totalChoiceCount} total choices):</strong>
                                {item.metadata.locations.map((location, locationIndex) => (
                                  <div key={locationIndex} className="mt-2 border rounded p-2">
                                    <h6 className="mb-2 text-primary">{location.location}</h6>
                                    {location.choices.map((choice, choiceIndex) => (
                                      <div key={choiceIndex} className="mt-1 p-2 border rounded" style={{fontSize: '0.8em'}}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                          <strong>{choice.eventTitle || choice.eventCode}</strong>
                                          <span className={`badge ${
                                            choice.choice === '1st' ? 'bg-success' : 
                                            choice.choice === '2nd' ? 'bg-warning' : 
                                            'bg-info'
                                          }`}>
                                            {choice.choice} Choice
                                          </span>
                                        </div>
                                        <ul style={{fontSize: '0.75em', paddingLeft: '1rem', marginBottom: '0'}}>
                                          {choice.eventCode && <li>Event Code: {choice.eventCode}</li>}
                                          {choice.venue && <li>Venue: {choice.venue}</li>}
                                          {choice.startDate && <li>Start: {new Date(choice.startDate).toLocaleDateString()}</li>}
                                          {choice.endDate && <li>End: {new Date(choice.endDate).toLocaleDateString()}</li>}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </>
                            ) : item.metadata.choices ? (
                              /* Legacy single-location format */
                              <>
                                <strong>Tutorial Choices ({item.metadata.choiceCount || item.metadata.choices.length}):</strong>
                                {item.metadata.choices.map((choice, index) => (
                                  <div key={index} className="mt-1 p-2 border rounded" style={{fontSize: '0.8em'}}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <strong>{choice.eventTitle || choice.eventCode}</strong>
                                      <span className={`badge ${
                                        choice.choice === '1st' ? 'bg-success' : 
                                        choice.choice === '2nd' ? 'bg-warning' : 
                                        'bg-info'
                                      }`}>
                                        {choice.choice} Choice
                                      </span>
                                    </div>
                                    <ul style={{fontSize: '0.75em', paddingLeft: '1rem', marginBottom: '0'}}>
                                      {choice.eventCode && <li>Event Code: {choice.eventCode}</li>}
                                      {choice.venue && <li>Venue: {choice.venue}</li>}
                                      {choice.startDate && <li>Start: {new Date(choice.startDate).toLocaleDateString()}</li>}
                                      {choice.endDate && <li>End: {new Date(choice.endDate).toLocaleDateString()}</li>}
                                    </ul>
                                  </div>
                                ))}
                              </>
                            ) : (
                              /* Legacy single-choice format */
                              <>
                                <span className="text-muted">
                                  Event Code: {item.metadata.eventCode || 'N/A'}
                                </span>
                                <ul className="mt-2 mb-2" style={{paddingLeft: '1.2rem'}}>
                                  {item.metadata.venue && (
                                    <li>Venue: {item.metadata.venue}</li>
                                  )}
                                  {item.metadata.startDate && (
                                    <li>Start: {new Date(item.metadata.startDate).toLocaleDateString()}</li>
                                  )}
                                  {item.metadata.endDate && (
                                    <li>End: {new Date(item.metadata.endDate).toLocaleDateString()}</li>
                                  )}
                                  {item.metadata.choice && (
                                    <li>
                                      <span className={`badge ${
                                        item.metadata.choice === '1st' ? 'bg-success' : 
                                        item.metadata.choice === '2nd' ? 'bg-warning' : 
                                        'bg-info'
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
                      ) : (
                        /* Regular product display */
                        <>
                          <span className="text-muted" style={{fontSize: '0.9em'}}>
                            Product Code: {generateProductCode(item)}
                          </span>
                          {item.metadata?.variationName && (
                            <>
                              <br />
                              <span className="text-info" style={{fontSize: '0.9em'}}>
                                Variation: {item.metadata.variationName}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      
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
