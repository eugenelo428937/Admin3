import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Form, Button, Badge, Alert, Modal } from 'react-bootstrap';
import { Button as MuiButton, Dialog, DialogTitle, DialogContent, DialogActions, Card as MuiCard, CardContent, Typography, Chip, Box } from '@mui/material';
import { useCart } from '../contexts/CartContext';
import tutorialService from '../services/tutorialService';

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Allows users to select tutorial variations with choice preferences (1st, 2nd, 3rd)
 */
const TutorialProductCard = ({ subjectCode, subjectName, location, productId, variations: preloadedVariations }) => {
  const [variations, setVariations] = useState(preloadedVariations || []);
  const [loading, setLoading] = useState(!preloadedVariations);
  const [error, setError] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const { addToCart } = useCart();

  useEffect(() => {
    // Only fetch if variations weren't preloaded
    if (!preloadedVariations && productId && subjectCode) {
      const fetchTutorialVariations = async () => {
        try {
          setLoading(true);
          const data = await tutorialService.getTutorialVariations(productId, subjectCode);
          setVariations(data || []);
          setError(null);
        } catch (err) {
          console.error('Error fetching tutorial variations:', err);
          setError('Failed to load tutorial variations');
        } finally {
          setLoading(false);
        }
      };

      fetchTutorialVariations();
    } else if (preloadedVariations) {
      setVariations(preloadedVariations);
      setLoading(false);
    }
  }, [productId, subjectCode, preloadedVariations]);

  const handleChoiceChange = (variationId, eventId, choice) => {
    setSelectedChoices(prev => ({
      ...prev,
      [`${variationId}_${eventId}`]: choice
    }));
  };

  const hasAnySelection = () => {
    return Object.keys(selectedChoices).length > 0 && 
           Object.values(selectedChoices).some(choice => choice !== '');
  };

  const handleAddToCart = () => {
    const selectedItems = [];
    
    Object.entries(selectedChoices).forEach(([key, choice]) => {
      if (choice) {
        const [variationId, eventId] = key.split('_');
        const variation = variations.find(v => v.id === parseInt(variationId));
        const event = variation?.events?.find(e => e.id === parseInt(eventId));
        
        if (variation && event) {
          selectedItems.push({
            variationId: parseInt(variationId),
            eventId: parseInt(eventId),
            choice: choice,
            variation: variation,
            event: event
          });
        }
      }
    });

    if (selectedItems.length > 0) {
      // Add each selected item to cart
      selectedItems.forEach(item => {
        addToCart({
          type: 'tutorial',
          productId: productId,
          variationId: item.variationId,
          eventId: item.eventId,
          choice: item.choice,
          title: `${subjectCode} ${item.variation.name} - ${item.event.title}`,
          price: item.event.price || 0
        });
      });
      
      // Reset selections after adding to cart
      setSelectedChoices({});
    }
  };

  const getChoiceColor = (choice) => {
    switch (choice) {
      case '1st': return 'success';
      case '2nd': return 'warning';
      case '3rd': return 'info';
      default: return 'secondary';
    }
  };

  // Calculate summary information
  const getSummaryInfo = () => {
    const allEvents = variations.flatMap(v => v.events || []);
    const totalEvents = allEvents.length;
    const distinctDescriptions = [...new Set(variations.map(v => v.description).filter(Boolean))];
    const distinctVenues = [...new Set(allEvents.map(e => e.venue).filter(Boolean))];
    
    return {
      totalEvents,
      distinctDescriptions,
      distinctVenues
    };
  };

  const summaryInfo = getSummaryInfo();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Col>
        <Card className="h-100">
          <Card.Body className="d-flex justify-content-center align-items-center">
            <div>Loading tutorial options...</div>
          </Card.Body>
        </Card>
      </Col>
    );
  }

  if (error) {
    return (
      <Col>
        <Card className="h-100">
          <Card.Body>
            <Alert variant="danger">{error}</Alert>
          </Card.Body>
        </Card>
      </Col>
    );
  }

  return (
    <>
      <Col>
        <Card className="h-100 shadow-sm product-card tutorial-product-card">
          <Card.Header className="d-flex justify-content-between align-items-center tutorial-product-card-header">
            <div className="py-1">
              <h5 className="mb-0">Subject {subjectCode}</h5>
              <h6 className="mb-0">{location}</h6>
            </div>
          </Card.Header>

          <Card.Body className="p-3">
            {variations.length === 0 ? (
              <div className="text-center text-muted">
                No tutorial variations available for this subject and location.
              </div>
            ) : (
              <div className="tutorial-summary">
                <div className="mb-3">
                  <h6 className="text-primary mb-2">Tutorial Summary</h6>
                  
                  <div className="summary-item mb-2">
                    <strong>Number of Events:</strong> {summaryInfo.totalEvents}
                  </div>
                  
                  <div className="summary-item mb-2">
                    <strong>Tutorial Types:</strong>
                    <div className="mt-1">
                      {summaryInfo.distinctDescriptions.map((desc, index) => (
                        <Badge key={index} bg="info" className="me-1">
                          {desc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="summary-item mb-3">
                    <strong>Venues:</strong>
                    <div className="mt-1">
                      {summaryInfo.distinctVenues.map((venue, index) => (
                        <Badge key={index} bg="secondary" className="me-1">
                          {venue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-center mb-3">
                  <MuiButton
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowDetailModal(true)}
                  >
                    Tutorial Details
                  </MuiButton>
                </div>

                {/* Quick selection area for choices */}
                <div className="quick-selection">
                  <h6 className="text-muted mb-2">Quick Selection</h6>
                  {variations.map((variation) => (
                    variation.events && variation.events.map((event) => (
                      <Row key={`${variation.id}_${event.id}`} className="align-items-center mb-2 p-2 border rounded">
                        <Col xs={8}>
                          <small className="fw-bold">{variation.name}</small>
                          <br />
                          <small className="text-muted">{event.title}</small>
                          {event.price && (
                            <div className="text-success fw-bold">£{event.price}</div>
                          )}
                        </Col>
                        <Col xs={4}>
                          <Form.Select
                            size="sm"
                            value={selectedChoices[`${variation.id}_${event.id}`] || ""}
                            onChange={(e) => handleChoiceChange(variation.id, event.id, e.target.value)}
                          >
                            <option value="">Choice</option>
                            <option value="1st">1st</option>
                            <option value="2nd">2nd</option>
                            <option value="3rd">3rd</option>
                          </Form.Select>
                        </Col>
                      </Row>
                    ))
                  ))}
                </div>
              </div>
            )}
          </Card.Body>

          {variations.length > 0 && (
            <Card.Footer className="bg-white border-top-0">
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  {Object.keys(selectedChoices).filter(key => selectedChoices[key]).length} selection(s) made
                </small>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!hasAnySelection()}
                  onClick={handleAddToCart}
                >
                  Add Selected to Cart
                </Button>
              </div>
            </Card.Footer>
          )}
        </Card>
      </Col>

      {/* Tutorial Details Modal */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5">
            Tutorial Details - {subjectCode} ({location})
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {variations.map((variation) => (
              <div key={variation.id}>
                <Typography variant="h6" color="primary" gutterBottom>
                  {variation.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {variation.description}
                </Typography>
                
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
                  {variation.events && variation.events.map((event) => (
                    <MuiCard key={event.id} variant="outlined" sx={{ p: 1 }}>
                      <CardContent sx={{ pb: '8px !important' }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {event.title || event.code}
                        </Typography>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            <strong>Code:</strong> {event.code || 'N/A'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Venue:</strong> {event.venue || 'N/A'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Start Date:</strong> {formatDate(event.start_date)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>End Date:</strong> {formatDate(event.end_date)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Finalisation Date:</strong> {formatDateOnly(event.finalisation_date)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Remaining Spaces:</strong> {event.remain_space ?? 'N/A'}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                          {event.is_soldout && (
                            <Chip label="Sold Out" color="error" size="small" />
                          )}
                          {event.price && (
                            <Chip label={`£${event.price}`} color="success" size="small" />
                          )}
                          {event.remain_space !== null && event.remain_space <= 5 && event.remain_space > 0 && (
                            <Chip label={`Only ${event.remain_space} spaces left`} color="warning" size="small" />
                          )}
                        </Box>
                      </CardContent>
                    </MuiCard>
                  ))}
                </Box>
              </div>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setShowDetailModal(false)}>
            Close
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

TutorialProductCard.propTypes = {
  subjectCode: PropTypes.string.isRequired,
  subjectName: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  variations: PropTypes.array, // Optional pre-loaded variations
};

TutorialProductCard.defaultProps = {
  variations: null,
};

export default TutorialProductCard;
