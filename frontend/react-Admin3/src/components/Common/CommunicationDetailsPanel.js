import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { Phone, Email } from '@mui/icons-material';
import PropTypes from 'prop-types';
import ValidatedPhoneInput from '../User/ValidatedPhoneInput';
import userService from '../../services/userService';
import phoneValidationService from '../../services/phoneValidationService';
import config from '../../config';

// Constants
const ERROR_MESSAGES = {
  MOBILE_REQUIRED: 'Mobile phone is required',
  EMAIL_REQUIRED: 'Email address is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PHONE_INVALID: {
    mobile: 'Please enter a valid mobile phone number',
    home: 'Please enter a valid home phone number',
    work: 'Please enter a valid work phone number'
  },
  UPDATE_FAILED: 'Failed to update communication details. Please try again.'
};

const CommunicationDetailsPanel = ({
  userProfile,
  onProfileUpdate,
  className = ''
}) => {
  // Form state
  const [formData, setFormData] = useState({
    homePhone: '',
    mobilePhone: '',
    workPhone: '',
    email: ''
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState({});

  // UI state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Countries and phone country state
  const [countryList, setCountryList] = useState([]);
  const [homePhoneCountry, setHomePhoneCountry] = useState(null);
  const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);
  const [workPhoneCountry, setWorkPhoneCountry] = useState(null);

  // Initialize form data from user profile
  useEffect(() => {
    if (userProfile) {
      // Support both old format (profile.phone_fields) and new format (contact_numbers.phone_fields)
      const getPhoneNumber = (type) => {
        // First try the new backend format (contact_numbers)
        if (userProfile.contact_numbers && userProfile.contact_numbers[type]) {
          return userProfile.contact_numbers[type];
        }
        // Fallback to old format (profile)
        if (userProfile.profile && userProfile.profile[type]) {
          return userProfile.profile[type];
        }
        return '';
      };

      setFormData({
        homePhone: getPhoneNumber('home_phone'),
        mobilePhone: getPhoneNumber('mobile_phone'),
        workPhone: getPhoneNumber('work_phone'),
        email: userProfile.email || userProfile.user?.email || ''
      });
    }
  }, [userProfile]);

  // Helper function to detect country from phone number or user profile
  const detectCountryForPhone = (phoneNumber, countries, defaultCountry, userProfileCountry = null) => {
    // First, try to detect from phone number (works if number has international format like +852...)
    if (phoneNumber && phoneNumber.trim()) {
      const detectedIsoCode = phoneValidationService.detectCountryFromPhoneNumber(phoneNumber);
      if (detectedIsoCode) {
        const detectedCountry = countries.find(c => c.iso_code === detectedIsoCode);
        if (detectedCountry) {
          return detectedCountry;
        }
      }
    }

    // Second, try to use the user's profile country (from home address)
    if (userProfileCountry) {
      const profileCountry = countries.find(c =>
        c.name === userProfileCountry ||
        c.iso_code === userProfileCountry
      );
      if (profileCountry) {
        return profileCountry;
      }
    }

    // Fall back to default (UK)
    return defaultCountry;
  };

  // Load countries from API
  useEffect(() => {
    fetch(config.apiBaseUrl + "/api/countries/")
      .then((res) => res.json())
      .then((data) => {
        let countries = Array.isArray(data) ? data : data.results || [];
        const frequentCountries = [
          "United Kingdom",
          "India",
          "South Africa",
        ];
        const frequent = frequentCountries
          .map((f) => countries.find((c) => c.name === f))
          .filter(Boolean);
        const rest = countries
          .filter((c) => !frequentCountries.includes(c.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        const all = [...frequent, ...rest];
        setCountryList(all);

        // Default to UK, but detect from phone numbers if available
        const ukCountry = countries.find(c => c.name === "United Kingdom");

        // Set default UK country initially (will be updated when formData loads)
        if (ukCountry) {
          setHomePhoneCountry(ukCountry);
          setMobilePhoneCountry(ukCountry);
          setWorkPhoneCountry(ukCountry);
        }
      })
      .catch((err) => console.error("Failed to load countries:", err));
  }, []);

  // Re-detect countries when phone numbers are populated from userProfile
  useEffect(() => {
    if (countryList.length === 0) return;

    const ukCountry = countryList.find(c => c.name === "United Kingdom");

    // Get user's country from their home address as fallback
    const userCountry = userProfile?.home_address?.country || userProfile?.work_address?.country || null;

    // Update phone countries - use phone number detection first, then user's address country, then UK
    if (formData.homePhone) {
      const detected = detectCountryForPhone(formData.homePhone, countryList, ukCountry, userCountry);
      setHomePhoneCountry(detected);
    } else if (userCountry) {
      // No phone number yet, but we have user's country - use it as default
      const detected = detectCountryForPhone(null, countryList, ukCountry, userCountry);
      setHomePhoneCountry(detected);
    }

    if (formData.mobilePhone) {
      const detected = detectCountryForPhone(formData.mobilePhone, countryList, ukCountry, userCountry);
      setMobilePhoneCountry(detected);
    } else if (userCountry) {
      // No phone number yet, but we have user's country - use it as default
      const detected = detectCountryForPhone(null, countryList, ukCountry, userCountry);
      setMobilePhoneCountry(detected);
    }

    if (formData.workPhone) {
      const detected = detectCountryForPhone(formData.workPhone, countryList, ukCountry, userCountry);
      setWorkPhoneCountry(detected);
    } else if (userCountry) {
      // No phone number yet, but we have user's country - use it as default
      const detected = detectCountryForPhone(null, countryList, ukCountry, userCountry);
      setWorkPhoneCountry(detected);
    }
  }, [formData.homePhone, formData.mobilePhone, formData.workPhone, countryList, userProfile]);

  // Validation functions
  const validators = {
    email: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    phone: (phone) => {
      if (!phone.trim()) return true; // Optional fields
      return phone.length >= 10; // Basic length check
    }
  };

  // Real-time email validation
  const handleEmailChange = (value) => {
    setFormData(prev => ({ ...prev, email: value }));

    if (value.trim()) {
      setIsValidating(prev => ({ ...prev, email: true }));
      setTimeout(() => {
        if (!validators.email(value)) {
          setErrors(prev => ({ ...prev, email: ERROR_MESSAGES.EMAIL_INVALID }));
        } else {
          setErrors(prev => ({ ...prev, email: '' }));
        }
        setIsValidating(prev => ({ ...prev, email: false }));
      }, 300);
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  // Real-time phone validation
  const handlePhoneChange = (field, value, isValid) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Update error state based on validation
    const fieldMap = {
      mobilePhone: 'mobile',
      homePhone: 'home',
      workPhone: 'work'
    };

    if (value.trim() && !isValid) {
      setErrors(prev => ({
        ...prev,
        [field]: ERROR_MESSAGES.PHONE_INVALID[fieldMap[field]]
      }));
    } else if (value.trim() === '' || isValid) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Mobile phone is required
    if (!formData.mobilePhone.trim()) {
      newErrors.mobilePhone = ERROR_MESSAGES.MOBILE_REQUIRED;
    }

    // Email is required
    if (!formData.email.trim()) {
      newErrors.email = ERROR_MESSAGES.EMAIL_REQUIRED;
    } else if (!validators.email(formData.email)) {
      newErrors.email = ERROR_MESSAGES.EMAIL_INVALID;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle update button click
  const handleUpdateClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        user: {
          email: formData.email
        },
        contact_numbers: {
          home_phone: formData.homePhone,
          mobile_phone: formData.mobilePhone,
          work_phone: formData.workPhone
        }
      };

      const result = await userService.updateUserProfile(updateData);

      if (result.status === 'success') {
        setSuccess('Communication details updated successfully');
        if (onProfileUpdate) {
          onProfileUpdate({
            contact: {
              home_phone: formData.homePhone,
              mobile_phone: formData.mobilePhone,
              work_phone: formData.workPhone,
              email_address: formData.email
            },
            orderOnly: false // This was a full profile update
          });
        }
      } else {
        setError(result.message || 'Failed to update communication details');
      }
    } catch (err) {
      console.error('Error updating communication details:', err);
      setError(ERROR_MESSAGES.UPDATE_FAILED);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  // Handle confirmation dialog close
  const handleConfirmationClose = () => {
    setShowConfirmation(false);
  };

  // Handle order-only update (don't save to profile)
  const handleOrderOnlyUpdate = () => {
    setLoading(true);

    // For now, just simulate the update without actually saving to profile
    setTimeout(() => {
      setLoading(false);
      setShowConfirmation(false);

      // Call the callback with order-only flag
      if (onProfileUpdate) {
        onProfileUpdate({
          contact: {
            home_phone: formData.homePhone,
            mobile_phone: formData.mobilePhone,
            work_phone: formData.workPhone,
            email_address: formData.email
          },
          orderOnly: true
        });
      }
    }, 1000);
  };

  // Render email section based on profile data
  const renderEmailSection = () => {
    const hasMultipleEmails = userProfile?.emails && Object.keys(userProfile.emails).length > 0;

    if (hasMultipleEmails) {
      return (
        <Box>
          {/* Primary Email - Readonly */}
          <TextField
            fullWidth
            label="Primary Email"
            type="email"
            value={formData.email}
            InputProps={{
              readOnly: true,
              startAdornment: <Email color="action" sx={{ mr: 1 }} />
            }}
            inputProps={{
              'data-testid': 'primary-email-display',
              readOnly: true
            }}
            sx={{ mb: 1 }}
          />

          {/* Additional Emails */}
          <Box sx={{ pl: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Additional emails:
            </Typography>
            {Object.entries(userProfile.emails).map(([type, email]) => (
              <Typography key={type} variant="body2" sx={{ ml: 1 }}>
                {email}
              </Typography>
            ))}
          </Box>

          {/* Email verification message */}
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Emails cannot be edited here. Please use the email verification process to update your email addresses.
          </Typography>
        </Box>
      );
    }

    // Single Email - Editable (legacy)
    return (
      <TextField
        fullWidth
        required
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={(e) => handleEmailChange(e.target.value)}
        error={!!errors.email}
        helperText={errors.email}
        placeholder="Enter email address"
        InputProps={{
          startAdornment: <Email color="action" sx={{ mr: 1 }} />,
          endAdornment: isValidating.email && <CircularProgress size={20} />
        }}
        inputProps={{
          'data-testid': 'email-input',
          'aria-invalid': !!errors.email
        }}
      />
    );
  };

  return (
    <Card className={`communication-details-panel ${className}`}>
      <CardHeader
        avatar={<Phone color="primary" />}
        title={
          <Typography variant="h6" component="h3">
            Communication Details
          </Typography>
        }
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Provide your contact information for delivery coordination and order updates.
        </Typography>

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" sx={{ '& > *': { mb: 2 } }}>
          {/* Home Phone */}
          <ValidatedPhoneInput
            name="home-phone"
            data-testid="home-phone-input"
            value={formData.homePhone}
            onChange={(e) => handlePhoneChange('homePhone', e.target.value, true)}
            onValidationChange={(result) => handlePhoneChange('homePhone', formData.homePhone, result.isValid)}
            countries={countryList}
            selectedCountry={homePhoneCountry}
            onCountryChange={setHomePhoneCountry}
            placeholder="Enter home phone number"
            label="Home Phone"
            error={!!errors.homePhone}
            isInvalid={!!errors.homePhone}
          />

          {/* Mobile Phone - Required */}
          <ValidatedPhoneInput
            name="mobile-phone"
            data-testid="mobile-phone-input"
            value={formData.mobilePhone}
            onChange={(e) => handlePhoneChange('mobilePhone', e.target.value, true)}
            onValidationChange={(result) => handlePhoneChange('mobilePhone', formData.mobilePhone, result.isValid)}
            countries={countryList}
            selectedCountry={mobilePhoneCountry}
            onCountryChange={setMobilePhoneCountry}
            placeholder="Enter mobile phone number"
            label="Mobile Phone"
            required
            error={!!errors.mobilePhone}
            isInvalid={!!errors.mobilePhone}
          />

          {/* Work Phone */}
          <ValidatedPhoneInput
            name="work-phone"
            data-testid="work-phone-input"
            value={formData.workPhone}
            onChange={(e) => handlePhoneChange('workPhone', e.target.value, true)}
            onValidationChange={(result) => handlePhoneChange('workPhone', formData.workPhone, result.isValid)}
            countries={countryList}
            selectedCountry={workPhoneCountry}
            onCountryChange={setWorkPhoneCountry}
            placeholder="Enter work phone number"
            label="Work Phone"
            error={!!errors.workPhone}
            isInvalid={!!errors.workPhone}
          />

          {/* Email Address Section */}
          {renderEmailSection()}
        </Box>

        {/* Update Button */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateClick}
            disabled={loading}
            size="large"
          >
            {loading ? 'Updating...' : 'Update Communication Details'}
          </Button>
        </Box>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmation}
        onClose={handleConfirmationClose}
        aria-labelledby="update-dialog-title"
        aria-describedby="update-dialog-description"
      >
        <DialogTitle id="update-dialog-title">
          Update Communication Details?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="update-dialog-description">
            This will update your profile with the new communication details.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={handleConfirmationClose} color="secondary">
            Cancel
          </Button>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              onClick={() => handleOrderOnlyUpdate()}
              color="info"
              variant="outlined"
              disabled={loading}
            >
              For this order only
            </Button>
            <Button
              onClick={handleProfileUpdate}
              color="primary"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Update Profile'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

CommunicationDetailsPanel.propTypes = {
  userProfile: PropTypes.shape({
    profile: PropTypes.shape({
      home_phone: PropTypes.string,
      mobile_phone: PropTypes.string,
      work_phone: PropTypes.string
    }),
    email: PropTypes.string
  }),
  onProfileUpdate: PropTypes.func,
  className: PropTypes.string
};

export default CommunicationDetailsPanel;