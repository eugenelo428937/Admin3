// src/components/OrderHistory.js
import React, { useEffect, useState } from "react";
import cartService from "../../services/cartService";
import { generateProductCode } from "../../utils/productCodeGenerator";
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Box,
  Chip
} from "@mui/material";

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

  if (loading) return <Box sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  if (!orders.length) return <Alert severity="info" sx={{ mt: 4 }}>No orders found.</Alert>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 3 }}>Order History</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Items</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>{order.id}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Box component="ul" sx={{ mb: 0, pl: 2 }}>
                  {order.items && order.items.map((item) => (
                    <Box component="li" key={item.id} sx={{ mb: 3 }}>
                      <Typography component="strong" fontWeight="bold">
                        {item.metadata?.type === 'tutorial' ? item.metadata.title : (item.product_name || item.product)}
                      </Typography>
                      <br />

                      {/* Tutorial-specific display */}
                      {item.metadata?.type === 'tutorial' ? (
                        <>
                          <Typography component="span" color="text.secondary" sx={{ fontSize: '0.9em' }}>
                            {item.metadata.subjectCode} - {item.metadata.location}
                          </Typography>
                          <Box sx={{ mt: 2, mb: 2, fontSize: '0.85em' }}>
                            {item.metadata.locations ? (
                              /* New multi-location format */
                              <>
                                <Typography component="strong" fontWeight="bold">Tutorial Locations ({item.metadata.totalChoiceCount} total choices):</Typography>
                                {item.metadata.locations.map((location, locationIndex) => (
                                  <Box key={locationIndex} sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                                    <Typography variant="h6" color="primary" sx={{ mb: 2 }}>{location.location}</Typography>
                                    {location.choices.map((choice, choiceIndex) => (
                                      <Box key={choiceIndex} sx={{ mt: 1, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, fontSize: '0.8em' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                          <Typography component="strong" fontWeight="bold">{choice.eventTitle || choice.eventCode}</Typography>
                                          <Chip
                                            label={`${choice.choice} Choice`}
                                            color={choice.choice === '1st' ? 'success' : choice.choice === '2nd' ? 'warning' : 'info'}
                                            size="small"
                                          />
                                        </Box>
                                        <Box component="ul" sx={{ fontSize: '0.75em', pl: 2, mb: 0 }}>
                                          {choice.eventCode && <li>Event Code: {choice.eventCode}</li>}
                                          {choice.venue && <li>Venue: {choice.venue}</li>}
                                          {choice.startDate && <li>Start: {new Date(choice.startDate).toLocaleDateString()}</li>}
                                          {choice.endDate && <li>End: {new Date(choice.endDate).toLocaleDateString()}</li>}
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                ))}
                              </>
                            ) : item.metadata.choices ? (
                              /* Legacy single-location format */
                              <>
                                <Typography component="strong" fontWeight="bold">Tutorial Choices ({item.metadata.choiceCount || item.metadata.choices.length}):</Typography>
                                {item.metadata.choices.map((choice, index) => (
                                  <Box key={index} sx={{ mt: 1, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, fontSize: '0.8em' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                      <Typography component="strong" fontWeight="bold">{choice.eventTitle || choice.eventCode}</Typography>
                                      <Chip
                                        label={`${choice.choice} Choice`}
                                        color={choice.choice === '1st' ? 'success' : choice.choice === '2nd' ? 'warning' : 'info'}
                                        size="small"
                                      />
                                    </Box>
                                    <Box component="ul" sx={{ fontSize: '0.75em', pl: 2, mb: 0 }}>
                                      {choice.eventCode && <li>Event Code: {choice.eventCode}</li>}
                                      {choice.venue && <li>Venue: {choice.venue}</li>}
                                      {choice.startDate && <li>Start: {new Date(choice.startDate).toLocaleDateString()}</li>}
                                      {choice.endDate && <li>End: {new Date(choice.endDate).toLocaleDateString()}</li>}
                                    </Box>
                                  </Box>
                                ))}
                              </>
                            ) : (
                              /* Legacy single-choice format */
                              <>
                                <Typography component="span" color="text.secondary">
                                  Event Code: {item.metadata.eventCode || 'N/A'}
                                </Typography>
                                <Box component="ul" sx={{ mt: 2, mb: 2, pl: 2.4 }}>
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
                                      <Chip
                                        label={`${item.metadata.choice} Choice`}
                                        color={item.metadata.choice === '1st' ? 'success' : item.metadata.choice === '2nd' ? 'warning' : 'info'}
                                        size="small"
                                      />
                                    </li>
                                  )}
                                </Box>
                              </>
                            )}
                          </Box>
                        </>
                      ) : (
                        /* Regular product display */
                        <>
                          <Typography component="span" color="text.secondary" sx={{ fontSize: '0.9em' }}>
                            Product Code: {generateProductCode(item)}
                          </Typography>
                          {item.metadata?.variationName && (
                            <>
                              <br />
                              <Typography component="span" color="info.main" sx={{ fontSize: '0.9em' }}>
                                Variation: {item.metadata.variationName}
                              </Typography>
                            </>
                          )}
                        </>
                      )}

                      <br />
                      Quantity: {item.quantity}
                      {item.price_type && item.price_type !== 'standard' && (
                        <>
                          <br />
                          <Chip
                            label={item.price_type === 'retaker' ? 'Retaker' :
                                   item.price_type === 'additional' ? 'Additional Copy' :
                                   item.price_type}
                            size="small"
                            sx={{ bgcolor: 'grey.500', color: 'white' }}
                          />
                        </>
                      )}
                      {item.actual_price && (
                        <>
                          <br />
                          <Typography component="span" color="success.main" fontWeight="bold">£{item.actual_price}</Typography>
                        </>
                      )}
                    </Box>
                  ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default OrderHistory;
