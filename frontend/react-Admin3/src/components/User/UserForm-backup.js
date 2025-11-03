import React, { useState, useEffect, useRef, useCallback } from "react";
import {
   Box,
   Card,
   CardContent,
   CardHeader,
   CardActions,
   Typography,
   TextField,
   Button,
   Select,
   MenuItem,
   FormControl,
   InputLabel,
   FormControlLabel,
   Radio,
   RadioGroup,
   FormLabel,
   LinearProgress,
   Chip,
   Grid,
   Alert,
   FormHelperText,
   Paper,
   Divider,
   Autocomplete,
} from "@mui/material";
import { Person, Home, Business, Phone, Lock } from "@mui/icons-material";
import authService from "../../services/authService";
import config from "../../config";
import ValidatedPhoneInput from "./ValidatedPhoneInput";
import SmartAddressInput from "../Address/SmartAddressInput";
import addressMetadataService from "../../services/addressMetadataService";
import { useTheme } from "@mui/material/styles";
const initialForm = {
   title: "",
   first_name: "",
   last_name: "",
   email: "",

   // Home address
   home_building: "",
   home_street: "",
   home_district: "",
   home_town: "",
   home_county: "",
   home_postcode: "",
   home_state: "",
   home_country: "",

   // Work address (optional)
   work_company: "",
   work_department: "",
   work_building: "",
   work_street: "",
   work_district: "",
   work_town: "",
   work_county: "",
   work_postcode: "",
   work_state: "",
   work_country: "",

   // Contact info
   home_phone: "",
   work_phone: "",
   mobile_phone: "",
   personal_email: "",
   work_email: "",

   // Preferences
   send_invoices_to: "HOME",
   send_study_material_to: "HOME",

   // Security
   password: "",
   confirmPassword: "",
};

const STEPS = [
   { id: 1, title: "Personal", subtitle: "Basic & contact info", icon: Person },
   { id: 2, title: "Home", subtitle: "Home address", icon: Home },
   { id: 3, title: "Work", subtitle: "Work details", icon: Business },
   {
      id: 4,
      title: "Preferences",
      subtitle: "Delivery preferences",
      icon: Phone,
   },
   { id: 5, title: "Security", subtitle: "Password setup", icon: Lock },
];

const RegistrationWizard = ({ onSuccess, onError, onSwitchToLogin }) => {
   const [currentStep, setCurrentStep] = useState(1);
   const [form, setForm] = useState(initialForm);
   const [fieldErrors, setFieldErrors] = useState({});
   const [isLoading, setIsLoading] = useState(false);
   const [showWorkSection, setShowWorkSection] = useState(false);
   const [hasUserInteracted, setHasUserInteracted] = useState(false);
   const [countryList, setCountryList] = useState([]);
   const [homePhoneCountry, setHomePhoneCountry] = useState(null);
   const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);
   const [workPhoneCountry, setWorkPhoneCountry] = useState(null);
   const [shakingFields, setShakingFields] = useState(new Set());
   const theme = useTheme();

   // Phone validation states
   const [phoneValidation, setPhoneValidation] = useState({
      home_phone: { isValid: true, error: null },
      mobile_phone: { isValid: true, error: null },
      work_phone: { isValid: true, error: null },
   });

   // Removed old address search states - now using SmartAddressInput

   const fieldRefs = {
      first_name: useRef(),
      last_name: useRef(),
      home_street: useRef(),
      home_town: useRef(),
      home_postcode: useRef(),
      home_country: useRef(),
      home_phone: useRef(),
      mobile_phone: useRef(),
      password: useRef(),
      confirmPassword: useRef(),
   };

   // Load countries on mount
   useEffect(() => {
      fetch(config.apiBaseUrl + "/api/countries/")
         .then((res) => res.json())
         .then((data) => {
            let countries = Array.isArray(data) ? data : data.results || [];
            const frequentCountries = [
               "United Kingdom",
               "India",
               "South Africa",
            ];
            const frequent = frequentCountries
               .map((f) => countries.find((c) => c.name === f))
               .filter(Boolean);
            const rest = countries
               .filter((c) => !frequentCountries.includes(c.name))
               .sort((a, b) => a.name.localeCompare(b.name));
            const all = [...frequent, ...rest];
            setCountryList(all);
         })
         .catch((err) => console.error("Failed to load countries:", err));
   }, []);

   // Update phone countries when home country changes
   useEffect(() => {
      const country = countryList.find((c) => c.name === form.home_country);
      if (country && country.phone_code) {
         setHomePhoneCountry(country);
         setMobilePhoneCountry(country);
      }
   }, [form.home_country, countryList]);

   // Update work phone country when work country changes
   useEffect(() => {
      if (showWorkSection) {
         const country = countryList.find((c) => c.name === form.work_country);
         if (country && country.phone_code) {
            setWorkPhoneCountry(country);
         }
      }
   }, [form.work_country, countryList, showWorkSection]);

   // Trigger validation on form changes to show errors only after user interaction
   useEffect(() => {
      if (hasUserInteracted) {
         const errors = validateStep(currentStep);
         setFieldErrors(errors);
      }
   }, [form, currentStep, phoneValidation, showWorkSection, hasUserInteracted]);

   // Function to trigger shake animation for invalid fields
   const triggerFieldShake = (fieldNames) => {
      const newShakingFields = new Set(fieldNames);
      setShakingFields(newShakingFields);

      // Clear shaking after animation completes
      setTimeout(() => {
         setShakingFields(new Set());
      }, 800);
   };

   // Phone validation handler - memoized to prevent infinite loops
   const handlePhoneValidationChange = useCallback(
      (fieldName, validationResult) => {
         // Mark that user has interacted when phone validation occurs
         if (!hasUserInteracted) {
            setHasUserInteracted(true);
         }

         setPhoneValidation((prev) => ({
            ...prev,
            [fieldName]: validationResult,
         }));

         // Clear field error if phone is now valid
         if (validationResult.isValid) {
            setFieldErrors((prev) => ({
               ...prev,
               [fieldName]: "",
            }));
         }
      },
      [hasUserInteracted]
   );

   // Memoized handlers for each phone field
   const handleHomePhoneValidation = useCallback(
      (result) => {
         handlePhoneValidationChange("home_phone", result);
      },
      [handlePhoneValidationChange]
   );

   const handleMobilePhoneValidation = useCallback(
      (result) => {
         handlePhoneValidationChange("mobile_phone", result);
      },
      [handlePhoneValidationChange]
   );

   const handleWorkPhoneValidation = useCallback(
      (result) => {
         handlePhoneValidationChange("work_phone", result);
      },
      [handlePhoneValidationChange]
   );

   const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;

      // Mark that user has started interacting
      if (!hasUserInteracted) {
         setHasUserInteracted(true);
      }

      setForm((prev) => ({
         ...prev,
         [name]: newValue,
      }));

      // Clear field error when user starts typing
      if (fieldErrors[name]) {
         setFieldErrors((prev) => ({
            ...prev,
            [name]: "",
         }));
      }
   };

   const validateStep = (step) => {
      const errors = {};

      switch (step) {
         case 1: // Personal Information & Contact
            if (!form.first_name.trim())
               errors.first_name = "First name is required";
            if (!form.last_name.trim())
               errors.last_name = "Last name is required";
            if (!form.email.trim()) errors.email = "Email is required";

            // Phone validation
            if (!phoneValidation.home_phone.isValid) {
               errors.home_phone = phoneValidation.home_phone.error;
            }

            if (!form.mobile_phone.trim()) {
               errors.mobile_phone = "Mobile phone is required";
            } else if (!phoneValidation.mobile_phone.isValid) {
               errors.mobile_phone = phoneValidation.mobile_phone.error;
            }

            break;

         case 2: // Home Address
            if (!form.home_country.trim()) {
               errors.home_country = "Country is required";
            } else {
               // Use dynamic validation based on selected country
               const countryCode = addressMetadataService.getCountryCode(
                  form.home_country
               );
               const metadata =
                  addressMetadataService.getAddressMetadata(countryCode);

               // Validate required address fields based on country
               metadata.required.forEach((fieldName) => {
                  const fullFieldName = `home_${fieldName}`;
                  const validation =
                     addressMetadataService.validateAddressField(
                        countryCode,
                        fieldName,
                        form[fullFieldName] || ""
                     );
                  if (!validation.isValid) {
                     errors[fullFieldName] = validation.error;
                  }
               });
            }
            break;

         case 3: // Work Address (optional, but if shown, validate required fields)
            if (showWorkSection) {
               if (!form.work_company.trim())
                  errors.work_company = "Company is required";

               if (!form.work_country.trim()) {
                  errors.work_country = "Country is required";
               } else {
                  // Use dynamic validation based on selected country
                  const countryCode = addressMetadataService.getCountryCode(
                     form.work_country
                  );
                  const metadata =
                     addressMetadataService.getAddressMetadata(countryCode);

                  // Validate required address fields based on country
                  metadata.required.forEach((fieldName) => {
                     const fullFieldName = `work_${fieldName}`;
                     const validation =
                        addressMetadataService.validateAddressField(
                           countryCode,
                           fieldName,
                           form[fullFieldName] || ""
                        );
                     if (!validation.isValid) {
                        errors[fullFieldName] = validation.error;
                     }
                  });
               }
            }
            break;

         case 4: // Delivery Preferences
            // No validation needed for preferences - they have defaults
            break;

         case 5: // Security
            if (!form.password.trim()) errors.password = "Password is required";
            else if (form.password.length < 8)
               errors.password = "Password must be at least 8 characters";
            if (!form.confirmPassword.trim())
               errors.confirmPassword = "Please confirm your password";
            else if (form.password !== form.confirmPassword)
               errors.confirmPassword = "Passwords do not match";
            break;

         default:
            break;
      }

      return errors;
   };

   const handleNextStep = () => {
      // Mark that user has interacted when trying to proceed
      if (!hasUserInteracted) {
         setHasUserInteracted(true);
      }

      const errors = validateStep(currentStep);
      setFieldErrors(errors);

      if (Object.keys(errors).length > 0) {
         // Trigger shake animation for invalid fields
         triggerFieldShake(Object.keys(errors));

         // Focus first error field
         const errorFields = Object.keys(errors);
         const firstErrorField = errorFields.find(
            (field) => fieldRefs[field]?.current
         );
         if (firstErrorField && fieldRefs[firstErrorField].current) {
            fieldRefs[firstErrorField].current.focus();
         }
         return;
      }

      if (currentStep < 5) {
         setCurrentStep(currentStep + 1);
      } else {
         handleSubmit();
      }
   };

   const handlePrevStep = () => {
      if (currentStep > 1) {
         setCurrentStep(currentStep - 1);
      }
   };

   const handleSubmit = async () => {
      // Mark that user has interacted when trying to submit
      if (!hasUserInteracted) {
         setHasUserInteracted(true);
      }

      // Final validation
      let allErrors = {};
      for (let step = 1; step <= 5; step++) {
         const stepErrors = validateStep(step);
         allErrors = { ...allErrors, ...stepErrors };
      }

      setFieldErrors(allErrors);

      if (Object.keys(allErrors).length > 0) {
         // Go back to first step with errors
         const firstStepWithError = Math.min(
            ...Object.keys(allErrors).map((field) => {
               if (
                  field.includes("first_name") ||
                  field.includes("last_name") ||
                  field.includes("email") ||
                  field.includes("phone")
               )
                  return 1;
               if (field.includes("home_")) return 2;
               if (field.includes("work_")) return 3;
               if (field.includes("password")) return 5;
               return 1;
            })
         );
         setCurrentStep(firstStepWithError);
         return;
      }

      setIsLoading(true);

      try {
         // Prepare registration data with dynamic address formatting
         const homeAddressData = formatAddressData("home");
         const workAddressData = showWorkSection
            ? formatAddressData("work")
            : {};

         const profile = {
            title: form.title,
            send_invoices_to: form.send_invoices_to,
            send_study_material_to: form.send_study_material_to,
            home_address: homeAddressData,
            work_address: workAddressData,
            home_phone: form.home_phone,
            work_phone: showWorkSection ? form.work_phone : "",
            mobile_phone: form.mobile_phone,
            work_email: showWorkSection ? form.work_email : "",
         };

         const payload = {
            username: form.email,
            password: form.password,
            email: form.email,
            first_name: form.first_name,
            last_name: form.last_name,
            profile,
         };

         const result = await authService.register(payload);

         if (result.status === "success") {
            if (onSuccess) {
               onSuccess(result);
            }
         } else {
            if (onError) {
               onError(result.message || "Registration failed");
            }
         }
      } catch (err) {
         const errorMessage = err.message || "Registration failed";
         if (onError) {
            onError(errorMessage);
         }
      } finally {
         setIsLoading(false);
      }
   };

   // Helper function to format address data for JSON storage
   const formatAddressData = (addressPrefix) => {
      const countryFieldName = `${addressPrefix}_country`;
      const country = form[countryFieldName];

      if (!country) return {};

      // Get country metadata to understand expected format
      const countryCode = addressMetadataService.getCountryCode(country);
      const metadata = addressMetadataService.getAddressMetadata(countryCode);

      const addressData = { country };

      // Map form fields to address data based on country metadata
      Object.keys(metadata.fields).forEach((fieldName) => {
         const formFieldName = `${addressPrefix}_${fieldName}`;
         const value = form[formFieldName];

         if (value && value.trim()) {
            addressData[fieldName] = value.trim();
         }
      });

      // Add company and department for work addresses
      if (addressPrefix === "work") {
         if (form.work_company) addressData.company = form.work_company;
         if (form.work_department)
            addressData.department = form.work_department;
      }

      return addressData;
   };

   const getProgressPercentage = () => {
      return (currentStep / 5) * 100;
   };

   const renderStepContent = () => {
      switch (currentStep) {
         case 1:
            return (
               <Box>
                  <Box
                     sx={{
                        textAlign: "center",
                        mb: theme.liftkit.spacing.sm,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Person
                        sx={{
                           fontSize: "3rem",
                           color: theme.palette.bpp.granite["030"],
                        }}
                     />
                     <Typography variant="h5">
                        Personal & Contact Information
                     </Typography>
                  </Box>
                  <Divider sx={{ mb: theme.liftkit.spacing.lg }}></Divider>

                  <Grid
                     container
                     spacing={theme.liftkit.spacing.sm}
                     sx={{ flexGrow: 1 }}
                  >
                     <Grid size={2} sx={{ mr: theme.liftkit.spacing.sm }}>
                        <Autocomplete
                           options={[
                              { label: "Mr", value: "Mr" },
                              { label: "Miss", value: "Miss" },
                              { label: "Mrs", value: "Mrs" },
                              { label: "Ms", value: "Ms" },
                              { label: "Dr", value: "Dr" },
                           ]}
                           getOptionLabel={(option) => option.label || ""}
                           value={
                              form.title
                                 ? { label: form.title, value: form.title }
                                 : null
                           }
                           onChange={(event, newValue) => {
                              handleChange({
                                 target: {
                                    name: "title",
                                    value: newValue ? newValue.value : "",
                                 },
                              });
                           }}
                           renderInput={(params) => (
                              <TextField
                                 {...params}
                                 label="Title"
                                 placeholder="Select title"
                                 variant="standard"
                              />
                           )}
                           isOptionEqualToValue={(option, value) =>
                              option.value === value.value
                           }
                        />
                     </Grid>
                     <Grid size={4}>
                        <Box
                           className={
                              shakingFields.has("first_name")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <TextField
                              fullWidth
                              required
                              label="First Name"
                              name="first_name"
                              value={form.first_name}
                              onChange={handleChange}
                              error={
                                 hasUserInteracted && !!fieldErrors.first_name
                              }
                              helperText={
                                 hasUserInteracted ? fieldErrors.first_name : ""
                              }
                              inputRef={fieldRefs.first_name}
                              variant="standard"
                           />
                        </Box>
                     </Grid>
                     <Grid size={4}>
                        <Box
                           className={
                              shakingFields.has("last_name")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <TextField
                              fullWidth
                              required
                              label="Last Name"
                              name="last_name"
                              value={form.last_name}
                              onChange={handleChange}
                              error={
                                 hasUserInteracted && !!fieldErrors.last_name
                              }
                              helperText={
                                 hasUserInteracted ? fieldErrors.last_name : ""
                              }
                              inputRef={fieldRefs.last_name}
                              variant="standard"
                           />
                        </Box>
                     </Grid>
                     <Grid size={12} sx={{ textAlign: "left" }}>
                        <Box
                           className={
                              shakingFields.has("email")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <TextField
                              fullWidth
                              required
                              type="email"
                              label="Email Address"
                              name="email"
                              value={form.email}
                              onChange={handleChange}
                              error={hasUserInteracted && !!fieldErrors.email}
                              helperText={
                                 (hasUserInteracted && fieldErrors.email) ||
                                 "This will be your login username"
                              }
                              variant="standard"
                              sx={{ maxWidth: "24rem" }}
                           />
                        </Box>
                     </Grid>
                     <Grid size={12}>
                        <Box
                           className={
                              shakingFields.has("home_phone")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <ValidatedPhoneInput
                              name="home_phone"
                              value={form.home_phone}
                              onChange={handleChange}
                              onValidationChange={handleHomePhoneValidation}
                              countries={countryList}
                              selectedCountry={homePhoneCountry}
                              onCountryChange={setHomePhoneCountry}
                              isInvalid={
                                 hasUserInteracted && !!fieldErrors.home_phone
                              }
                              error={
                                 hasUserInteracted ? fieldErrors.home_phone : ""
                              }
                              placeholder="Enter home phone number"
                              label="Home Phone"
                              variant="standard"
                              sx={{ maxWidth: "24rem" }}
                           />
                        </Box>
                     </Grid>
                     <Grid size={12}>
                        <Box
                           className={
                              shakingFields.has("mobile_phone")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <ValidatedPhoneInput
                              name="mobile_phone"
                              value={form.mobile_phone}
                              onChange={handleChange}
                              onValidationChange={handleMobilePhoneValidation}
                              countries={countryList}
                              selectedCountry={mobilePhoneCountry}
                              onCountryChange={setMobilePhoneCountry}
                              isInvalid={
                                 hasUserInteracted && !!fieldErrors.mobile_phone
                              }
                              error={
                                 hasUserInteracted
                                    ? fieldErrors.mobile_phone
                                    : ""
                              }
                              placeholder="Enter mobile phone number"
                              required={true}
                              label="Mobile Phone"
                              variant="standard"
                              sx={{ maxWidth: "24rem" }}
                           />
                        </Box>
                     </Grid>
                  </Grid>
               </Box>
            );

         case 2:
            return (
               <Box>
                  <Box
                     sx={{
                        textAlign: "center",
                        mb: theme.liftkit.spacing.sm,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Home
                        sx={{
                           fontSize: "3rem",
                           color: theme.palette.bpp.granite["030"],
                        }}
                     />
                     <Typography variant="h5">Home Address</Typography>
                  </Box>
                  <Divider sx={{ mb: theme.liftkit.spacing.lg }}></Divider>
                  <SmartAddressInput
                     values={form}
                     onChange={handleChange}
                     errors={hasUserInteracted ? fieldErrors : {}}
                     fieldPrefix="home"
                     shakingFields={shakingFields}
                  />
               </Box>
            );

         case 3:
            return (
               <Box>
                  <Box
                     sx={{
                        textAlign: "center",
                        mb: theme.liftkit.spacing.sm,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Business
                        sx={{
                           fontSize: "3rem",
                           color: theme.palette.bpp.granite["030"],
                        }}
                     />
                     <Typography variant="h5">Work Address</Typography>
                  </Box>
                  <Divider sx={{ mb: theme.liftkit.spacing.lg }}></Divider>

                  <Paper
                     sx={{
                        p: 3,
                        mb: 3,
                        textAlign: "left",
                     }}
                  >
                     <Button
                        variant={showWorkSection ? "outlined" : "contained"}
                        color={showWorkSection ? "error" : "primary"}
                        onClick={() => setShowWorkSection(!showWorkSection)}
                     >
                        {showWorkSection
                           ? "Remove Work Address"
                           : "Add Work Address"}
                     </Button>
                  </Paper>

                  {showWorkSection && (
                     <Box>
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                           <Grid size={{ xs: 12, md: 6 }}>
                              <Box
                                 className={
                                    shakingFields.has("work_company")
                                       ? "field-error-shake"
                                       : ""
                                 }
                              >
                                 <TextField
                                    fullWidth
                                    required
                                    label="Company/Institution"
                                    name="work_company"
                                    value={form.work_company}
                                    onChange={handleChange}
                                    error={
                                       hasUserInteracted &&
                                       !!fieldErrors.work_company
                                    }
                                    helperText={
                                       hasUserInteracted
                                          ? fieldErrors.work_company
                                          : ""
                                    }
                                    variant="standard"
                                 />
                              </Box>
                           </Grid>
                           <Grid size={{ xs: 12, md: 6 }}>
                              <TextField
                                 fullWidth
                                 label="Department"
                                 name="work_department"
                                 value={form.work_department}
                                 onChange={handleChange}
                                 variant="standard"
                              />
                           </Grid>
                        </Grid>

                        <SmartAddressInput
                           values={form}
                           onChange={handleChange}
                           errors={hasUserInteracted ? fieldErrors : {}}
                           fieldPrefix="work"
                           shakingFields={shakingFields}
                        />

                        <Grid container spacing={3} sx={{ mt: 2 }}>
                           <Grid size={{ xs: 12, md: 6 }}>
                              <Box
                                 className={
                                    shakingFields.has("work_phone")
                                       ? "field-error-shake"
                                       : ""
                                 }
                              >
                                 <ValidatedPhoneInput
                                    name="work_phone"
                                    value={form.work_phone}
                                    onChange={handleChange}
                                    onValidationChange={
                                       handleWorkPhoneValidation
                                    }
                                    countries={countryList}
                                    selectedCountry={workPhoneCountry}
                                    onCountryChange={setWorkPhoneCountry}
                                    isInvalid={
                                       hasUserInteracted &&
                                       !!fieldErrors.work_phone
                                    }
                                    error={
                                       hasUserInteracted
                                          ? fieldErrors.work_phone
                                          : ""
                                    }
                                    placeholder="Enter work phone number"
                                    required={false}
                                    label="Work Phone"
                                    variant="standard"
                                 />
                              </Box>
                           </Grid>
                           <Grid size={{ xs: 12, md: 6 }}>
                              <TextField
                                 fullWidth
                                 type="email"
                                 label="Work Email"
                                 name="work_email"
                                 value={form.work_email}
                                 onChange={handleChange}
                                 variant="standard"
                              />
                           </Grid>
                        </Grid>
                     </Box>
                  )}
               </Box>
            );

         case 4:
            return (
               <Box sx={{ minHeight: "400px" }}>
                  <Box sx={{ textAlign: "center", mb: 4 }}>
                     <Phone
                        sx={{ fontSize: "3rem", color: "primary.main", mb: 2 }}
                     />
                     <Typography variant="h4" gutterBottom>
                        Delivery Preferences
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        Choose where to send your materials
                     </Typography>
                  </Box>

                  <Grid container spacing={4}>
                     <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl component="fieldset">
                           <FormLabel component="legend" required>
                              <Typography variant="h6">
                                 Send invoices to
                              </Typography>
                           </FormLabel>
                           <RadioGroup
                              name="send_invoices_to"
                              value={form.send_invoices_to}
                              onChange={handleChange}
                              sx={{ mt: 1 }}
                           >
                              <FormControlLabel
                                 value="HOME"
                                 control={<Radio />}
                                 label="Home Address"
                              />
                              <FormControlLabel
                                 value="WORK"
                                 control={<Radio />}
                                 label="Work Address"
                                 disabled={!showWorkSection}
                              />
                           </RadioGroup>
                        </FormControl>
                     </Grid>
                     <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl component="fieldset">
                           <FormLabel component="legend" required>
                              <Typography variant="h6">
                                 Send study materials to
                              </Typography>
                           </FormLabel>
                           <RadioGroup
                              name="send_study_material_to"
                              value={form.send_study_material_to}
                              onChange={handleChange}
                              sx={{ mt: 1 }}
                           >
                              <FormControlLabel
                                 value="HOME"
                                 control={<Radio />}
                                 label="Home Address"
                              />
                              <FormControlLabel
                                 value="WORK"
                                 control={<Radio />}
                                 label="Work Address"
                                 disabled={!showWorkSection}
                              />
                           </RadioGroup>
                        </FormControl>
                     </Grid>
                  </Grid>
               </Box>
            );

         case 5:
            return (
               <Box sx={{ minHeight: "400px" }}>
                  <Box sx={{ textAlign: "center", mb: 4 }}>
                     <Lock
                        sx={{ fontSize: "3rem", color: "primary.main", mb: 2 }}
                     />
                     <Typography variant="h4" gutterBottom>
                        Account Security
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        Create a secure password for your account
                     </Typography>
                  </Box>

                  <Grid container spacing={3}>
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                           className={
                              shakingFields.has("password")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <TextField
                              fullWidth
                              required
                              type="password"
                              label="Password"
                              name="password"
                              value={form.password}
                              onChange={handleChange}
                              error={
                                 hasUserInteracted && !!fieldErrors.password
                              }
                              helperText={
                                 (hasUserInteracted && fieldErrors.password) ||
                                 "Use at least 8 characters with a mix of letters, numbers, and symbols"
                              }
                              inputRef={fieldRefs.password}
                              variant="standard"
                           />
                        </Box>
                     </Grid>
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                           className={
                              shakingFields.has("confirmPassword")
                                 ? "field-error-shake"
                                 : ""
                           }
                        >
                           <TextField
                              fullWidth
                              required
                              type="password"
                              label="Confirm Password"
                              name="confirmPassword"
                              value={form.confirmPassword}
                              onChange={handleChange}
                              error={
                                 hasUserInteracted &&
                                 !!fieldErrors.confirmPassword
                              }
                              helperText={
                                 hasUserInteracted
                                    ? fieldErrors.confirmPassword
                                    : ""
                              }
                              inputRef={fieldRefs.confirmPassword}
                              variant="standard"
                           />
                        </Box>
                     </Grid>
                  </Grid>
               </Box>
            );

         default:
            return null;
      }
   };

   return (
      <Box
         className="p-top__lg"
         sx={{
            maxWidth: "800px",
            margin: "0 auto",
            height: "100%",
            // CSS keyframes for shake animation
            "@keyframes shake": {
               "0%, 100%": { transform: "translateX(0)" },
               "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-3px)" },
               "20%, 40%, 60%, 80%": { transform: "translateX(3px)" },
            },
            // CSS class for invalid field styling
            "& .field-error-shake": {
               animation: "shake 0.5s ease-in-out",
               backgroundColor: "rgba(244, 67, 54, 0.08)",
               borderRadius: "4px",
               padding: "4px",
               margin: "-4px",
               transition: "background-color 0.3s ease-out",
            },
         }}
      >
         <Card elevation={3}>
            <CardHeader
               sx={{
                  background:
                     "linear-gradient(135deg, #9E9E9E 0%, #d9d9d9 100%)",
                  color: "white",
                  textAlign: "center",
                  py: 4,
               }}
               title={
                  <Box>
                     <Typography
                        variant="h3"
                        gutterBottom
                        className="m-top__md"
                     >
                        Create Your ActEd Account
                     </Typography>
                     <Typography
                        variant="body2"
                        color={theme.palette.text.primary}
                        sx={{ mb: theme.liftkit.spacing.md }}
                     >
                        Follow these steps below to register your account
                     </Typography>

                     <LinearProgress
                        variant="determinate"
                        value={getProgressPercentage()}
                        sx={{
                           mb: theme.liftkit.spacing.md,
                           height: 6,
                           borderRadius: 4,
                           backgroundColor: "rgba(255,255,255,0.2)",
                           "& .MuiLinearProgress-bar": {
                              backgroundColor: theme.palette.bpp.pink["050"],
                              opacity: 0.65,
                           },
                        }}
                     />

                     <Box
                        sx={{
                           display: "flex",
                           justifyContent: "space-between",
                           alignItems: "center",
                        }}
                     >
                        {STEPS.map((step) => {
                           const StepIcon = step.icon;
                           return (
                              <Box
                                 key={step.id}
                                 sx={{ textAlign: "center", flex: 1 }}
                              >
                                 <Chip
                                    icon={<StepIcon />}
                                    label={step.id}
                                    size="small"
                                    color={
                                       currentStep > step.id
                                          ? "success"
                                          : currentStep === step.id
                                          ? "secondary"
                                          : "default"
                                    }
                                    variant={
                                       currentStep === step.id
                                          ? "filled"
                                          : "outlined"
                                    }
                                    sx={{
                                       mb: 1,
                                       color:
                                          currentStep === step.id
                                             ? "primary.contrastText"
                                             : "white",
                                       borderColor:
                                          currentStep === step.id
                                             ? "white"
                                             : "rgba(255,255,255,0.5)",
                                    }}
                                 />
                                 <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{
                                       fontWeight:
                                          currentStep === step.id
                                             ? "bold"
                                             : "normal",
                                       opacity:
                                          currentStep === step.id ? 1 : 0.8,
                                    }}
                                 >
                                    {step.title}
                                 </Typography>
                              </Box>
                           );
                        })}
                     </Box>
                  </Box>
               }
            />

            <CardContent sx={{ p: 3 }}>{renderStepContent()}</CardContent>

            <CardActions
               sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 3,
               }}
            >
               <Box>
                  {currentStep > 1 && (
                     <Button
                        variant="outlined"
                        onClick={handlePrevStep}
                        disabled={isLoading}
                        startIcon={<span>←</span>}
                     >
                        Previous
                     </Button>
                  )}
               </Box>

               <Typography variant="body2" color="text.secondary">
                  Step {currentStep} of {STEPS.length}
               </Typography>

               <Box>
                  <Button
                     variant="contained"
                     onClick={handleNextStep}
                     disabled={isLoading}
                     sx={{
                        backgroundColor: theme.palette.primary,
                        color: theme.palette.liftkit.light.onPrimary,
                     }}
                     endIcon={
                        currentStep === 5 ? <span>✓</span> : <span>→</span>
                     }
                  >
                     {isLoading ? (
                        "Creating Account..."
                     ) : currentStep === 5 ? (
                        "Create Account"
                     ) : (
                        <Typography
                           variant="button"
                           color={theme.palette.liftkit.light.onPrimary}
                        >
                           Next
                        </Typography>
                     )}
                  </Button>
               </Box>
            </CardActions>
         </Card>

         {onSwitchToLogin && (
            <Box sx={{ textAlign: "center", mt: theme.liftkit.spacing.md }}>
               <Button variant="text" onClick={onSwitchToLogin}>
                  Already have an account? Login
               </Button>
            </Box>
         )}
      </Box>
   );
};

export default RegistrationWizard;
