import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import useStepSubjectsVM, { Subject } from './useStepSubjectsVM';

interface StepSubjectsProps {
  sessionId: number | null;
  sessionCode: string;
  isExistingSession: boolean;
  onComplete: () => void;
}

const renderList = (
  items: Subject[],
  title: string,
  checked: number[],
  handleToggle: (id: number) => void
) => (
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

const StepSubjects: React.FC<StepSubjectsProps> = ({
  sessionId,
  sessionCode,
  isExistingSession,
  onComplete,
}) => {
  const vm = useStepSubjectsVM({ sessionId, sessionCode, isExistingSession, onComplete });

  if (vm.loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Step 2: Assign Subjects
      </Typography>

      {vm.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {vm.error}
        </Alert>
      )}

      {/* Warning dialog for existing sessions with data */}
      <Dialog open={vm.showWarningDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Existing Data Found</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            There are related subjects and products associated with Exam Session{' '}
            <strong>{sessionCode}</strong>.
          </Alert>
          <Typography sx={{ mb: 1 }}>This session already has:</Typography>
          <Box component="ul" sx={{ mt: 0 }}>
            <li>{vm.sessionDataCounts?.exam_session_subjects} subject assignments</li>
            <li>{vm.sessionDataCounts?.products} products</li>
            <li>{vm.sessionDataCounts?.bundles} bundles</li>
          </Box>
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
            Proceed if you want to clear all associated subjects and products for{' '}
            {sessionCode}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={vm.handleCancelWarning} disabled={vm.deactivating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={vm.handleDeactivateAndProceed}
            disabled={vm.deactivating}
          >
            {vm.deactivating ? 'Clearing...' : 'Proceed'}
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={5}>
          {renderList(vm.available, 'Available Subjects', vm.checked, vm.handleToggle)}
        </Grid>
        <Grid item xs={2}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={vm.handleAllRight}
              disabled={vm.available.length === 0}
              aria-label="move all right"
            >
              &gt;&gt;
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={vm.handleCheckedRight}
              disabled={vm.leftChecked.length === 0}
              aria-label="move selected right"
            >
              &gt;
            </Button>
            {vm.previousSession && (
              <Button
                variant="contained"
                size="small"
                onClick={vm.handleCopyFromPrevious}
                aria-label={`copy from ${vm.previousSession.session_code}`}
              >
                Copy from {vm.previousSession.session_code}
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={vm.handleCheckedLeft}
              disabled={vm.rightChecked.length === 0}
              aria-label="move selected left"
            >
              &lt;
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={vm.handleAllLeft}
              disabled={vm.assigned.length === 0}
              aria-label="move all left"
            >
              &lt;&lt;
            </Button>
          </Box>
        </Grid>
        <Grid item xs={5}>
          {renderList(vm.assigned, 'Assigned Subjects', vm.checked, vm.handleToggle)}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={vm.handleSave}
          disabled={vm.saving || vm.assigned.length === 0}
        >
          {vm.saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </Box>
    </Paper>
  );
};

export default StepSubjects;
