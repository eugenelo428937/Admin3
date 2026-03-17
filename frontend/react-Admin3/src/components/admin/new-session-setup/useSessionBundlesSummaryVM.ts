import { useState, useEffect } from 'react';
import storeBundleService from '../../../services/storeBundleService';

// ─── Interfaces ───────────────────────────────────────────────

export interface SessionBundle {
  id: number;
  name: string;
  template_name: string;
  subject_code: string;
  is_active: boolean;
  component_count?: number;
}

export interface SessionBundlesSummaryProps {
  sessionId: number | null;
}

export interface SessionBundlesSummaryVM {
  bundles: SessionBundle[];
  loading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────

const useSessionBundlesSummaryVM = ({ sessionId }: SessionBundlesSummaryProps): SessionBundlesSummaryVM => {
  const [bundles, setBundles] = useState<SessionBundle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setLoading(true);
        const { results } = await storeBundleService.adminList({ exam_session_id: sessionId, page_size: 100 });
        setBundles(results || []);
      } catch {
        setError('Failed to load bundles');
      } finally {
        setLoading(false);
      }
    };
    fetchBundles();
  }, [sessionId]);

  return { bundles, loading, error };
};

export default useSessionBundlesSummaryVM;
