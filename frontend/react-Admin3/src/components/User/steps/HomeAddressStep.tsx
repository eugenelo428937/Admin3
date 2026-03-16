import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Button, Alert, Divider,
} from "@mui/material";
import { Home, Edit as EditIcon } from "@mui/icons-material";
import SmartAddressInput from "../../Address/SmartAddressInput.js";
import DynamicAddressForm from "../../Address/DynamicAddressForm.js";
import { useTheme } from "@mui/material/styles";
import type { WizardMode, WizardStepData, WizardValidationErrors } from "../../../types/auth";

interface StepProps {
  initialData?: Record<string, any>;
  onDataChange?: (data: WizardStepData) => void;
  errors?: WizardValidationErrors;
  mode?: WizardMode;
  readOnly?: boolean;
}

interface HomeAddressForm {
  home_building: string;
  home_address: string;
  home_district: string;
  home_city: string;
  home_county: string;
  home_postal_code: string;
  home_state: string;
  home_country: string;
  [key: string]: any;
}

const HomeAddressStep: React.FC<StepProps> = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const isProfileMode = mode === "profile" || mode === "admin";

  const [form, setForm] = useState<HomeAddressForm>({
    home_building: "",
    home_address: "",
    home_district: "",
    home_city: "",
    home_county: "",
    home_postal_code: "",
    home_state: "",
    home_country: "",
    ...initialData,
  });

  const [useSmartInput, setUseSmartInput] = useState(!isProfileMode);
  const [isEditing, setIsEditing] = useState(!isProfileMode);

  // Refs for direct callback pattern (avoids effect cascade)
  const formRef = useRef<HomeAddressForm>(form);
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);

  const notifyParent = useCallback((nextForm: HomeAddressForm) => {
    onDataChangeRef.current?.(nextForm);
  }, []);

  // Initialize from initialData only on subsequent changes (not initial mount)
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      formRef.current = next;
      return next;
    });
    notifyParent(formRef.current);
  }, [notifyParent]);

  const header = (
    <>
      <Box sx={{ textAlign: "center", mb: (theme as any).spacingTokens?.sm || 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <Home sx={{ fontSize: "3rem", color: (theme as any).palette.scales?.granite?.[30] || "grey" }} />
        <Typography variant="h5">Home Address</Typography>
      </Box>
      <Divider sx={{ mb: (theme as any).spacingTokens?.lg || 3 }} />
    </>
  );

  if (readOnly) {
    return (
      <Box>
        {header}
        {form.home_country ? (
          <DynamicAddressForm
            country={form.home_country}
            values={form}
            onChange={handleChange}
            errors={{}}
            fieldPrefix="home"
            showOptionalFields={true}
            readonly={true}
          />
        ) : (
          <Alert severity="info">No home address on file.</Alert>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {!isEditing ? (
        <Box>
          {form.home_country ? (
            <DynamicAddressForm
              country={form.home_country}
              values={form}
              onChange={handleChange}
              errors={{}}
              fieldPrefix="home"
              showOptionalFields={true}
              readonly={true}
            />
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No home address on file. Click "Edit Address" to add your address.
            </Alert>
          )}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setIsEditing(true);
                setUseSmartInput(!form.home_country);
              }}
            >
              Edit Address
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          {!useSmartInput ? (
            <Box>
              <DynamicAddressForm
                country={form.home_country}
                values={form}
                onChange={handleChange}
                errors={errors}
                fieldPrefix="home"
                showOptionalFields={true}
              />
              <Box sx={{ textAlign: "center", mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
                <Button variant="outlined" onClick={() => setUseSmartInput(true)}>
                  Use address lookup
                </Button>
                {isProfileMode && (
                  <Button variant="text" onClick={() => { setIsEditing(false); setUseSmartInput(false); }}>
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Using smart address lookup
              </Typography>
              <SmartAddressInput
                values={form}
                onChange={handleChange}
                errors={errors}
                fieldPrefix="home"
              />
              <Box sx={{ textAlign: "center", mt: 2, display: "flex", gap: 2, justifyContent: "center" }}>
                {isProfileMode && (
                  <Button variant="text" onClick={() => { setIsEditing(false); setUseSmartInput(false); }}>
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default HomeAddressStep;
