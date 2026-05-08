// Types mirror the backend admin event/attendance contract.

export interface SubjectMini {
  code: string;
  description: string;
}

export interface SittingMini {
  id: number;
  session_code: string;
  start_date: string;
  end_date: string;
}

export interface LocationMini {
  id: number;
  name: string;
}

export interface VenueMini {
  id: number;
  name: string;
}

export interface InstructorMini {
  id: number;
  name: string;
}

export interface SessionEmbedded {
  id: number;
  title: string;
  sequence: number;
  start_date: string;
  end_date: string;
  venue: VenueMini | null;
  instructors: InstructorMini[];
  enrolled_count: number;
}

export interface EventDTO {
  id: number;
  code: string;
  subject: SubjectMini | null;
  exam_session: SittingMini | null;
  start_date: string;
  end_date: string;
  location: LocationMini | null;
  venue: VenueMini | null;
  main_instructor: InstructorMini | null;
  all_instructors: InstructorMini[];
  finalisation_date: string | null;
  enrolled_distinct: number;
  sessions: SessionEmbedded[];
}

export interface PaginatedEvents {
  count: number;
  next: string | null;
  previous: string | null;
  results: EventDTO[];
}

export interface FilterOptions {
  subjects: SubjectMini[];
  locations: LocationMini[];
  venues: VenueMini[];
  instructors: InstructorMini[];
  sittings: SittingMini[];
}

export type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'LATE' | 'OTHER';

export interface StudentMini {
  student_ref: number;
  first_name: string;
  last_name: string;
}

export interface RosterRowDTO {
  registration_id: number;
  student: StudentMini;
  current_status: AttendanceStatus | null;
  current_reason: string;
}

export interface SessionDetail {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: VenueMini | null;
  tutorial_event: {
    id: number;
    code: string;
  };
}

export interface AttendancePayload {
  session: SessionDetail;
  attendance_enabled: boolean;
  registrations: RosterRowDTO[];
}

export interface AttendanceSaveItem {
  registration_id: number;
  status: AttendanceStatus;
  reason: string;
}

export interface EventFilters {
  subject_codes: string[];
  code: string;
  start_from: string | null;
  start_to: string | null;
  location_ids: number[];
  venue_ids: number[];
  instructor_id: number | null;
  finalisation_from: string | null;
  finalisation_to: string | null;
  sitting_id: number | 'all' | null;
}
