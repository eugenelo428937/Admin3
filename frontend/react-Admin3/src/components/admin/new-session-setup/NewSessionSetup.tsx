import React from 'react';
import { Container, Stepper, Step, StepLabel, Typography, Box, Paper } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useNewSessionSetupVM from './useNewSessionSetupVM';
import StepExamSession from './StepExamSession.tsx';
import StepSubjects from './StepSubjects.tsx';
import StepMaterials from './StepMaterials.tsx';
import StepTutorials from './StepTutorials.tsx';

const STEPS = ['Exam Session', 'Subjects', 'Materials & Marking', 'Tutorials'];

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
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        New Session Setup
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
      <Box>
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
      </Box>
    </Container>
  );
};

export default NewSessionSetup;
