import React, { useState, useEffect } from 'react';
import {
  Container, Stepper, Step, StepLabel, Typography, Box, Paper
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import StepExamSession from './StepExamSession.js';
import StepSubjects from './StepSubjects.js';
import StepMaterials from './StepMaterials.js';
import StepTutorials from './StepTutorials.js';

const STEPS = ['Exam Session', 'Subjects', 'Materials & Marking', 'Tutorials'];

const NewSessionSetup = () => {
  const { isSuperuser } = useAuth();
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();

  const [activeStep, setActiveStep] = useState(0);
  const [sessionId, setSessionId] = useState(
    urlSessionId ? Number(urlSessionId) : null
  );
  const [sessionCode, setSessionCode] = useState('');
  const [isExistingSession, setIsExistingSession] = useState(false);

  // If URL has sessionId and we just navigated here, resume at Step 2+
  useEffect(() => {
    if (urlSessionId && !sessionId) {
      setSessionId(Number(urlSessionId));
      setActiveStep(1);
    }
  }, [urlSessionId, sessionId]);

  const handleStepComplete = (step) => {
    if (step < STEPS.length - 1) {
      setActiveStep(step + 1);
    }
  };

  const handleSessionCreated = (session, { isExisting = false } = {}) => {
    setSessionId(session.id);
    setSessionCode(session.session_code);
    setIsExistingSession(isExisting);
    navigate(`/admin/new-session-setup/${session.id}`, { replace: true });
    handleStepComplete(0);
  };

  const handleWizardComplete = () => {
    navigate('/admin/exam-sessions');
  };

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
        {activeStep === 0 && (
          <StepExamSession onSessionCreated={handleSessionCreated} />
        )}
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
        {activeStep === 3 && (
          <StepTutorials onComplete={handleWizardComplete} />
        )}
      </Box>
    </Container>
  );
};

export default NewSessionSetup;
