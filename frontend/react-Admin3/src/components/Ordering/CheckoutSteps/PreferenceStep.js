import React, { useState, useEffect } from 'react';
import {
  Alert,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  TextField,
  Typography,
  Box,
  Grid,
  CircularProgress
} from '@mui/material';
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
      // Sanitize cart items to ensure actual_price is never null
      const sanitizedItems = (cartData?.items || []).map(item => ({
        ...item,
        actual_price: item.actual_price || 0
      }));

      const context = {
        user: {
          id: isAuthenticated && user ? user.id : 'anonymous',
          email: isAuthenticated && user ? user.email : null,
          is_authenticated: isAuthenticated
        },
        cart: {
          id: cartData?.id || null,
          items: sanitizedItems,
          has_digital: cartData?.has_digital || false,
          has_tutorial: cartData?.has_tutorial || false,
          has_material: cartData?.has_material || false,
          has_marking: cartData?.has_marking || false,
          total: cartData?.total || 0,
          created_at: cartData?.created_at,
          updated_at: cartData?.updated_at,
          session_key: cartData?.session_key || null
        },
        entryPoint: 'checkout_preference'
      };

      const response = await rulesEngineService.executeRules(rulesEngineService.ENTRY_POINTS.CHECKOUT_PREFERENCE, context);

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
      // For health and safety rule structure: { content: { content: { message: "..." } } }
      if (content.content && typeof content.content === 'object' && content.content.message) {
        return content.content.message;
      }
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
          <Card key={preference.preferenceKey} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h6" gutterBottom>
                {preference.title}
              </Typography>
              {contentText && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {contentText}
                </Typography>
              )}

              <FormControl component="fieldset">
                <RadioGroup
                  name={preference.preferenceKey}
                  value={currentValue}
                  onChange={(e) => handlePreferenceChange(preference.preferenceKey, e.target.value)}
                >
                  {preference.options?.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        );

      case 'checkbox':
        // Handle single checkbox (for marketing preference)
        if (preference.options?.length === 1) {
          const option = preference.options[0];
          const isChecked = typeof currentValue === 'boolean' ? currentValue : currentValue === option.value;

          return (
            <Card key={preference.preferenceKey} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h6" gutterBottom>
                  {preference.title}
                </Typography>
                {contentText && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {contentText}
                  </Typography>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        handlePreferenceChange(preference.preferenceKey, e.target.checked);
                      }}
                    />
                  }
                  label={option.label}
                />
              </CardContent>
            </Card>
          );
        }

        // Handle multiple checkboxes (original implementation)
        return (
          <Card key={preference.preferenceKey} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h6" gutterBottom>
                {preference.title}
              </Typography>
              {contentText && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {contentText}
                </Typography>
              )}

              <FormControl component="fieldset">
                {preference.options?.map((option, index) => {
                  const isChecked = Array.isArray(currentValue) && currentValue.includes(option.value);

                  return (
                    <FormControlLabel
                      key={index}
                      control={
                        <Checkbox
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
                        />
                      }
                      label={option.label}
                    />
                  );
                })}
              </FormControl>
            </CardContent>
          </Card>
        );

      case 'combined_checkbox_textarea':
        const combinedValue = typeof currentValue === 'object' && currentValue !== null
          ? currentValue
          : { special_needs: false, details: '' };

        return (
          <Card key={preference.preferenceKey} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h6" gutterBottom>
                {preference.title}
              </Typography>
              {contentText && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {contentText}
                </Typography>
              )}

              {/* Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={combinedValue.special_needs}
                    onChange={(e) => {
                      const newValue = {
                        ...combinedValue,
                        special_needs: e.target.checked
                      };
                      handlePreferenceChange(preference.preferenceKey, newValue);
                    }}
                  />
                }
                label={preference.checkboxLabel || "If you have a special educational need or health condition that you would like us to be aware of, please click this box"}
                sx={{ mb: 3 }}
              />

              {/* Textarea - always visible but labeled as optional */}
              <Box>
                {preference.textareaLabel && (
                  <FormLabel sx={{ color: 'text.secondary', mb: 1 }}>
                    {preference.textareaLabel}
                  </FormLabel>
                )}
                <TextField
                  fullWidth
                  multiline
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
              </Box>
            </CardContent>
          </Card>
        );

      case 'text':
      case 'textarea':
        return (
          <Card key={preference.preferenceKey} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h6" gutterBottom>
                {preference.title}
              </Typography>
              {contentText && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {contentText}
                </Typography>
              )}

              <TextField
                fullWidth
                multiline={preference.inputType === 'textarea'}
                rows={preference.inputType === 'textarea' ? 4 : undefined}
                type={preference.inputType === 'text' ? 'text' : undefined}
                placeholder={preference.placeholder || `Enter your ${preference.title.toLowerCase()}`}
                value={currentValue}
                onChange={(e) => handlePreferenceChange(preference.preferenceKey, e.target.value)}
              />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading preferences...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h4" gutterBottom sx={{ mb: 4 }}>
        Preferences
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {rulesPreferences.length === 0 ? (
        <Alert severity="info">
          No preferences need to be set at this time. You can continue to payment.
        </Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Please review and update your preferences below. These settings will help us provide you with the best possible experience.
          </Typography>

          {rulesPreferences.map(preference => renderPreferenceInput(preference))}

          <Grid container sx={{ mt: 4 }}>
            <Grid size={12}>
              <Alert severity="info" variant="outlined">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    You can change these preferences at any time from your account settings.
                  </Typography>
                </Box>
              </Alert>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default PreferenceStep;