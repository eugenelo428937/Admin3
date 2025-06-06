import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, Form, Button, Badge, Alert } from 'react-bootstrap';
import { useCart } from '../contexts/CartContext';
import tutorialService from '../services/tutorialService';

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Allows users to select tutorial variations with choice preferences (1st, 2nd, 3rd)
 */
const TutorialProductCard = ({ subjectCode, subjectName, location, productId }) => {
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState({});
  const [expanded, setExpanded] = useState(false);
  
  const { addToCart } = useCart();

  useEffect(() => {
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

    if (productId && subjectCode) {
      fetchTutorialVariations();
    }
  }, [productId, subjectCode]);

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
    <Col>
      <Card className="h-100 shadow-sm tutorial-product-card">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Subject {subjectCode}: {location}</h5>
            <small className="text-light">{subjectName}</small>
          </div>
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </Card.Header>
        
        <Card.Body className="p-0">
          {variations.length === 0 ? (
            <div className="p-3 text-center text-muted">
              No tutorial variations available for this subject and location.
            </div>
          ) : (
            <div className={`tutorial-variations ${expanded ? 'expanded' : 'collapsed'}`}>
              {variations.map((variation) => (
                <div key={variation.id} className="variation-section border-bottom">
                  <div className="variation-header bg-light p-3">
                    <h6 className="mb-1 text-primary">{variation.name}</h6>
                    <small className="text-muted">{variation.description}</small>
                  </div>
                  
                  {variation.events && variation.events.length > 0 ? (
                    <div className="events-list">
                      {variation.events.map((event) => (
                        <div key={event.id} className="event-item p-3 border-bottom">
                          <Row className="align-items-center">
                            <Col md={6}>
                              <div className="event-details">
                                <h6 className="mb-1">{event.title}</h6>
                                <div className="small text-muted">
                                  <div>Start: {event.start_date}</div>
                                  <div>End: {event.end_date}</div>
                                  {event.instructor && <div>Instructor: {event.instructor}</div>}
                                  {event.venue && <div>Venue: {event.venue}</div>}
                                </div>
                              </div>
                            </Col>
                            <Col md={3} className="text-center">
                              {event.price && (
                                <div className="price-display">
                                  <strong>£{event.price}</strong>
                                </div>
                              )}
                            </Col>
                            <Col md={3}>
                              <Form.Select
                                size="sm"
                                value={selectedChoices[`${variation.id}_${event.id}`] || ''}
                                onChange={(e) => handleChoiceChange(variation.id, event.id, e.target.value)}
                                className="choice-selector"
                              >
                                <option value="">Select Choice</option>
                                <option value="1st">1st Choice</option>
                                <option value="2nd">2nd Choice</option>
                                <option value="3rd">3rd Choice</option>
                              </Form.Select>
                              {selectedChoices[`${variation.id}_${event.id}`] && (
                                <Badge 
                                  bg={getChoiceColor(selectedChoices[`${variation.id}_${event.id}`])}
                                  className="mt-1"
                                >
                                  {selectedChoices[`${variation.id}_${event.id}`]} Choice
                                </Badge>
                              )}
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-muted">
                      No events available for this variation.
                    </div>
                  )}
                </div>
              ))}
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
      
      <style jsx>{`
        .tutorial-product-card .tutorial-variations.collapsed {
          max-height: 300px;
          overflow: hidden;
        }
        
        .tutorial-product-card .tutorial-variations.expanded {
          max-height: none;
        }
        
        .variation-section:last-child {
          border-bottom: none !important;
        }
        
        .event-item:last-child {
          border-bottom: none !important;
        }
        
        .choice-selector {
          min-width: 120px;
        }
        
        .price-display {
          font-size: 1.1em;
          color: #28a745;
        }
      `}</style>
    </Col>
  );
};

TutorialProductCard.propTypes = {
  subjectCode: PropTypes.string.isRequired,
  subjectName: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default TutorialProductCard;
