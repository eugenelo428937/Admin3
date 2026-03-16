import React, { useState } from 'react';
import { Container, Card, Button, Alert, Badge, Row, Col, Table } from 'react-bootstrap';
import {
  classifyMessages,
  isAcknowledgmentMessage,
  getMessageVariant,
  requiresUserAction,
  getMessagePriority,
  sortMessagesByPriority
} from '../../utils/rulesEngineUtils';

/**
 * Demo component to showcase message classification utilities
 */
const MessageClassificationDemo = () => {
  // Sample messages that mimic real rules engine responses
  const sampleMessages = [
    {
      type: 'acknowledge',
      display_type: 'inline',
      template_id: 11,
      ack_key: 'terms_conditions_v1',
      required: true,
      content: {
        title: 'Terms & Conditions',
        message: 'Please accept our terms and conditions',
        checkbox_text: 'I accept the Terms & Conditions'
      }
    },
    {
      type: 'acknowledge',
      display_type: 'modal',
      template_id: 13,
      ack_key: 'digital_content_v1',
      required: true,
      content: {
        title: 'Digital Content Consent',
        message: 'By purchasing digital content, you agree to immediate access',
        variant: 'info'
      }
    },
    {
      type: 'display',
      display_type: 'inline',
      message_type: 'warning',
      content: {
        title: 'Holiday Notice',
        message: 'Our offices will be closed from Dec 24-26',
        icon: 'calendar-event',
        dismissible: true
      }
    },
    {
      type: 'display',
      display_type: 'modal',
      message_type: 'error',
      blocking: true,
      content: {
        title: 'Important: Expired Deadlines',
        message: 'Some items in your cart have expired deadlines'
      }
    },
    {
      type: 'display',
      message_type: 'info',
      content: {
        title: 'Free Shipping Available',
        message: 'Orders over £50 qualify for free shipping'
      }
    }
  ];

  const [messages, setMessages] = useState(sampleMessages);
  const [classified, setClassified] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const runClassification = () => {
    const result = classifyMessages(messages);
    setClassified(result);
    setShowDetails(true);
    console.log('Classification Result:', result);
  };

  const runPrioritySorting = () => {
    const sorted = sortMessagesByPriority(messages);
    setMessages(sorted);
    alert('Messages sorted by priority! Check the order in the table.');
  };

  const MessageRow = ({ msg, index }) => {
    const variant = getMessageVariant(msg);
    const isAck = isAcknowledgmentMessage(msg);
    const needsAction = requiresUserAction(msg);
    const priority = getMessagePriority(msg);

    return (
      <tr>
        <td>{index + 1}</td>
        <td>
          <Badge bg={isAck ? 'warning' : 'primary'}>
            {isAck ? 'Acknowledgment' : 'Display'}
          </Badge>
        </td>
        <td>
          <Badge bg={msg.display_type === 'modal' ? 'dark' : 'light'} text={msg.display_type === 'modal' ? 'light' : 'dark'}>
            {msg.display_type || 'default'}
          </Badge>
        </td>
        <td>
          <Badge bg={
            variant === 'error' ? 'danger' :
            variant === 'warning' ? 'warning' :
            variant === 'success' ? 'success' :
            'info'
          }>
            {variant}
          </Badge>
        </td>
        <td>{priority}</td>
        <td>
          {needsAction && <Badge bg="danger">Action Required</Badge>}
          {msg.required && <Badge bg="warning" className="ms-1">Required</Badge>}
          {msg.blocking && <Badge bg="dark" className="ms-1">Blocking</Badge>}
        </td>
        <td className="text-truncate" style={{ maxWidth: '200px' }}>
          {msg.content?.title || msg.ack_key || 'Untitled'}
        </td>
      </tr>
    );
  };

  return (
    <Container className="mt-4">
      <h2>Message Classification Demo</h2>
      <p className="text-muted">
        This demo showcases the new centralized message classification utilities for the rules engine.
      </p>

      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <span>Sample Messages ({messages.length})</span>
            <div>
              <Button
                variant="primary"
                size="sm"
                onClick={runClassification}
                className="me-2"
              >
                Run Classification
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={runPrioritySorting}
              >
                Sort by Priority
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <Table responsive hover size="sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Display</th>
                <th>Variant</th>
                <th>Priority</th>
                <th>Flags</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, index) => (
                <MessageRow key={index} msg={msg} index={index} />
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {classified && showDetails && (
        <>
          <Alert variant="success">
            Classification completed! See results below.
          </Alert>

          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-warning text-dark">
                  Acknowledgments ({classified.acknowledgments.all.length})
                </Card.Header>
                <Card.Body>
                  <div className="mb-2">
                    <strong>Inline ({classified.acknowledgments.inline.length}):</strong>
                    {classified.acknowledgments.inline.length > 0 ? (
                      <ul className="mb-0 mt-1">
                        {classified.acknowledgments.inline.map((msg, i) => (
                          <li key={i}>{msg.content?.title || msg.ack_key}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted ms-2">None</span>
                    )}
                  </div>
                  <div>
                    <strong>Modal ({classified.acknowledgments.modal.length}):</strong>
                    {classified.acknowledgments.modal.length > 0 ? (
                      <ul className="mb-0 mt-1">
                        {classified.acknowledgments.modal.map((msg, i) => (
                          <li key={i}>{msg.content?.title || msg.ack_key}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted ms-2">None</span>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-primary text-white">
                  Display Messages ({classified.displays.all.length})
                </Card.Header>
                <Card.Body>
                  <div className="mb-2">
                    <strong>Inline ({classified.displays.inline.length}):</strong>
                    {classified.displays.inline.length > 0 ? (
                      <ul className="mb-0 mt-1">
                        {classified.displays.inline.map((msg, i) => (
                          <li key={i}>{msg.content?.title} <Badge bg={getMessageVariant(msg)}>{getMessageVariant(msg)}</Badge></li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted ms-2">None</span>
                    )}
                  </div>
                  <div>
                    <strong>Modal ({classified.displays.modal.length}):</strong>
                    {classified.displays.modal.length > 0 ? (
                      <ul className="mb-0 mt-1">
                        {classified.displays.modal.map((msg, i) => (
                          <li key={i}>{msg.content?.title} <Badge bg={getMessageVariant(msg)}>{getMessageVariant(msg)}</Badge></li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted ms-2">None</span>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card>
            <Card.Header>Classification Summary</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <ul className="list-unstyled">
                    <li>✅ Total Messages: <strong>{classified.summary.totalMessages}</strong></li>
                    <li>📝 Total Acknowledgments: <strong>{classified.summary.totalAcknowledgments}</strong></li>
                    <li>📢 Total Display Messages: <strong>{classified.summary.totalDisplays}</strong></li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul className="list-unstyled">
                    <li>Has Inline Acknowledgments: {classified.summary.hasInlineAcknowledgments ? '✅ Yes' : '❌ No'}</li>
                    <li>Has Modal Acknowledgments: {classified.summary.hasModalAcknowledgments ? '✅ Yes' : '❌ No'}</li>
                    <li>Has Inline Displays: {classified.summary.hasInlineDisplays ? '✅ Yes' : '❌ No'}</li>
                    <li>Has Modal Displays: {classified.summary.hasModalDisplays ? '✅ Yes' : '❌ No'}</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default MessageClassificationDemo;