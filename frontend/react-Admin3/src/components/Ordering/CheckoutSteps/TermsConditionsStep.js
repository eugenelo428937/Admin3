import React, { useEffect, useState } from 'react';
import { Card, Form, Alert } from 'react-bootstrap';
import { rulesEngineHelpers, parseMessageContent } from '../../../utils/rulesEngineUtils';
import rulesEngineService from '../../../services/rulesEngineService';
import RulesEngineAcknowledgmentModal from '../../Common/RulesEngineAcknowledgmentModal';
import acknowledgmentService from '../../../services/acknowledgmentService';

const TermsConditionsStep = ({
  cartData,
  cartItems,
  generalTermsAccepted,
  setGeneralTermsAccepted
}) => {
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesMessages, setRulesMessages] = useState([]);
  const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);
  const [acknowledgmentMessages, setAcknowledgmentMessages] = useState([]);
  const [error, setError] = useState('');
  const [termsContent, setTermsContent] = useState(null);

  // Execute checkout_terms rules when step mounts
  useEffect(() => {
    const executeTermsRules = async () => {
      if (!cartData) {
        console.warn('[TermsConditionsStep] No cart data available, skipping rules execution');
        setError('Cart data is not available. Please refresh the page.');
        return;
      }

      if (!cartData.id) {
        console.error('[TermsConditionsStep] Cart data missing ID:', cartData);
        setError('Invalid cart data. Please refresh the page.');
        return;
      }

      if (cartItems.length === 0) {
        console.warn('[TermsConditionsStep] Cart is empty, but continuing with rules execution');
      }

      setRulesLoading(true);
      setError('');

      try {
        console.log('🔍 [TermsConditionsStep] Executing checkout_terms rules...');

        // Use the new helper function for simplified execution
        const result = await rulesEngineHelpers.executeCheckoutTerms(cartData, cartItems, rulesEngineService);

        console.log('📋 [TermsConditionsStep] Rules result:', result);
        console.log('📋 [TermsConditionsStep] Messages received:', result.messages?.summary?.totalMessages || 0);

        if (result.success && result.messages?.classified) {
          // Handle inline acknowledgment messages (like terms & conditions)
          const inlineAcks = result.messages.classified.acknowledgments.inline;
          if (inlineAcks.length > 0) {
            const termsMessage = inlineAcks[0];

            // Use the new parsing utility
            const parsed = parseMessageContent(termsMessage, {
              title: 'Terms & Conditions',
              message: 'Please acknowledge the terms and conditions',
              checkboxText: 'I have read and accept the Terms & Conditions'
            });

            const content = {
              title: parsed.title,
              message: parsed.message,
              checkbox_text: parsed.checkboxText,
              template_id: parsed.templateId,
              ack_key: parsed.ackKey,
              required: parsed.required
            };
            setTermsContent(content);
          }

          // Show acknowledgment modal for messages that need modal display (like digital content)
          const modalAcks = result.messages.classified.acknowledgments.modal;
          if (modalAcks.length > 0) {
            setAcknowledgmentMessages(modalAcks);
            setShowAcknowledgmentModal(true);
          }

          // Set display messages
          setRulesMessages(result.messages.classified.displays.all);
        }

        // Handle processing errors
        if (result.errors && result.errors.length > 0) {
          console.error('🚨 Rules processing errors:', result.errors);
          setError(`Processing errors: ${result.errors.join(', ')}`);
        }

        // Check for any blocking requirements
        if (result.blocked || result.requires_acknowledgment) {
          console.log('⚠️ [TermsConditionsStep] Acknowledgment required for checkout');
        }
      } catch (err) {
        console.error('Error executing checkout_terms rules:', err);
        setError('Failed to load terms and conditions. Please refresh the page.');
      } finally {
        setRulesLoading(false);
      }
    };

    executeTermsRules();
  }, [cartData, cartItems]);

  const handleAcknowledgmentComplete = async (acknowledged, messageId, ackKey) => {
    if (acknowledged) {
      try {
        // Submit acknowledgment to the server
        await acknowledgmentService.submitAcknowledgment({
          ackKey: ackKey || 'terms_conditions_v1', // Use the specific ack key for this rule
          message_id: messageId,
          acknowledged: true,
          entry_point_location: 'checkout_terms'
        });

        // Only set general terms accepted if this is specifically a terms & conditions acknowledgment
        if (ackKey === 'terms_conditions_v1') {
          setGeneralTermsAccepted(true);
        }

        setShowAcknowledgmentModal(false);
      } catch (err) {
        console.error('Error submitting acknowledgment:', err);
        setError('Failed to save acknowledgment. Please try again.');
      }
    }
  };

  // Render terms content from rules engine or fallback to static content
  const renderTermsContent = () => {
    if (termsContent) {
      // If we have content from the rules engine
      return (
        <div>
          {termsContent.title && <h5>{termsContent.title}</h5>}
          {typeof termsContent.message === 'string' ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{termsContent.message}</p>
          ) : termsContent.content ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{termsContent.content}</p>
          ) : (
            <p>{JSON.stringify(termsContent)}</p>
          )}
        </div>
      );
    }

    // Fallback to static content
    return (
      <div>
        <h5>Terms & Conditions</h5>
        <p>
          ActEd's full Terms & Conditions, which include ActEd's policy on cancellation and refunds,
          are set out in the Professional Training Brochure available from the website
          (see Helpful Information tab/Professional Exams).
        </p>
        <p>
          By purchasing from us you acknowledge that you have read and agree to be bound by
          these terms & conditions.
        </p>
      </div>
    );
  };

  return (
    <div>
      <h4>Step 2: Terms & Conditions</h4>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {rulesLoading ? (
        <Alert variant="info" className="mt-3">
          <i className="bi bi-hourglass-split me-2"></i>
          Loading terms and conditions...
        </Alert>
      ) : (
        <>
          {/* Display any non-acknowledgment rules messages */}
          {rulesMessages.map((message, index) => {
            // Use the parsed content from the new utilities
            const parsed = message.parsed || message;
            const variant = parsed.variant === 'warning' ? 'warning' :
                          parsed.variant === 'error' ? 'danger' :
                          parsed.variant === 'info' ? 'info' : 'primary';

            return (
              <Alert
                key={`alert-${message.template_id || index}`}
                variant={variant}
                className="mt-3"
                dismissible={parsed.dismissible || false}
              >
                <Alert.Heading>
                  {parsed.icon && <i className={`bi bi-${parsed.icon} me-2`}></i>}
                  {parsed.title || 'Notice'}
                </Alert.Heading>
                <div
                  className="mb-0"
                  dangerouslySetInnerHTML={{
                    __html: parsed.message || 'No message content'
                  }}
                />
              </Alert>
            );
          })}

          <Card className="mt-3">
            <Card.Header>Terms & Conditions</Card.Header>
            <Card.Body>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #dee2e6',
                padding: '15px',
                borderRadius: '4px'
              }}>
                {renderTermsContent()}
              </div>

              <Form.Check
                type="checkbox"
                id="general-terms-checkbox"
                label={termsContent?.checkbox_text || "I have read and accept the Terms & Conditions"}
                checked={generalTermsAccepted}
                onChange={async (e) => {
                  const isChecked = e.target.checked;
                  setGeneralTermsAccepted(isChecked);

                  // Submit acknowledgment to backend if checked and we have terms content from rules engine
                  if (isChecked && termsContent) {
                    try {
                      await acknowledgmentService.submitAcknowledgment({
                        ackKey: 'terms_conditions_v1', // Required acknowledgment key
                        message_id: 11, // Template ID for terms & conditions
                        acknowledged: true,
                        entry_point_location: 'checkout_terms'
                      });
                      console.log('✅ Terms acknowledgment submitted successfully');
                    } catch (err) {
                      console.error('❌ Error submitting terms acknowledgment:', err);
                      // Don't show error to user for this as it's not critical for UX
                    }
                  }
                }}
                className="mt-3"
              />
            </Card.Body>
          </Card>
        </>
      )}

      {/* Acknowledgment Modal */}
      <RulesEngineAcknowledgmentModal
        open={showAcknowledgmentModal}
        onClose={() => setShowAcknowledgmentModal(false)}
        messages={acknowledgmentMessages}
        entryPointLocation="checkout_terms"
        onAcknowledge={handleAcknowledgmentComplete}
      />
    </div>
  );
};

export default TermsConditionsStep;