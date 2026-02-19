import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Grid, FormControl, FormLabel,
  FormControlLabel, Radio, RadioGroup,
} from "@mui/material";
import { Phone } from "@mui/icons-material";

const PreferencesStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  hasWorkAddress = false,
  readOnly = false,
}) => {
  const [form, setForm] = useState({
    send_invoices_to: "HOME",
    send_study_material_to: "HOME",
    ...initialData,
  });

  // Initialize from initialData only on subsequent changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => {
        const hasChanges = Object.keys(initialData).some(key => prev[key] !== initialData[key]);
        return hasChanges ? { ...prev, ...initialData } : prev;
      });
    }
  }, [initialData]);

  useEffect(() => {
    onDataChange?.(form);
  }, [form, onDataChange]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  return (
    <Box sx={{ minHeight: "400px" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Phone sx={{ fontSize: "3rem", color: "primary.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>Delivery Preferences</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose where to send your materials
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" required>
              <Typography variant="h6">Send invoices to</Typography>
            </FormLabel>
            <RadioGroup
              name="send_invoices_to"
              value={form.send_invoices_to}
              onChange={handleChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="HOME" control={<Radio />} label="Home Address" disabled={readOnly} />
              <FormControlLabel value="WORK" control={<Radio />} label="Work Address" disabled={!hasWorkAddress || readOnly} />
            </RadioGroup>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" required>
              <Typography variant="h6">Send study materials to</Typography>
            </FormLabel>
            <RadioGroup
              name="send_study_material_to"
              value={form.send_study_material_to}
              onChange={handleChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="HOME" control={<Radio />} label="Home Address" disabled={readOnly} />
              <FormControlLabel value="WORK" control={<Radio />} label="Work Address" disabled={!hasWorkAddress || readOnly} />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PreferencesStep;
