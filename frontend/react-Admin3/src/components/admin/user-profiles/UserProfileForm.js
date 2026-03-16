import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Stepper, Step, StepLabel, Button, Alert,
  Box, Typography, CircularProgress, Paper, Snackbar,
} from '@mui/material';
import { Person, Home, Business, Phone } from '@mui/icons-material';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import userProfileService from '../../../services/userProfileService.ts';
import { PersonalInfoStep, HomeAddressStep, WorkAddressStep, PreferencesStep } from '../../User/steps';

const ADMIN_STEPS = [
  { title: 'Personal', icon: Person },
  { title: 'Home', icon: Home },
  { title: 'Work', icon: Business },
  { title: 'Preferences', icon: Phone },
];

const AdminUserProfileForm = () => {
  const { isSuperuser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [stepData, setStepData] = useState({});
  const [hasWorkAddress, setHasWorkAddress] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profile, addresses, contacts] = await Promise.all([
        userProfileService.getById(id),
        userProfileService.getAddresses(id),
        userProfileService.getContacts(id),
      ]);
      setProfileData({ ...profile, addresses, contacts });
    } catch (err) {
      setError('Failed to fetch user profile details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleStepDataChange = useCallback((stepKey, data) => {
    setStepData(prev => ({ ...prev, [stepKey]: data }));
    if (stepKey === 'workAddress' && data.showWorkSection !== undefined) {
      setHasWorkAddress(data.showWorkSection);
    }
  }, []);

  // Transform profile data into step-compatible slices (memoized to prevent infinite render loops)
  // All hooks MUST be before any conditional returns to satisfy React's rules of hooks
  const personalData = useMemo(() => profileData ? {
    title: profileData.title || '',
    first_name: profileData.user?.first_name || '',
    last_name: profileData.user?.last_name || '',
    email: profileData.user?.email || '',
    home_phone: '',
    mobile_phone: '',
  } : {}, [profileData]);

  const homeAddressData = useMemo(() => {
    const homeAddress = profileData?.addresses?.find(a => a.address_type === 'HOME') || {};
    return {
      home_building: homeAddress.building || '',
      home_address: homeAddress.address_line_1 || '',
      home_district: homeAddress.district || '',
      home_city: homeAddress.city || '',
      home_county: homeAddress.county || '',
      home_postal_code: homeAddress.postcode || '',
      home_state: homeAddress.state || '',
      home_country: homeAddress.country || '',
    };
  }, [profileData]);

  const workAddressData = useMemo(() => {
    const workAddress = profileData?.addresses?.find(a => a.address_type === 'WORK') || {};
    return {
      showWorkSection: !!workAddress.id,
      work_company: workAddress.company || '',
      work_department: workAddress.department || '',
      work_building: workAddress.building || '',
      work_address: workAddress.address_line_1 || '',
      work_district: workAddress.district || '',
      work_city: workAddress.city || '',
      work_county: workAddress.county || '',
      work_postal_code: workAddress.postcode || '',
      work_state: workAddress.state || '',
      work_country: workAddress.country || '',
      work_phone: '',
      work_email: '',
    };
  }, [profileData]);

  const preferencesData = useMemo(() => ({
    send_invoices_to: profileData?.send_invoices_to || 'HOME',
    send_study_material_to: profileData?.send_study_material_to || 'HOME',
  }), [profileData]);

  // Stable callbacks for step data changes
  const handlePersonalChange = useCallback((data) => handleStepDataChange('personal', data), [handleStepDataChange]);
  const handleHomeAddressChange = useCallback((data) => handleStepDataChange('homeAddress', data), [handleStepDataChange]);
  const handleWorkAddressChange = useCallback((data) => handleStepDataChange('workAddress', data), [handleStepDataChange]);
  const handlePreferencesChange = useCallback((data) => handleStepDataChange('preferences', data), [handleStepDataChange]);

  const emptyErrors = useMemo(() => ({}), []);

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {};
      Object.values(stepData).forEach(data => {
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith('_') && key !== 'showWorkSection') {
            payload[key] = value;
          }
        });
      });
      await userProfileService.update(id, payload);
      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <PersonalInfoStep
            initialData={personalData}
            onDataChange={handlePersonalChange}
            errors={emptyErrors}
            mode="admin"
          />
        );
      case 1:
        return (
          <HomeAddressStep
            initialData={homeAddressData}
            onDataChange={handleHomeAddressChange}
            errors={emptyErrors}
            mode="admin"
          />
        );
      case 2:
        return (
          <WorkAddressStep
            initialData={workAddressData}
            onDataChange={handleWorkAddressChange}
            errors={emptyErrors}
            mode="admin"
          />
        );
      case 3:
        return (
          <PreferencesStep
            initialData={preferencesData}
            onDataChange={handlePreferencesChange}
            errors={emptyErrors}
            mode="admin"
            hasWorkAddress={hasWorkAddress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 3 }}>
        Edit User Profile
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {ADMIN_STEPS.map((step, index) => (
            <Step
              key={step.title}
              completed={activeStep > index}
              sx={{ cursor: 'pointer' }}
              onClick={() => setActiveStep(index)}
            >
              <StepLabel icon={<step.icon />}>{step.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box>
            {activeStep > 0 && (
              <Button onClick={() => setActiveStep(prev => prev - 1)} disabled={isSubmitting}>
                Back
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/user-profiles')} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {activeStep < ADMIN_STEPS.length - 1 && (
              <Button variant="contained" onClick={() => setActiveStep(prev => prev + 1)} disabled={isSubmitting}>
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminUserProfileForm;
