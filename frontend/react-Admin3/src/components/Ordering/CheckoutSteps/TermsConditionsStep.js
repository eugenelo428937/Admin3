import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  FormControlLabel,
  Checkbox,
  Alert,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { rulesEngineHelpers, parseMessageContent } from '../../../utils/rulesEngineUtils';
import rulesEngineService from '../../../services/rulesEngineService';
import RulesEngineAcknowledgmentModal from '../../Common/RulesEngineAcknowledgmentModal';
import { useAuth } from '../../../hooks/useAuth';

const TermsConditionsStep = ({
  cartData,
  cartItems,
  generalTermsAccepted,
  setGeneralTermsAccepted
}) => {
  const { user } = useAuth(); // Get user from AuthContext
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

        setError('Cart data is not available. Please refresh the page.');
        return;
      }

      if (!cartData.id) {
        console.error('[TermsConditionsStep] Cart data missing ID:', cartData);
        setError('Invalid cart data. Please refresh the page.');
        return;
      }

      if (cartItems.length === 0) {

      }

      setRulesLoading(true);
      setError('');

      try {

        // Use the new helper function for simplified execution
        const result = await rulesEngineHelpers.executeCheckoutTerms(cartData, cartItems, rulesEngineService, user);

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
          console.log('🔍 [TermsConditionsStep] Modal acknowledgments:', modalAcks);
          console.log('🔍 [TermsConditionsStep] Modal ack_keys:', modalAcks.map(m => ({ ack_key: m.ack_key, template_id: m.template_id })));
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

        }
      } catch (err) {
        console.error('Error executing checkout_terms rules:', err);
        setError('Failed to load terms and conditions. Please refresh the page.');
      } finally {
        setRulesLoading(false);
      }
    };

    executeTermsRules();
  }, [cartData, cartItems, user]);

  const handleAcknowledgmentComplete = async (acknowledged, messageId, ackKey) => {
    console.log('🔍 [TermsConditionsStep] handleAcknowledgmentComplete called:', {
      acknowledged,
      messageId,
      ackKey,
      hasAckKey: !!ackKey
    });

    if (acknowledged) {
      try {
        const ackData = {
          ackKey: ackKey || 'terms_conditions_v1', // Use the specific ack key for this rule
          message_id: messageId,
          acknowledged: true,
          entry_point_location: 'checkout_terms'
        };
        console.log('✅ [TermsConditionsStep] Sending acknowledgment to server:', ackData);

        // Submit acknowledgment to the server
        const response = await rulesEngineService.acknowledgeRule(ackData);
        console.log('✅ [TermsConditionsStep] Server response:', response);

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
        <Box>
          {termsContent.title && (
            <Typography variant="h6" component="h5" gutterBottom>
              {termsContent.title}
            </Typography>
          )}
          {typeof termsContent.message === 'string' ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {termsContent.message}
            </Typography>
          ) : termsContent.content ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {termsContent.content}
            </Typography>
          ) : (
            <Typography variant="body2">{JSON.stringify(termsContent)}</Typography>
          )}
        </Box>
      );
    }

    // Fallback to static content
    return (
      <Box>
        <Typography variant="h6" component="h5" gutterBottom>
          Terms & Conditions
        </Typography>
        <Typography variant="body2" paragraph>
          ActEd's full Terms & Conditions, which include ActEd's policy on cancellation and refunds,
          are set out in the Professional Training Brochure available from the website
          (see Helpful Information tab/Professional Exams).
        </Typography>
        <Typography variant="body2">
          By purchasing from us you acknowledge that you have read and agree to be bound by
          these terms & conditions.
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" component="h4" gutterBottom>
        Step 2: Terms & Conditions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {rulesLoading ? (
        <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mt: 3 }}>
          Loading terms and conditions...
        </Alert>
      ) : (
        <>
          {/* Display any non-acknowledgment rules messages */}
          {rulesMessages.map((message, index) => {
            // Use the parsed content from the new utilities
            const parsed = message.parsed || message;
            const severity = parsed.variant === 'warning' ? 'warning' :
                          parsed.variant === 'error' ? 'error' :
                          parsed.variant === 'info' ? 'info' : 'info';

            return (
              <Alert
                key={`alert-${message.template_id || index}`}
                severity={severity}
                sx={{ mt: 3 }}
                onClose={parsed.dismissible ? () => {} : undefined}
              >
                <Typography variant="h6" component="h4">
                  {parsed.title || 'Notice'}
                </Typography>
                <Box
                  dangerouslySetInnerHTML={{
                    __html: parsed.message || 'No message content'
                  }}
                />
              </Alert>
            );
          })}

          <Card sx={{ mt: 3 }}>
            <CardHeader title="Terms & Conditions" />
            <CardContent>
              <Box
                sx={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  p: 2,
                  borderRadius: 1,
                  mb: 3
                }}
              >
                {renderTermsContent()}
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    id="general-terms-checkbox"
                    checked={generalTermsAccepted}
                    required
                    error={true}
                    onChange={async (e) => {
                      const isChecked = e.target.checked;
                      setGeneralTermsAccepted(isChecked);

                      // Submit acknowledgment to backend if checked and we have terms content from rules engine
                      if (isChecked && termsContent) {
                        try {
                          await rulesEngineService.acknowledgeRule({
                            ackKey: 'terms_conditions_v1', // Required acknowledgment key
                            message_id: 11, // Template ID for terms & conditions
                            acknowledged: true,
                            entry_point_location: 'checkout_terms'
                          });

                        } catch (err) {
                          console.error('❌ Error submitting terms acknowledgment:', err);
                          // Don't show error to user for this as it's not critical for UX
                        }
                      }
                    }}
                  />
                }
                label={termsContent?.checkbox_text || "I have read and accept the Terms & Conditions"}
              />
            </CardContent>
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
    </Box>
  );
};

export default TermsConditionsStep;