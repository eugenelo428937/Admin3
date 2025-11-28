import React, { useState } from 'react';
import { Container, Card, Button, Alert, Row, Col, Form, Badge } from 'react-bootstrap';
import {
  buildRulesContext,
  validateContext
} from '../../utils/rulesEngineUtils';

/**
 * Demo component to showcase context building utilities
 */
const ContextBuildingDemo = () => {
  const [selectedBuilder, setSelectedBuilder] = useState('checkout');
  const [builtContext, setBuiltContext] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  // Sample data for different contexts
  const sampleData = {
    cartData: {
      id: 'cart_123',
      user: 42,
      session_key: 'sess_abc123',
      has_marking: true,
      has_material: false,
      has_tutorial: true,
      has_digital: true,
      has_online_classroom: false,
      marking_paper_count: 2,
      expired_deadlines_count: 1,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-17T14:30:00Z'
    },
    cartItems: [
      {
        id: 1,
        product_id: 101,
        variation_id: 201,
        quantity: 1,
        actual_price: 59.99,
        metadata: {
          subject: 'CS1',
          exam_session: 'April 2025',
          product_type: 'marking_paper'
        }
      },
      {
        id: 2,
        product_id: 102,
        variation_id: 202,
        quantity: 2,
        actual_price: 29.99,
        metadata: {
          subject: 'CM1',
          exam_session: 'April 2025',
          product_type: 'tutorial'
        }
      },
      {
        id: 3,
        product_id: 103,
        variation_id: 203,
        quantity: 1,
        actual_price: 149.99,
        metadata: {
          subject: 'CP1',
          exam_session: 'September 2025',
          product_type: 'online_classroom',
          variationId: 'live'
        }
      }
    ],
    user: {
      id: 42,
      email: 'john.doe@example.com',
      region: 'EU'
    },
    product: {
      id: 201,
      name: 'CS1 Study Pack',
      product_code: 'CS1-PACK-2025',
      product_type: 'material',
      category: 'Study Materials',
      price: 89.99,
      variations: [
        { id: 1, name: 'Printed', price: 89.99 },
        { id: 2, name: 'eBook', price: 69.99 }
      ],
      exam_session: 'April 2025',
      subject: 'CS1',
      location: 'UK',
      in_stock: true,
      available: true,
      has_expired_deadline: false,
      requires_shipping: true,
      is_digital: false
    },
    registrationData: {
      email: 'newuser@example.com',
      country: 'United Kingdom',
      region: 'EU',
      termsAccepted: true,
      marketingAccepted: false,
      source: 'organic'
    }
  };

  const contextBuilders = [
    {
      name: 'checkout',
      label: 'Checkout Context',
      description: 'Build context for checkout entry points',
      entryPoint: 'checkout_terms'
    },
    {
      name: 'homePage',
      label: 'Home Page Context',
      description: 'Build context for home page mount',
      entryPoint: 'home_page_mount'
    },
    {
      name: 'productCard',
      label: 'Product Card Context',
      description: 'Build context for product card mount',
      entryPoint: 'product_card_mount'
    },
    {
      name: 'productList',
      label: 'Product List Context',
      description: 'Build context for product list page',
      entryPoint: 'product_list_mount'
    },
    {
      name: 'userRegistration',
      label: 'User Registration Context',
      description: 'Build context for registration form',
      entryPoint: 'user_registration'
    },
    {
      name: 'checkoutTerms',
      label: 'Checkout Terms Context',
      description: 'Build context specifically for terms step',
      entryPoint: 'checkout_terms'
    },
    {
      name: 'checkoutPayment',
      label: 'Checkout Payment Context',
      description: 'Build context for payment step',
      entryPoint: 'checkout_payment'
    },
    {
      name: 'generic',
      label: 'Generic Context',
      description: 'Build generic context with custom data',
      entryPoint: 'custom_entry_point'
    }
  ];

  const buildContext = (builderName) => {
    let context = null;
    const builder = contextBuilders.find(b => b.name === builderName);

    console.log(`Building context with: ${builderName}`);

    switch (builderName) {
      case 'checkout':
        context = buildRulesContext.checkout(sampleData.cartData, sampleData.cartItems);
        break;
      case 'homePage':
        context = buildRulesContext.homePage(sampleData.user);
        break;
      case 'productCard':
        context = buildRulesContext.productCard(sampleData.product, { selectedVariation: 1 });
        break;
      case 'productList':
        context = buildRulesContext.productList(
          [sampleData.product],
          { subjects: ['CS1'], q: 'study pack' }
        );
        break;
      case 'userRegistration':
        context = buildRulesContext.userRegistration(sampleData.registrationData);
        break;
      case 'checkoutTerms':
        context = buildRulesContext.checkoutTerms(
          sampleData.cartData,
          sampleData.cartItems,
          sampleData.user
        );
        break;
      case 'checkoutPayment':
        context = buildRulesContext.checkoutPayment(
          sampleData.cartData,
          sampleData.cartItems,
          { type: 'card', provider: 'stripe', requiresBillingAddress: true }
        );
        break;
      case 'generic':
        context = buildRulesContext.generic('custom_entry_point', {
          custom_field: 'custom_value',
          nested: { data: 'example' }
        });
        break;
      default:
        context = {};
    }

    setBuiltContext(context);

    // Validate the context
    if (builder) {
      const validation = validateContext(context, builder.entryPoint);
      setValidationResult(validation);
      console.log('Validation result:', validation);
    }

    return context;
  };

  const handleBuilderSelect = (builderName) => {
    setSelectedBuilder(builderName);
    buildContext(builderName);
  };

  const calculateStats = (context) => {
    if (!context) return {};

    const stats = {
      totalFields: 0,
      totalArrays: 0,
      totalObjects: 0,
      depth: 0
    };

    const countFields = (obj, depth = 0) => {
      if (depth > stats.depth) stats.depth = depth;

      Object.entries(obj || {}).forEach(([key, value]) => {
        stats.totalFields++;
        if (Array.isArray(value)) {
          stats.totalArrays++;
        } else if (value && typeof value === 'object') {
          stats.totalObjects++;
          countFields(value, depth + 1);
        }
      });
    };

    countFields(context);
    return stats;
  };

  const stats = calculateStats(builtContext);

  return (
    <Container className="mt-4">
      <h2>Context Building Demo</h2>
      <p className="text-muted">
        This demo showcases the context building utilities that standardize context creation for different entry points.
      </p>

      <Row>
        <Col md={5}>
          <Card className="mb-3">
            <Card.Header>
              Context Builders
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                {contextBuilders.map((builder) => (
                  <Button
                    key={builder.name}
                    variant={selectedBuilder === builder.name ? 'primary' : 'outline-primary'}
                    onClick={() => handleBuilderSelect(builder.name)}
                    className="text-start"
                  >
                    <div>
                      <strong>{builder.label}</strong>
                      <br />
                      <small className="text-muted">{builder.description}</small>
                      <br />
                      <Badge bg="secondary" className="mt-1">
                        Entry Point: {builder.entryPoint}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              Sample Data Preview
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflow: 'auto' }}>
              <h6>Cart Data:</h6>
              <pre className="bg-light p-2 small">
                {JSON.stringify(sampleData.cartData, null, 2).substring(0, 200)}...
              </pre>
              <h6>Cart Items: {sampleData.cartItems.length} items</h6>
              <h6>Total Value: £{sampleData.cartItems.reduce((sum, item) =>
                sum + (item.actual_price * item.quantity), 0).toFixed(2)}</h6>
            </Card.Body>
          </Card>
        </Col>

        <Col md={7}>
          {builtContext && (
            <>
              <Card className="mb-3">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>Built Context</span>
                  <div>
                    <Badge bg="info" className="me-2">
                      {stats.totalFields} fields
                    </Badge>
                    <Badge bg="secondary" className="me-2">
                      {stats.totalArrays} arrays
                    </Badge>
                    <Badge bg="dark">
                      Depth: {stats.depth}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <pre
                    className="bg-light p-3"
                    style={{
                      maxHeight: '400px',
                      overflow: 'auto',
                      fontSize: '0.85rem'
                    }}
                  >
                    {JSON.stringify(builtContext, null, 2)}
                  </pre>
                </Card.Body>
              </Card>

              {validationResult && (
                <Card>
                  <Card.Header className={validationResult.valid ? 'bg-success text-white' : 'bg-warning'}>
                    Context Validation Result
                  </Card.Header>
                  <Card.Body>
                    {validationResult.valid ? (
                      <Alert variant="success">
                        <i className="bi bi-check-circle me-2"></i>
                        Context is valid for entry point!
                      </Alert>
                    ) : (
                      <Alert variant="danger">
                        <i className="bi bi-x-circle me-2"></i>
                        Context validation failed
                      </Alert>
                    )}

                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <div className="mb-3">
                        <h6>Errors:</h6>
                        <ul className="text-danger">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.warnings && validationResult.warnings.length > 0 && (
                      <div>
                        <h6>Warnings:</h6>
                        <ul className="text-warning">
                          {validationResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </>
          )}

          {!builtContext && (
            <Alert variant="info">
              Select a context builder from the left panel to see the generated context.
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ContextBuildingDemo;