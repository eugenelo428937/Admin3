export type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'LATE' | 'OTHER';

export interface StudentMini {
  student_ref: number;
  first_name: string;
  last_name: string;
}

export interface SessionLite {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: { id: number; name: string } | null;
  tutorial_event: { id: number; code: string };
  location?: { id: number; name: string } | null;
  cancelled?: boolean;
}

export interface RosterRowDTO {
  registration_id: number;
  student: StudentMini;
  current_status: AttendanceStatus | null;
  current_reason: string | null;
}

export interface AttendancePayload {
  session: SessionLite;
  attendance_enabled: boolean;
  registrations: RosterRowDTO[];
  instructor?: { id: number; name: string };
}

export interface AttendanceSaveItem {
  registration_id: number;
  status: AttendanceStatus;
  reason: string;
}

export interface AttendanceService {
  get(): Promise<AttendancePayload>;
  save(items: AttendanceSaveItem[]): Promise<AttendancePayload>;
}
