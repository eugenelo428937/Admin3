import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Checkbox, Grid, List, ListItemButton, ListItemIcon,
  ListItemText, Paper, Typography, Alert, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import httpService from '../../../services/httpService.js';
import sessionSetupService from '../../../services/sessionSetupService.js';
import config from '../../../config.js';

const CATALOG_URL = `${config.catalogUrl}`;

const StepSubjects = ({ sessionId, sessionCode, isExistingSession, onComplete }) => {
  const navigate = useNavigate();
  const [allSubjects, setAllSubjects] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [checked, setChecked] = useState([]);
  const [previousSession, setPreviousSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Warning dialog state for existing sessions
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [sessionDataCounts, setSessionDataCounts] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const available = allSubjects.filter(
    (s) => !assigned.some((a) => a.id === s.id)
  );

  const leftChecked = checked.filter((id) =>
    available.some((s) => s.id === id)
  );
  const rightChecked = checked.filter((id) =>
    assigned.some((s) => s.id === id)
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // If existing session, check for existing data first
      if (isExistingSession) {
        const counts = await sessionSetupService.getSessionDataCounts(sessionId);
        if (counts.has_data) {
          setSessionDataCounts(counts);
          setShowWarningDialog(true);
        }
      }

      const [subjectsRes, prevSession] = await Promise.all([
        httpService.get(`${CATALOG_URL}/admin-subjects/`, {
          params: { active: true },
        }),
        sessionSetupService.getPreviousSession(sessionId),
      ]);

      const subjects = Array.isArray(subjectsRes.data)
        ? subjectsRes.data
        : subjectsRes.data.results || [];
      setAllSubjects(subjects);
      setPreviousSession(prevSession);
    } catch (err) {
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [sessionId, isExistingSession]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeactivateAndProceed = async () => {
    setDeactivating(true);
    setError(null);
    try {
      await sessionSetupService.deactivateSessionData(sessionId);
      setShowWarningDialog(false);
      setSessionDataCounts(null);
    } catch (err) {
      setError('Failed to deactivate session data');
    } finally {
      setDeactivating(false);
    }
  };

  const handleCancelWarning = () => {
    setShowWarningDialog(false);
    navigate('/admin/new-session-setup');
  };

  const handleToggle = (id) => {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleAllRight = () => {
    setAssigned(allSubjects);
    setChecked([]);
  };

  const handleCheckedRight = () => {
    const toMove = available.filter((s) => leftChecked.includes(s.id));
    setAssigned((prev) => [...prev, ...toMove]);
    setChecked((prev) => prev.filter((id) => !leftChecked.includes(id)));
  };

  const handleCheckedLeft = () => {
    setAssigned((prev) => prev.filter((s) => !rightChecked.includes(s.id)));
    setChecked((prev) => prev.filter((id) => !rightChecked.includes(id)));
  };

  const handleAllLeft = () => {
    setAssigned([]);
    setChecked([]);
  };

  const handleCopyFromPrevious = async () => {
    if (!previousSession) return;
    try {
      const prevSubjects = await sessionSetupService.getSessionSubjects(
        previousSession.id
      );
      // Replace behavior (FR-008): clear right panel first
      const prevSubjectIds = prevSubjects.map((ess) => ess.subject.id);
      const copied = allSubjects.filter((s) => prevSubjectIds.includes(s.id));
      setAssigned(copied);
      setChecked([]);
    } catch (err) {
      setError('Failed to copy subjects from previous session');
    }
  };

  const handleSave = async () => {
    if (assigned.length === 0) {
      setError('At least one subject must be assigned');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create ESS records for each assigned subject
      await Promise.all(
        assigned.map((subject) =>
          httpService.post(`${CATALOG_URL}/exam-session-subjects/`, {
            exam_session: sessionId,
            subject: subject.id,
            is_active: true,
          })
        )
      );
      onComplete();
    } catch (err) {
      setError('Failed to save subject assignments');
    } finally {
      setSaving(false);
    }
  };

  const renderList = (items, title) => (
    <Paper sx={{ width: '100%', minHeight: 300, maxHeight: 400, overflow: 'auto' }}>
      <Typography variant="subtitle2" sx={{ p: 1, bgcolor: 'grey.100' }}>
        {title} ({items.length})
      </Typography>
      <Divider />
      <List dense role="list">
        {items.map((subject) => (
          <ListItemButton
            key={subject.id}
            role="listitem"
            onClick={() => handleToggle(subject.id)}
          >
            <ListItemIcon>
              <Checkbox
                checked={checked.includes(subject.id)}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={`${subject.code} - ${subject.description}`} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Step 2: Assign Subjects
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Warning dialog for existing sessions with data */}
      <Dialog open={showWarningDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Existing Data Found</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            There are related subjects and products associated with Exam Session{' '}
            <strong>{sessionCode}</strong>.
          </Alert>
          <Typography sx={{ mb: 1 }}>This session already has:</Typography>
          <Box component="ul" sx={{ mt: 0 }}>
            <li>{sessionDataCounts?.exam_session_subjects} subject assignments</li>
            <li>{sessionDataCounts?.products} products</li>
            <li>{sessionDataCounts?.bundles} bundles</li>
          </Box>
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
            Proceed if you want to clear all associated subjects and products
            for {sessionCode}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelWarning} disabled={deactivating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDeactivateAndProceed}
            disabled={deactivating}
          >
            {deactivating ? 'Clearing...' : 'Proceed'}
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={5}>
          {renderList(available, 'Available Subjects')}
        </Grid>
        <Grid item xs={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleAllRight}
              disabled={available.length === 0}
              aria-label="move all right"
            >
              &gt;&gt;
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCheckedRight}
              disabled={leftChecked.length === 0}
              aria-label="move selected right"
            >
              &gt;
            </Button>
            {previousSession && (
              <Button
                variant="contained"
                size="small"
                onClick={handleCopyFromPrevious}
                aria-label={`copy from ${previousSession.session_code}`}
              >
                Copy from {previousSession.session_code}
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleCheckedLeft}
              disabled={rightChecked.length === 0}
              aria-label="move selected left"
            >
              &lt;
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleAllLeft}
              disabled={assigned.length === 0}
              aria-label="move all left"
            >
              &lt;&lt;
            </Button>
          </Box>
        </Grid>
        <Grid item xs={5}>
          {renderList(assigned, 'Assigned Subjects')}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || assigned.length === 0}
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </Box>
    </Paper>
  );
};

export default StepSubjects;
