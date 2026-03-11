import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
   Box,
   Card,
   CardContent,
   CardHeader,
   CardActions,
   Typography,
   Button,
   LinearProgress,
   Chip,
   Alert,
   Snackbar,
} from "@mui/material";
import { Person, Home, Business, Phone, Lock } from "@mui/icons-material";
import authService from "../../services/authService.js";
import userService from "../../services/userService.js";
import config from '../../config.js';
import addressMetadataService from "../../services/addressMetadataService.js";
import AddressComparisonModal from '../Address/AddressComparisonModal.js';
import addressValidationService from '../../services/addressValidationService.js';
import { PersonalInfoStep, HomeAddressStep, WorkAddressStep, PreferencesStep, SecurityStep } from './steps';
import { useTheme } from "@mui/material/styles";
const initialForm = {
   title: "",
   first_name: "",
   last_name: "",
   email: "",

   // Home address (using metadata-compatible field names)
   home_building: "",
   home_address: "",
   home_district: "",
   home_city: "",
   home_county: "",
   home_postal_code: "",
   home_state: "",
   home_country: "",

   // Work address (optional, using metadata-compatible field names)
   work_company: "",
   work_department: "",
   work_building: "",
   work_address: "",
   work_district: "",
   work_city: "",
   work_county: "",
   work_postal_code: "",
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

const UserFormWizard = ({ mode = "registration", initialData = null, onSuccess, onError, onSwitchToLogin }) => {
   const isProfileMode = mode === "profile";
   const [currentStep, setCurrentStep] = useState(1);
   const [form, setForm] = useState(initialForm);
   const [fieldErrors, setFieldErrors] = useState({});
   const [isLoading, setIsLoading] = useState(false);
   const [showWorkSection, setShowWorkSection] = useState(false);
   const [hasUserInteracted, setHasUserInteracted] = useState(false);
   const hasUserInteractedRef = useRef(false);
   const [stepData, setStepData] = useState({});

   // Ref to avoid stale closure in handleStepDataChange (synced after initialFormData declaration)
   const initialFormDataRef = useRef(null);

   const handleStepDataChange = useCallback((stepKey, data) => {
      setStepData(prev => ({ ...prev, [stepKey]: data }));

      // Mark user interaction when step data changes (using ref to avoid dep)
      if (!hasUserInteractedRef.current) {
         hasUserInteractedRef.current = true;
         setHasUserInteracted(true);
      }

      // Merge into flat form for backward compatibility with existing submit logic
      setForm(prev => {
         let changed = false;
         Object.keys(data).forEach(key => {
            if (!key.startsWith('_') && prev[key] !== data[key]) {
               changed = true;
            }
         });
         if (!changed) return prev;
         const newForm = { ...prev };
         Object.keys(data).forEach(key => {
            if (!key.startsWith('_')) {
               newForm[key] = data[key];
            }
         });
         return newForm;
      });

      // Track changed fields in profile mode
      if (isProfileMode && initialFormDataRef.current) {
         setChangedFields(prev => {
            const updated = new Set(prev);
            Object.keys(data).forEach(key => {
               if (!key.startsWith('_')) {
                  if (initialFormDataRef.current[key] !== data[key]) {
                     updated.add(key);
                  } else {
                     updated.delete(key);
                  }
               }
            });
            return updated;
         });
      }

      // Sync phone validation state from step components back to parent
      if (data._phoneValidation) {
         setPhoneValidation(prev => {
            const hasChanges = Object.keys(data._phoneValidation).some(key => {
               const existing = prev[key];
               const incoming = data._phoneValidation[key];
               return !existing || existing.isValid !== incoming.isValid || existing.error !== incoming.error;
            });
            return hasChanges ? { ...prev, ...data._phoneValidation } : prev;
         });
      }
      // Sync phone country selections from step components back to parent
      if (data._phoneCountries) {
         const { homePhoneCountry: hpc, mobilePhoneCountry: mpc, workPhoneCountry: wpc } = data._phoneCountries;
         if (hpc !== undefined) setHomePhoneCountry(hpc);
         if (mpc !== undefined) setMobilePhoneCountry(mpc);
         if (wpc !== undefined) setWorkPhoneCountry(wpc);
      }
      // Sync password change state from SecurityStep
      if (data._isChangingPassword !== undefined) {
         setIsChangingPassword(data._isChangingPassword);
      }
   }, [isProfileMode]);
   const [countryList, setCountryList] = useState([]);
   const [homePhoneCountry, setHomePhoneCountry] = useState(null);
   const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);
   const [workPhoneCountry, setWorkPhoneCountry] = useState(null);
   const [shakingFields, setShakingFields] = useState(new Set());
   const theme = useTheme();

   // Profile mode states
   const [isLoadingProfile, setIsLoadingProfile] = useState(false);
   const [profileLoadError, setProfileLoadError] = useState(null);
   const [initialFormData, setInitialFormData] = useState(null);
   useEffect(() => { initialFormDataRef.current = initialFormData; }, [initialFormData]);

   // Address editing states (controls readonly vs editable mode in profile)
   const [isEditingHomeAddress, setIsEditingHomeAddress] = useState(!isProfileMode);
   const [isEditingWorkAddress, setIsEditingWorkAddress] = useState(!isProfileMode);

   // Phone validation states
   const [phoneValidation, setPhoneValidation] = useState({
      home_phone: { isValid: true, error: null },
      mobile_phone: { isValid: true, error: null },
      work_phone: { isValid: true, error: null },
   });

   // Change tracking for step-by-step saving (profile mode)
   const [changedFields, setChangedFields] = useState(new Set());

   // Snackbar for save notifications
   const [snackbar, setSnackbar] = useState({
      open: false,
      message: "",
      severity: "success", // success, error, warning, info
   });

   // Address comparison modal state
   const [showComparisonModal, setShowComparisonModal] = useState(false);
   const [pendingAddressType, setPendingAddressType] = useState(null); // 'home' or 'work'
   const [userEnteredAddress, setUserEnteredAddress] = useState({});
   const [suggestedAddress, setSuggestedAddress] = useState({});
   const [isValidatingAddress, setIsValidatingAddress] = useState(false);

   // Password change tracking for profile mode
   const [isChangingPassword, setIsChangingPassword] = useState(!isProfileMode);

   // Removed old address search states - now using SmartAddressInput
   // Robust email validation helper
   const validateEmail = (email, fieldLabel = "Email", isRequired = true) => {
      const trimmedEmail = email?.trim() || "";
      if (!trimmedEmail) {
         return isRequired
            ? { isValid: false, error: `${fieldLabel} is required` }
            : { isValid: true, error: null };
      }
      if (trimmedEmail.length > 254) {
         return { isValid: false, error: "Email address is too long (max 254 characters)" };
      }
      // RFC 5322 compliant regex
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(trimmedEmail)) {
         return { isValid: false, error: "Please enter a valid email address" };
      }
      const parts = trimmedEmail.split('@');
      if (parts.length !== 2) {
         return { isValid: false, error: "Email must contain exactly one @ symbol" };
      }
      const [localPart, domain] = parts;
      if (localPart.length > 64) {
         return { isValid: false, error: "The part before @ is too long (max 64 characters)" };
      }
      if (domain.length > 253) {
         return { isValid: false, error: "Domain name is too long" };
      }
      const domainParts = domain.split('.');
      const tld = domainParts[domainParts.length - 1];
      if (domainParts.length < 2 || tld.length < 2) {
         return { isValid: false, error: "Please enter a valid domain (e.g., example.com)" };
      }
      if (trimmedEmail.includes('..')) {
         return { isValid: false, error: "Email cannot contain consecutive dots" };
      }
      if (localPart.startsWith('.') || localPart.endsWith('.')) {
         return { isValid: false, error: "Email cannot start or end with a dot before @" };
      }
      // Common domain typo detection
      const lowerDomain = domain.toLowerCase();
      const commonTypos = {
         'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
         'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com',
         'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
         'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
         'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com',
         'icloud.con': 'icloud.com', 'icoud.com': 'icloud.com',
      };
      if (commonTypos[lowerDomain]) {
         return { isValid: false, error: `Did you mean ${localPart}@${commonTypos[lowerDomain]}?` };
      }
      // Common TLD typo detection
      const tldTypos = {
         'con': 'com', 'cmo': 'com', 'ocm': 'com', 'vom': 'com', 'xom': 'com',
         'ogr': 'org', 'rog': 'org', 'prg': 'org',
         'nte': 'net', 'nett': 'net', 'ent': 'net',
         'co.uj': 'co.uk',
      };
      if (tldTypos[tld.toLowerCase()]) {
         const correctedDomain = domainParts.slice(0, -1).join('.') + '.' + tldTypos[tld.toLowerCase()];
         return { isValid: false, error: `Did you mean ${localPart}@${correctedDomain}?` };
      }
      return { isValid: true, error: null };
   };

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

   // Helper to detect country from postal code format
   const detectCountryFromPostalCode = (postalCode) => {
      if (!postalCode) return null;

      const code = postalCode.trim();

      // UK postcode: Letters/numbers with space (e.g., "OX14 1BZ", "SW1A 1AA")
      if (/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(code)) {
         return "United Kingdom";
      }

      // Singapore postcode: 6 digits
      if (/^\d{6}$/.test(code)) {
         return "Singapore";
      }

      // US ZIP code: 5 digits or 5+4 format
      if (/^\d{5}(-\d{4})?$/.test(code)) {
         return "United States";
      }

      // South Africa postcode: 4 digits
      if (/^\d{4}$/.test(code)) {
         return "South Africa";
      }

      return null;
   };

   // Helper to normalize address field names (handles both JSON and legacy formats)
   // IMPORTANT: Output field names must match addressMetadataService field mappings
   // (address, city, postal_code, state, county) NOT (street, town, postcode)
   const normalizeAddress = (addr) => {
      if (!addr) return {};

      const postalCode = addr.postcode || addr.postal_code || "";

      // Detect correct country from postal code format
      const detectedCountry = detectCountryFromPostalCode(postalCode);
      const country = detectedCountry || addr.country || "";

      return {
         building: addr.building || "",
         address: addr.street || addr.address || "",  // Unified field name for street address
         district: addr.district || "",
         city: addr.town || addr.city || "",  // Unified field name for town/city
         county: addr.county || "",
         postal_code: postalCode,  // Unified field name for postcode
         state: addr.state || "",
         country: country,
      };
   };

   // Fetch profile data in profile mode
   useEffect(() => {
      if (isProfileMode && !initialData) {
         const fetchProfileData = async () => {
            setIsLoadingProfile(true);
            setProfileLoadError(null);

            try {
               const result = await userService.getUserProfile();

               if (result.status === "success" && result.data) {
                  const profileData = result.data;

                  const homeAddr = normalizeAddress(profileData.home_address);
                  const workAddr = normalizeAddress(profileData.work_address);

                  const newForm = {
                     title: profileData.profile?.title || "",
                     first_name: profileData.user?.first_name || "",
                     last_name: profileData.user?.last_name || "",
                     email: profileData.user?.email || "",

                     // Home address (using metadata-compatible field names)
                     home_building: homeAddr.building,
                     home_address: homeAddr.address,
                     home_district: homeAddr.district,
                     home_city: homeAddr.city,
                     home_county: homeAddr.county,
                     home_postal_code: homeAddr.postal_code,
                     home_state: homeAddr.state,
                     home_country: homeAddr.country,

                     // Work address (using metadata-compatible field names)
                     work_company: profileData.work_address?.company || "",
                     work_department: profileData.work_address?.department || "",
                     work_building: workAddr.building,
                     work_address: workAddr.address,
                     work_district: workAddr.district,
                     work_city: workAddr.city,
                     work_county: workAddr.county,
                     work_postal_code: workAddr.postal_code,
                     work_state: workAddr.state,
                     work_country: workAddr.country,

                     // Contact info
                     home_phone: profileData.contact_numbers?.home_phone || "",
                     work_phone: profileData.contact_numbers?.work_phone || "",
                     mobile_phone: profileData.contact_numbers?.mobile_phone || "",
                     personal_email: "",
                     work_email: "",

                     // Preferences
                     send_invoices_to: profileData.profile?.send_invoices_to || "HOME",
                     send_study_material_to: profileData.profile?.send_study_material_to || "HOME",

                     // Password fields empty in profile mode
                     password: "",
                     confirmPassword: "",
                  };

                  setForm(newForm);
                  setInitialFormData(newForm);

                  // Set work address visibility based on fetched data
                  const hasWorkAddress = profileData.work_address && (
                     profileData.work_address.company ||
                     profileData.work_address.street ||
                     profileData.work_address.town
                  );
                  setShowWorkSection(!!hasWorkAddress);
               } else {
                  setProfileLoadError(result.message || "Failed to load profile data");
               }
            } catch (error) {
               setProfileLoadError(error.message || "Failed to load profile data");
            } finally {
               setIsLoadingProfile(false);
            }
         };

         fetchProfileData();
      } else if (isProfileMode && initialData) {
         // If initialData is provided, use it directly
         const homeAddr = normalizeAddress(initialData.home_address);
         const workAddr = normalizeAddress(initialData.work_address);

         const newForm = {
            title: initialData.profile?.title || "",
            first_name: initialData.user?.first_name || "",
            last_name: initialData.user?.last_name || "",
            email: initialData.user?.email || "",

            // Home address (using metadata-compatible field names)
            home_building: homeAddr.building,
            home_address: homeAddr.address,
            home_district: homeAddr.district,
            home_city: homeAddr.city,
            home_county: homeAddr.county,
            home_postal_code: homeAddr.postal_code,
            home_state: homeAddr.state,
            home_country: homeAddr.country,

            // Work address (using metadata-compatible field names)
            work_company: initialData.work_address?.company || "",
            work_department: initialData.work_address?.department || "",
            work_building: workAddr.building,
            work_address: workAddr.address,
            work_district: workAddr.district,
            work_city: workAddr.city,
            work_county: workAddr.county,
            work_postal_code: workAddr.postal_code,
            work_state: workAddr.state,
            work_country: workAddr.country,

            // Contact info
            home_phone: initialData.contact_numbers?.home_phone || "",
            work_phone: initialData.contact_numbers?.work_phone || "",
            mobile_phone: initialData.contact_numbers?.mobile_phone || "",
            personal_email: "",
            work_email: "",

            // Preferences
            send_invoices_to: initialData.profile?.send_invoices_to || "HOME",
            send_study_material_to: initialData.profile?.send_study_material_to || "HOME",

            // Password fields empty
            password: "",
            confirmPassword: "",
         };

         setForm(newForm);
         setInitialFormData(newForm);

         // Set work address visibility
         const hasWorkAddress = initialData.work_address && (
            initialData.work_address.company ||
            initialData.work_address.street ||
            initialData.work_address.town
         );
         setShowWorkSection(!!hasWorkAddress);
      }
   }, [isProfileMode, initialData]);

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

   // Load phone countries from profile data (saved country codes)
   useEffect(() => {
      if (!isProfileMode || countryList.length === 0) return;

      // Helper to find country by ISO code
      const findCountryByCode = (isoCode) => {
         if (!isoCode) return null;
         return countryList.find(c => c.iso_code === isoCode);
      };

      // Get profile data (from initialData or fetched profileData)
      const profileContactNumbers = initialData?.contact_numbers;
      if (!profileContactNumbers) return;

      // Set phone countries from saved country codes (priority over address country)
      const savedHomeCountry = findCountryByCode(profileContactNumbers.home_phone_country);
      const savedMobileCountry = findCountryByCode(profileContactNumbers.mobile_phone_country);
      const savedWorkCountry = findCountryByCode(profileContactNumbers.work_phone_country);

      if (savedHomeCountry) setHomePhoneCountry(savedHomeCountry);
      if (savedMobileCountry) setMobilePhoneCountry(savedMobileCountry);
      if (savedWorkCountry) setWorkPhoneCountry(savedWorkCountry);
   }, [isProfileMode, countryList, initialData]);

   // Trigger validation on form changes to show errors only after user interaction
   useEffect(() => {
      if (hasUserInteracted) {
         const errors = validateStep(currentStep);
         setFieldErrors(prev => {
            const prevKeys = Object.keys(prev);
            const newKeys = Object.keys(errors);
            if (prevKeys.length !== newKeys.length) return errors;
            const hasChanges = newKeys.some(key => prev[key] !== errors[key]);
            return hasChanges ? errors : prev;
         });
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

      // Track changed fields in profile mode (compare to initialFormData)
      if (isProfileMode && initialFormData) {
         if (initialFormData[name] !== newValue) {
            setChangedFields((prev) => new Set([...prev, name]));
         } else {
            setChangedFields((prev) => {
               const updated = new Set(prev);
               updated.delete(name);
               return updated;
            });
         }
      }

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
            // Email validation using robust validator
            const emailValidation = validateEmail(form.email, "Email", true);
            if (!emailValidation.isValid) {
               errors.email = emailValidation.error;
            }

            // Home phone validation (OPTIONAL - only validate if provided)
            if (form.home_phone.trim() && !phoneValidation.home_phone.isValid) {
               errors.home_phone = phoneValidation.home_phone.error;
            }

            // Mobile phone validation (REQUIRED)
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

               // Work email validation (optional - only validate format if provided)
               if (form.work_email.trim()) {
                  const workEmailValidation = validateEmail(form.work_email, "Work email", false);
                  if (!workEmailValidation.isValid) {
                     errors.work_email = workEmailValidation.error;
                  }
               }
            }
            break;

         case 4: // Delivery Preferences
            // No validation needed for preferences - they have defaults
            break;

         case 5: // Security
            // In profile mode, only validate password if user wants to change it
            if (isProfileMode && !isChangingPassword) {
               // No password validation needed - user can skip password change
               break;
            }

            // Registration mode OR profile mode with password change - validate password
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
         // In profile mode, use step save instead of submit
         if (isProfileMode) {
            handleStepSave();
         } else {
            handleSubmit();
         }
      }
   };

   const handlePrevStep = () => {
      if (currentStep > 1) {
         setCurrentStep(currentStep - 1);
      }
   };

   // Save current step changes in profile mode
   // Internal save function that accepts form and changedFields directly
   // This avoids async state issues when called immediately after setForm
   const handleStepSaveWithForm = async (formData, changedFieldsSet) => {
      if (!isProfileMode) return; // Only available in profile mode

      // Check if there are any changes to save
      if (changedFieldsSet.size === 0) {
         setSnackbar({
            open: true,
            message: "No changes to save",
            severity: "info",
         });
         return;
      }

      setIsLoading(true);

      try {
         // Build update payload with only changed fields
         const updatePayload = {};

         // Helper to check if any field with prefix has changed
         const hasChangedFieldsWithPrefix = (prefix) => {
            return Array.from(changedFieldsSet).some((field) =>
               field.startsWith(prefix)
            );
         };

         // Helper to format address data from the provided form
         const formatAddressFromForm = (addressPrefix) => {
            const countryFieldName = `${addressPrefix}_country`;
            const country = formData[countryFieldName];

            if (!country) return {};

            const addressData = { country };

            const addressFields = [
               'address', 'city', 'county', 'state', 'postal_code',
               'district', 'building', 'sub_building_name', 'building_name', 'building_number'
            ];

            addressFields.forEach((fieldName) => {
               const formFieldName = `${addressPrefix}_${fieldName}`;
               const value = formData[formFieldName];
               if (value && value.trim()) {
                  addressData[fieldName] = value.trim();
               }
            });

            if (addressPrefix === "work") {
               if (formData.work_company) addressData.company = formData.work_company;
               if (formData.work_department) addressData.department = formData.work_department;
            }

            return addressData;
         };

         // User fields (first_name, last_name, email)
         if (changedFieldsSet.has("first_name") || changedFieldsSet.has("last_name") || changedFieldsSet.has("email")) {
            updatePayload.user = {};
            if (changedFieldsSet.has("first_name")) updatePayload.user.first_name = formData.first_name;
            if (changedFieldsSet.has("last_name")) updatePayload.user.last_name = formData.last_name;
            if (changedFieldsSet.has("email")) updatePayload.user.email = formData.email;
         }

         // Profile fields (title, preferences)
         if (
            changedFieldsSet.has("title") ||
            changedFieldsSet.has("send_invoices_to") ||
            changedFieldsSet.has("send_study_material_to")
         ) {
            updatePayload.profile = {};
            if (changedFieldsSet.has("title")) updatePayload.profile.title = formData.title;
            if (changedFieldsSet.has("send_invoices_to"))
               updatePayload.profile.send_invoices_to = formData.send_invoices_to;
            if (changedFieldsSet.has("send_study_material_to"))
               updatePayload.profile.send_study_material_to = formData.send_study_material_to;
         }

         // Home address
         if (hasChangedFieldsWithPrefix("home_")) {
            updatePayload.home_address = formatAddressFromForm("home");
         }

         // Work address
         if (hasChangedFieldsWithPrefix("work_")) {
            updatePayload.work_address = formatAddressFromForm("work");
         }

         // Contact numbers with country codes
         if (
            changedFieldsSet.has("home_phone") ||
            changedFieldsSet.has("mobile_phone") ||
            changedFieldsSet.has("work_phone") ||
            changedFieldsSet.has("work_email")
         ) {
            updatePayload.contact_numbers = {};
            if (changedFieldsSet.has("home_phone")) {
               updatePayload.contact_numbers.home_phone = formData.home_phone;
               updatePayload.contact_numbers.home_phone_country = homePhoneCountry?.iso_code || '';
            }
            if (changedFieldsSet.has("mobile_phone")) {
               updatePayload.contact_numbers.mobile_phone = formData.mobile_phone;
               updatePayload.contact_numbers.mobile_phone_country = mobilePhoneCountry?.iso_code || '';
            }
            if (changedFieldsSet.has("work_phone")) {
               updatePayload.contact_numbers.work_phone = formData.work_phone;
               updatePayload.contact_numbers.work_phone_country = workPhoneCountry?.iso_code || '';
            }
            if (changedFieldsSet.has("work_email"))
               updatePayload.contact_numbers.work_email = formData.work_email;
         }

         // Password (only if user is changing password)
         if (isChangingPassword && (changedFieldsSet.has("password") || changedFieldsSet.has("confirmPassword"))) {
            updatePayload.password = formData.password;
         }

         // Call update API
         const result = await userService.updateUserProfile(updatePayload);

         if (result.status === "success") {
            // Track if password was changed
            const passwordChanged = isChangingPassword && (changedFieldsSet.has("password") || changedFieldsSet.has("confirmPassword"));

            // Update initialFormData with saved values
            setInitialFormData((prev) => ({
               ...prev,
               ...formData,
            }));

            // Clear changed fields
            setChangedFields(new Set());

            // If password was changed, reset password change state and clear fields
            if (passwordChanged) {
               setIsChangingPassword(false);
               setForm(prev => ({
                  ...prev,
                  password: "",
                  confirmPassword: ""
               }));
            }

            setSnackbar({
               open: true,
               message: "Changes saved successfully",
               severity: "success",
            });
         } else {
            throw new Error(result.message || "Failed to save changes");
         }
      } catch (error) {
         console.error("Error saving profile:", error);
         setSnackbar({
            open: true,
            message: error.message || "Failed to save changes",
            severity: "error",
         });
      } finally {
         setIsLoading(false);
      }
   };

   // Public save function that uses current state
   const handleStepSave = async () => {
      if (!isProfileMode) return; // Only available in profile mode

      // Check if there are any changes to save
      if (changedFields.size === 0) {
         setSnackbar({
            open: true,
            message: "No changes to save",
            severity: "info",
         });
         return;
      }

      setIsLoading(true);

      try {
         // Build update payload with only changed fields
         const updatePayload = {};

         // Helper to check if any field with prefix has changed
         const hasChangedFieldsWithPrefix = (prefix) => {
            return Array.from(changedFields).some((field) =>
               field.startsWith(prefix)
            );
         };

         // User fields (first_name, last_name, email)
         if (changedFields.has("first_name") || changedFields.has("last_name") || changedFields.has("email")) {
            updatePayload.user = {};
            if (changedFields.has("first_name")) updatePayload.user.first_name = form.first_name;
            if (changedFields.has("last_name")) updatePayload.user.last_name = form.last_name;
            if (changedFields.has("email")) updatePayload.user.email = form.email;
         }

         // Profile fields (title, preferences)
         if (
            changedFields.has("title") ||
            changedFields.has("send_invoices_to") ||
            changedFields.has("send_study_material_to")
         ) {
            updatePayload.profile = {};
            if (changedFields.has("title")) updatePayload.profile.title = form.title;
            if (changedFields.has("send_invoices_to"))
               updatePayload.profile.send_invoices_to = form.send_invoices_to;
            if (changedFields.has("send_study_material_to"))
               updatePayload.profile.send_study_material_to = form.send_study_material_to;
         }

         // Home address
         if (hasChangedFieldsWithPrefix("home_")) {
            updatePayload.home_address = formatAddressData("home");
         }

         // Work address
         if (hasChangedFieldsWithPrefix("work_")) {
            updatePayload.work_address = formatAddressData("work");
         }

         // Contact numbers with country codes
         if (
            changedFields.has("home_phone") ||
            changedFields.has("mobile_phone") ||
            changedFields.has("work_phone") ||
            changedFields.has("work_email")
         ) {
            updatePayload.contact_numbers = {};
            if (changedFields.has("home_phone")) {
               updatePayload.contact_numbers.home_phone = form.home_phone;
               updatePayload.contact_numbers.home_phone_country = homePhoneCountry?.iso_code || '';
            }
            if (changedFields.has("mobile_phone")) {
               updatePayload.contact_numbers.mobile_phone = form.mobile_phone;
               updatePayload.contact_numbers.mobile_phone_country = mobilePhoneCountry?.iso_code || '';
            }
            if (changedFields.has("work_phone")) {
               updatePayload.contact_numbers.work_phone = form.work_phone;
               updatePayload.contact_numbers.work_phone_country = workPhoneCountry?.iso_code || '';
            }
            if (changedFields.has("work_email"))
               updatePayload.contact_numbers.work_email = form.work_email;
         }

         // Password (only if user is changing password)
         if (isChangingPassword && (changedFields.has("password") || changedFields.has("confirmPassword"))) {
            updatePayload.password = form.password;
         }

         // Call update API
         const result = await userService.updateUserProfile(updatePayload);

         if (result.status === "success") {
            // Track if password was changed
            const passwordChanged = isChangingPassword && (changedFields.has("password") || changedFields.has("confirmPassword"));

            // Update initialFormData with saved values
            setInitialFormData((prev) => ({
               ...prev,
               ...form,
            }));

            // Clear changed fields
            setChangedFields(new Set());

            // If password was changed, reset password change state and clear fields
            if (passwordChanged) {
               setIsChangingPassword(false);
               setForm((prev) => ({
                  ...prev,
                  password: "",
                  confirmPassword: "",
               }));
            }

            // Show success notification
            setSnackbar({
               open: true,
               message: passwordChanged
                  ? "Profile updated successfully. Your password has been changed."
                  : "Changes saved successfully",
               severity: "success",
            });

            // Check if email verification was sent
            if (result.email_verification_sent) {
               // Show additional notification about email verification
               setTimeout(() => {
                  setSnackbar({
                     open: true,
                     message: "Please check your email to verify your new email address",
                     severity: "info",
                  });
               }, 3000);
            }
         } else {
            setSnackbar({
               open: true,
               message: result.message || "Failed to save changes",
               severity: "error",
            });
         }
      } catch (error) {
         console.error("Error saving profile:", error);
         setSnackbar({
            open: true,
            message: "An error occurred while saving changes",
            severity: "error",
         });
      } finally {
         setIsLoading(false);
      }
   };

   // Validate address against Postcoder API before saving
   const validateAndSaveAddress = async (addressType) => {
      setIsValidatingAddress(true);

      try {
         const addressData = formatAddressData(addressType);

         // Only validate for countries with address lookup support
         const countryCode = addressMetadataService.getCountryCode(addressData.country);
         const metadata = await addressMetadataService.fetchAddressMetadata(countryCode);

         if (!metadata.addressLookupSupported) {
            // No validation needed, proceed with save
            return { validated: true, proceed: true };
         }

         const result = await addressValidationService.validateAddress(addressData);

         if (!result.hasMatch) {
            // No match found, proceed with user's address
            return { validated: true, proceed: true };
         }

         if (result.needsComparison) {
            // Show comparison modal
            setPendingAddressType(addressType);
            setUserEnteredAddress(addressData);
            setSuggestedAddress(result.bestMatch);
            setShowComparisonModal(true);
            return { validated: true, proceed: false }; // Wait for user decision
         }

         // Addresses match, proceed with save
         return { validated: true, proceed: true };
      } catch (error) {
         console.error('Address validation error:', error);
         // On error, allow save to proceed
         return { validated: true, proceed: true };
      } finally {
         setIsValidatingAddress(false);
      }
   };

   // Handle accepting suggested address
   const handleAcceptSuggestedAddress = (suggestedAddr) => {
      const prefix = pendingAddressType;

      // Update form with suggested address
      const updates = {};
      if (suggestedAddr.building) updates[`${prefix}_building`] = suggestedAddr.building;
      if (suggestedAddr.address) updates[`${prefix}_address`] = suggestedAddr.address;
      if (suggestedAddr.district) updates[`${prefix}_district`] = suggestedAddr.district;
      if (suggestedAddr.city) updates[`${prefix}_city`] = suggestedAddr.city;
      if (suggestedAddr.county) updates[`${prefix}_county`] = suggestedAddr.county;
      if (suggestedAddr.state) updates[`${prefix}_state`] = suggestedAddr.state;
      if (suggestedAddr.postal_code) updates[`${prefix}_postal_code`] = suggestedAddr.postal_code;

      // Create merged form for immediate save (since setForm is async)
      const mergedForm = { ...form, ...updates };

      setForm(mergedForm);

      // Mark fields as changed and collect them for immediate use
      const newChangedFields = new Set([...changedFields, ...Object.keys(updates)]);
      setChangedFields(newChangedFields);

      // Close modal and exit edit mode
      setShowComparisonModal(false);
      if (prefix === 'home') {
         setIsEditingHomeAddress(false);
      } else {
         setIsEditingWorkAddress(false);
      }

      // Trigger save with the merged form data (pass directly to avoid async state issues)
      handleStepSaveWithForm(mergedForm, newChangedFields);
   };

   // Handle keeping original address
   const handleKeepOriginalAddress = () => {
      setShowComparisonModal(false);

      // Exit edit mode
      if (pendingAddressType === 'home') {
         setIsEditingHomeAddress(false);
      } else {
         setIsEditingWorkAddress(false);
      }

      // Trigger save with original address
      handleStepSave();
   };

   // Handler for closing snackbar
   const handleSnackbarClose = () => {
      setSnackbar((prev) => ({ ...prev, open: false }));
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
            home_phone_country: homePhoneCountry?.iso_code || '',
            work_phone: showWorkSection ? form.work_phone : "",
            work_phone_country: showWorkSection ? (workPhoneCountry?.iso_code || '') : '',
            mobile_phone: form.mobile_phone,
            mobile_phone_country: mobilePhoneCountry?.iso_code || '',
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

      const addressData = { country };

      // Extract all known address field names regardless of country metadata.
      // This ensures no data is lost regardless of which metadata was used for form rendering.
      // The form uses Google's libaddressinput API (async) which provides dynamic fields per country,
      // but we extract all known fields to avoid metadata mismatch issues.
      const addressFields = [
         'address',           // Street address
         'city',              // City/Town
         'county',            // County (UK)
         'state',             // State/Province
         'postal_code',       // Postal/ZIP code
         'district',          // District
         'building',          // Building name
         'sub_building_name', // Flat/Unit
         'building_name',     // Building
         'building_number'    // Street number
      ];

      addressFields.forEach((fieldName) => {
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

   // Stable callbacks for step data changes (prevent infinite render loops)
   const handlePersonalChange = useCallback((data) => handleStepDataChange('personal', data), [handleStepDataChange]);
   const handleHomeAddressChange = useCallback((data) => handleStepDataChange('homeAddress', data), [handleStepDataChange]);
   const handleWorkAddressChange = useCallback((data) => {
      const { showWorkSection: showWork, ...rest } = data;
      if (showWork !== undefined) setShowWorkSection(showWork);
      handleStepDataChange('workAddress', rest);
   }, [handleStepDataChange]);
   const handlePreferencesChange = useCallback((data) => handleStepDataChange('preferences', data), [handleStepDataChange]);
   const handleSecurityChange = useCallback((data) => handleStepDataChange('security', data), [handleStepDataChange]);
   const emptyErrors = useMemo(() => ({}), []);
   const stepErrors = hasUserInteracted ? fieldErrors : emptyErrors;

   // Memoize initialData for each step to prevent new object references on every render
   const personalInitialData = useMemo(() => ({
      title: form.title,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      home_phone: form.home_phone,
      mobile_phone: form.mobile_phone,
   }), [form.title, form.first_name, form.last_name, form.email, form.home_phone, form.mobile_phone]);

   const homeAddressInitialData = useMemo(() =>
      Object.fromEntries(Object.entries(form).filter(([k]) => k.startsWith('home_'))),
      [form.home_building, form.home_address, form.home_district, form.home_city,
       form.home_county, form.home_postal_code, form.home_state, form.home_country,
       form.home_phone]
   );

   const workAddressInitialData = useMemo(() => ({
      showWorkSection,
      ...Object.fromEntries(Object.entries(form).filter(([k]) => k.startsWith('work_'))),
   }), [showWorkSection, form.work_company, form.work_department, form.work_building,
        form.work_address, form.work_district, form.work_city, form.work_county,
        form.work_postal_code, form.work_state, form.work_country, form.work_phone,
        form.work_email]);

   const preferencesInitialData = useMemo(() => ({
      send_invoices_to: form.send_invoices_to,
      send_study_material_to: form.send_study_material_to,
   }), [form.send_invoices_to, form.send_study_material_to]);

   const securityInitialData = useMemo(() => ({
      password: form.password,
      confirmPassword: form.confirmPassword,
   }), [form.password, form.confirmPassword]);

   const renderStepContent = () => {
      switch (currentStep) {
         case 1:
            return (
               <PersonalInfoStep
                  initialData={personalInitialData}
                  onDataChange={handlePersonalChange}
                  errors={stepErrors}
                  mode={mode}
               />
            );
         case 2:
            return (
               <HomeAddressStep
                  initialData={homeAddressInitialData}
                  onDataChange={handleHomeAddressChange}
                  errors={stepErrors}
                  mode={mode}
               />
            );
         case 3:
            return (
               <WorkAddressStep
                  initialData={workAddressInitialData}
                  onDataChange={handleWorkAddressChange}
                  errors={stepErrors}
                  mode={mode}
               />
            );
         case 4:
            return (
               <PreferencesStep
                  initialData={preferencesInitialData}
                  onDataChange={handlePreferencesChange}
                  errors={stepErrors}
                  mode={mode}
                  hasWorkAddress={showWorkSection}
               />
            );
         case 5:
            return (
               <SecurityStep
                  initialData={securityInitialData}
                  onDataChange={handleSecurityChange}
                  errors={stepErrors}
                  mode={mode}
               />
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
               sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.palette.scales.granite[40]} 0%, ${theme.palette.scales.granite[20]} 100%)`,
                  color: "white",
                  textAlign: "center",
                  py: 4,
               })}
               title={
                  <Box>
                     <Typography
                        variant="h3"
                        gutterBottom
                        className="m-top__md"
                     >
                        {isProfileMode ? "Update Your Profile" : "Create Your ActEd Account"}
                     </Typography>
                     <Typography
                        variant="body2"
                        color={theme.palette.text.primary}
                        sx={{ mb: theme.spacingTokens.md }}
                     >
                        {isProfileMode
                           ? "Update your profile information below. You can save changes at each step."
                           : "Follow these steps below to register your account"}
                     </Typography>

                     <LinearProgress
                        variant="determinate"
                        value={getProgressPercentage()}
                        sx={{
                           mb: theme.spacingTokens.md,
                           height: 6,
                           borderRadius: 4,
                           backgroundColor: "rgba(255,255,255,0.2)",
                           "& .MuiLinearProgress-bar": {
                              backgroundColor: theme.palette.scales.pink[50],
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

               <Box sx={{ display: "flex", gap: 2 }}>
                  {/* Save Progress button (profile mode only) */}
                  {isProfileMode && (
                     <Button
                        variant="outlined"
                        onClick={handleStepSave}
                        disabled={isLoading || changedFields.size === 0}
                        sx={{
                           color: theme.palette.primary.main,
                           borderColor: theme.palette.primary.main,
                        }}
                     >
                        {changedFields.size > 0
                           ? `Save Progress (${changedFields.size} changes)`
                           : "No Changes"}
                     </Button>
                  )}

                  <Button
                     variant="contained"
                     onClick={handleNextStep}
                     disabled={isLoading}
                     sx={{
                        backgroundColor: theme.palette.primary,
                        color: 'primary.contrastText',
                     }}
                     endIcon={
                        currentStep === 5 ? <span>✓</span> : <span>→</span>
                     }
                  >
                     {isLoading ? (
                        isProfileMode ? "Saving..." : "Creating Account..."
                     ) : currentStep === 5 ? (
                        isProfileMode ? "Save Changes" : "Create Account"
                     ) : (
                        <Typography
                           variant="button"
                           color={'primary.contrastText'}
                        >
                           Next
                        </Typography>
                     )}
                  </Button>
               </Box>
            </CardActions>
         </Card>

         {onSwitchToLogin && (
            <Box sx={{ textAlign: "center", mt: theme.spacingTokens.md }}>
               <Button variant="text" onClick={onSwitchToLogin}>
                  Already have an account? Login
               </Button>
            </Box>
         )}

         {/* Snackbar for notifications */}
         <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            <Alert
               onClose={handleSnackbarClose}
               severity={snackbar.severity}
               sx={{ width: "100%" }}
            >
               {snackbar.message}
            </Alert>
         </Snackbar>

         {/* Address Comparison Modal */}
         <AddressComparisonModal
            open={showComparisonModal}
            userAddress={userEnteredAddress}
            suggestedAddress={suggestedAddress}
            onAcceptSuggested={handleAcceptSuggestedAddress}
            onKeepOriginal={handleKeepOriginalAddress}
            onClose={() => setShowComparisonModal(false)}
            loading={isValidatingAddress}
         />
      </Box>
   );
};

export default UserFormWizard;
