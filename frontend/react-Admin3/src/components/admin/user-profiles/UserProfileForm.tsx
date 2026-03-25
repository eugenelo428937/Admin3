import React from 'react';
import { Navigate } from 'react-router-dom';
import { User, Home, Briefcase, Settings } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminErrorAlert,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { cn } from '@/components/admin/styles/cn';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useUserProfileFormVM from './useUserProfileFormVM';
import { PersonalInfoStep, HomeAddressStep, WorkAddressStep, PreferencesStep } from '../../User/steps';

const ADMIN_STEPS = [
  { label: 'Personal', icon: User },
  { label: 'Home', icon: Home },
  { label: 'Work', icon: Briefcase },
  { label: 'Preferences', icon: Settings },
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

  if (loading) {
    return (
      <AdminPage>
        <div className="tw:flex tw:items-center tw:justify-center tw:py-16">
          <div
            role="progressbar"
            className="tw:h-8 tw:w-8 tw:animate-spin tw:rounded-full tw:border-4 tw:border-admin-border tw:border-t-admin-primary"
          />
        </div>
      </AdminPage>
    );
  }

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
    <AdminPage>
      <AdminPageHeader title="Edit User Profile" />
      <AdminErrorAlert message={error} />

      {/* Snackbar / toast notification */}
      {snackbar.open && (
        <div
          role="status"
          className={cn(
            'tw:mb-4 tw:rounded-md tw:border tw:p-4 tw:text-sm',
            snackbar.severity === 'success' && 'tw:border-green-200 tw:bg-green-50 tw:text-green-800',
            snackbar.severity === 'error' && 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
            snackbar.severity === 'warning' && 'tw:border-yellow-200 tw:bg-yellow-50 tw:text-yellow-800',
            snackbar.severity === 'info' && 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-800',
          )}
        >
          <div className="tw:flex tw:items-center tw:justify-between">
            <span>{snackbar.message}</span>
            <button
              type="button"
              onClick={handleSnackbarClose}
              className="tw:ml-4 tw:text-current tw:opacity-60 hover:tw:opacity-100"
              aria-label="close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-surface tw:p-6">
        {/* Step indicator */}
        <div className="tw:mb-6 tw:flex tw:items-center tw:gap-2">
          {ADMIN_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className="tw:h-px tw:flex-1 tw:bg-admin-border" />
                )}
                <button
                  type="button"
                  onClick={() => setActiveStep(i)}
                  className={cn(
                    'tw:flex tw:items-center tw:gap-2 tw:rounded-md tw:px-3 tw:py-1.5 tw:text-sm tw:transition-colors',
                    activeStep === i
                      ? 'tw:bg-admin-primary tw:text-admin-primary-fg'
                      : 'tw:text-admin-fg-muted hover:tw:text-admin-fg',
                  )}
                >
                  <span className="tw:flex tw:h-6 tw:w-6 tw:items-center tw:justify-center tw:rounded-full tw:border tw:text-xs">
                    {i + 1}
                  </span>
                  {step.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        {renderStepContent()}

        {/* Navigation buttons */}
        <div className="tw:mt-6 tw:flex tw:items-center tw:justify-between tw:border-t tw:border-admin-border tw:pt-4">
          <div>
            {activeStep > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveStep(activeStep - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
          </div>
          <div className="tw:flex tw:items-center tw:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {activeStep < ADMIN_STEPS.length - 1 && (
              <Button
                type="button"
                onClick={() => setActiveStep(activeStep + 1)}
                disabled={isSubmitting}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminUserProfileForm;
