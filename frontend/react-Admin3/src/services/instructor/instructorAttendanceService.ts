import httpService from '../httpService';
import type {
  AttendancePayload, AttendanceSaveItem, AttendanceService,
} from '../../components/shared/attendance/types';

function urlFor(token: string): string {
  return `/api/tutorials/public/attendance/${encodeURIComponent(token)}/`;
}

export interface UploadSummary {
  rows_applied: number;
  skipped_blank: number;
  errors: string[];
}

export type UploadResponse = AttendancePayload & { upload_summary: UploadSummary };

export interface InstructorAttendanceService extends AttendanceService {
  uploadXlsx(file: File): Promise<UploadResponse>;
}

/**
 * Build an InstructorAttendanceService bound to a specific magic-link token.
 *
 * Extends the base AttendanceService interface (get + save) with an
 * uploadXlsx method for the xlsx-roundtrip flow. The page hands the
 * service to useAttendanceVM (which only sees the base interface) AND
 * to the upload handler (which sees the extended interface).
 */
export function makeInstructorAttendanceService(token: string): InstructorAttendanceService {
  return {
    get: () =>
      httpService.get(urlFor(token)).then(r => r.data as AttendancePayload),
    save: (items: AttendanceSaveItem[]) =>
      httpService.post(urlFor(token), { items }).then(r => r.data as AttendancePayload),
    uploadXlsx: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return httpService.post(`${urlFor(token)}upload-xlsx/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data as UploadResponse);
    },
  };
}
