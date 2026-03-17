import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import staffService from '../../../services/staffService';

// ─── Interfaces ───────────────────────────────────────────────

export interface StaffFormData {
  user: string;
  is_active: boolean;
}

export interface StaffFormVM {
  isEditMode: boolean;
  formData: StaffFormData;
  loading: boolean;
  error: string | null;
  isSubmitting: boolean;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleCancel: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────

const useStaffFormVM = (): StaffFormVM => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<StaffFormData>({ user: '', is_active: true });
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchStaff = useCallback(async () => {
    try {
      const data = await staffService.getById(id as string);
      setFormData({
        user: (data as any).user ?? '',
        is_active: (data as any).is_active !== undefined ? (data as any).is_active : true,
      });
    } catch (err) {
      setError('Failed to fetch staff details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      fetchStaff();
    }
  }, [isEditMode, fetchStaff]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formData.user) {
        setError('Please provide a user ID or email.');
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        if (isEditMode) {
          await staffService.update(id as string, formData);
        } else {
          await staffService.create(formData);
        }
        navigate('/admin/staff');
      } catch (err) {
        setError(
          `Failed to ${isEditMode ? 'update' : 'create'} staff member. Please check your input and try again.`,
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isEditMode, id, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate('/admin/staff');
  }, [navigate]);

  return {
    isEditMode,
    formData,
    loading,
    error,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleCancel,
  };
};

export default useStaffFormVM;
