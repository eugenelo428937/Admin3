import type { AttendanceStatus } from './types';

export const ATTENDANCE_STATUS_TOKENS: Record<AttendanceStatus, { label: string }> = {
  ATTENDED: { label: 'Attended' },
  ABSENT:   { label: 'Absent'   },
  LATE:     { label: 'Late'     },
  OTHER:    { label: 'Other'    },
} as const;

export const ATTENDANCE_STATUS_VALUES: AttendanceStatus[] = ['ATTENDED', 'ABSENT', 'LATE', 'OTHER'];
