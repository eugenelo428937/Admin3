import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Button, Alert, Divider,
} from "@mui/material";
import { Home, Edit as EditIcon } from "@mui/icons-material";
import SmartAddressInput from "../../Address/SmartAddressInput";
import DynamicAddressForm from "../../Address/DynamicAddressForm";
import { useTheme } from "@mui/material/styles";

const HomeAddressStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const isProfileMode = mode === "profile" || mode === "admin";

  const [form, setForm] = useState({
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

  // Initialize from initialData only on subsequent changes (not initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    onDataChange?.(form);
  }, [form, onDataChange]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  if (readOnly) {
    return (
      <Box>
        <Box sx={{ textAlign: "center", mb: theme.spacingTokens?.sm || 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Home sx={{ fontSize: "3rem", color: theme.palette.scales?.granite?.[30] || "grey" }} />
          <Typography variant="h5">Home Address</Typography>
        </Box>
        <Divider sx={{ mb: theme.spacingTokens?.lg || 3 }} />
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
      <Box sx={{ textAlign: "center", mb: theme.spacingTokens?.sm || 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <Home sx={{ fontSize: "3rem", color: theme.palette.scales?.granite?.[30] || "grey" }} />
        <Typography variant="h5">Home Address</Typography>
      </Box>
      <Divider sx={{ mb: theme.spacingTokens?.lg || 3 }} />

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
