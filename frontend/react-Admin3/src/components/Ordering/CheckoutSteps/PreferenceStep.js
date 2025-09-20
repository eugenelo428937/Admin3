import React, { useState, useEffect } from 'react';
import { Alert, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import rulesEngineService from '../../../services/rulesEngineService';
import { useCart } from '../../../contexts/CartContext';
import { useAuth } from '../../../hooks/useAuth';

const PreferenceStep = ({ preferences, setPreferences, onPreferencesSubmit }) => {
  const { cartData } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rulesPreferences, setRulesPreferences] = useState([]);

  useEffect(() => {
    fetchPreferences();
  }, [cartData, user, isAuthenticated]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError('');

      // Build context for rules engine
      const context = {
        user: {
          id: isAuthenticated && user ? user.id : 'anonymous',
          email: isAuthenticated && user ? user.email : null,
          is_authenticated: isAuthenticated
        },
        cart: {
          items: cartData?.items || [],
          has_digital: cartData?.has_digital || false,
          total: cartData?.total || 0
        },
        entryPoint: 'checkout_preference'
      };

      console.log('🔍 [PreferenceStep] Fetching preferences with context:', context);

      const response = await rulesEngineService.executeRules('checkout_preference', context);

      console.log('📋 [PreferenceStep] Rules engine response:', response);

      // Check for both preference_prompts (new) and preferences (legacy) fields
      const preferencesData = response.preference_prompts || response.preferences || [];

      if (response.success && preferencesData.length > 0) {
        setRulesPreferences(preferencesData);

        // Initialize preferences state with defaults
        const initialPrefs = {};
        preferencesData.forEach(pref => {
          initialPrefs[pref.preferenceKey] = {
            value: pref.default || '',
            inputType: pref.inputType,
            ruleId: pref.ruleId
          };
        });

        setPreferences(prev => ({ ...prev, ...initialPrefs }));
      } else {
        console.log('📋 [PreferenceStep] No preferences found');
      }

    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (preferenceKey, value) => {
    setPreferences(prev => ({
      ...prev,
      [preferenceKey]: {
        ...prev[preferenceKey],
        value: value
      }
    }));
  };

  const getContentText = (content) => {
    // Handle different content formats
    if (typeof content === 'string') {
      return content;
    }
    if (typeof content === 'object' && content !== null) {
      // For the marketing preference structure where content is nested
      // Structure: { title: "...", content: "description text", input: {...} }
      if (content.content && typeof content.content === 'string') {
        return content.content;
      }
      if (content.message) {
        return content.message;
      }
      if (content.text) {
        return content.text;
      }
      // If no text field found, return empty string to avoid React error
      return '';
    }
    return '';
  };

  const renderPreferenceInput = (preference) => {
    const currentValue = preferences[preference.preferenceKey]?.value || preference.default || '';
    const contentText = getContentText(preference.content);

    switch (preference.inputType) {
      case 'radio':
        return (
          <div key={preference.preferenceKey}>
            <Card className="mb-3">
              <Card.Body>
                <h6 className="mb-3">{preference.title}</h6>
                {contentText && <p className="text-muted mb-3">{contentText}</p>}

                {preference.options?.map((option, index) => (
                  <Form.Check
                    key={index}
                    type="radio"
                    id={`${preference.preferenceKey}_${option.value}`}
                    name={preference.preferenceKey}
                    label={option.label}
                    value={option.value}
                    checked={currentValue === option.value}
                    onChange={(e) => handlePreferenceChange(preference.preferenceKey, e.target.value)}
                    className="mb-2"
                  />
                ))}
              </Card.Body>
            </Card>
          </div>
        );

      case 'checkbox':
        // Handle single checkbox (for marketing preference)
        if (preference.options?.length === 1) {
          const option = preference.options[0];
          const isChecked = typeof currentValue === 'boolean' ? currentValue : currentValue === option.value;

          return (
            <div key={preference.preferenceKey}>
              <Card className="mb-3">
                <Card.Body>
                  <h6 className="mb-3">{preference.title}</h6>
                  {contentText && <p className="text-muted mb-3">{contentText}</p>}

                  <Form.Check
                    type="checkbox"
                    id={`${preference.preferenceKey}_single`}
                    label={option.label}
                    checked={isChecked}
                    onChange={(e) => {
                      handlePreferenceChange(preference.preferenceKey, e.target.checked);
                    }}
                    className="mb-2"
                  />
                </Card.Body>
              </Card>
            </div>
          );
        }

        // Handle multiple checkboxes (original implementation)
        return (
          <div key={preference.preferenceKey}>
            <Card className="mb-3">
              <Card.Body>
                <h6 className="mb-3">{preference.title}</h6>
                {contentText && <p className="text-muted mb-3">{contentText}</p>}

                {preference.options?.map((option, index) => {
                  const isChecked = Array.isArray(currentValue) && currentValue.includes(option.value);

                  return (
                    <Form.Check
                      key={index}
                      type="checkbox"
                      id={`${preference.preferenceKey}_${option.value}`}
                      label={option.label}
                      checked={isChecked}
                      onChange={(e) => {
                        let newValue = Array.isArray(currentValue) ? [...currentValue] : [];
                        if (e.target.checked) {
                          if (!newValue.includes(option.value)) {
                            newValue.push(option.value);
                          }
                        } else {
                          newValue = newValue.filter(v => v !== option.value);
                        }
                        handlePreferenceChange(preference.preferenceKey, newValue);
                      }}
                      className="mb-2"
                    />
                  );
                })}
              </Card.Body>
            </Card>
          </div>
        );

      case 'combined_checkbox_textarea':
        const combinedValue = typeof currentValue === 'object' && currentValue !== null
          ? currentValue
          : { special_needs: false, details: '' };

        return (
          <div key={preference.preferenceKey}>
            <Card className="mb-3">
              <Card.Body>
                <h6 className="mb-3">{preference.title}</h6>
                {contentText && <p className="text-muted mb-3">{contentText}</p>}

                {/* Checkbox */}
                <Form.Check
                  type="checkbox"
                  id={`${preference.preferenceKey}_checkbox`}
                  label={preference.checkboxLabel || "If you have a special educational need or health condition that you would like us to be aware of, please click this box"}
                  checked={combinedValue.special_needs}
                  onChange={(e) => {
                    const newValue = {
                      ...combinedValue,
                      special_needs: e.target.checked
                    };
                    handlePreferenceChange(preference.preferenceKey, newValue);
                  }}
                  className="mb-3"
                />

                {/* Textarea - always visible but labeled as optional */}
                <div>
                  {preference.textareaLabel && (
                    <Form.Label className="text-muted">
                      {preference.textareaLabel}
                    </Form.Label>
                  )}
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder={preference.textareaPlaceholder || "Please tell us more about your special educational need or health condition and how we might be able to help..."}
                    value={combinedValue.details}
                    onChange={(e) => {
                      const newValue = {
                        ...combinedValue,
                        details: e.target.value
                      };
                      handlePreferenceChange(preference.preferenceKey, newValue);
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </div>
        );

      case 'text':
      case 'textarea':
        return (
          <div key={preference.preferenceKey}>
            <Card className="mb-3">
              <Card.Body>
                <h6 className="mb-3">{preference.title}</h6>
                {contentText && <p className="text-muted mb-3">{contentText}</p>}

                <Form.Control
                  as={preference.inputType === 'textarea' ? 'textarea' : 'input'}
                  type={preference.inputType === 'text' ? 'text' : undefined}
                  rows={preference.inputType === 'textarea' ? 4 : undefined}
                  placeholder={preference.placeholder || `Enter your ${preference.title.toLowerCase()}`}
                  value={currentValue}
                  onChange={(e) => handlePreferenceChange(preference.preferenceKey, e.target.value)}
                />
              </Card.Body>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-4">Preferences</h4>

      {error && <Alert variant="danger">{error}</Alert>}

      {rulesPreferences.length === 0 ? (
        <Alert variant="info">
          No preferences need to be set at this time. You can continue to payment.
        </Alert>
      ) : (
        <div>
          <p className="text-muted mb-4">
            Please review and update your preferences below. These settings will help us provide you with the best possible experience.
          </p>

          {rulesPreferences.map(preference => renderPreferenceInput(preference))}

          <Row className="mt-4">
            <Col>
              <Alert variant="light" className="border">
                <div className="d-flex align-items-center">
                  <i className="fas fa-info-circle text-info me-2"></i>
                  <small className="text-muted">
                    You can change these preferences at any time from your account settings.
                  </small>
                </div>
              </Alert>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default PreferenceStep;