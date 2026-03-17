import React from 'react';
import {
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Snackbar,
} from '@mui/material';
import { Person, Home, Business, Phone } from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useUserProfileFormVM from './useUserProfileFormVM';
import { PersonalInfoStep, HomeAddressStep, WorkAddressStep, PreferencesStep } from '../../User/steps';

const ADMIN_STEPS = [
  { title: 'Personal', icon: Person },
  { title: 'Home', icon: Home },
  { title: 'Work', icon: Business },
  { title: 'Preferences', icon: Phone },
];

const AdminUserProfileForm: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useUserProfileFormVM();

  const {
    activeStep,
    setActiveStep,
    loading,
    error,
    isSubmitting,
    hasWorkAddress,
    snackbar,
    personalData,
    homeAddressData,
    workAddressData,
    preferencesData,
    emptyErrors,
    handlePersonalChange,
    handleHomeAddressChange,
    handleWorkAddressChange,
    handlePreferencesChange,
    handleSave,
    handleCancel,
    handleSnackbarClose,
  } = vm;

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
      <Typography variant="h4" component="h2" sx={{ mb: 3 }}>Edit User Profile</Typography>
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
              <Button onClick={() => setActiveStep(activeStep - 1)} disabled={isSubmitting}>
                Back
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {activeStep < ADMIN_STEPS.length - 1 && (
              <Button
                variant="contained"
                onClick={() => setActiveStep(activeStep + 1)}
                disabled={isSubmitting}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminUserProfileForm;
