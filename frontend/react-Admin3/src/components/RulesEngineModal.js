import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Card } from 'react-bootstrap';
import rulesEngineService from '../services/rulesEngineService';

const RulesEngineModal = ({ 
  show = true, 
  onHide = null, 
  messages = [], 
  onAllAcknowledged = null 
}) => {
  const [acknowledgedMessages, setAcknowledgedMessages] = useState(new Set());
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState('');

  // Filter out acknowledged messages
  const pendingMessages = messages.filter(msg => !acknowledgedMessages.has(msg.rule_id));
  const hasUnacknowledgedMessages = pendingMessages.some(msg => msg.requires_acknowledgment);

  // Reset state when messages change
  useEffect(() => {
    setAcknowledgedMessages(new Set());
    setError('');
  }, [messages]);

  const getVariant = (messageType) => {
    switch (messageType) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      case 'success':
        return 'success';
      case 'terms':
        return 'primary';
      default:
        return 'info';
    }
  };

  const handleAcknowledge = async (message) => {
    if (!message.requires_acknowledgment) {
      return;
    }

    setIsAcknowledging(true);
    setError('');

    try {
      // For acknowledgment type messages, we need to acknowledge the rule
      if (message.type === 'acknowledgment') {
        await rulesEngineService.acknowledgeRule(
          message.rule_id,
          message.template_id
        );
      }

      // Mark this message as acknowledged
      setAcknowledgedMessages(prev => new Set([...prev, message.rule_id]));

    } catch (err) {
      setError('Failed to acknowledge. Please try again.');
      console.error('Acknowledgment error:', err);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleAcknowledgeAll = async () => {
    const messagesToAcknowledge = pendingMessages.filter(msg => msg.requires_acknowledgment);
    
    if (messagesToAcknowledge.length === 0) {
      handleComplete();
      return;
    }

    setIsAcknowledging(true);
    setError('');

    try {
      // Acknowledge all messages that require acknowledgment
      for (const message of messagesToAcknowledge) {
        if (message.type === 'acknowledgment') {
          await rulesEngineService.acknowledgeRule(
            message.rule_id,
            message.template_id
          );
        }
        // Mark as acknowledged
        setAcknowledgedMessages(prev => new Set([...prev, message.rule_id]));
      }

      // Complete after all acknowledgments
      handleComplete();

    } catch (err) {
      setError('Failed to acknowledge. Please try again.');
      console.error('Acknowledgment error:', err);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleComplete = () => {
    if (onAllAcknowledged) {
      onAllAcknowledged();
    }
    onHide();
  };

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Important Information</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="rules-messages-container">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          
          {pendingMessages.map((message, index) => (
            <Card key={`${message.rule_id}-${index}`} className="mb-3">
              <Card.Header className={`bg-${getVariant(message.message_type)}`}>
                <h6 className="mb-0 text-white">
                  {message.title || `Rule Message ${index + 1}`}
                </h6>
              </Card.Header>
              <Card.Body>
                <div 
                  dangerouslySetInnerHTML={{ __html: message.content || message.message }} 
                />
                
                {message.requires_acknowledgment && !acknowledgedMessages.has(message.rule_id) && (
                  <div className="mt-3">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleAcknowledge(message)}
                      disabled={isAcknowledging}
                    >
                      {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
                    </Button>
                  </div>
                )}
                
                {acknowledgedMessages.has(message.rule_id) && (
                  <div className="mt-3">
                    <Alert variant="success" className="mb-0 py-2">
                      <small>✓ Acknowledged</small>
                    </Alert>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}

          <div className="d-flex justify-content-end gap-2">
            {hasUnacknowledgedMessages ? (
              <Button
                variant="primary"
                onClick={handleAcknowledgeAll}
                disabled={isAcknowledging}
              >
                {isAcknowledging ? 'Processing...' : 'Acknowledge All & Continue'}
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleComplete}
                disabled={isAcknowledging}
              >
                Continue
              </Button>
            )}
            
            <Button
              variant="outline-secondary"
              onClick={onHide}
              disabled={isAcknowledging}
            >
              Skip
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default RulesEngineModal; 