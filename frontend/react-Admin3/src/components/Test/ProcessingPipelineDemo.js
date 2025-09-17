import React, { useState } from 'react';
import { Container, Card, Button, Alert, Row, Col, Badge, Form, ProgressBar } from 'react-bootstrap';
import {
  processRulesResponse,
  processForUI,
  executeAndProcessRules,
  rulesEngineHelpers,
  buildRulesContext
} from '../../utils/rulesEngineUtils';
import rulesEngineService from '../../services/rulesEngineService';

/**
 * Demo component to showcase the complete message processing pipeline
 */
const ProcessingPipelineDemo = () => {
  const [processing, setProcessing] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [processedResponse, setProcessedResponse] = useState(null);
  const [uiResponse, setUIResponse] = useState(null);
  const [selectedDemo, setSelectedDemo] = useState('mock');
  const [processingOptions, setProcessingOptions] = useState({
    filterModal: false,
    filterInline: false,
    processAcknowledgments: true,
    sortByPriority: true,
    validateContent: true
  });

  // Mock raw response that simulates real rules engine output
  const mockRawResponse = {
    success: true,
    blocked: false,
    requires_acknowledgment: true,
    messages: [
      {
        type: 'acknowledge',
        display_type: 'inline',
        template_id: 11,
        ack_key: 'terms_conditions_v1',
        required: true,
        message_type: 'terms',
        content: {
          title: 'Terms & Conditions',
          message: 'Please read and accept our **Terms & Conditions** before proceeding.\n\nBy accepting, you agree to our refund policy.',
          checkbox_text: 'I have read and accept the Terms & Conditions',
          dismissible: false
        }
      },
      {
        type: 'acknowledge',
        display_type: 'modal',
        template_id: 13,
        ack_key: 'digital_content_v1',
        required: true,
        message_type: 'digital_consent',
        blocking: true,
        content: {
          title: 'Digital Content Agreement',
          message: 'By purchasing digital content, you waive your right to cancel.',
          checkbox_text: 'I understand and agree to immediate digital delivery',
          variant: 'warning',
          link: {
            url: 'https://example.com/digital-terms',
            text: 'Learn more about digital content terms'
          }
        }
      },
      {
        type: 'display',
        display_type: 'inline',
        message_type: 'warning',
        template_id: 5,
        content: {
          title: 'UK Import Tax Notice',
          message: 'Orders shipped internationally may be subject to import duties and taxes.',
          icon: 'exclamation-triangle',
          dismissible: true,
          variant: 'warning'
        }
      },
      {
        type: 'display',
        display_type: 'modal',
        message_type: 'error',
        blocking: true,
        template_id: 7,
        content: {
          title: 'Expired Marking Deadlines',
          message: 'Some items in your cart have expired marking deadlines. Please remove these items to continue.',
          variant: 'error',
          details: [
            'CS1 Marking Paper - Deadline: March 15, 2025',
            'CM1 Mock Exam - Deadline: February 28, 2025'
          ]
        }
      },
      {
        type: 'display',
        display_type: 'inline',
        message_type: 'info',
        template_id: 2,
        content: {
          title: 'Holiday Notice',
          message: 'Our offices will be closed December 24-26. Orders will be processed on December 27.',
          icon: 'calendar-event',
          dismissible: true
        }
      }
    ]
  };

  // Sample cart data for live demo
  const sampleCartData = {
    id: 'cart_demo_123',
    user: { id: 42, email: 'demo@example.com', region: 'EU' },
    session_key: 'sess_demo_abc',
    has_marking: true,
    has_digital: true,
    has_tutorial: false,
    has_material: true,
    marking_paper_count: 2,
    expired_deadlines_count: 1
  };

  const sampleCartItems = [
    {
      id: 1,
      product_id: 101,
      variation_id: 201,
      quantity: 1,
      actual_price: 59.99,
      metadata: { subject: 'CS1', product_type: 'marking_paper', variationId: 1 }
    },
    {
      id: 2,
      product_id: 102,
      variation_id: 202,
      quantity: 1,
      actual_price: 149.99,
      metadata: { subject: 'CP1', product_type: 'online_classroom', variationId: 203 }
    }
  ];

  const demoOptions = [
    {
      key: 'mock',
      label: 'Mock Response Processing',
      description: 'Process a mock rules engine response to show pipeline features'
    },
    {
      key: 'checkout',
      label: 'Live Checkout Terms Demo',
      description: 'Execute real checkout_terms rules (may not return messages)'
    },
    {
      key: 'home',
      label: 'Live Home Page Demo',
      description: 'Execute real home_page_mount rules (may not return messages)'
    },
    {
      key: 'helper',
      label: 'Rules Engine Helper Demo',
      description: 'Use the simplified helper functions'
    }
  ];

  const runDemo = async (demoType) => {
    setProcessing(true);
    setRawResponse(null);
    setProcessedResponse(null);
    setUIResponse(null);

    try {
      let rawResp = null;

      switch (demoType) {
        case 'mock':
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 500));
          rawResp = mockRawResponse;
          break;

        case 'checkout':
          console.log('Executing live checkout terms rules...');
          const checkoutContext = buildRulesContext.checkoutTerms(sampleCartData, sampleCartItems);
          const checkoutResult = await executeAndProcessRules(
            'checkout_terms',
            checkoutContext,
            rulesEngineService,
            processingOptions
          );
          // For this demo, we'll use the processed result as if it were raw
          rawResp = {
            success: checkoutResult.success,
            blocked: checkoutResult.blocked,
            requires_acknowledgment: checkoutResult.requires_acknowledgment,
            messages: checkoutResult.messages.raw || []
          };
          // Set processed response directly since we already processed it
          setProcessedResponse(checkoutResult);
          break;

        case 'home':
          console.log('Executing live home page rules...');
          const homeResult = await rulesEngineHelpers.executeHomePage(
            { id: 42, email: 'demo@example.com', region: 'EU' },
            rulesEngineService
          );
          rawResp = {
            success: homeResult.success,
            blocked: homeResult.blocked,
            requires_acknowledgment: homeResult.requires_acknowledgment,
            messages: homeResult.messages.raw || []
          };
          setProcessedResponse(homeResult);
          break;

        case 'helper':
          console.log('Using rules engine helper...');
          const helperResult = await rulesEngineHelpers.executeCheckoutTerms(
            sampleCartData,
            sampleCartItems,
            rulesEngineService
          );
          rawResp = {
            success: helperResult.success,
            blocked: helperResult.blocked,
            requires_acknowledgment: helperResult.requires_acknowledgment,
            messages: helperResult.messages.raw || []
          };
          setProcessedResponse(helperResult);
          break;
      }

      setRawResponse(rawResp);

      // Process the response if we haven't already
      if (demoType === 'mock') {
        // Step 1: Full pipeline processing
        const processed = processRulesResponse(rawResp, {
          ...processingOptions,
          entryPoint: 'checkout_terms'
        });
        setProcessedResponse(processed);

        // Step 2: UI-specific processing
        const uiReady = processForUI(rawResp, processingOptions);
        setUIResponse(uiReady);
      } else {
        // For live demos, create UI response from processed response
        const uiReady = processForUI(rawResp, processingOptions);
        setUIResponse(uiReady);
      }

    } catch (error) {
      console.error('Demo error:', error);
      setRawResponse({
        success: false,
        blocked: true,
        messages: [],
        error: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOptionChange = (option, value) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const getStepBadge = (step, isActive, isComplete) => {
    if (isComplete) return <Badge bg="success">✓</Badge>;
    if (isActive) return <Badge bg="primary">⏳</Badge>;
    return <Badge bg="secondary">⏸</Badge>;
  };

  const renderProcessingSteps = () => {
    const steps = [
      { name: 'Raw Response', complete: !!rawResponse },
      { name: 'Pipeline Processing', complete: !!processedResponse },
      { name: 'UI Processing', complete: !!uiResponse }
    ];

    return (
      <div className="mb-3">
        <h6>Processing Pipeline Status:</h6>
        <div className="d-flex gap-3">
          {steps.map((step, index) => (
            <div key={step.name} className="d-flex align-items-center">
              {getStepBadge(step.name, processing, step.complete)}
              <span className="ms-2">{step.name}</span>
              {index < steps.length - 1 && <span className="mx-2">→</span>}
            </div>
          ))}
        </div>
        {processing && <ProgressBar animated now={50} className="mt-2" />}
      </div>
    );
  };

  return (
    <Container className="mt-4">
      <h2>Processing Pipeline Demo</h2>
      <p className="text-muted">
        This demo showcases the complete end-to-end message processing pipeline that combines all utilities.
      </p>

      <Row>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header>Demo Options</Card.Header>
            <Card.Body>
              <Form>
                {demoOptions.map((demo) => (
                  <Form.Check
                    key={demo.key}
                    type="radio"
                    name="demoType"
                    id={`demo-${demo.key}`}
                    label={demo.label}
                    checked={selectedDemo === demo.key}
                    onChange={() => setSelectedDemo(demo.key)}
                    className="mb-2"
                  />
                ))}
              </Form>
              <div className="mt-3">
                <small className="text-muted">
                  {demoOptions.find(d => d.key === selectedDemo)?.description}
                </small>
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Header>Processing Options</Card.Header>
            <Card.Body>
              <Form>
                <Form.Check
                  type="checkbox"
                  label="Filter Modal Messages"
                  checked={processingOptions.filterModal}
                  onChange={(e) => handleOptionChange('filterModal', e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  label="Filter Inline Messages"
                  checked={processingOptions.filterInline}
                  onChange={(e) => handleOptionChange('filterInline', e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  label="Process Acknowledgments"
                  checked={processingOptions.processAcknowledgments}
                  onChange={(e) => handleOptionChange('processAcknowledgments', e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  label="Sort by Priority"
                  checked={processingOptions.sortByPriority}
                  onChange={(e) => handleOptionChange('sortByPriority', e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  label="Validate Content"
                  checked={processingOptions.validateContent}
                  onChange={(e) => handleOptionChange('validateContent', e.target.checked)}
                  className="mb-2"
                />
              </Form>
            </Card.Body>
          </Card>

          <Button
            variant="primary"
            size="lg"
            disabled={processing}
            onClick={() => runDemo(selectedDemo)}
            className="w-100"
          >
            {processing ? 'Processing...' : 'Run Demo'}
          </Button>
        </Col>

        <Col md={8}>
          {renderProcessingSteps()}

          {rawResponse && (
            <Card className="mb-3">
              <Card.Header className="bg-info text-white">
                Step 1: Raw Response from Rules Engine
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span>Success: {rawResponse.success ? '✅' : '❌'}</span>
                  <span>Blocked: {rawResponse.blocked ? '🚫' : '✅'}</span>
                  <span>Messages: {rawResponse.messages?.length || 0}</span>
                </div>
                <pre
                  className="bg-light p-2"
                  style={{ maxHeight: '200px', overflow: 'auto', fontSize: '0.8rem' }}
                >
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </Card.Body>
            </Card>
          )}

          {processedResponse && (
            <Card className="mb-3">
              <Card.Header className="bg-success text-white">
                Step 2: Processed Response (Complete Pipeline)
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={6}>
                    <h6>Summary Statistics:</h6>
                    <ul className="list-unstyled">
                      <li>Total Messages: {processedResponse.messages?.summary?.totalMessages || 0}</li>
                      <li>Acknowledgments: {processedResponse.acknowledgments?.length || 0}</li>
                      <li>Errors: {processedResponse.errors?.length || 0}</li>
                      <li>Warnings: {processedResponse.warnings?.length || 0}</li>
                      <li>Highest Priority: {processedResponse.messages?.summary?.highestPriority || 0}</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6>Processing Flags:</h6>
                    <ul className="list-unstyled">
                      <li>Has Acknowledgments: {processedResponse.messages?.summary?.hasAcknowledgments ? '✅' : '❌'}</li>
                      <li>Has Displays: {processedResponse.messages?.summary?.hasDisplays ? '✅' : '❌'}</li>
                      <li>Has Errors: {processedResponse.messages?.summary?.hasErrors ? '⚠️' : '✅'}</li>
                      <li>Requires Action: {processedResponse.messages?.summary?.requiresAction ? '🔴' : '🟢'}</li>
                    </ul>
                  </Col>
                </Row>

                {processedResponse.messages?.processed && processedResponse.messages.processed.length > 0 && (
                  <div>
                    <h6>Processed Messages:</h6>
                    {processedResponse.messages.processed.map((msg, index) => (
                      <Alert key={index} variant={msg.variant} className="mb-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{msg.parsed?.title || 'Untitled'}</strong>
                            <br />
                            <small>{msg.parsed?.message}</small>
                          </div>
                          <div className="text-end">
                            <Badge bg="secondary">Priority: {msg.priority}</Badge>
                            {msg.isAcknowledgment && <Badge bg="warning" className="ms-1">ACK</Badge>}
                            {msg.needsAction && <Badge bg="danger" className="ms-1">Action</Badge>}
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {uiResponse && (
            <Card>
              <Card.Header className="bg-warning text-dark">
                Step 3: UI-Ready Response (Component Compatible)
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <h6>For Existing Components:</h6>
                  <p>Display Messages: {uiResponse.messages?.length || 0}</p>
                  <p>Inline Acknowledgments: {uiResponse.acknowledgments?.inline?.length || 0}</p>
                  <p>Modal Acknowledgments: {uiResponse.acknowledgments?.modal?.length || 0}</p>
                </div>

                <pre
                  className="bg-light p-2"
                  style={{ maxHeight: '200px', overflow: 'auto', fontSize: '0.8rem' }}
                >
                  {JSON.stringify(uiResponse, null, 2)}
                </pre>
              </Card.Body>
            </Card>
          )}

          {!rawResponse && !processing && (
            <Alert variant="info">
              Select demo options and click "Run Demo" to see the processing pipeline in action.
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ProcessingPipelineDemo;