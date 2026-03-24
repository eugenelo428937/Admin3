import React from 'react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/components/admin/styles/cn';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useNewSessionSetupVM from './useNewSessionSetupVM';
import StepExamSession from './StepExamSession.tsx';
import StepSubjects from './StepSubjects.tsx';
import StepMaterials from './StepMaterials.tsx';
import StepTutorials from './StepTutorials.tsx';

const STEPS = [
  { label: 'Exam Session' },
  { label: 'Subjects' },
  { label: 'Materials & Marking' },
  { label: 'Tutorials' },
];

const NewSessionSetup: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useNewSessionSetupVM();

  const {
    activeStep,
    sessionId,
    sessionCode,
    isExistingSession,
    handleStepComplete,
    handleSessionCreated,
    handleWizardComplete,
  } = vm;

  if (!isSuperuser) return <Navigate to="/" replace />;

  return (
    <div className="tw:mx-auto tw:max-w-5xl tw:px-4 tw:py-8">
      <h1 className="tw:mb-6 tw:text-2xl tw:font-bold tw:text-admin-fg">
        New Session Setup
      </h1>

      {/* Step indicator */}
      <div className="tw:mb-6 tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-card tw:p-4">
        <div className="tw:flex tw:items-center tw:gap-2">
          {STEPS.map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="tw:h-px tw:flex-1 tw:bg-admin-border" />}
              <div
                className={cn(
                  'tw:flex tw:items-center tw:gap-2 tw:rounded-admin tw:px-3 tw:py-1.5 tw:text-sm',
                  activeStep === i
                    ? 'tw:bg-admin-primary tw:text-admin-primary-fg'
                    : activeStep > i
                      ? 'tw:text-admin-fg'
                      : 'tw:text-admin-fg-muted',
                )}
              >
                <span
                  className={cn(
                    'tw:flex tw:h-6 tw:w-6 tw:items-center tw:justify-center tw:rounded-full tw:border tw:text-xs',
                    activeStep > i &&
                      'tw:bg-admin-success tw:text-admin-success-fg tw:border-admin-success',
                  )}
                >
                  {activeStep > i ? '\u2713' : i + 1}
                </span>
                {step.label}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div>
        {activeStep === 0 && <StepExamSession onSessionCreated={handleSessionCreated} />}
        {activeStep === 1 && (
          <StepSubjects
            sessionId={sessionId}
            sessionCode={sessionCode}
            isExistingSession={isExistingSession}
            onComplete={() => handleStepComplete(1)}
          />
        )}
        {activeStep === 2 && (
          <StepMaterials
            sessionId={sessionId}
            sessionCode={sessionCode}
            onComplete={() => handleStepComplete(2)}
          />
        )}
        {activeStep === 3 && <StepTutorials onComplete={handleWizardComplete} />}
      </div>
    </div>
  );
};

export default NewSessionSetup;
