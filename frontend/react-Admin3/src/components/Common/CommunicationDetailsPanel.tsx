import React, { useState, useEffect } from 'react';
import {
    Card, CardHeader, CardContent, Typography, TextField, Button, Box, Alert,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress,
} from '@mui/material';
import { Phone, Email } from '@mui/icons-material';
import ValidatedPhoneInput from '../User/ValidatedPhoneInput.tsx';
import userService from '../../services/userService.ts';
import config from '../../config.js';

const ERROR_MESSAGES = {
    MOBILE_REQUIRED: 'Mobile phone is required',
    EMAIL_REQUIRED: 'Email address is required',
    EMAIL_INVALID: 'Please enter a valid email address',
    PHONE_INVALID: {
        mobile: 'Please enter a valid mobile phone number',
        home: 'Please enter a valid home phone number',
        work: 'Please enter a valid work phone number',
    },
    UPDATE_FAILED: 'Failed to update communication details. Please try again.',
};

interface Country {
    name: string;
    iso_code: string;
}

interface UserProfile {
    profile?: { home_phone?: string; mobile_phone?: string; work_phone?: string };
    contact_numbers?: {
        home_phone?: string;
        mobile_phone?: string;
        work_phone?: string;
        home_phone_country?: string;
        mobile_phone_country?: string;
        work_phone_country?: string;
    };
    email?: string;
    user?: { email?: string };
    emails?: Record<string, string>;
}

interface ContactUpdate {
    contact: {
        home_phone: string;
        home_phone_country: string;
        mobile_phone: string;
        mobile_phone_country: string;
        work_phone: string;
        work_phone_country: string;
        email_address: string;
    };
    orderOnly: boolean;
}

interface CommunicationDetailsPanelProps {
    userProfile?: UserProfile;
    onProfileUpdate?: (update: ContactUpdate) => void;
    className?: string;
}

const CommunicationDetailsPanel: React.FC<CommunicationDetailsPanelProps> = ({
    userProfile,
    onProfileUpdate,
    className = '',
}) => {
    const [formData, setFormData] = useState({ homePhone: '', mobilePhone: '', workPhone: '', email: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isValidating, setIsValidating] = useState<Record<string, boolean>>({});
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [countryList, setCountryList] = useState<Country[]>([]);
    const [homePhoneCountry, setHomePhoneCountry] = useState<Country | null>(null);
    const [mobilePhoneCountry, setMobilePhoneCountry] = useState<Country | null>(null);
    const [workPhoneCountry, setWorkPhoneCountry] = useState<Country | null>(null);

    useEffect(() => {
        if (userProfile) {
            const getPhoneNumber = (type: string) => {
                if (userProfile.contact_numbers && (userProfile.contact_numbers as any)[type]) {
                    return (userProfile.contact_numbers as any)[type];
                }
                if (userProfile.profile && (userProfile.profile as any)[type]) {
                    return (userProfile.profile as any)[type];
                }
                return '';
            };
            setFormData({
                homePhone: getPhoneNumber('home_phone'),
                mobilePhone: getPhoneNumber('mobile_phone'),
                workPhone: getPhoneNumber('work_phone'),
                email: userProfile.email || userProfile.user?.email || '',
            });
        }
    }, [userProfile]);

    useEffect(() => {
        fetch(config.apiBaseUrl + '/api/countries/')
            .then((res) => res.json())
            .then((data) => {
                let countries: Country[] = Array.isArray(data) ? data : data.results || [];
                const frequentCountries = ['United Kingdom', 'India', 'South Africa'];
                const frequent = frequentCountries.map((f) => countries.find((c) => c.name === f)).filter(Boolean) as Country[];
                const rest = countries.filter((c) => !frequentCountries.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name));
                const all = [...frequent, ...rest];
                setCountryList(all);
                const ukCountry = countries.find((c) => c.name === 'United Kingdom');
                if (ukCountry) {
                    setHomePhoneCountry(ukCountry);
                    setMobilePhoneCountry(ukCountry);
                    setWorkPhoneCountry(ukCountry);
                }
            })
            .catch((err) => console.error('Failed to load countries:', err));
    }, []);

    useEffect(() => {
        if (countryList.length === 0 || !userProfile) return;
        const ukCountry = countryList.find((c) => c.name === 'United Kingdom');
        const findCountryByCode = (isoCode?: string) => {
            if (isoCode) {
                const country = countryList.find((c) => c.iso_code === isoCode);
                if (country) return country;
            }
            return ukCountry || null;
        };
        setHomePhoneCountry(findCountryByCode(userProfile.contact_numbers?.home_phone_country));
        setMobilePhoneCountry(findCountryByCode(userProfile.contact_numbers?.mobile_phone_country));
        setWorkPhoneCountry(findCountryByCode(userProfile.contact_numbers?.work_phone_country));
    }, [countryList, userProfile]);

    const validators = {
        email: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        phone: (phone: string) => !phone.trim() || phone.length >= 10,
    };

    const handleEmailChange = (value: string) => {
        setFormData((prev) => ({ ...prev, email: value }));
        if (value.trim()) {
            setIsValidating((prev) => ({ ...prev, email: true }));
            setTimeout(() => {
                if (!validators.email(value)) {
                    setErrors((prev) => ({ ...prev, email: ERROR_MESSAGES.EMAIL_INVALID }));
                } else {
                    setErrors((prev) => ({ ...prev, email: '' }));
                }
                setIsValidating((prev) => ({ ...prev, email: false }));
            }, 300);
        } else {
            setErrors((prev) => ({ ...prev, email: '' }));
        }
    };

    const handlePhoneChange = (field: string, value: string, isValid: boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        const fieldMap: Record<string, keyof typeof ERROR_MESSAGES.PHONE_INVALID> = {
            mobilePhone: 'mobile',
            homePhone: 'home',
            workPhone: 'work',
        };
        if (value.trim() && !isValid) {
            setErrors((prev) => ({ ...prev, [field]: ERROR_MESSAGES.PHONE_INVALID[fieldMap[field]] }));
        } else if (!value.trim() || isValid) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.mobilePhone.trim()) newErrors.mobilePhone = ERROR_MESSAGES.MOBILE_REQUIRED;
        if (!formData.email.trim()) newErrors.email = ERROR_MESSAGES.EMAIL_REQUIRED;
        else if (!validators.email(formData.email)) newErrors.email = ERROR_MESSAGES.EMAIL_INVALID;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdateClick = () => {
        if (validateForm()) setShowConfirmation(true);
    };

    const buildContactPayload = () => ({
        home_phone: formData.homePhone,
        home_phone_country: homePhoneCountry?.iso_code || '',
        mobile_phone: formData.mobilePhone,
        mobile_phone_country: mobilePhoneCountry?.iso_code || '',
        work_phone: formData.workPhone,
        work_phone_country: workPhoneCountry?.iso_code || '',
        email_address: formData.email,
    });

    const handleProfileUpdate = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const updateData = {
                user: { email: formData.email },
                contact_numbers: {
                    home_phone: formData.homePhone,
                    home_phone_country: homePhoneCountry?.iso_code || '',
                    mobile_phone: formData.mobilePhone,
                    mobile_phone_country: mobilePhoneCountry?.iso_code || '',
                    work_phone: formData.workPhone,
                    work_phone_country: workPhoneCountry?.iso_code || '',
                },
            };
            const result = await userService.updateUserProfile(updateData);
            if (result.status === 'success') {
                setSuccess('Communication details updated successfully');
                if (onProfileUpdate) onProfileUpdate({ contact: buildContactPayload(), orderOnly: false });
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

    const handleOrderOnlyUpdate = () => {
        setShowConfirmation(false);
        if (onProfileUpdate) onProfileUpdate({ contact: buildContactPayload(), orderOnly: true });
    };

    const renderEmailSection = () => {
        const hasMultipleEmails = userProfile?.emails && Object.keys(userProfile.emails).length > 0;
        if (hasMultipleEmails) {
            return (
                <Box>
                    <TextField
                        fullWidth
                        label="Primary Email"
                        type="email"
                        value={formData.email}
                        InputProps={{ readOnly: true, startAdornment: <Email color="action" sx={{ mr: 1 }} /> }}
                        inputProps={{ 'data-testid': 'primary-email-display', readOnly: true }}
                        sx={{ mb: 1 }}
                    />
                    <Box sx={{ pl: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Additional emails:</Typography>
                        {Object.entries(userProfile!.emails!).map(([type, email]) => (
                            <Typography key={type} variant="body2" sx={{ ml: 1 }}>{email}</Typography>
                        ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Emails cannot be edited here. Please use the email verification process to update your email addresses.
                    </Typography>
                </Box>
            );
        }
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
                    endAdornment: isValidating.email && <CircularProgress size={20} />,
                }}
                inputProps={{ 'data-testid': 'email-input', 'aria-invalid': !!errors.email }}
            />
        );
    };

    return (
        <Card className={`communication-details-panel ${className}`}>
            <CardHeader
                avatar={<Phone color="primary" />}
                title={<Typography variant="h6" component="h3">Communication Details</Typography>}
            />
            <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Provide your contact information for delivery coordination and order updates.
                </Typography>

                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" sx={{ '& > *': { mb: 2 } }}>
                    <ValidatedPhoneInput
                        name="home-phone"
                        data-testid="home-phone-input"
                        value={formData.homePhone}
                        onChange={(e: any) => handlePhoneChange('homePhone', e.target.value, true)}
                        onValidationChange={(result: any) => handlePhoneChange('homePhone', formData.homePhone, result.isValid)}
                        countries={countryList}
                        selectedCountry={homePhoneCountry}
                        onCountryChange={setHomePhoneCountry}
                        placeholder="Enter home phone number"
                        label="Home Phone"
                        error={!!errors.homePhone}
                        isInvalid={!!errors.homePhone}
                    />
                    <ValidatedPhoneInput
                        name="mobile-phone"
                        data-testid="mobile-phone-input"
                        value={formData.mobilePhone}
                        onChange={(e: any) => handlePhoneChange('mobilePhone', e.target.value, true)}
                        onValidationChange={(result: any) => handlePhoneChange('mobilePhone', formData.mobilePhone, result.isValid)}
                        countries={countryList}
                        selectedCountry={mobilePhoneCountry}
                        onCountryChange={setMobilePhoneCountry}
                        placeholder="Enter mobile phone number"
                        label="Mobile Phone"
                        required
                        error={!!errors.mobilePhone}
                        isInvalid={!!errors.mobilePhone}
                    />
                    <ValidatedPhoneInput
                        name="work-phone"
                        data-testid="work-phone-input"
                        value={formData.workPhone}
                        onChange={(e: any) => handlePhoneChange('workPhone', e.target.value, true)}
                        onValidationChange={(result: any) => handlePhoneChange('workPhone', formData.workPhone, result.isValid)}
                        countries={countryList}
                        selectedCountry={workPhoneCountry}
                        onCountryChange={setWorkPhoneCountry}
                        placeholder="Enter work phone number"
                        label="Work Phone"
                        error={!!errors.workPhone}
                        isInvalid={!!errors.workPhone}
                    />
                    {renderEmailSection()}
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button variant="contained" color="primary" onClick={handleUpdateClick} disabled={loading} size="large">
                        {loading ? 'Updating...' : 'Update Communication Details'}
                    </Button>
                </Box>
            </CardContent>

            <Dialog open={showConfirmation} onClose={() => setShowConfirmation(false)} aria-labelledby="update-dialog-title">
                <DialogTitle id="update-dialog-title">Update Communication Details?</DialogTitle>
                <DialogContent>
                    <DialogContentText>This will update your profile with the new communication details.</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Button onClick={() => setShowConfirmation(false)} color="secondary">Cancel</Button>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button onClick={handleOrderOnlyUpdate} color="info" variant="outlined" disabled={loading}>
                            For this order only
                        </Button>
                        <Button onClick={handleProfileUpdate} color="primary" variant="contained" disabled={loading}>
                            {loading ? <CircularProgress size={20} /> : 'Update Profile'}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default CommunicationDetailsPanel;
