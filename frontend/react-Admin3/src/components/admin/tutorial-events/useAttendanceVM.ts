import { useCallback, useEffect, useMemo, useState } from 'react';
import service from '../../../services/admin/tutorialEventsAdminService';
import type {
  AttendancePayload, AttendanceStatus, RosterRowDTO,
} from './types';

export class AttendanceSaveError extends Error {
  constructor(
    message: string,
    public readonly code: string | null,
    public readonly rowErrors: Record<number, string>,
  ) {
    super(message);
    this.name = 'AttendanceSaveError';
  }
}

export interface RosterRow {
  registration_id: number;
  student: RosterRowDTO['student'];
  status: AttendanceStatus | '';
  reason: string;
  current_status: AttendanceStatus | null;
  current_reason: string;
  dirty: boolean;
}

function rowFromDTO(dto: RosterRowDTO): RosterRow {
  return {
    registration_id: dto.registration_id,
    student: dto.student,
    status: dto.current_status ?? '',
    reason: dto.current_reason ?? '',
    current_status: dto.current_status,
    current_reason: dto.current_reason ?? '',
    dirty: false,
  };
}

function isDirty(row: RosterRow): boolean {
  if (row.status !== (row.current_status ?? '')) return true;
  if (row.status === 'OTHER' && row.reason !== row.current_reason) return true;
  return false;
}

export default function useAttendanceVM(sessionId: number) {
  const [session, setSession] = useState<AttendancePayload['session'] | null>(null);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const applyPayload = useCallback((p: AttendancePayload) => {
    setSession(p.session);
    setAttendanceEnabled(p.attendance_enabled);
    setRoster(p.registrations.map(rowFromDTO));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    service.getAttendance(sessionId).then(p => {
      if (!cancelled) applyPayload(p);
    }).catch((e: any) => {
      if (!cancelled) setError(e?.response?.data?.detail || 'Failed to load roster.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionId, applyPayload]);

  const setStatus = useCallback((regId: number, status: AttendanceStatus) => {
    setRoster(prev => prev.map(r => {
      if (r.registration_id !== regId) return r;
      const next: RosterRow = { ...r, status };
      next.dirty = isDirty(next);
      return next;
    }));
    setRowErrors(prev => {
      if (!(regId in prev)) return prev;
      const next = { ...prev };
      delete next[regId];
      return next;
    });
  }, []);

  const setReason = useCallback((regId: number, reason: string) => {
    setRoster(prev => prev.map(r => {
      if (r.registration_id !== regId) return r;
      const next: RosterRow = { ...r, reason };
      next.dirty = isDirty(next);
      return next;
    }));
    setRowErrors(prev => {
      if (!(regId in prev)) return prev;
      const next = { ...prev };
      delete next[regId];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setLastErrorCode(null);
    setRowErrors({});
    try {
      const items = roster
        .filter(r => r.status !== '')
        .map(r => ({
          registration_id: r.registration_id,
          status: r.status as AttendanceStatus,
          reason: r.status === 'OTHER' ? r.reason : '',
        }));
      const updated = await service.saveAttendance(sessionId, items);
      applyPayload(updated);
    } catch (e: any) {
      const data = e?.response?.data;
      const code = data?.code;
      if (code === 'not_yet_open') {
        setLastErrorCode('not_yet_open');
        setError('Session has not started yet.');
        throw new AttendanceSaveError('Session has not started yet.', 'not_yet_open', {});
      }
      // 400 with per-item errors
      if (data?.items && Array.isArray(data.items)) {
        const sentItems = roster
          .filter(r => r.status !== '')
          .map(r => ({
            registration_id: r.registration_id,
            status: r.status as AttendanceStatus,
            reason: r.status === 'OTHER' ? r.reason : '',
          }));
        const indexToId: Record<number, number> = {};
        sentItems.forEach((it, i) => { indexToId[i] = it.registration_id; });
        const errs: Record<number, string> = {};
        (data.items as any[]).forEach((entry: any, idx: number) => {
          if (!entry || (typeof entry === 'object' && Object.keys(entry).length === 0)) return;
          const regId = indexToId[idx];
          if (regId === undefined) return;
          let msg: string;
          if (typeof entry === 'string') {
            msg = entry;
          } else {
            const firstField = Object.values(entry)[0];
            msg = Array.isArray(firstField) ? String(firstField[0]) : String(firstField);
          }
          errs[regId] = msg;
        });
        if (Object.keys(errs).length > 0) {
          setRowErrors(errs);
          setError('Some entries are invalid.');
          throw new AttendanceSaveError('Some entries are invalid.', null, errs);
        }
      }
      const msg = data?.detail || 'Save failed — please try again.';
      setError(msg);
      throw new AttendanceSaveError(msg, null, {});
    } finally {
      setIsSaving(false);
    }
  }, [roster, sessionId, applyPayload]);

  const reset = useCallback(() => {
    setRoster(prev => prev.map(r => ({
      ...r,
      status: r.current_status ?? '',
      reason: r.current_reason ?? '',
      dirty: false,
    })));
  }, []);

  const hasInvalidOther = useMemo(
    () => roster.some(r => r.status === 'OTHER' && !r.reason.trim()),
    [roster],
  );

  const hasDirty = useMemo(() => roster.some(r => r.dirty), [roster]);

  return {
    session,
    attendanceEnabled,
    roster,
    isLoading,
    isSaving,
    error,
    lastErrorCode,
    rowErrors,
    hasDirty,
    hasInvalidOther,
    setStatus,
    setReason,
    save,
    reset,
  };
}
