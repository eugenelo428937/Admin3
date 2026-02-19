import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, TextField, Grid, Button,
} from "@mui/material";
import { Lock } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const SecurityStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const isProfileMode = mode === "profile";
  const isAdminMode = mode === "admin";

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
    ...initialData,
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Refs for direct callback pattern (avoids effect cascade)
  const formRef = useRef(form);
  const onDataChangeRef = useRef(onDataChange);
  const isChangingPasswordRef = useRef(false);
  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);

  const notifyParent = useCallback((nextForm, extras = {}) => {
    onDataChangeRef.current?.({
      ...nextForm,
      _isChangingPassword: extras.isChangingPassword !== undefined
        ? extras.isChangingPassword
        : isChangingPasswordRef.current,
    });
  }, []);

  // Initialize from initialData only on subsequent changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (initialData && Object.keys(initialData).length > 0) {
      let changed = false;
      setForm(prev => {
        const hasChanges = Object.keys(initialData).some(key => prev[key] !== initialData[key]);
        if (!hasChanges) return prev;
        const next = { ...prev, ...initialData };
        formRef.current = next;
        changed = true;
        return next;
      });
      if (changed) notifyParent(formRef.current);
    }
  }, [initialData, notifyParent]);

  // Initial report to parent on mount (once only)
  const hasSentInitial = useRef(false);
  useEffect(() => {
    if (!hasSentInitial.current) {
      hasSentInitial.current = true;
      notifyParent(form);
    }
  }, [form, notifyParent]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      formRef.current = next;
      return next;
    });
    notifyParent(formRef.current);
  }, [notifyParent]);

  if (isAdminMode) {
    return (
      <Box sx={{ minHeight: "400px" }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Lock sx={{ fontSize: "3rem", color: "primary.main", mb: 2 }} />
          <Typography variant="h4" gutterBottom>Account Security</Typography>
          <Typography variant="body1" color="text.secondary">
            Password management is not available in admin mode.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "400px" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Lock sx={{ fontSize: "3rem", color: "primary.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>Account Security</Typography>
        <Typography variant="body2" color="text.secondary">
          {isProfileMode
            ? isChangingPassword
              ? "Enter your new password below"
              : "Your password is secure. Click below to change it."
            : "Create a secure password for your account"}
        </Typography>
      </Box>

      {isProfileMode && !isChangingPassword && (
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setIsChangingPassword(true);
              isChangingPasswordRef.current = true;
              notifyParent(formRef.current, { isChangingPassword: true });
            }}
            sx={{
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
            }}
          >
            Change Password
          </Button>
        </Box>
      )}

      {(!isProfileMode || isChangingPassword) && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="password"
              label="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={
                errors.password ||
                "Use at least 8 characters with a mix of letters, numbers, and symbols"
              }
              variant="standard"
              InputProps={{ readOnly }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="password"
              label="Confirm Password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword || ""}
              variant="standard"
              InputProps={{ readOnly }}
            />
          </Grid>

          {isProfileMode && isChangingPassword && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Button
                  variant="text"
                  onClick={() => {
                    setIsChangingPassword(false);
                    isChangingPasswordRef.current = false;
                    const next = { ...formRef.current, password: "", confirmPassword: "" };
                    formRef.current = next;
                    setForm(next);
                    notifyParent(next, { isChangingPassword: false });
                  }}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  Cancel Password Change
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default SecurityStep;
