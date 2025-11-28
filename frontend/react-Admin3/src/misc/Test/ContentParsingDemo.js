import React, { useState } from 'react';
import { Container, Card, Button, Alert, Badge, Row, Col, Table, Form } from 'react-bootstrap';
import {
  parseMessageContent,
  formatMessageText,
  extractAcknowledgmentConfig
} from '../../utils/rulesEngineUtils';

/**
 * Demo component to showcase content parsing utilities
 */
const ContentParsingDemo = () => {
  // Sample messages with different content structures
  const sampleMessages = [
    {
      id: 1,
      name: 'Simple String Content',
      message: 'This is a simple string message'
    },
    {
      id: 2,
      name: 'Nested Content Structure',
      content: {
        content: {
          title: 'Nested Title',
          message: 'Message from nested content.content structure',
          checkbox_text: 'I accept nested terms',
          icon: 'shield-check',
          dismissible: true
        }
      }
    },
    {
      id: 3,
      name: 'Complex Acknowledgment',
      type: 'acknowledge',
      display_type: 'modal',
      template_id: 13,
      ack_key: 'digital_content_v1',
      required: true,
      content: {
        title: 'Digital Content Terms',
        message: 'By purchasing **digital content**, you agree to:\n- Immediate access\n- No cancellation rights\n- [Terms Details](/terms)',
        checkbox_text: 'I understand and accept',
        variant: 'warning',
        link: {
          url: 'https://example.com/terms',
          text: 'Read full terms',
          target: '_blank'
        },
        details: [
          'Content is non-refundable',
          'Access expires after 18 months',
          'Single user license only'
        ],
        buttons: [
          { label: 'Accept', action: 'acknowledge', variant: 'primary' },
          { label: 'Cancel', action: 'close', variant: 'secondary' }
        ]
      }
    },
    {
      id: 4,
      name: 'Message with Array Content',
      content: {
        title: 'Multiple Messages',
        message: ['Line 1 of the message', 'Line 2 of the message', 'Line 3 of the message'],
        items: [
          { text: 'Item 1' },
          { text: 'Item 2' },
          'Item 3 as string'
        ]
      }
    },
    {
      id: 5,
      name: 'Markdown Formatted Message',
      content: {
        title: 'Formatted Content',
        message: 'This message has **bold text**, *italic text*, and [a link](https://example.com).\n\nIt also has line breaks!',
        dismissible: true
      }
    }
  ];

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [parsedContent, setParsedContent] = useState(null);
  const [customDefaults, setCustomDefaults] = useState({
    title: 'Default Title',
    message: 'Default message text',
    checkboxText: 'I acknowledge',
    icon: 'info-circle'
  });

  const handleParseMessage = (message) => {
    setSelectedMessage(message);
    const parsed = parseMessageContent(message, customDefaults);
    setParsedContent(parsed);
    console.log('Parsed Content:', parsed);

    // If it's an acknowledgment, also extract config
    if (message.type === 'acknowledge' || message.ack_key) {
      const ackConfig = extractAcknowledgmentConfig(message);
      console.log('Acknowledgment Config:', ackConfig);
    }
  };

  const handleDefaultChange = (field, value) => {
    setCustomDefaults(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderParsedContent = () => {
    if (!parsedContent) return null;

    return (
      <Card className="mt-3">
        <Card.Header className="bg-success text-white">
          Parsed Content Result
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Basic Fields:</h6>
              <Table size="sm" bordered>
                <tbody>
                  <tr>
                    <td><strong>Title:</strong></td>
                    <td>{parsedContent.title}</td>
                  </tr>
                  <tr>
                    <td><strong>Message:</strong></td>
                    <td>{parsedContent.message}</td>
                  </tr>
                  <tr>
                    <td><strong>Icon:</strong></td>
                    <td><i className={`bi bi-${parsedContent.icon}`}></i> {parsedContent.icon}</td>
                  </tr>
                  <tr>
                    <td><strong>Variant:</strong></td>
                    <td><Badge bg={parsedContent.variant}>{parsedContent.variant}</Badge></td>
                  </tr>
                  <tr>
                    <td><strong>Dismissible:</strong></td>
                    <td>{parsedContent.dismissible ? '✅ Yes' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>Display Type:</strong></td>
                    <td>{parsedContent.displayType}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
            <Col md={6}>
              <h6>Metadata:</h6>
              <Table size="sm" bordered>
                <tbody>
                  <tr>
                    <td><strong>Template ID:</strong></td>
                    <td>{parsedContent.templateId || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Ack Key:</strong></td>
                    <td>{parsedContent.ackKey || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Required:</strong></td>
                    <td>{parsedContent.required ? '✅ Yes' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>Blocking:</strong></td>
                    <td>{parsedContent.blocking ? '✅ Yes' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>Checkbox Text:</strong></td>
                    <td>{parsedContent.checkboxText}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>

          {parsedContent.link && (
            <div className="mt-3">
              <h6>Link:</h6>
              <a
                href={parsedContent.link.url}
                target={parsedContent.link.target}
                rel="noopener noreferrer"
              >
                {parsedContent.link.text}
              </a>
            </div>
          )}

          {parsedContent.details && parsedContent.details.length > 0 && (
            <div className="mt-3">
              <h6>Details:</h6>
              <ul>
                {parsedContent.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedContent.buttons && parsedContent.buttons.length > 0 && (
            <div className="mt-3">
              <h6>Buttons:</h6>
              {parsedContent.buttons.map((button, index) => (
                <Button
                  key={index}
                  variant={button.variant}
                  disabled={button.disabled}
                  className="me-2"
                >
                  {button.label} ({button.action})
                </Button>
              ))}
            </div>
          )}

          {parsedContent.message && (
            <div className="mt-3">
              <h6>Formatted Message (with Markdown):</h6>
              <Alert variant={parsedContent.variant}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMessageText(parsedContent.message)
                  }}
                />
              </Alert>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container className="mt-4">
      <h2>Content Parsing Demo</h2>
      <p className="text-muted">
        This demo showcases the content parsing utilities that normalize various message formats.
      </p>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              Sample Messages
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                {sampleMessages.map((msg) => (
                  <Button
                    key={msg.id}
                    variant={selectedMessage?.id === msg.id ? 'primary' : 'outline-primary'}
                    onClick={() => handleParseMessage(msg)}
                    className="text-start"
                  >
                    <strong>{msg.name}</strong>
                    {msg.type === 'acknowledge' && (
                      <Badge bg="warning" className="ms-2">ACK</Badge>
                    )}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              Default Values (Customize)
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-2">
                  <Form.Label>Default Title</Form.Label>
                  <Form.Control
                    type="text"
                    value={customDefaults.title}
                    onChange={(e) => handleDefaultChange('title', e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Default Message</Form.Label>
                  <Form.Control
                    type="text"
                    value={customDefaults.message}
                    onChange={(e) => handleDefaultChange('message', e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Default Checkbox Text</Form.Label>
                  <Form.Control
                    type="text"
                    value={customDefaults.checkboxText}
                    onChange={(e) => handleDefaultChange('checkboxText', e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Default Icon</Form.Label>
                  <Form.Control
                    type="text"
                    value={customDefaults.icon}
                    onChange={(e) => handleDefaultChange('icon', e.target.value)}
                  />
                </Form.Group>
              </Form>
              <div className="mt-3 text-muted">
                <small>These defaults are used when fields are missing from the message.</small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          {selectedMessage && (
            <Card className="mb-3">
              <Card.Header className="bg-info text-white">
                Original Message Structure
              </Card.Header>
              <Card.Body>
                <pre className="bg-light p-2" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {JSON.stringify(selectedMessage, null, 2)}
                </pre>
              </Card.Body>
            </Card>
          )}

          {renderParsedContent()}
        </Col>
      </Row>
    </Container>
  );
};

export default ContentParsingDemo;