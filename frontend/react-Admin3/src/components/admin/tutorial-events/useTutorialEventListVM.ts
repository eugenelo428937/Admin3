import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import service from '../../../services/admin/tutorialEventsAdminService';
import type {
  EventDTO, EventFilters, FilterOptions, SessionEmbedded,
} from './types';

interface ModalSession {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: SessionEmbedded['venue'];
  tutorial_event: { id: number; code: string };
}

const DEFAULT_FILTERS: EventFilters = {
  subject_codes: [],
  code: '',
  start_from: null,
  start_to: null,
  location_ids: [],
  venue_ids: [],
  instructor_id: null,
  finalisation_from: null,
  finalisation_to: null,
  sitting_id: null,
};

const DEBOUNCE_MS = 300;

// Returns true iff the only differing field between `next` and `prev`
// is the text-debounced field `code`. We use a separate "applied
// filters" state so non-text filters fire immediately while `code` is
// debounced.
function onlyCodeChanged(next: EventFilters, prev: EventFilters): boolean {
  const keys = Object.keys(next) as (keyof EventFilters)[];
  for (const k of keys) {
    if (k === 'code') continue;
    if (JSON.stringify((next as any)[k]) !== JSON.stringify((prev as any)[k])) {
      return false;
    }
  }
  return next.code !== prev.code;
}

export default function useTutorialEventListVM() {
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [ordering, setOrdering] = useState('start_date');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [meta, setMeta] = useState({ count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [attendanceTarget, setAttendanceTarget] = useState<ModalSession | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch of filter options. Once we know the available sittings,
  // default the sitting filter to the latest one (backend returns sittings
  // ordered by `-start_date`, so index 0 is the latest).
  useEffect(() => {
    let cancelled = false;
    service.filterOptions().then(opts => {
      if (cancelled) return;
      setFilterOptions(opts);
      const latest = opts.sittings[0];
      if (latest) {
        setFilters(prev =>
          prev.sitting_id === null ? { ...prev, sitting_id: latest.id } : prev,
        );
        setAppliedFilters(prev =>
          prev.sitting_id === null ? { ...prev, sitting_id: latest.id } : prev,
        );
      }
    }).catch(() => { /* filter bar will fall back to no dropdown options */ });
    return () => { cancelled = true; };
  }, []);

  // Sync filters -> appliedFilters with text-field debouncing.
  useEffect(() => {
    if (filters === appliedFilters) return;
    if (onlyCodeChanged(filters, appliedFilters)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setAppliedFilters(filters), DEBOUNCE_MS);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAppliedFilters(filters);
  }, [filters, appliedFilters]);

  // Fetch events whenever appliedFilters / ordering / pagination /
  // refetchToken change.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    service.listEvents(
      appliedFilters, ordering, pagination.page, pagination.pageSize,
    ).then(res => {
      if (!cancelled) {
        setEvents(res.results);
        setMeta({ count: res.count });
      }
    }).catch((e: any) => {
      if (!cancelled) setError(e?.response?.data?.detail || 'Failed to load events.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [appliedFilters, ordering, pagination.page, pagination.pageSize, refetchToken]);

  const setFilter = useCallback(
    <K extends keyof EventFilters>(name: K, value: EventFilters[K]) => {
      setFilters(prev => ({ ...prev, [name]: value }));
      setPagination(p => ({ ...p, page: 1 }));
    }, [],
  );

  const clearFilters = useCallback(() => {
    // Clearing reverts to "latest sitting" rather than "no sitting", to keep
    // the UI consistent with the initial-load default.
    const latest = filterOptions?.sittings?.[0];
    setFilters({
      ...DEFAULT_FILTERS,
      sitting_id: latest ? latest.id : null,
    });
    setPagination(p => ({ page: 1, pageSize: p.pageSize }));
  }, [filterOptions]);

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (id: number) => expandedIds.has(id),
    [expandedIds],
  );

  const openAttendance = useCallback((session: ModalSession) => {
    setAttendanceTarget(session);
  }, []);

  const closeAttendance = useCallback(() => setAttendanceTarget(null), []);

  const handleAttendanceSaved = useCallback(() => {
    closeAttendance();
  }, [closeAttendance]);

  const retry = useCallback(() => setRefetchToken(t => t + 1), []);

  return useMemo(() => ({
    filters,
    ordering,
    pagination,
    events,
    count: meta.count,
    isLoading,
    error,
    filterOptions,
    attendanceTarget,
    setFilter,
    clearFilters,
    setOrdering,
    setPagination,
    toggleExpanded,
    isExpanded,
    openAttendance,
    closeAttendance,
    handleAttendanceSaved,
    retry,
  }), [filters, ordering, pagination, events, meta.count, isLoading, error,
    filterOptions, attendanceTarget, setFilter, clearFilters, toggleExpanded,
    isExpanded, openAttendance, closeAttendance, handleAttendanceSaved, retry]);
}
