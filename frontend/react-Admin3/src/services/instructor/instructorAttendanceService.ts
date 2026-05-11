import httpService from '../httpService';
import type {
  AttendancePayload, AttendanceSaveItem, AttendanceService,
} from '../../components/shared/attendance/types';

function urlFor(token: string): string {
  return `/api/tutorials/public/attendance/${encodeURIComponent(token)}/`;
}

/**
 * Build an AttendanceService bound to a specific magic-link token.
 *
 * The instructor page mounts at /instructor/attendance/:token and feeds the
 * token into this factory. The returned object satisfies the same
 * AttendanceService interface that the admin path uses, so the shared
 * useAttendanceVM hook can drive either flow without code changes.
 */
export function makeInstructorAttendanceService(token: string): AttendanceService {
  return {
    get: () =>
      httpService.get(urlFor(token)).then(r => r.data as AttendancePayload),
    save: (items: AttendanceSaveItem[]) =>
      httpService.post(urlFor(token), { items }).then(r => r.data as AttendancePayload),
  };
}
