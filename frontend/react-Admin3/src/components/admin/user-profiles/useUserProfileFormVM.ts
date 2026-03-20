import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import userProfileService from '../../../services/userProfileService.ts';

// ─── Interfaces ───────────────────────────────────────────────

export interface ProfileAddress {
  id?: number;
  address_type?: string;
  building?: string;
  address_line_1?: string;
  district?: string;
  city?: string;
  county?: string;
  postcode?: string;
  state?: string;
  country?: string;
  company?: string;
  department?: string;
}

export interface ProfileContact {
  id?: number;
  contact_type?: string;
  value?: string;
}

export interface ProfileData {
  id?: number;
  title?: string;
  send_invoices_to?: string;
  send_study_material_to?: string;
  user?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  addresses?: ProfileAddress[];
  contacts?: ProfileContact[];
}

export interface PersonalStepData {
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  home_phone: string;
  mobile_phone: string;
}

export interface HomeAddressStepData {
  home_building: string;
  home_address: string;
  home_district: string;
  home_city: string;
  home_county: string;
  home_postal_code: string;
  home_state: string;
  home_country: string;
}

export interface WorkAddressStepData {
  showWorkSection: boolean;
  work_company: string;
  work_department: string;
  work_building: string;
  work_address: string;
  work_district: string;
  work_city: string;
  work_county: string;
  work_postal_code: string;
  work_state: string;
  work_country: string;
  work_phone: string;
  work_email: string;
}

export interface PreferencesStepData {
  send_invoices_to: string;
  send_study_material_to: string;
}

export interface StepDataMap {
  personal?: PersonalStepData;
  homeAddress?: HomeAddressStepData;
  workAddress?: WorkAddressStepData;
  preferences?: PreferencesStepData;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface UserProfileFormVM {
  activeStep: number;
  setActiveStep: (step: number) => void;
  loading: boolean;
  error: string | null;
  isSubmitting: boolean;
  hasWorkAddress: boolean;
  snackbar: SnackbarState;
  personalData: PersonalStepData;
  homeAddressData: HomeAddressStepData;
  workAddressData: WorkAddressStepData;
  preferencesData: PreferencesStepData;
  emptyErrors: Record<string, never>;
  handlePersonalChange: (data: PersonalStepData) => void;
  handleHomeAddressChange: (data: HomeAddressStepData) => void;
  handleWorkAddressChange: (data: WorkAddressStepData) => void;
  handlePreferencesChange: (data: PreferencesStepData) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleSnackbarClose: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────

const useUserProfileFormVM = (): UserProfileFormVM => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stepData, setStepData] = useState<StepDataMap>({});
  const [hasWorkAddress, setHasWorkAddress] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profile, addresses, contacts] = await Promise.all([
        userProfileService.getById(id as string),
        userProfileService.getAddresses(id as string),
        userProfileService.getContacts(id as string),
      ]);
      setProfileData({ ...(profile as ProfileData), addresses: addresses as ProfileAddress[], contacts: contacts as ProfileContact[] });
    } catch (err) {
      setError('Failed to fetch user profile details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStepDataChange = useCallback((stepKey: keyof StepDataMap, data: StepDataMap[keyof StepDataMap]) => {
    setStepData((prev) => ({ ...prev, [stepKey]: data }));
    if (stepKey === 'workAddress') {
      const workData = data as WorkAddressStepData;
      if (workData.showWorkSection !== undefined) {
        setHasWorkAddress(workData.showWorkSection);
      }
    }
  }, []);

  const personalData = useMemo<PersonalStepData>(() => profileData ? {
    title: profileData.title || '',
    first_name: profileData.user?.first_name || '',
    last_name: profileData.user?.last_name || '',
    email: profileData.user?.email || '',
    home_phone: '',
    mobile_phone: '',
  } : {
    title: '',
    first_name: '',
    last_name: '',
    email: '',
    home_phone: '',
    mobile_phone: '',
  }, [profileData]);

  const homeAddressData = useMemo<HomeAddressStepData>(() => {
    const homeAddress = profileData?.addresses?.find((a) => a.address_type === 'HOME') || {};
    return {
      home_building: homeAddress.building || '',
      home_address: homeAddress.address_line_1 || '',
      home_district: homeAddress.district || '',
      home_city: homeAddress.city || '',
      home_county: homeAddress.county || '',
      home_postal_code: homeAddress.postcode || '',
      home_state: homeAddress.state || '',
      home_country: homeAddress.country || '',
    };
  }, [profileData]);

  const workAddressData = useMemo<WorkAddressStepData>(() => {
    const workAddress = profileData?.addresses?.find((a) => a.address_type === 'WORK') || {};
    return {
      showWorkSection: !!(workAddress as ProfileAddress).id,
      work_company: (workAddress as ProfileAddress).company || '',
      work_department: (workAddress as ProfileAddress).department || '',
      work_building: (workAddress as ProfileAddress).building || '',
      work_address: (workAddress as ProfileAddress).address_line_1 || '',
      work_district: (workAddress as ProfileAddress).district || '',
      work_city: (workAddress as ProfileAddress).city || '',
      work_county: (workAddress as ProfileAddress).county || '',
      work_postal_code: (workAddress as ProfileAddress).postcode || '',
      work_state: (workAddress as ProfileAddress).state || '',
      work_country: (workAddress as ProfileAddress).country || '',
      work_phone: '',
      work_email: '',
    };
  }, [profileData]);

  const preferencesData = useMemo<PreferencesStepData>(() => ({
    send_invoices_to: profileData?.send_invoices_to || 'HOME',
    send_study_material_to: profileData?.send_study_material_to || 'HOME',
  }), [profileData]);

  const emptyErrors = useMemo(() => ({} as Record<string, never>), []);

  const handlePersonalChange = useCallback(
    (data: PersonalStepData) => handleStepDataChange('personal', data),
    [handleStepDataChange],
  );

  const handleHomeAddressChange = useCallback(
    (data: HomeAddressStepData) => handleStepDataChange('homeAddress', data),
    [handleStepDataChange],
  );

  const handleWorkAddressChange = useCallback(
    (data: WorkAddressStepData) => handleStepDataChange('workAddress', data),
    [handleStepDataChange],
  );

  const handlePreferencesChange = useCallback(
    (data: PreferencesStepData) => handleStepDataChange('preferences', data),
    [handleStepDataChange],
  );

  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      (Object.values(stepData) as Array<Record<string, unknown>>).forEach((data) => {
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith('_') && key !== 'showWorkSection') {
            payload[key] = value;
          }
        });
      });
      await userProfileService.update(id as string, payload);
      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [id, stepData]);

  const handleCancel = useCallback(() => {
    navigate('/admin/user-profiles');
  }, [navigate]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    activeStep,
    setActiveStep,
    loading,
    error,
    isSubmitting,
    hasWorkAddress,
    snackbar,
    personalData,
    homeAddressData,
    workAddressData,
    preferencesData,
    emptyErrors,
    handlePersonalChange,
    handleHomeAddressChange,
    handleWorkAddressChange,
    handlePreferencesChange,
    handleSave,
    handleCancel,
    handleSnackbarClose,
  };
};

export default useUserProfileFormVM;
