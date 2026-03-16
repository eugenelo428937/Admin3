import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Person, Home, Business, Phone, Lock } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import authService from "../../services/authService";
import userService from "../../services/userService";
import config from "../../config.js";
import addressMetadataService from "../../services/address/addressMetadataService.ts";
import addressValidationService from "../../services/address/addressValidationService.ts";
import type { WizardMode } from "../../types/auth";

// ─── Constants ──────────────────────────────────────────────────────────────

export interface WizardStep {
   id: number;
   title: string;
   subtitle: string;
   icon: SvgIconComponent;
}

export const STEPS: WizardStep[] = [
   { id: 1, title: "Personal", subtitle: "Basic & contact info", icon: Person },
   { id: 2, title: "Home", subtitle: "Home address", icon: Home },
   { id: 3, title: "Work", subtitle: "Work details", icon: Business },
   { id: 4, title: "Preferences", subtitle: "Delivery preferences", icon: Phone },
   { id: 5, title: "Security", subtitle: "Password setup", icon: Lock },
];

const initialForm: Record<string, any> = {
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

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface UserFormWizardProps {
   mode?: WizardMode;
   initialData?: any;
   onSuccess?: (result: any) => void;
   onError?: (message: string) => void;
   onSwitchToLogin?: () => void;
}

export interface SnackbarState {
   open: boolean;
   message: string;
   severity: string;
}

export interface UserFormWizardVM {
   // Mode
   isProfileMode: boolean;
   mode: WizardMode;

   // Step navigation
   currentStep: number;
   handleNextStep: () => void;
   handlePrevStep: () => void;
   getProgressPercentage: () => number;

   // Form state
   form: Record<string, any>;
   fieldErrors: Record<string, string>;
   stepErrors: Record<string, string>;
   isLoading: boolean;
   showWorkSection: boolean;

   // Profile mode
   isLoadingProfile: boolean;
   profileLoadError: string | null;
   changedFields: Set<string>;

   // Snackbar
   snackbar: SnackbarState;
   handleSnackbarClose: () => void;

   // Step data change handlers (stable callbacks)
   handlePersonalChange: (data: any) => void;
   handleHomeAddressChange: (data: any) => void;
   handleWorkAddressChange: (data: any) => void;
   handlePreferencesChange: (data: any) => void;
   handleSecurityChange: (data: any) => void;

   // Memoized initial data for steps
   personalInitialData: Record<string, any>;
   homeAddressInitialData: Record<string, any>;
   workAddressInitialData: Record<string, any>;
   preferencesInitialData: Record<string, any>;
   securityInitialData: Record<string, any>;

   // Save (profile mode)
   handleStepSave: () => Promise<void>;

   // Address comparison modal
   showComparisonModal: boolean;
   userEnteredAddress: Record<string, any>;
   suggestedAddress: Record<string, any>;
   isValidatingAddress: boolean;
   handleAcceptSuggestedAddress: (suggestedAddr: any) => void;
   handleKeepOriginalAddress: () => void;

   // Callback props
   onSwitchToLogin?: () => void;
}

// ─── ViewModel Hook ─────────────────────────────────────────────────────────

const useUserFormWizardVM = (props: UserFormWizardProps): UserFormWizardVM => {
   const {
      mode = "registration",
      initialData = null,
      onSuccess,
      onError,
      onSwitchToLogin,
   } = props;

   const isProfileMode = mode === "profile";
   const [currentStep, setCurrentStep] = useState(1);
   const [form, setForm] = useState<Record<string, any>>(initialForm);
   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
   const [isLoading, setIsLoading] = useState(false);
   const [showWorkSection, setShowWorkSection] = useState(false);
   const [hasUserInteracted, setHasUserInteracted] = useState(false);
   const hasUserInteractedRef = useRef(false);
   const [stepData, setStepData] = useState<Record<string, any>>({});

   // Ref to avoid stale closure in handleStepDataChange (synced after initialFormData declaration)
   const initialFormDataRef = useRef<Record<string, any> | null>(null);

   const handleStepDataChange = useCallback((stepKey: string, data: any) => {
      setStepData((prev) => ({ ...prev, [stepKey]: data }));

      // Mark user interaction when step data changes (using ref to avoid dep)
      if (!hasUserInteractedRef.current) {
         hasUserInteractedRef.current = true;
         setHasUserInteracted(true);
      }

      // Merge into flat form for backward compatibility with existing submit logic
      setForm((prev) => {
         let changed = false;
         Object.keys(data).forEach((key: string) => {
            if (!key.startsWith("_") && prev[key] !== data[key]) {
               changed = true;
            }
         });
         if (!changed) return prev;
         const newForm = { ...prev };
         Object.keys(data).forEach((key: string) => {
            if (!key.startsWith("_")) {
               newForm[key] = data[key];
            }
         });
         return newForm;
      });

      // Track changed fields in profile mode
      if (isProfileMode && initialFormDataRef.current) {
         setChangedFields((prev) => {
            const updated = new Set(prev);
            Object.keys(data).forEach((key: string) => {
               if (!key.startsWith("_")) {
                  if (initialFormDataRef.current![key] !== data[key]) {
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
         setPhoneValidation((prev: Record<string, any>) => {
            const hasChanges = Object.keys(data._phoneValidation).some((key: string) => {
               const existing = prev[key];
               const incoming = data._phoneValidation[key];
               return (
                  !existing ||
                  existing.isValid !== incoming.isValid ||
                  existing.error !== incoming.error
               );
            });
            return hasChanges ? { ...prev, ...data._phoneValidation } : prev;
         });
      }
      // Sync phone country selections from step components back to parent
      if (data._phoneCountries) {
         const {
            homePhoneCountry: hpc,
            mobilePhoneCountry: mpc,
            workPhoneCountry: wpc,
         } = data._phoneCountries;
         if (hpc !== undefined) setHomePhoneCountry(hpc);
         if (mpc !== undefined) setMobilePhoneCountry(mpc);
         if (wpc !== undefined) setWorkPhoneCountry(wpc);
      }
      // Sync password change state from SecurityStep
      if (data._isChangingPassword !== undefined) {
         setIsChangingPassword(data._isChangingPassword);
      }
   }, [isProfileMode]);

   const [countryList, setCountryList] = useState<any[]>([]);
   const [homePhoneCountry, setHomePhoneCountry] = useState<any>(null);
   const [mobilePhoneCountry, setMobilePhoneCountry] = useState<any>(null);
   const [workPhoneCountry, setWorkPhoneCountry] = useState<any>(null);
   const [shakingFields, setShakingFields] = useState<Set<string>>(new Set());

   // Profile mode states
   const [isLoadingProfile, setIsLoadingProfile] = useState(false);
   const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
   const [initialFormData, setInitialFormData] = useState<Record<string, any> | null>(null);
   useEffect(() => {
      initialFormDataRef.current = initialFormData;
   }, [initialFormData]);

   // Address editing states (controls readonly vs editable mode in profile)
   const [isEditingHomeAddress, setIsEditingHomeAddress] = useState(!isProfileMode);
   const [isEditingWorkAddress, setIsEditingWorkAddress] = useState(!isProfileMode);

   // Phone validation states
   const [phoneValidation, setPhoneValidation] = useState<Record<string, any>>({
      home_phone: { isValid: true, error: null },
      mobile_phone: { isValid: true, error: null },
      work_phone: { isValid: true, error: null },
   });

   // Change tracking for step-by-step saving (profile mode)
   const [changedFields, setChangedFields] = useState<Set<string>>(new Set());

   // Snackbar for save notifications
   const [snackbar, setSnackbar] = useState<SnackbarState>({
      open: false,
      message: "",
      severity: "success",
   });

   // Address comparison modal state
   const [showComparisonModal, setShowComparisonModal] = useState(false);
   const [pendingAddressType, setPendingAddressType] = useState<string | null>(null);
   const [userEnteredAddress, setUserEnteredAddress] = useState<Record<string, any>>({});
   const [suggestedAddress, setSuggestedAddress] = useState<Record<string, any>>({});
   const [isValidatingAddress, setIsValidatingAddress] = useState(false);

   // Password change tracking for profile mode
   const [isChangingPassword, setIsChangingPassword] = useState(!isProfileMode);

   // Robust email validation helper
   const validateEmail = (
      email: string,
      fieldLabel: string = "Email",
      isRequired: boolean = true
   ): { isValid: boolean; error: string | null } => {
      const trimmedEmail = email?.trim() || "";
      if (!trimmedEmail) {
         return isRequired
            ? { isValid: false, error: `${fieldLabel} is required` }
            : { isValid: true, error: null };
      }
      if (trimmedEmail.length > 254) {
         return {
            isValid: false,
            error: "Email address is too long (max 254 characters)",
         };
      }
      // RFC 5322 compliant regex
      const emailRegex =
         /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(trimmedEmail)) {
         return { isValid: false, error: "Please enter a valid email address" };
      }
      const parts = trimmedEmail.split("@");
      if (parts.length !== 2) {
         return {
            isValid: false,
            error: "Email must contain exactly one @ symbol",
         };
      }
      const [localPart, domain] = parts;
      if (localPart.length > 64) {
         return {
            isValid: false,
            error: "The part before @ is too long (max 64 characters)",
         };
      }
      if (domain.length > 253) {
         return { isValid: false, error: "Domain name is too long" };
      }
      const domainParts = domain.split(".");
      const tld = domainParts[domainParts.length - 1];
      if (domainParts.length < 2 || tld.length < 2) {
         return {
            isValid: false,
            error: "Please enter a valid domain (e.g., example.com)",
         };
      }
      if (trimmedEmail.includes("..")) {
         return {
            isValid: false,
            error: "Email cannot contain consecutive dots",
         };
      }
      if (localPart.startsWith(".") || localPart.endsWith(".")) {
         return {
            isValid: false,
            error: "Email cannot start or end with a dot before @",
         };
      }
      // Common domain typo detection
      const lowerDomain = domain.toLowerCase();
      const commonTypos: Record<string, string> = {
         "gmial.com": "gmail.com",
         "gmal.com": "gmail.com",
         "gamil.com": "gmail.com",
         "gmail.con": "gmail.com",
         "gmail.cmo": "gmail.com",
         "hotmal.com": "hotmail.com",
         "hotmai.com": "hotmail.com",
         "hotmail.con": "hotmail.com",
         "yahooo.com": "yahoo.com",
         "yaho.com": "yahoo.com",
         "yahoo.con": "yahoo.com",
         "outlok.com": "outlook.com",
         "outloo.com": "outlook.com",
         "outlook.con": "outlook.com",
         "icloud.con": "icloud.com",
         "icoud.com": "icloud.com",
      };
      if (commonTypos[lowerDomain]) {
         return {
            isValid: false,
            error: `Did you mean ${localPart}@${commonTypos[lowerDomain]}?`,
         };
      }
      // Common TLD typo detection
      const tldTypos: Record<string, string> = {
         con: "com",
         cmo: "com",
         ocm: "com",
         vom: "com",
         xom: "com",
         ogr: "org",
         rog: "org",
         prg: "org",
         nte: "net",
         nett: "net",
         ent: "net",
         "co.uj": "co.uk",
      };
      if (tldTypos[tld.toLowerCase()]) {
         const correctedDomain =
            domainParts.slice(0, -1).join(".") +
            "." +
            tldTypos[tld.toLowerCase()];
         return {
            isValid: false,
            error: `Did you mean ${localPart}@${correctedDomain}?`,
         };
      }
      return { isValid: true, error: null };
   };

   const fieldRefs: Record<string, React.RefObject<any>> = {
      first_name: useRef(null),
      last_name: useRef(null),
      home_street: useRef(null),
      home_town: useRef(null),
      home_postcode: useRef(null),
      home_country: useRef(null),
      home_phone: useRef(null),
      mobile_phone: useRef(null),
      password: useRef(null),
      confirmPassword: useRef(null),
   };

   // Load countries on mount
   useEffect(() => {
      fetch(config.apiBaseUrl + "/api/countries/")
         .then((res: Response) => res.json())
         .then((data: any) => {
            let countries: any[] = Array.isArray(data)
               ? data
               : data.results || [];
            const frequentCountries = [
               "United Kingdom",
               "India",
               "South Africa",
            ];
            const frequent = frequentCountries
               .map((f) => countries.find((c: any) => c.name === f))
               .filter(Boolean);
            const rest = countries
               .filter((c: any) => !frequentCountries.includes(c.name))
               .sort((a: any, b: any) => a.name.localeCompare(b.name));
            const all = [...frequent, ...rest];
            setCountryList(all);
         })
         .catch((err: any) => console.error("Failed to load countries:", err));
   }, []);

   // Helper to detect country from postal code format
   const detectCountryFromPostalCode = (postalCode: string): string | null => {
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
   const normalizeAddress = (addr: any): Record<string, string> => {
      if (!addr) return {};

      const postalCode = addr.postcode || addr.postal_code || "";

      // Detect correct country from postal code format
      const detectedCountry = detectCountryFromPostalCode(postalCode);
      const country = detectedCountry || addr.country || "";

      return {
         building: addr.building || "",
         address: addr.street || addr.address || "",
         district: addr.district || "",
         city: addr.town || addr.city || "",
         county: addr.county || "",
         postal_code: postalCode,
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
                  const profileData: any = result.data;

                  const homeAddr = normalizeAddress(profileData.home_address);
                  const workAddr = normalizeAddress(profileData.work_address);

                  const newForm: Record<string, any> = {
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
                     mobile_phone:
                        profileData.contact_numbers?.mobile_phone || "",
                     personal_email: "",
                     work_email: "",

                     // Preferences
                     send_invoices_to:
                        profileData.profile?.send_invoices_to || "HOME",
                     send_study_material_to:
                        profileData.profile?.send_study_material_to || "HOME",

                     // Password fields empty in profile mode
                     password: "",
                     confirmPassword: "",
                  };

                  setForm(newForm);
                  setInitialFormData(newForm);

                  // Set work address visibility based on fetched data
                  const hasWorkAddress =
                     profileData.work_address &&
                     (profileData.work_address.company ||
                        profileData.work_address.street ||
                        profileData.work_address.town);
                  setShowWorkSection(!!hasWorkAddress);
               } else {
                  setProfileLoadError(
                     result.message || "Failed to load profile data"
                  );
               }
            } catch (error: any) {
               setProfileLoadError(
                  error.message || "Failed to load profile data"
               );
            } finally {
               setIsLoadingProfile(false);
            }
         };

         fetchProfileData();
      } else if (isProfileMode && initialData) {
         // If initialData is provided, use it directly
         const homeAddr = normalizeAddress(initialData.home_address);
         const workAddr = normalizeAddress(initialData.work_address);

         const newForm: Record<string, any> = {
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
            send_invoices_to:
               initialData.profile?.send_invoices_to || "HOME",
            send_study_material_to:
               initialData.profile?.send_study_material_to || "HOME",

            // Password fields empty
            password: "",
            confirmPassword: "",
         };

         setForm(newForm);
         setInitialFormData(newForm);

         // Set work address visibility
         const hasWorkAddress =
            initialData.work_address &&
            (initialData.work_address.company ||
               initialData.work_address.street ||
               initialData.work_address.town);
         setShowWorkSection(!!hasWorkAddress);
      }
   }, [isProfileMode, initialData]);

   // Update phone countries when home country changes
   useEffect(() => {
      const country = countryList.find(
         (c: any) => c.name === form.home_country
      );
      if (country && country.phone_code) {
         setHomePhoneCountry(country);
         setMobilePhoneCountry(country);
      }
   }, [form.home_country, countryList]);

   // Update work phone country when work country changes
   useEffect(() => {
      if (showWorkSection) {
         const country = countryList.find(
            (c: any) => c.name === form.work_country
         );
         if (country && country.phone_code) {
            setWorkPhoneCountry(country);
         }
      }
   }, [form.work_country, countryList, showWorkSection]);

   // Load phone countries from profile data (saved country codes)
   useEffect(() => {
      if (!isProfileMode || countryList.length === 0) return;

      // Helper to find country by ISO code
      const findCountryByCode = (isoCode: string | undefined) => {
         if (!isoCode) return null;
         return countryList.find((c: any) => c.iso_code === isoCode);
      };

      // Get profile data (from initialData or fetched profileData)
      const profileContactNumbers = initialData?.contact_numbers;
      if (!profileContactNumbers) return;

      // Set phone countries from saved country codes (priority over address country)
      const savedHomeCountry = findCountryByCode(
         profileContactNumbers.home_phone_country
      );
      const savedMobileCountry = findCountryByCode(
         profileContactNumbers.mobile_phone_country
      );
      const savedWorkCountry = findCountryByCode(
         profileContactNumbers.work_phone_country
      );

      if (savedHomeCountry) setHomePhoneCountry(savedHomeCountry);
      if (savedMobileCountry) setMobilePhoneCountry(savedMobileCountry);
      if (savedWorkCountry) setWorkPhoneCountry(savedWorkCountry);
   }, [isProfileMode, countryList, initialData]);

   // Trigger validation on form changes to show errors only after user interaction
   useEffect(() => {
      if (hasUserInteracted) {
         const errors = validateStep(currentStep);
         setFieldErrors((prev) => {
            const prevKeys = Object.keys(prev);
            const newKeys = Object.keys(errors);
            if (prevKeys.length !== newKeys.length) return errors;
            const hasChanges = newKeys.some(
               (key) => prev[key] !== errors[key]
            );
            return hasChanges ? errors : prev;
         });
      }
   }, [form, currentStep, phoneValidation, showWorkSection, hasUserInteracted]);

   // Function to trigger shake animation for invalid fields
   const triggerFieldShake = (fieldNames: string[]) => {
      const newShakingFields = new Set(fieldNames);
      setShakingFields(newShakingFields);

      // Clear shaking after animation completes
      setTimeout(() => {
         setShakingFields(new Set());
      }, 800);
   };

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setChangedFields((prev) => new Set([...Array.from(prev), name]));
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

   const validateStep = (step: number): Record<string, string> => {
      const errors: Record<string, string> = {};

      switch (step) {
         case 1: {
            // Personal Information & Contact
            if (!form.first_name.trim())
               errors.first_name = "First name is required";
            if (!form.last_name.trim())
               errors.last_name = "Last name is required";
            // Email validation using robust validator
            const emailValidation = validateEmail(form.email, "Email", true);
            if (!emailValidation.isValid) {
               errors.email = emailValidation.error!;
            }

            // Home phone validation (OPTIONAL - only validate if provided)
            if (
               form.home_phone.trim() &&
               !phoneValidation.home_phone.isValid
            ) {
               errors.home_phone = phoneValidation.home_phone.error;
            }

            // Mobile phone validation (REQUIRED)
            if (!form.mobile_phone.trim()) {
               errors.mobile_phone = "Mobile phone is required";
            } else if (!phoneValidation.mobile_phone.isValid) {
               errors.mobile_phone = phoneValidation.mobile_phone.error;
            }

            break;
         }

         case 2: {
            // Home Address
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
               metadata.required.forEach((fieldName: string) => {
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
         }

         case 3: {
            // Work Address (optional, but if shown, validate required fields)
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
                  metadata.required.forEach((fieldName: string) => {
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
                  const workEmailValidation = validateEmail(
                     form.work_email,
                     "Work email",
                     false
                  );
                  if (!workEmailValidation.isValid) {
                     errors.work_email = workEmailValidation.error!;
                  }
               }
            }
            break;
         }

         case 4:
            // Delivery Preferences
            // No validation needed for preferences - they have defaults
            break;

         case 5: {
            // Security
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
         }

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

   // Helper function to format address data for JSON storage
   const formatAddressData = (addressPrefix: string): Record<string, any> => {
      const countryFieldName = `${addressPrefix}_country`;
      const country = form[countryFieldName];

      if (!country) return {};

      const addressData: Record<string, any> = { country };

      const addressFields = [
         "address",
         "city",
         "county",
         "state",
         "postal_code",
         "district",
         "building",
         "sub_building_name",
         "building_name",
         "building_number",
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

   // Save current step changes in profile mode
   // Internal save function that accepts form and changedFields directly
   // This avoids async state issues when called immediately after setForm
   const handleStepSaveWithForm = async (
      formData: Record<string, any>,
      changedFieldsSet: Set<string>
   ) => {
      if (!isProfileMode) return;

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
         const updatePayload: Record<string, any> = {};

         // Helper to check if any field with prefix has changed
         const hasChangedFieldsWithPrefix = (prefix: string) => {
            return Array.from(changedFieldsSet).some((field) =>
               field.startsWith(prefix)
            );
         };

         // Helper to format address data from the provided form
         const formatAddressFromForm = (addressPrefix: string) => {
            const countryFieldName = `${addressPrefix}_country`;
            const country = formData[countryFieldName];

            if (!country) return {};

            const addressData: Record<string, any> = { country };

            const addressFields = [
               "address",
               "city",
               "county",
               "state",
               "postal_code",
               "district",
               "building",
               "sub_building_name",
               "building_name",
               "building_number",
            ];

            addressFields.forEach((fieldName) => {
               const formFieldName = `${addressPrefix}_${fieldName}`;
               const value = formData[formFieldName];
               if (value && value.trim()) {
                  addressData[fieldName] = value.trim();
               }
            });

            if (addressPrefix === "work") {
               if (formData.work_company)
                  addressData.company = formData.work_company;
               if (formData.work_department)
                  addressData.department = formData.work_department;
            }

            return addressData;
         };

         // User fields (first_name, last_name, email)
         if (
            changedFieldsSet.has("first_name") ||
            changedFieldsSet.has("last_name") ||
            changedFieldsSet.has("email")
         ) {
            updatePayload.user = {};
            if (changedFieldsSet.has("first_name"))
               updatePayload.user.first_name = formData.first_name;
            if (changedFieldsSet.has("last_name"))
               updatePayload.user.last_name = formData.last_name;
            if (changedFieldsSet.has("email"))
               updatePayload.user.email = formData.email;
         }

         // Profile fields (title, preferences)
         if (
            changedFieldsSet.has("title") ||
            changedFieldsSet.has("send_invoices_to") ||
            changedFieldsSet.has("send_study_material_to")
         ) {
            updatePayload.profile = {};
            if (changedFieldsSet.has("title"))
               updatePayload.profile.title = formData.title;
            if (changedFieldsSet.has("send_invoices_to"))
               updatePayload.profile.send_invoices_to =
                  formData.send_invoices_to;
            if (changedFieldsSet.has("send_study_material_to"))
               updatePayload.profile.send_study_material_to =
                  formData.send_study_material_to;
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
               updatePayload.contact_numbers.home_phone_country =
                  homePhoneCountry?.iso_code || "";
            }
            if (changedFieldsSet.has("mobile_phone")) {
               updatePayload.contact_numbers.mobile_phone =
                  formData.mobile_phone;
               updatePayload.contact_numbers.mobile_phone_country =
                  mobilePhoneCountry?.iso_code || "";
            }
            if (changedFieldsSet.has("work_phone")) {
               updatePayload.contact_numbers.work_phone = formData.work_phone;
               updatePayload.contact_numbers.work_phone_country =
                  workPhoneCountry?.iso_code || "";
            }
            if (changedFieldsSet.has("work_email"))
               updatePayload.contact_numbers.work_email = formData.work_email;
         }

         // Password (only if user is changing password)
         if (
            isChangingPassword &&
            (changedFieldsSet.has("password") ||
               changedFieldsSet.has("confirmPassword"))
         ) {
            updatePayload.password = formData.password;
         }

         // Call update API
         const result = await userService.updateUserProfile(updatePayload);

         if (result.status === "success") {
            // Track if password was changed
            const passwordChanged =
               isChangingPassword &&
               (changedFieldsSet.has("password") ||
                  changedFieldsSet.has("confirmPassword"));

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
               setForm((prev) => ({
                  ...prev,
                  password: "",
                  confirmPassword: "",
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
      } catch (error: any) {
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
      if (!isProfileMode) return;

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
         const updatePayload: Record<string, any> = {};

         // Helper to check if any field with prefix has changed
         const hasChangedFieldsWithPrefix = (prefix: string) => {
            return Array.from(changedFields).some((field) =>
               field.startsWith(prefix)
            );
         };

         // User fields (first_name, last_name, email)
         if (
            changedFields.has("first_name") ||
            changedFields.has("last_name") ||
            changedFields.has("email")
         ) {
            updatePayload.user = {};
            if (changedFields.has("first_name"))
               updatePayload.user.first_name = form.first_name;
            if (changedFields.has("last_name"))
               updatePayload.user.last_name = form.last_name;
            if (changedFields.has("email"))
               updatePayload.user.email = form.email;
         }

         // Profile fields (title, preferences)
         if (
            changedFields.has("title") ||
            changedFields.has("send_invoices_to") ||
            changedFields.has("send_study_material_to")
         ) {
            updatePayload.profile = {};
            if (changedFields.has("title"))
               updatePayload.profile.title = form.title;
            if (changedFields.has("send_invoices_to"))
               updatePayload.profile.send_invoices_to = form.send_invoices_to;
            if (changedFields.has("send_study_material_to"))
               updatePayload.profile.send_study_material_to =
                  form.send_study_material_to;
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
               updatePayload.contact_numbers.home_phone_country =
                  homePhoneCountry?.iso_code || "";
            }
            if (changedFields.has("mobile_phone")) {
               updatePayload.contact_numbers.mobile_phone = form.mobile_phone;
               updatePayload.contact_numbers.mobile_phone_country =
                  mobilePhoneCountry?.iso_code || "";
            }
            if (changedFields.has("work_phone")) {
               updatePayload.contact_numbers.work_phone = form.work_phone;
               updatePayload.contact_numbers.work_phone_country =
                  workPhoneCountry?.iso_code || "";
            }
            if (changedFields.has("work_email"))
               updatePayload.contact_numbers.work_email = form.work_email;
         }

         // Password (only if user is changing password)
         if (
            isChangingPassword &&
            (changedFields.has("password") ||
               changedFields.has("confirmPassword"))
         ) {
            updatePayload.password = form.password;
         }

         // Call update API
         const result = await userService.updateUserProfile(updatePayload);

         if (result.status === "success") {
            // Track if password was changed
            const passwordChanged =
               isChangingPassword &&
               (changedFields.has("password") ||
                  changedFields.has("confirmPassword"));

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
                     message:
                        "Please check your email to verify your new email address",
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
      } catch (error: any) {
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
   const validateAndSaveAddress = async (addressType: string) => {
      setIsValidatingAddress(true);

      try {
         const addressData = formatAddressData(addressType);

         // Only validate for countries with address lookup support
         const countryCode = addressMetadataService.getCountryCode(
            addressData.country
         );
         const metadata =
            await addressMetadataService.fetchAddressMetadata(countryCode);

         if (!metadata.addressLookupSupported) {
            // No validation needed, proceed with save
            return { validated: true, proceed: true };
         }

         const result =
            await addressValidationService.validateAddress(addressData);

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
         console.error("Address validation error:", error);
         // On error, allow save to proceed
         return { validated: true, proceed: true };
      } finally {
         setIsValidatingAddress(false);
      }
   };

   // Handle accepting suggested address
   const handleAcceptSuggestedAddress = (suggestedAddr: any) => {
      const prefix = pendingAddressType;

      // Update form with suggested address
      const updates: Record<string, any> = {};
      if (suggestedAddr.building)
         updates[`${prefix}_building`] = suggestedAddr.building;
      if (suggestedAddr.address)
         updates[`${prefix}_address`] = suggestedAddr.address;
      if (suggestedAddr.district)
         updates[`${prefix}_district`] = suggestedAddr.district;
      if (suggestedAddr.city) updates[`${prefix}_city`] = suggestedAddr.city;
      if (suggestedAddr.county)
         updates[`${prefix}_county`] = suggestedAddr.county;
      if (suggestedAddr.state)
         updates[`${prefix}_state`] = suggestedAddr.state;
      if (suggestedAddr.postal_code)
         updates[`${prefix}_postal_code`] = suggestedAddr.postal_code;

      // Create merged form for immediate save (since setForm is async)
      const mergedForm = { ...form, ...updates };

      setForm(mergedForm);

      // Mark fields as changed and collect them for immediate use
      const newChangedFields = new Set([
         ...Array.from(changedFields),
         ...Object.keys(updates),
      ]);
      setChangedFields(newChangedFields);

      // Close modal and exit edit mode
      setShowComparisonModal(false);
      if (prefix === "home") {
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
      if (pendingAddressType === "home") {
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
      let allErrors: Record<string, string> = {};
      for (let step = 1; step <= 5; step++) {
         const stepValidationErrors = validateStep(step);
         allErrors = { ...allErrors, ...stepValidationErrors };
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

         const profile: Record<string, any> = {
            title: form.title,
            send_invoices_to: form.send_invoices_to,
            send_study_material_to: form.send_study_material_to,
            home_address: homeAddressData,
            work_address: workAddressData,
            home_phone: form.home_phone,
            home_phone_country: homePhoneCountry?.iso_code || "",
            work_phone: showWorkSection ? form.work_phone : "",
            work_phone_country: showWorkSection
               ? workPhoneCountry?.iso_code || ""
               : "",
            mobile_phone: form.mobile_phone,
            mobile_phone_country: mobilePhoneCountry?.iso_code || "",
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
      } catch (err: any) {
         const errorMessage = err.message || "Registration failed";
         if (onError) {
            onError(errorMessage);
         }
      } finally {
         setIsLoading(false);
      }
   };

   const getProgressPercentage = (): number => {
      return (currentStep / 5) * 100;
   };

   // Stable callbacks for step data changes (prevent infinite render loops)
   const handlePersonalChange = useCallback(
      (data: any) => handleStepDataChange("personal", data),
      [handleStepDataChange]
   );
   const handleHomeAddressChange = useCallback(
      (data: any) => handleStepDataChange("homeAddress", data),
      [handleStepDataChange]
   );
   const handleWorkAddressChange = useCallback(
      (data: any) => {
         const { showWorkSection: showWork, ...rest } = data;
         if (showWork !== undefined) setShowWorkSection(showWork);
         handleStepDataChange("workAddress", rest);
      },
      [handleStepDataChange]
   );
   const handlePreferencesChange = useCallback(
      (data: any) => handleStepDataChange("preferences", data),
      [handleStepDataChange]
   );
   const handleSecurityChange = useCallback(
      (data: any) => handleStepDataChange("security", data),
      [handleStepDataChange]
   );

   const emptyErrors = useMemo(() => ({}), []);
   const stepErrors = hasUserInteracted ? fieldErrors : emptyErrors;

   // Memoize initialData for each step to prevent new object references on every render
   const personalInitialData = useMemo(
      () => ({
         title: form.title,
         first_name: form.first_name,
         last_name: form.last_name,
         email: form.email,
         home_phone: form.home_phone,
         mobile_phone: form.mobile_phone,
      }),
      [
         form.title,
         form.first_name,
         form.last_name,
         form.email,
         form.home_phone,
         form.mobile_phone,
      ]
   );

   const homeAddressInitialData = useMemo(
      () =>
         Object.fromEntries(
            Object.entries(form).filter(([k]) => k.startsWith("home_"))
         ),
      [
         form.home_building,
         form.home_address,
         form.home_district,
         form.home_city,
         form.home_county,
         form.home_postal_code,
         form.home_state,
         form.home_country,
         form.home_phone,
      ]
   );

   const workAddressInitialData = useMemo(
      () => ({
         showWorkSection,
         ...Object.fromEntries(
            Object.entries(form).filter(([k]) => k.startsWith("work_"))
         ),
      }),
      [
         showWorkSection,
         form.work_company,
         form.work_department,
         form.work_building,
         form.work_address,
         form.work_district,
         form.work_city,
         form.work_county,
         form.work_postal_code,
         form.work_state,
         form.work_country,
         form.work_phone,
         form.work_email,
      ]
   );

   const preferencesInitialData = useMemo(
      () => ({
         send_invoices_to: form.send_invoices_to,
         send_study_material_to: form.send_study_material_to,
      }),
      [form.send_invoices_to, form.send_study_material_to]
   );

   const securityInitialData = useMemo(
      () => ({
         password: form.password,
         confirmPassword: form.confirmPassword,
      }),
      [form.password, form.confirmPassword]
   );

   return {
      // Mode
      isProfileMode,
      mode,

      // Step navigation
      currentStep,
      handleNextStep,
      handlePrevStep,
      getProgressPercentage,

      // Form state
      form,
      fieldErrors,
      stepErrors,
      isLoading,
      showWorkSection,

      // Profile mode
      isLoadingProfile,
      profileLoadError,
      changedFields,

      // Snackbar
      snackbar,
      handleSnackbarClose,

      // Step data change handlers
      handlePersonalChange,
      handleHomeAddressChange,
      handleWorkAddressChange,
      handlePreferencesChange,
      handleSecurityChange,

      // Memoized initial data for steps
      personalInitialData,
      homeAddressInitialData,
      workAddressInitialData,
      preferencesInitialData,
      securityInitialData,

      // Save (profile mode)
      handleStepSave,

      // Address comparison modal
      showComparisonModal,
      userEnteredAddress,
      suggestedAddress,
      isValidatingAddress,
      handleAcceptSuggestedAddress,
      handleKeepOriginalAddress,

      // Callback props
      onSwitchToLogin,
   };
};

export default useUserFormWizardVM;
