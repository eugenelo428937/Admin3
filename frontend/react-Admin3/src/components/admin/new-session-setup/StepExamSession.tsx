import React from 'react';
import {
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  Autocomplete,
  Divider,
  CircularProgress,
} from '@mui/material';
import type { ExamSession } from '../../../types/examSession/examSession.types';
import useStepExamSessionVM from './useStepExamSessionVM';
import type { StepExamSessionProps } from './useStepExamSessionVM';

const StepExamSession: React.FC<StepExamSessionProps> = ({ onSessionCreated }) => {
  const vm = useStepExamSessionVM({ onSessionCreated });

  const {
    error,
    isSubmitting,
    allSessions,
    loadingSessions,
    selectedSession,
    formData,
    handleChange,
    handleAutocompleteChange,
    handleSelectExisting,
    handleSubmit,
    formatDate,
  } = vm;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Step 1: Exam Session
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Select Existing Session
      </Typography>
      <Autocomplete<ExamSession>
        value={selectedSession}
        onChange={handleAutocompleteChange}
        options={allSessions}
        getOptionLabel={(option) => option.session_code || ''}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={loadingSessions}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box>
              <Typography variant="body1">{option.session_code}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(option.start_date)} - {formatDate(option.end_date)}
              </Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search by session code"
            placeholder="e.g., 2026-04"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingSessions ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        sx={{ mb: 2 }}
      />
      {selectedSession && (
        <Box sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Session:</strong> {selectedSession.session_code}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Start:</strong> {formatDate(selectedSession.start_date)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>End:</strong> {formatDate(selectedSession.end_date)}
          </Typography>
          <Button variant="contained" onClick={handleSelectExisting}>
            Use This Session
          </Button>
        </Box>
      )}
      <Divider sx={{ my: 3 }}>
        <Typography variant="body2" color="text.secondary">
          OR
        </Typography>
      </Divider>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create New Session
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Session Code</FormLabel>
          <TextField
            name="session_code"
            value={formData.session_code}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            fullWidth
            placeholder="e.g., 2026-09"
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Start Date</FormLabel>
          <TextField
            type="datetime-local"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>End Date</FormLabel>
          <TextField
            type="datetime-local"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </FormControl>
        <Button variant="contained" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create & Continue'}
        </Button>
      </Box>
    </Paper>
  );
};

export default StepExamSession;
