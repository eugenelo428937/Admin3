import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, Check as CheckIcon, Edit as EditIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

const AddressComparisonModal = ({
  open = false,
  userAddress = {},
  suggestedAddress = {},
  onAcceptSuggested,
  onKeepOriginal,
  onClose,
  loading = false
}) => {
  // Helper to format address for display
  const formatAddressLines = (address) => {
    if (!address) return [];

    const lines = [];
    if (address.building) lines.push(address.building);
    if (address.address) lines.push(address.address);
    if (address.district) lines.push(address.district);
    if (address.city) lines.push(address.city);
    if (address.county) lines.push(address.county);
    if (address.state) lines.push(address.state);
    if (address.postal_code) lines.push(address.postal_code);
    if (address.country) lines.push(address.country);

    return lines.filter(Boolean);
  };

  // Check if a field differs between addresses
  const fieldDiffers = (field) => {
    const userValue = (userAddress[field] || '').toLowerCase().trim();
    const suggestedValue = (suggestedAddress[field] || '').toLowerCase().trim();
    return userValue !== suggestedValue && (userValue || suggestedValue);
  };

  const userLines = formatAddressLines(userAddress);
  const suggestedLines = formatAddressLines(suggestedAddress);

  const handleAccept = () => {
    if (onAcceptSuggested) {
      onAcceptSuggested(suggestedAddress);
    }
  };

  const handleKeepOriginal = () => {
    if (onKeepOriginal) {
      onKeepOriginal(userAddress);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="address-comparison-modal-title"
    >
      <DialogTitle id="address-comparison-modal-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Address Verification
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We found a matching address in our database. Would you like to use the suggested address or keep your original entry?
        </Typography>

        <Grid container spacing={3}>
          {/* User's Address */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                height: '100%',
                border: '2px solid',
                borderColor: 'grey.300'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                <EditIcon sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                Your Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {userLines.map((line, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {line}
                </Typography>
              ))}
            </Paper>
          </Grid>

          {/* Suggested Address */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                height: '100%',
                border: '2px solid',
                borderColor: 'success.main',
                bgcolor: 'success.50'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.dark">
                <CheckIcon sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                Suggested Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {suggestedLines.map((line, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {line}
                </Typography>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleKeepOriginal}
          disabled={loading}
          startIcon={<EditIcon />}
        >
          Keep My Address
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleAccept}
          disabled={loading}
          startIcon={<CheckIcon />}
        >
          Accept Suggested
        </Button>
      </DialogActions>
    </Dialog>
  );
};

AddressComparisonModal.propTypes = {
  open: PropTypes.bool.isRequired,
  userAddress: PropTypes.object,
  suggestedAddress: PropTypes.object,
  onAcceptSuggested: PropTypes.func.isRequired,
  onKeepOriginal: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default AddressComparisonModal;
